using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using OtpNet;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.Configuration;
using PassFort.DTO.DTOs;
using QRCoder;

namespace PassFort.BLL.Services;

public class MfaService : IMfaService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IUserRecoveryCodeRepository _recoveryCodeRepository;
    private readonly JwtSettings _jwtSettings;

    public MfaService(
        UserManager<ApplicationUser> userManager,
        IUserRecoveryCodeRepository recoveryCodeRepository,
        IOptions<JwtSettings> jwtSettings
    )
    {
        _userManager = userManager;
        _recoveryCodeRepository = recoveryCodeRepository;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<EnableTwoFactorResponseDto> EnableTwoFactorAsync(
        string userId,
        EnableTwoFactorRequestDto request
    )
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        // Verify the user's password before enabling 2FA
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Invalid password");
        }

        // Check if 2FA is already enabled
        if (user.TwoFactorEnabled)
        {
            throw new InvalidOperationException("Two-factor authentication is already enabled");
        }

        // Generate a new secret key
        var secretKey = GenerateSecretKey();
        user.TwoFactorSecretKey = secretKey;

        // Generate recovery codes
        var recoveryCodes = GenerateRecoveryCodes();

        // Save the secret key to the user
        await _userManager.UpdateAsync(user);

        // Save recovery codes to database
        var recoveryCodeEntities = recoveryCodes
            .Select(code => new UserRecoveryCode
            {
                UserId = userId,
                Code = code,
                CreatedAt = DateTime.UtcNow,
            })
            .ToList();

        await _recoveryCodeRepository.AddRangeAsync(recoveryCodeEntities);

        // Update recovery codes count
        user.RecoveryCodesRemaining = recoveryCodes.Length;
        await _userManager.UpdateAsync(user);

        // Generate QR code
        var issuer = _jwtSettings.Issuer ?? "PassFort";
        var accountTitle = user.Email ?? user.UserName ?? "User";
        var qrCodeUri = GenerateQrCodeUri(secretKey, accountTitle, issuer);
        var qrCodeBase64 = GenerateQrCodeImage(qrCodeUri);

        return new EnableTwoFactorResponseDto
        {
            SharedKey = FormatSecretKey(secretKey),
            AuthenticatorUri = qrCodeUri,
            RecoveryCodes = recoveryCodes,
            QrCodeUri = qrCodeBase64,
        };
    }

    public async Task<bool> VerifyTwoFactorAsync(string userId, VerifyTwoFactorRequestDto request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.TwoFactorSecretKey))
        {
            return false;
        }

        // Try to verify as TOTP code first
        if (VerifyTotpCode(user.TwoFactorSecretKey, request.Code))
        {
            // If this is the first verification, enable 2FA
            if (!user.TwoFactorEnabled)
            {
                user.TwoFactorEnabled = true;
                user.TwoFactorEnabledAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
            }
            return true;
        }

        // If TOTP fails, try recovery code
        return await VerifyRecoveryCodeAsync(userId, request.Code);
    }

    public async Task<bool> DisableTwoFactorAsync(string userId, DisableTwoFactorRequestDto request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        // Verify the user's password before disabling 2FA
        var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Invalid password");
        }

        // Disable 2FA
        user.TwoFactorEnabled = false;
        user.TwoFactorSecretKey = null;
        user.TwoFactorEnabledAt = null;
        user.RecoveryCodesRemaining = 0;

        await _userManager.UpdateAsync(user);

        // Remove all recovery codes
        await _recoveryCodeRepository.DeleteByUserIdAsync(userId);

        return true;
    }

    public async Task<TwoFactorStatusDto> GetTwoFactorStatusAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        var recoveryCodesCount = await _recoveryCodeRepository.GetUnusedCountByUserIdAsync(userId);

        return new TwoFactorStatusDto
        {
            IsEnabled = user.TwoFactorEnabled,
            HasRecoveryCodes = recoveryCodesCount > 0,
            RecoveryCodesLeft = recoveryCodesCount,
        };
    }

    public async Task<string[]> GenerateRecoveryCodesAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        if (!user.TwoFactorEnabled)
        {
            throw new InvalidOperationException("Two-factor authentication is not enabled");
        }

        // Remove existing recovery codes
        await _recoveryCodeRepository.DeleteByUserIdAsync(userId);

        // Generate new recovery codes
        var recoveryCodes = GenerateRecoveryCodes();

        // Save new recovery codes to database
        var recoveryCodeEntities = recoveryCodes
            .Select(code => new UserRecoveryCode
            {
                UserId = userId,
                Code = code,
                CreatedAt = DateTime.UtcNow,
            })
            .ToList();

        await _recoveryCodeRepository.AddRangeAsync(recoveryCodeEntities);

        // Update recovery codes count
        user.RecoveryCodesRemaining = recoveryCodes.Length;
        await _userManager.UpdateAsync(user);

        return recoveryCodes;
    }

    public async Task<bool> VerifyRecoveryCodeAsync(string userId, string recoveryCode)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || !user.TwoFactorEnabled)
        {
            return false;
        }

        var recoveryCodeEntity = await _recoveryCodeRepository.GetByUserIdAndCodeAsync(
            userId,
            recoveryCode
        );
        if (recoveryCodeEntity == null)
        {
            return false;
        }

        // Mark the recovery code as used
        recoveryCodeEntity.IsUsed = true;
        recoveryCodeEntity.UsedAt = DateTime.UtcNow;
        await _recoveryCodeRepository.UpdateAsync(recoveryCodeEntity);

        // Update the remaining count
        user.RecoveryCodesRemaining = Math.Max(0, user.RecoveryCodesRemaining - 1);
        await _userManager.UpdateAsync(user);

        return true;
    }

    #region Private Helper Methods

    private static string GenerateSecretKey()
    {
        var key = KeyGeneration.GenerateRandomKey(20); // 160-bit key
        return Base32Encoding.ToString(key);
    }

    private static string[] GenerateRecoveryCodes()
    {
        var codes = new string[10]; // Generate 10 recovery codes
        using var rng = RandomNumberGenerator.Create();

        for (int i = 0; i < codes.Length; i++)
        {
            var bytes = new byte[5]; // 40 bits = 8 characters in base32
            rng.GetBytes(bytes);
            codes[i] = Base32Encoding.ToString(bytes).Replace("=", "").ToLower();
        }

        return codes;
    }

    private static bool VerifyTotpCode(string secretKey, string code)
    {
        try
        {
            var keyBytes = Base32Encoding.ToBytes(secretKey);
            var totp = new Totp(keyBytes);
            return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
        }
        catch
        {
            return false;
        }
    }

    private static string GenerateQrCodeUri(string secretKey, string accountTitle, string issuer)
    {
        return $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(accountTitle)}?secret={secretKey}&issuer={Uri.EscapeDataString(issuer)}";
    }

    private static string GenerateQrCodeImage(string qrCodeUri)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(qrCodeUri, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeBytes = qrCode.GetGraphic(20);
        return Convert.ToBase64String(qrCodeBytes);
    }

    private static string FormatSecretKey(string secretKey)
    {
        // Format the secret key in groups of 4 characters for easier manual entry
        var formatted = new StringBuilder();
        for (int i = 0; i < secretKey.Length; i += 4)
        {
            if (i > 0)
                formatted.Append(' ');
            formatted.Append(secretKey.Substring(i, Math.Min(4, secretKey.Length - i)));
        }
        return formatted.ToString();
    }

    #endregion
}

using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
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

    public async Task<TwoFactorSetupDto> GenerateTwoFactorSetupAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        // Check if 2FA is already enabled
        if (user.TwoFactorEnabled)
        {
            throw new InvalidOperationException("Two-factor authentication is already enabled");
        }

        // Generate a new secret key
        var secretKey = GenerateSecretKey();

        // Generate QR code
        var issuer = _jwtSettings.Issuer ?? "PassFort";
        var accountTitle = user.Email ?? user.UserName ?? "User";
        var qrCodeUri = GenerateQrCodeUri(secretKey, accountTitle, issuer);
        var qrCodeBase64 = GenerateQrCodeImage(qrCodeUri);

        // Store the temporary secret key (not yet enabled)
        user.TwoFactorSecretKey = secretKey;
        await _userManager.UpdateAsync(user);

        return new TwoFactorSetupDto
        {
            SecretKey = FormatSecretKey(secretKey),
            QrCodeUrl = qrCodeBase64
        };
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

        // Verify the user's master password hash before enabling 2FA (ZERO-KNOWLEDGE)
        var passwordValid = VerifyPasswordHash(user.MasterPasswordHash, request.MasterPasswordHash);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Invalid master password");
        }

        // Check if we have a secret key from setup
        if (string.IsNullOrEmpty(user.TwoFactorSecretKey))
        {
            throw new InvalidOperationException("No 2FA setup found. Please run setup first.");
        }

        // Verify the 2FA code
        if (!VerifyTotpCode(user.TwoFactorSecretKey, request.VerificationCode))
        {
            throw new UnauthorizedAccessException("Invalid verification code");
        }

        // Generate recovery codes
        var recoveryCodes = GenerateRecoveryCodes();

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

        // Enable 2FA
        user.TwoFactorEnabled = true;
        user.TwoFactorEnabledAt = DateTime.UtcNow;
        user.RecoveryCodesRemaining = recoveryCodes.Length;
        await _userManager.UpdateAsync(user);

        // Generate QR code for response
        var issuer = _jwtSettings.Issuer ?? "PassFort";
        var accountTitle = user.Email ?? user.UserName ?? "User";
        var qrCodeUri = GenerateQrCodeUri(user.TwoFactorSecretKey, accountTitle, issuer);
        var qrCodeBase64 = GenerateQrCodeImage(qrCodeUri);

        return new EnableTwoFactorResponseDto
        {
            Success = true,
            Message = "Two-factor authentication enabled successfully",
            SecretKey = FormatSecretKey(user.TwoFactorSecretKey),
            QrCodeUrl = qrCodeBase64,
            RecoveryCodes = recoveryCodes,
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

        // Check if 2FA is enabled
        if (!user.TwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecretKey))
        {
            throw new InvalidOperationException("Two-factor authentication is not enabled");
        }

        // Verify the user's master password hash before disabling 2FA (ZERO-KNOWLEDGE)
        var passwordValid = VerifyPasswordHash(user.MasterPasswordHash, request.MasterPasswordHash);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Invalid master password");
        }

        // Verify the 2FA code before disabling 2FA
        var twoFactorValid =
            VerifyTotpCode(user.TwoFactorSecretKey, request.VerificationCode)
            || await VerifyRecoveryCodeAsync(userId, request.VerificationCode);

        if (!twoFactorValid)
        {
            throw new UnauthorizedAccessException("Invalid two-factor authentication code");
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
        if (user == null)
        {
            return false;
        }

        // Find and verify the recovery code
        var validRecoveryCode = await _recoveryCodeRepository.GetByUserIdAndCodeAsync(
            userId,
            recoveryCode
        );

        if (validRecoveryCode != null && !validRecoveryCode.IsUsed)
        {
            // Mark the recovery code as used
            validRecoveryCode.IsUsed = true;
            validRecoveryCode.UsedAt = DateTime.UtcNow;
            await _recoveryCodeRepository.UpdateAsync(validRecoveryCode);

            // Update the remaining count
            user.RecoveryCodesRemaining = Math.Max(0, user.RecoveryCodesRemaining - 1);
            await _userManager.UpdateAsync(user);

            return true;
        }

        return false;
    }

    #region Private Helper Methods

    private static string GenerateSecretKey()
    {
        var key = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(key);
    }

    private static string[] GenerateRecoveryCodes()
    {
        const int codeCount = 10;
        const int codeLength = 8;
        var codes = new string[codeCount];

        using var rng = RandomNumberGenerator.Create();
        for (int i = 0; i < codeCount; i++)
        {
            var bytes = new byte[codeLength / 2];
            rng.GetBytes(bytes);
            codes[i] = Convert.ToHexString(bytes).ToLowerInvariant();
        }

        return codes;
    }

    private static bool VerifyTotpCode(string secretKey, string code)
    {
        try
        {
            var keyBytes = Base32Encoding.ToBytes(secretKey);
            var totp = new Totp(keyBytes);
            return totp.VerifyTotp(code, out _);
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
        using var qrCode = new Base64QRCode(qrCodeData);
        return $"data:image/png;base64,{qrCode.GetGraphic(20)}";
    }

    private static string FormatSecretKey(string secretKey)
    {
        var formatted = new StringBuilder();
        for (int i = 0; i < secretKey.Length; i += 4)
        {
            if (i > 0) formatted.Append(' ');
            formatted.Append(secretKey.Substring(i, Math.Min(4, secretKey.Length - i)));
        }
        return formatted.ToString();
    }

    private static bool VerifyPasswordHash(string? storedBcryptHash, string providedHash)
    {
        // ZERO-KNOWLEDGE: Verify the provided derived hash against the stored BCrypt hash
        // The provided hash is derived from Scrypt, the stored hash is BCrypt-hashed
        if (string.IsNullOrEmpty(storedBcryptHash))
        {
            return false;
        }
        
        return BCrypt.Net.BCrypt.Verify(providedHash, storedBcryptHash);
    }

    #endregion
}

using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using PassFort.Api.Models;

namespace PassFort.Api.Services
{
    public class MfaService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public MfaService(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        public async Task<TwoFactorSetupInfo> GenerateTwoFactorSetupAsync(ApplicationUser user)
        {
            // Generate a new authenticator key
            await _userManager.ResetAuthenticatorKeyAsync(user);

            // Get the key
            string authenticatorKey = await _userManager.GetAuthenticatorKeyAsync(user);

            // Create the setup info for the authenticator app
            string appName = "PassFort";
            string encodedKey = authenticatorKey;

            // Create QR code URL (for Google Authenticator, Microsoft Authenticator, etc.)
            string qrCodeUrl =
                $"otpauth://totp/{Uri.EscapeDataString(appName)}:{Uri.EscapeDataString(user.Email)}?secret={encodedKey}&issuer={Uri.EscapeDataString(appName)}";

            return new TwoFactorSetupInfo
            {
                AuthenticatorKey = authenticatorKey,
                QrCodeUrl = qrCodeUrl,
                ManualSetupKey = encodedKey,
            };
        }

        public async Task<bool> VerifyTwoFactorCodeAsync(
            ApplicationUser user,
            string verificationCode
        )
        {
            if (string.IsNullOrWhiteSpace(verificationCode))
            {
                return false;
            }

            // Verify the token using ASP.NET Core Identity
            return await _userManager.VerifyTwoFactorTokenAsync(
                user,
                _userManager.Options.Tokens.AuthenticatorTokenProvider,
                verificationCode
            );
        }
    }

    public class TwoFactorSetupInfo
    {
        public string AuthenticatorKey { get; set; } = string.Empty;
        public string QrCodeUrl { get; set; } = string.Empty;
        public string ManualSetupKey { get; set; } = string.Empty;
    }
}

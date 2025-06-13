using System.ComponentModel.DataAnnotations;

namespace PassFort.DTO.DTOs
{
    public class TwoFactorSetupDto
    {
        public string SecretKey { get; set; } = string.Empty;
        public string QrCodeUrl { get; set; } = string.Empty;
    }

    public class EnableTwoFactorRequestDto
    {
        [Required]
        public string MasterPasswordHash { get; set; } = string.Empty;
        
        [Required]
        public string VerificationCode { get; set; } = string.Empty;
    }

    public class EnableTwoFactorResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string SecretKey { get; set; } = string.Empty;
        public string QrCodeUrl { get; set; } = string.Empty;
        public string[] RecoveryCodes { get; set; } = Array.Empty<string>();
    }

    public class VerifyTwoFactorRequestDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;
    }

    public class DisableTwoFactorRequestDto
    {
        [Required]
        public string MasterPasswordHash { get; set; } = string.Empty;

        [Required]
        public string VerificationCode { get; set; } = string.Empty;
    }

    public class TwoFactorStatusDto
    {
        public bool IsEnabled { get; set; }
        public bool HasRecoveryCodes { get; set; }
        public int RecoveryCodesLeft { get; set; }
    }

    public class VerifyRecoveryCodeRequestDto
    {
        [Required]
        public string RecoveryCode { get; set; } = string.Empty;
    }
}

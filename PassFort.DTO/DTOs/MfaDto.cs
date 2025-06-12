using System.ComponentModel.DataAnnotations;

namespace PassFort.DTO.DTOs
{
    public class EnableTwoFactorRequestDto
    {
        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class EnableTwoFactorResponseDto
    {
        public string SharedKey { get; set; } = string.Empty;
        public string AuthenticatorUri { get; set; } = string.Empty;
        public string[] RecoveryCodes { get; set; } = Array.Empty<string>();
        public string QrCodeUri { get; set; } = string.Empty;
    }

    public class VerifyTwoFactorRequestDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;
    }

    public class DisableTwoFactorRequestDto
    {
        [Required]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string TwoFactorCode { get; set; } = string.Empty;
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

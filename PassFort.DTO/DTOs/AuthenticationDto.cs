using System.ComponentModel.DataAnnotations;

namespace PassFort.DTO.DTOs
{
    public class LoginRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string MasterPassword { get; set; } = string.Empty;

        public bool RememberMe { get; set; } = false;

        // Optional 2FA code
        public string? TwoFactorCode { get; set; }
    }

    public class RegisterRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 12)]
        public string MasterPassword { get; set; } = string.Empty;

        [Required]
        [Compare("MasterPassword")]
        public string ConfirmMasterPassword { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;
    }

    public class TokenResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public UserDto User { get; set; } = new();
    }

    public class RegisterResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public UserDto User { get; set; } = new();
    }

    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class ChangePasswordRequestDto
    {
        [Required]
        public string CurrentMasterPassword { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 12)]
        public string NewMasterPassword { get; set; } = string.Empty;

        [Required]
        [Compare("NewMasterPassword")]
        public string ConfirmNewMasterPassword { get; set; } = string.Empty;
    }
}

using System.ComponentModel.DataAnnotations;

namespace PassFort.DTO.DTOs
{
    public class LoginRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string MasterPasswordHash { get; set; } = string.Empty;

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
        public string MasterPasswordHash { get; set; } = string.Empty;

        [Required]
        [Compare("MasterPasswordHash")]
        public string ConfirmMasterPasswordHash { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;
        
        // Security level used for password hashing
        public string SecurityLevel { get; set; } = "balanced";
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
        public string CurrentMasterPasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 12)]
        public string NewMasterPasswordHash { get; set; } = string.Empty;

        [Required]
        [Compare("NewMasterPasswordHash")]
        public string ConfirmNewMasterPasswordHash { get; set; } = string.Empty;
        
        // New security level (if changing)
        public string? NewSecurityLevel { get; set; }
    }

    public class ChangeSecurityLevelRequestDto
    {
        [Required]
        public string CurrentMasterPasswordHash { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 12)]
        public string NewMasterPasswordHash { get; set; } = string.Empty;

        [Required]
        public string NewSecurityLevel { get; set; } = string.Empty;
    }

    public class SecurityLevelRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    public class SecurityLevelResponseDto
    {
        public string SecurityLevel { get; set; } = string.Empty;
    }
}

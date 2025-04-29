using System.ComponentModel.DataAnnotations;

namespace PassFort.Api.Models.Authentication
{
    public class LoginRequestModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string MasterPassword { get; set; } = string.Empty;

        // Optional two-factor authentication code
        public string? TwoFactorCode { get; set; }
    }
}

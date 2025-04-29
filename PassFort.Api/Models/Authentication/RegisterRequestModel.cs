using System.ComponentModel.DataAnnotations;

namespace PassFort.Api.Models.Authentication
{
    public class RegisterRequestModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string MasterPassword { get; set; } = string.Empty;

        [Required]
        [Compare("MasterPassword")]
        public string ConfirmMasterPassword { get; set; } = string.Empty;

        [Required]
        public string Username { get; set; } = string.Empty;
    }
}

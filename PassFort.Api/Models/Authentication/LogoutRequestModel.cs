using System.ComponentModel.DataAnnotations;

namespace PassFort.Api.Models.Authentication
{
    public class LogoutRequestModel
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;

        // The JWT token to be blacklisted is already in the Authorization header
        // so we don't need to include it here, but we'll extract it in the controller
    }
}

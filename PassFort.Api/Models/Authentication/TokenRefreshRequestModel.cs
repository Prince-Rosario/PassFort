using System.ComponentModel.DataAnnotations;

namespace PassFort.Api.Models.Authentication
{
    public class TokenRefreshRequestModel
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}

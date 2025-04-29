namespace PassFort.Api.Models.Authentication
{
    public class AuthResponseModel
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Token { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? Expiration { get; set; }
        public bool RequiresTwoFactor { get; set; }
        public string? UserId { get; set; }
        public string? Username { get; set; }
        public string? Email { get; set; }
    }
}

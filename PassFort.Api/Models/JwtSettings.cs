namespace PassFort.Api.Models
{
    public class JwtSettings
    {
        public string SecretKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public int ExpirationInMinutes { get; set; } = 60; // 1 hour default
        public int RefreshTokenExpirationInDays { get; set; } = 7; // 1 week default
    }
}

namespace PassFort.DTO.Configuration
{
    public class JwtSettings
    {
        public string SecretKey { get; init; } = string.Empty;
        public string Issuer { get; init; } = string.Empty;
        public string Audience { get; init; } = string.Empty;
        public int ExpirationInMinutes { get; init; } = 60;
        public int RefreshTokenExpirationInDays { get; init; } = 7;
    }
}

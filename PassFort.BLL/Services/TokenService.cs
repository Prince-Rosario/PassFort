using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PassFort.BLL.Mappers;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.Configuration;
using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IBlacklistedTokenRepository _blacklistedTokenRepository;

        public TokenService(
            IOptions<JwtSettings> jwtSettings,
            UserManager<ApplicationUser> userManager,
            IRefreshTokenRepository refreshTokenRepository,
            IBlacklistedTokenRepository blacklistedTokenRepository
        )
        {
            _jwtSettings = jwtSettings.Value;
            _userManager = userManager;
            _refreshTokenRepository = refreshTokenRepository;
            _blacklistedTokenRepository = blacklistedTokenRepository;
        }

        public async Task<string> GenerateJwtTokenAsync(ApplicationUser user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.SecretKey);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Name, user.UserName ?? string.Empty),
                new(ClaimTypes.Email, user.Email ?? string.Empty),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(
                    JwtRegisteredClaimNames.Iat,
                    DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                    ClaimValueTypes.Integer64
                ),
            };

            // Add user roles to claims
            var roles = await _userManager.GetRolesAsync(user);
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature
                ),
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public async Task<RefreshToken> GenerateRefreshTokenAsync(string userId)
        {
            var refreshToken = new RefreshToken
            {
                Token = GenerateRandomToken(),
                UserId = userId,
                ExpiryDate = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
                CreatedAt = DateTime.UtcNow,
            };

            return await _refreshTokenRepository.AddAsync(refreshToken);
        }

        public async Task<TokenResponseDto> RefreshTokenAsync(string refreshToken)
        {
            var storedToken = await _refreshTokenRepository.GetByTokenAsync(refreshToken);

            if (storedToken == null || !storedToken.IsActive)
            {
                throw new SecurityTokenException("Invalid refresh token");
            }

            // Revoke the old refresh token
            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            await _refreshTokenRepository.UpdateAsync(storedToken);

            // Generate new tokens
            var user = storedToken.User;
            var newJwtToken = await GenerateJwtTokenAsync(user);
            var newRefreshToken = await GenerateRefreshTokenAsync(user.Id);

            // Set replacement token reference
            storedToken.ReplacedByToken = newRefreshToken.Token;
            await _refreshTokenRepository.UpdateAsync(storedToken);

            return new TokenResponseDto
            {
                AccessToken = newJwtToken,
                RefreshToken = newRefreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                User = UserMapper.ToDto(user),
            };
        }

        public async Task<bool> RevokeTokenAsync(string refreshToken)
        {
            var storedToken = await _refreshTokenRepository.GetByTokenAsync(refreshToken);

            if (storedToken == null || !storedToken.IsActive)
            {
                return false;
            }

            storedToken.IsRevoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            await _refreshTokenRepository.UpdateAsync(storedToken);

            return true;
        }

        public async Task<bool> RevokeAllUserTokensAsync(string userId)
        {
            await _refreshTokenRepository.RevokeAllUserTokensAsync(userId);
            return true;
        }

        public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false,
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)
                ),
                ValidateLifetime =
                    false // We don't care about the token's expiration date
                ,
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var principal = tokenHandler.ValidateToken(
                token,
                tokenValidationParameters,
                out SecurityToken securityToken
            );

            if (
                securityToken is not JwtSecurityToken jwtSecurityToken
                || !jwtSecurityToken.Header.Alg.Equals(
                    SecurityAlgorithms.HmacSha256,
                    StringComparison.InvariantCultureIgnoreCase
                )
            )
            {
                throw new SecurityTokenException("Invalid token");
            }

            return principal;
        }

        public string? GetTokenIdFromJwt(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwt = tokenHandler.ReadJwtToken(token);
            return jwt.Claims.FirstOrDefault(x => x.Type == JwtRegisteredClaimNames.Jti)?.Value;
        }

        private static string GenerateRandomToken()
        {
            var randomBytes = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PassFort.Api.Data;
using PassFort.Api.Models;
using PassFort.Api.Models.Authentication;

namespace PassFort.Api.Services
{
    public class TokenService
    {
        private readonly JwtSettings _jwtSettings;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;

        public TokenService(
            IOptions<JwtSettings> jwtSettings,
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext context
        )
        {
            _jwtSettings = jwtSettings.Value;
            _userManager = userManager;
            _context = context;
        }

        public async Task<string> GenerateJwtToken(ApplicationUser user)
        {
            var userRoles = await _userManager.GetRolesAsync(user);

            var authClaims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            foreach (var role in userRoles)
            {
                authClaims.Add(new Claim(ClaimTypes.Role, role));
            }

            var authSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_jwtSettings.SecretKey)
            );

            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                claims: authClaims,
                signingCredentials: new SigningCredentials(
                    authSigningKey,
                    SecurityAlgorithms.HmacSha256
                )
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<RefreshToken> GenerateRefreshToken(string userId)
        {
            var refreshToken = new RefreshToken
            {
                Token = GenerateRandomToken(),
                UserId = userId,
                ExpiryDate = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false,
                IsUsed = false,
            };

            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return refreshToken;
        }

        public async Task<AuthResponseModel> RefreshToken(string refreshToken)
        {
            // Find the refresh token in the database
            var storedToken = await _context
                .RefreshTokens.Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

            if (storedToken == null)
            {
                return new AuthResponseModel { Success = false, Message = "Invalid refresh token" };
            }

            // Check if the token is used or revoked
            if (storedToken.IsUsed || storedToken.IsRevoked)
            {
                return new AuthResponseModel
                {
                    Success = false,
                    Message = "Refresh token has been used or revoked",
                };
            }

            // Check if the token is expired
            if (storedToken.ExpiryDate < DateTime.UtcNow)
            {
                return new AuthResponseModel
                {
                    Success = false,
                    Message = "Refresh token has expired",
                };
            }

            // Mark the current token as used
            storedToken.IsUsed = true;
            _context.RefreshTokens.Update(storedToken);

            // Generate new tokens
            var user = storedToken.User;
            if (user == null)
            {
                return new AuthResponseModel { Success = false, Message = "User not found" };
            }

            var newAccessToken = await GenerateJwtToken(user);
            var newRefreshToken = await GenerateRefreshToken(user.Id);

            await _context.SaveChangesAsync();

            return new AuthResponseModel
            {
                Success = true,
                Message = "Token refreshed successfully",
                Token = newAccessToken,
                RefreshToken = newRefreshToken.Token,
                Expiration = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                UserId = user.Id,
                Username = user.UserName,
                Email = user.Email,
            };
        }

        private string GenerateRandomToken()
        {
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
                return Convert.ToBase64String(randomBytes);
            }
        }
    }
}

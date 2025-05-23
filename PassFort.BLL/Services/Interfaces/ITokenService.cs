using System.Security.Claims;
using PassFort.DAL.Entities;
using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services.Interfaces
{
    public interface ITokenService
    {
        Task<string> GenerateJwtTokenAsync(ApplicationUser user);
        Task<RefreshToken> GenerateRefreshTokenAsync(string userId);
        Task<TokenResponseDto> RefreshTokenAsync(string refreshToken);
        Task<bool> RevokeTokenAsync(string refreshToken);
        Task<bool> RevokeAllUserTokensAsync(string userId);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
        string? GetTokenIdFromJwt(string token);
    }
}

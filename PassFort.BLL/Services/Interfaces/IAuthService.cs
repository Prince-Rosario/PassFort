using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services.Interfaces
{
    public interface IAuthService
    {
        Task<TokenResponseDto> RegisterAsync(RegisterRequestDto request);
        Task<TokenResponseDto> LoginAsync(LoginRequestDto request);
        Task<bool> LogoutAsync(string userId, string refreshToken, string jwtToken);
        Task<TokenResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request);
        Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequestDto request);
        Task<UserDto> GetUserAsync(string userId);
        Task<bool> RevokeAllTokensAsync(string userId);
    }
}

using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IRefreshTokenRepository
    {
        Task<RefreshToken?> GetByTokenAsync(string token);
        Task<RefreshToken?> GetByIdAsync(int id);
        Task<IEnumerable<RefreshToken>> GetByUserIdAsync(string userId);
        Task<RefreshToken> AddAsync(RefreshToken refreshToken);
        Task UpdateAsync(RefreshToken refreshToken);
        Task DeleteAsync(RefreshToken refreshToken);
        Task DeleteExpiredTokensAsync();
        Task RevokeAllUserTokensAsync(string userId);
    }
}

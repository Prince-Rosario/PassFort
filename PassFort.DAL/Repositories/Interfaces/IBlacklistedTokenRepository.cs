using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IBlacklistedTokenRepository
    {
        Task<bool> IsTokenBlacklistedAsync(string tokenId);
        Task<BlacklistedToken> AddAsync(BlacklistedToken blacklistedToken);
        Task DeleteExpiredTokensAsync();
        Task<IEnumerable<BlacklistedToken>> GetByUserIdAsync(string userId);
    }
}

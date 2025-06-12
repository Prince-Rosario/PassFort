using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class BlacklistedTokenRepository : IBlacklistedTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public BlacklistedTokenRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> IsTokenBlacklistedAsync(string tokenId)
        {
            return await _context.BlacklistedTokens.AnyAsync(bt =>
                bt.TokenId == tokenId && bt.ExpiryDate > DateTime.UtcNow
            );
        }

        public async Task<BlacklistedToken> AddAsync(BlacklistedToken blacklistedToken)
        {
            _context.BlacklistedTokens.Add(blacklistedToken);
            await _context.SaveChangesAsync();
            return blacklistedToken;
        }

        public async Task DeleteExpiredTokensAsync()
        {
            var expiredTokens = await _context
                .BlacklistedTokens.Where(bt => bt.ExpiryDate <= DateTime.UtcNow)
                .ToListAsync();

            _context.BlacklistedTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<BlacklistedToken>> GetByUserIdAsync(string userId)
        {
            return await _context
                .BlacklistedTokens.Where(bt => bt.UserId == userId)
                .OrderByDescending(bt => bt.BlacklistedAt)
                .ToListAsync();
        }
    }
}

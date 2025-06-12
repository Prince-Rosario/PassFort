using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public RefreshTokenRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<RefreshToken?> GetByTokenAsync(string token)
        {
            return await _context
                .RefreshTokens.Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == token);
        }

        public async Task<RefreshToken?> GetByIdAsync(int id)
        {
            return await _context
                .RefreshTokens.Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Id == id);
        }

        public async Task<IEnumerable<RefreshToken>> GetByUserIdAsync(string userId)
        {
            return await _context
                .RefreshTokens.Where(rt => rt.UserId == userId)
                .OrderByDescending(rt => rt.CreatedAt)
                .ToListAsync();
        }

        public async Task<RefreshToken> AddAsync(RefreshToken refreshToken)
        {
            _context.RefreshTokens.Add(refreshToken);
            await _context.SaveChangesAsync();
            return refreshToken;
        }

        public async Task UpdateAsync(RefreshToken refreshToken)
        {
            _context.RefreshTokens.Update(refreshToken);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(RefreshToken refreshToken)
        {
            _context.RefreshTokens.Remove(refreshToken);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteExpiredTokensAsync()
        {
            var expiredTokens = await _context
                .RefreshTokens.Where(rt => rt.ExpiryDate <= DateTime.UtcNow)
                .ToListAsync();

            _context.RefreshTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
        }

        public async Task RevokeAllUserTokensAsync(string userId)
        {
            var userTokens = await _context
                .RefreshTokens.Where(rt =>
                    rt.UserId == userId && !rt.IsRevoked && rt.ExpiryDate > DateTime.UtcNow
                )
                .ToListAsync();

            foreach (var token in userTokens)
            {
                token.IsRevoked = true;
                token.RevokedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}

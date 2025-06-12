using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class UserRecoveryCodeRepository : IUserRecoveryCodeRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRecoveryCodeRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UserRecoveryCode>> GetByUserIdAsync(string userId)
        {
            return await _context
                .UserRecoveryCodes.Where(rc => rc.UserId == userId)
                .OrderBy(rc => rc.CreatedAt)
                .ToListAsync();
        }

        public async Task<UserRecoveryCode?> GetByUserIdAndCodeAsync(string userId, string code)
        {
            return await _context.UserRecoveryCodes.FirstOrDefaultAsync(rc =>
                rc.UserId == userId && rc.Code == code && !rc.IsUsed
            );
        }

        public async Task<UserRecoveryCode> AddAsync(UserRecoveryCode recoveryCode)
        {
            _context.UserRecoveryCodes.Add(recoveryCode);
            await _context.SaveChangesAsync();
            return recoveryCode;
        }

        public async Task AddRangeAsync(IEnumerable<UserRecoveryCode> recoveryCodes)
        {
            _context.UserRecoveryCodes.AddRange(recoveryCodes);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(UserRecoveryCode recoveryCode)
        {
            _context.UserRecoveryCodes.Update(recoveryCode);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteByUserIdAsync(string userId)
        {
            var recoveryCodes = await _context
                .UserRecoveryCodes.Where(rc => rc.UserId == userId)
                .ToListAsync();

            _context.UserRecoveryCodes.RemoveRange(recoveryCodes);
            await _context.SaveChangesAsync();
        }

        public async Task<int> GetUnusedCountByUserIdAsync(string userId)
        {
            return await _context.UserRecoveryCodes.CountAsync(rc =>
                rc.UserId == userId && !rc.IsUsed
            );
        }
    }
}

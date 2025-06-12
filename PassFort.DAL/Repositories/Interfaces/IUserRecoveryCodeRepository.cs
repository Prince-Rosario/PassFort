using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IUserRecoveryCodeRepository
    {
        Task<IEnumerable<UserRecoveryCode>> GetByUserIdAsync(string userId);
        Task<UserRecoveryCode?> GetByUserIdAndCodeAsync(string userId, string code);
        Task<UserRecoveryCode> AddAsync(UserRecoveryCode recoveryCode);
        Task AddRangeAsync(IEnumerable<UserRecoveryCode> recoveryCodes);
        Task UpdateAsync(UserRecoveryCode recoveryCode);
        Task DeleteByUserIdAsync(string userId);
        Task<int> GetUnusedCountByUserIdAsync(string userId);
    }
}

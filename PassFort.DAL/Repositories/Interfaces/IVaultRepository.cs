using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IVaultRepository
    {
        Task<Vault?> GetByIdAsync(Guid id);
        Task<Vault?> GetByIdAndUserIdAsync(Guid id, string userId);
        Task<IEnumerable<Vault>> GetByUserIdAsync(string userId);
        Task<Vault> AddAsync(Vault vault);
        Task UpdateAsync(Vault vault);
        Task DeleteAsync(Vault vault);
        Task<bool> ExistsAsync(Guid id, string userId);
        Task<int> GetItemCountAsync(Guid vaultId);
        Task<int> GetFolderCountAsync(Guid vaultId);
    }
}

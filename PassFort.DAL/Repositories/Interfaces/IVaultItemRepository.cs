using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IVaultItemRepository
    {
        Task<VaultItem?> GetByIdAsync(Guid id);
        Task<VaultItem?> GetByIdAndVaultIdAsync(Guid id, Guid vaultId);
        Task<IEnumerable<VaultItem>> GetByVaultIdAsync(Guid vaultId);
        Task<IEnumerable<VaultItem>> GetByFolderIdAsync(Guid folderId);
        Task<IEnumerable<VaultItem>> GetByVaultIdAndTypeAsync(Guid vaultId, string itemType);
        Task<VaultItem> AddAsync(VaultItem vaultItem);
        Task UpdateAsync(VaultItem vaultItem);
        Task DeleteAsync(VaultItem vaultItem);
        Task<bool> ExistsAsync(Guid id, Guid vaultId);
        Task UpdateLastAccessedAsync(Guid id);
        Task<IEnumerable<VaultItem>> GetFavoritesAsync(Guid vaultId);
    }
}

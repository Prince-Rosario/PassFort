using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IVaultFolderRepository
    {
        Task<VaultFolder?> GetByIdAsync(Guid id);
        Task<VaultFolder?> GetByIdAndVaultIdAsync(Guid id, Guid vaultId);
        Task<IEnumerable<VaultFolder>> GetByVaultIdAsync(Guid vaultId);
        Task<IEnumerable<VaultFolder>> GetByParentFolderIdAsync(Guid parentFolderId);
        Task<IEnumerable<VaultFolder>> GetRootFoldersAsync(Guid vaultId);
        Task<VaultFolder> AddAsync(VaultFolder vaultFolder);
        Task UpdateAsync(VaultFolder vaultFolder);
        Task DeleteAsync(VaultFolder vaultFolder);
        Task<bool> ExistsAsync(Guid id, Guid vaultId);
        Task<int> GetItemCountAsync(Guid folderId);
        Task<int> GetSubFolderCountAsync(Guid folderId);
        Task<bool> HasSubFoldersAsync(Guid folderId);
        Task<bool> HasItemsAsync(Guid folderId);
    }
}

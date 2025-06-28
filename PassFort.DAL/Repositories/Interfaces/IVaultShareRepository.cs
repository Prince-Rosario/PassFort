using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface IVaultShareRepository
    {
        Task<VaultShare?> GetByIdAsync(Guid id);
        Task<VaultShare?> GetByVaultIdAndTeamIdAsync(Guid vaultId, Guid teamId);
        Task<IEnumerable<VaultShare>> GetByVaultIdAsync(Guid vaultId);
        Task<IEnumerable<VaultShare>> GetByTeamIdAsync(Guid teamId);
        Task<IEnumerable<VaultShare>> GetByUserIdAsync(string userId);
        Task<VaultShare> AddAsync(VaultShare vaultShare);
        Task UpdateAsync(VaultShare vaultShare);
        Task DeleteAsync(VaultShare vaultShare);
        Task<bool> ExistsAsync(Guid vaultId, Guid teamId);
        Task<bool> HasUserAccessToVaultAsync(Guid vaultId, string userId, VaultPermission? requiredPermission = null);
        Task<VaultPermission?> GetUserPermissionForVaultAsync(Guid vaultId, string userId);
        Task UpdateLastAccessedAsync(Guid vaultShareId);
        Task<int> GetSharedVaultCountByTeamAsync(Guid teamId);
    }
} 
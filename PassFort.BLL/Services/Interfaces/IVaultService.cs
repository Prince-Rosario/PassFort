using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services.Interfaces
{
    public interface IVaultService
    {
        // Vault Operations
        Task<CreateVaultResponseDto> CreateVaultAsync(string userId, CreateVaultRequestDto request);
        Task<VaultDto> GetVaultAsync(string userId, Guid vaultId);
        Task<IEnumerable<VaultSummaryDto>> GetUserVaultsAsync(string userId);
        Task<VaultDto> UpdateVaultAsync(string userId, UpdateVaultRequestDto request);
        Task<bool> DeleteVaultAsync(string userId, Guid vaultId);

        // Vault Item Operations
        Task<VaultItemDto> CreateVaultItemAsync(string userId, CreateVaultItemRequestDto request);
        Task<VaultItemDto> GetVaultItemAsync(string userId, Guid vaultId, Guid itemId);
        Task<IEnumerable<VaultItemDto>> GetVaultItemsAsync(string userId, Guid vaultId);
        Task<IEnumerable<VaultItemDto>> GetVaultItemsByTypeAsync(
            string userId,
            Guid vaultId,
            string itemType
        );
        Task<IEnumerable<VaultItemDto>> GetVaultItemsByFolderAsync(
            string userId,
            Guid vaultId,
            Guid folderId
        );
        Task<IEnumerable<VaultItemDto>> GetFavoriteItemsAsync(string userId, Guid vaultId);
        Task<VaultItemDto> UpdateVaultItemAsync(string userId, UpdateVaultItemRequestDto request);
        Task<bool> DeleteVaultItemAsync(string userId, Guid vaultId, Guid itemId);
        Task<bool> ToggleFavoriteAsync(string userId, Guid vaultId, Guid itemId);

        // Vault Folder Operations
        Task<VaultFolderDto> CreateVaultFolderAsync(
            string userId,
            CreateVaultFolderRequestDto request
        );
        Task<VaultFolderDto> GetVaultFolderAsync(string userId, Guid vaultId, Guid folderId);
        Task<IEnumerable<VaultFolderDto>> GetVaultFoldersAsync(string userId, Guid vaultId);
        Task<IEnumerable<VaultFolderDto>> GetRootFoldersAsync(string userId, Guid vaultId);
        Task<VaultFolderDto> UpdateVaultFolderAsync(
            string userId,
            UpdateVaultFolderRequestDto request
        );
        Task<bool> DeleteVaultFolderAsync(string userId, Guid vaultId, Guid folderId);
    }
}

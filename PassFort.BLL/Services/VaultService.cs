using PassFort.BLL.Mappers;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.DTOs;
using PassFort.DAL.Entities;

namespace PassFort.BLL.Services
{
    public class VaultService : IVaultService
    {
        private readonly IVaultRepository _vaultRepository;
        private readonly IVaultItemRepository _vaultItemRepository;
        private readonly IVaultFolderRepository _vaultFolderRepository;
        private readonly IVaultShareRepository _vaultShareRepository;

        public VaultService(
            IVaultRepository vaultRepository,
            IVaultItemRepository vaultItemRepository,
            IVaultFolderRepository vaultFolderRepository,
            IVaultShareRepository vaultShareRepository
        )
        {
            _vaultRepository = vaultRepository;
            _vaultItemRepository = vaultItemRepository;
            _vaultFolderRepository = vaultFolderRepository;
            _vaultShareRepository = vaultShareRepository;
        }

        #region Private Helper Methods

        /// <summary>
        /// Checks if a user has access to a vault (either as owner or through sharing)
        /// </summary>
        private async Task<bool> HasVaultAccessAsync(Guid vaultId, string userId, VaultPermission? requiredPermission = null)
        {
            // First check if user owns the vault
            if (await _vaultRepository.ExistsAsync(vaultId, userId))
            {
                return true; // Owner has all permissions
            }

            // Check if user has access through vault sharing
            return await _vaultShareRepository.HasUserAccessToVaultAsync(vaultId, userId, requiredPermission);
        }

        /// <summary>
        /// Gets the user's permission level for a vault
        /// </summary>
        private async Task<VaultPermission?> GetUserVaultPermissionAsync(Guid vaultId, string userId)
        {
            // First check if user owns the vault
            if (await _vaultRepository.ExistsAsync(vaultId, userId))
            {
                return VaultPermission.Admin; // Owner has admin permissions
            }

            // Check permission through vault sharing
            return await _vaultShareRepository.GetUserPermissionForVaultAsync(vaultId, userId);
        }

        #endregion

        #region Vault Operations

        public async Task<CreateVaultResponseDto> CreateVaultAsync(
            string userId,
            CreateVaultRequestDto request
        )
        {
            try
            {
                var vault = VaultMapper.ToEntity(request, userId);
                var createdVault = await _vaultRepository.AddAsync(vault);

                var vaultDto = VaultMapper.ToDto(createdVault, 0, 0);

                return new CreateVaultResponseDto
                {
                    Success = true,
                    Message = "Vault created successfully",
                    Vault = vaultDto,
                };
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to create vault: {ex.Message}", ex);
            }
        }

        public async Task<VaultDto> GetVaultAsync(string userId, Guid vaultId)
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            // If user owns the vault, get it normally
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(vaultId, userId);
            
            // If not owned, get by ID only (user has shared access)
            if (vault == null)
            {
                vault = await _vaultRepository.GetByIdAsync(vaultId);
                if (vault == null)
                {
                    throw new InvalidOperationException("Vault not found");
                }
            }

            // Get counts for display
            var itemCount = await _vaultRepository.GetItemCountAsync(vaultId);
            var folderCount = await _vaultRepository.GetFolderCountAsync(vaultId);

            return VaultMapper.ToDto(vault, itemCount, folderCount);
        }

        public async Task<IEnumerable<VaultSummaryDto>> GetUserVaultsAsync(string userId)
        {
            // Get owned vaults
            var ownedVaults = await _vaultRepository.GetByUserIdAsync(userId);
            var vaultSummaries = new List<VaultSummaryDto>();

            foreach (var vault in ownedVaults)
            {
                var itemCount = await _vaultRepository.GetItemCountAsync(vault.Id);
                var folderCount = await _vaultRepository.GetFolderCountAsync(vault.Id);
                vaultSummaries.Add(VaultMapper.ToSummaryDto(vault, itemCount, folderCount));
            }

            // Get shared vaults
            var sharedVaults = await _vaultShareRepository.GetByUserIdAsync(userId);
            foreach (var vaultShare in sharedVaults)
            {
                var vault = vaultShare.Vault;
                var itemCount = await _vaultRepository.GetItemCountAsync(vault.Id);
                var folderCount = await _vaultRepository.GetFolderCountAsync(vault.Id);
                var summary = VaultMapper.ToSummaryDto(vault, itemCount, folderCount);
                
                // Mark as shared and add permission info
                summary.IsShared = true;
                summary.SharedPermission = vaultShare.Permission.ToString();
                summary.SharedByUserEmail = vaultShare.SharedByUser?.Email;
                summary.SharedAt = vaultShare.SharedAt;
                summary.EncryptedVaultKey = vaultShare.EncryptedVaultKey; // Include encrypted vault key
                
                vaultSummaries.Add(summary);
            }

            return vaultSummaries;
        }

        public async Task<VaultDto> UpdateVaultAsync(string userId, UpdateVaultRequestDto request)
        {
            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(request.Id, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            var vault = await _vaultRepository.GetByIdAsync(request.Id);
            if (vault == null)
            {
                throw new InvalidOperationException("Vault not found");
            }

            VaultMapper.UpdateEntity(vault, request);
            await _vaultRepository.UpdateAsync(vault);

            // Get counts for display
            var itemCount = await _vaultRepository.GetItemCountAsync(vault.Id);
            var folderCount = await _vaultRepository.GetFolderCountAsync(vault.Id);

            return VaultMapper.ToDto(vault, itemCount, folderCount);
        }

        public async Task<bool> DeleteVaultAsync(string userId, Guid vaultId)
        {
            // Only vault owners can delete vaults
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(vaultId, userId);
            if (vault == null)
            {
                return false;
            }

            await _vaultRepository.DeleteAsync(vault);
            return true;
        }

        #endregion

        #region Vault Item Operations

        public async Task<VaultItemDto> CreateVaultItemAsync(
            string userId,
            CreateVaultItemRequestDto request
        )
        {
            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(request.VaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            // If folder is specified, verify it exists and belongs to the same vault
            if (request.FolderId.HasValue)
            {
                var folderExists = await _vaultFolderRepository.ExistsAsync(
                    request.FolderId.Value,
                    request.VaultId
                );
                if (!folderExists)
                {
                    throw new InvalidOperationException(
                        "Specified folder does not exist in this vault"
                    );
                }
            }

            var vaultItem = VaultMapper.ToEntity(request);
            var createdItem = await _vaultItemRepository.AddAsync(vaultItem);

            return VaultMapper.ToDto(createdItem);
        }

        public async Task<VaultItemDto> GetVaultItemAsync(string userId, Guid vaultId, Guid itemId)
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var item = await _vaultItemRepository.GetByIdAndVaultIdAsync(itemId, vaultId);
            if (item == null)
            {
                throw new InvalidOperationException("Vault item not found");
            }

            // Update last accessed time
            await _vaultItemRepository.UpdateLastAccessedAsync(itemId);

            return VaultMapper.ToDto(item);
        }

        public async Task<IEnumerable<VaultItemDto>> GetVaultItemsAsync(string userId, Guid vaultId)
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var items = await _vaultItemRepository.GetByVaultIdAsync(vaultId);
            return items.Select(VaultMapper.ToDto);
        }

        public async Task<IEnumerable<VaultItemDto>> GetVaultItemsByTypeAsync(
            string userId,
            Guid vaultId,
            string itemType
        )
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var items = await _vaultItemRepository.GetByVaultIdAndTypeAsync(vaultId, itemType);
            return items.Select(VaultMapper.ToDto);
        }

        public async Task<IEnumerable<VaultItemDto>> GetVaultItemsByFolderAsync(
            string userId,
            Guid vaultId,
            Guid folderId
        )
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            // Verify folder belongs to vault
            var folderExists = await _vaultFolderRepository.ExistsAsync(folderId, vaultId);
            if (!folderExists)
            {
                throw new InvalidOperationException("Folder not found in this vault");
            }

            var items = await _vaultItemRepository.GetByFolderIdAsync(folderId);
            return items.Select(VaultMapper.ToDto);
        }

        public async Task<IEnumerable<VaultItemDto>> GetFavoriteItemsAsync(
            string userId,
            Guid vaultId
        )
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var items = await _vaultItemRepository.GetFavoritesAsync(vaultId);
            return items.Select(VaultMapper.ToDto);
        }

        public async Task<VaultItemDto> UpdateVaultItemAsync(
            string userId,
            UpdateVaultItemRequestDto request
        )
        {
            var item = await _vaultItemRepository.GetByIdAsync(request.Id);
            if (item == null)
            {
                throw new InvalidOperationException("Vault item not found");
            }

            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(item.VaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            // If folder is specified, verify it exists and belongs to the same vault
            if (request.FolderId.HasValue)
            {
                var folderExists = await _vaultFolderRepository.ExistsAsync(
                    request.FolderId.Value,
                    item.VaultId
                );
                if (!folderExists)
                {
                    throw new InvalidOperationException(
                        "Specified folder does not exist in this vault"
                    );
                }
            }

            VaultMapper.UpdateEntity(item, request);
            await _vaultItemRepository.UpdateAsync(item);

            return VaultMapper.ToDto(item);
        }

        public async Task<bool> DeleteVaultItemAsync(string userId, Guid vaultId, Guid itemId)
        {
            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            var item = await _vaultItemRepository.GetByIdAndVaultIdAsync(itemId, vaultId);
            if (item == null)
            {
                return false;
            }

            await _vaultItemRepository.DeleteAsync(item);
            return true;
        }

        public async Task<bool> ToggleFavoriteAsync(string userId, Guid vaultId, Guid itemId)
        {
            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            var item = await _vaultItemRepository.GetByIdAndVaultIdAsync(itemId, vaultId);
            if (item == null)
            {
                return false;
            }

            item.IsFavorite = !item.IsFavorite;
            await _vaultItemRepository.UpdateAsync(item);
            return true;
        }

        #endregion

        #region Vault Folder Operations

        public async Task<VaultFolderDto> CreateVaultFolderAsync(
            string userId,
            CreateVaultFolderRequestDto request
        )
        {
            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(request.VaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            // If parent folder is specified, verify it exists and belongs to the same vault
            if (request.ParentFolderId.HasValue)
            {
                var parentExists = await _vaultFolderRepository.ExistsAsync(
                    request.ParentFolderId.Value,
                    request.VaultId
                );
                if (!parentExists)
                {
                    throw new InvalidOperationException(
                        "Specified parent folder does not exist in this vault"
                    );
                }
            }

            var folder = VaultMapper.ToEntity(request);
            var createdFolder = await _vaultFolderRepository.AddAsync(folder);

            return VaultMapper.ToDto(createdFolder, 0, 0);
        }

        public async Task<VaultFolderDto> GetVaultFolderAsync(
            string userId,
            Guid vaultId,
            Guid folderId
        )
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var folder = await _vaultFolderRepository.GetByIdAndVaultIdAsync(folderId, vaultId);
            if (folder == null)
            {
                throw new InvalidOperationException("Vault folder not found");
            }

            // Get counts for display
            var itemCount = await _vaultFolderRepository.GetItemCountAsync(folderId);
            var subFolderCount = await _vaultFolderRepository.GetSubFolderCountAsync(folderId);

            return VaultMapper.ToDto(folder, itemCount, subFolderCount);
        }

        public async Task<IEnumerable<VaultFolderDto>> GetVaultFoldersAsync(
            string userId,
            Guid vaultId
        )
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var folders = await _vaultFolderRepository.GetByVaultIdAsync(vaultId);
            var folderDtos = new List<VaultFolderDto>();

            foreach (var folder in folders)
            {
                var itemCount = await _vaultFolderRepository.GetItemCountAsync(folder.Id);
                var subFolderCount = await _vaultFolderRepository.GetSubFolderCountAsync(folder.Id);
                folderDtos.Add(VaultMapper.ToDto(folder, itemCount, subFolderCount));
            }

            return folderDtos;
        }

        public async Task<IEnumerable<VaultFolderDto>> GetRootFoldersAsync(
            string userId,
            Guid vaultId
        )
        {
            // Check if user has read access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Read))
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
            }

            var folders = await _vaultFolderRepository.GetRootFoldersAsync(vaultId);
            var folderDtos = new List<VaultFolderDto>();

            foreach (var folder in folders)
            {
                var itemCount = await _vaultFolderRepository.GetItemCountAsync(folder.Id);
                var subFolderCount = await _vaultFolderRepository.GetSubFolderCountAsync(folder.Id);
                folderDtos.Add(VaultMapper.ToDto(folder, itemCount, subFolderCount));
            }

            return folderDtos;
        }

        public async Task<VaultFolderDto> UpdateVaultFolderAsync(
            string userId,
            UpdateVaultFolderRequestDto request
        )
        {
            var folder = await _vaultFolderRepository.GetByIdAsync(request.Id);
            if (folder == null)
            {
                throw new InvalidOperationException("Vault folder not found");
            }

            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(folder.VaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            // If parent folder is specified, verify it exists, belongs to the same vault, and prevent circular references
            if (request.ParentFolderId.HasValue)
            {
                if (request.ParentFolderId.Value == request.Id)
                {
                    throw new InvalidOperationException("A folder cannot be its own parent");
                }

                var parentExists = await _vaultFolderRepository.ExistsAsync(
                    request.ParentFolderId.Value,
                    folder.VaultId
                );
                if (!parentExists)
                {
                    throw new InvalidOperationException(
                        "Specified parent folder does not exist in this vault"
                    );
                }
            }

            VaultMapper.UpdateEntity(folder, request);
            await _vaultFolderRepository.UpdateAsync(folder);

            // Get counts for display
            var itemCount = await _vaultFolderRepository.GetItemCountAsync(folder.Id);
            var subFolderCount = await _vaultFolderRepository.GetSubFolderCountAsync(folder.Id);

            return VaultMapper.ToDto(folder, itemCount, subFolderCount);
        }

        public async Task<bool> DeleteVaultFolderAsync(string userId, Guid vaultId, Guid folderId)
        {
            // Check if user has write access to the vault
            if (!await HasVaultAccessAsync(vaultId, userId, VaultPermission.Write))
            {
                throw new UnauthorizedAccessException("Vault not found or insufficient permissions");
            }

            var folder = await _vaultFolderRepository.GetByIdAndVaultIdAsync(folderId, vaultId);
            if (folder == null)
            {
                return false;
            }

            // Check if folder has subfolders or items
            var hasSubFolders = await _vaultFolderRepository.HasSubFoldersAsync(folderId);
            var hasItems = await _vaultFolderRepository.HasItemsAsync(folderId);

            if (hasSubFolders || hasItems)
            {
                throw new InvalidOperationException(
                    "Cannot delete folder that contains subfolders or items. Please move or delete the contents first."
                );
            }

            await _vaultFolderRepository.DeleteAsync(folder);
            return true;
        }

        #endregion
    }
}

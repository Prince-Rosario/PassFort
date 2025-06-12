using PassFort.BLL.Mappers;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services
{
    public class VaultService : IVaultService
    {
        private readonly IVaultRepository _vaultRepository;
        private readonly IVaultItemRepository _vaultItemRepository;
        private readonly IVaultFolderRepository _vaultFolderRepository;

        public VaultService(
            IVaultRepository vaultRepository,
            IVaultItemRepository vaultItemRepository,
            IVaultFolderRepository vaultFolderRepository
        )
        {
            _vaultRepository = vaultRepository;
            _vaultItemRepository = vaultItemRepository;
            _vaultFolderRepository = vaultFolderRepository;
        }

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
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(vaultId, userId);
            if (vault == null)
            {
                throw new InvalidOperationException("Vault not found");
            }

            // Get counts for display
            var itemCount = await _vaultRepository.GetItemCountAsync(vaultId);
            var folderCount = await _vaultRepository.GetFolderCountAsync(vaultId);

            return VaultMapper.ToDto(vault, itemCount, folderCount);
        }

        public async Task<IEnumerable<VaultSummaryDto>> GetUserVaultsAsync(string userId)
        {
            var vaults = await _vaultRepository.GetByUserIdAsync(userId);
            var vaultSummaries = new List<VaultSummaryDto>();

            foreach (var vault in vaults)
            {
                var itemCount = await _vaultRepository.GetItemCountAsync(vault.Id);
                var folderCount = await _vaultRepository.GetFolderCountAsync(vault.Id);
                vaultSummaries.Add(VaultMapper.ToSummaryDto(vault, itemCount, folderCount));
            }

            return vaultSummaries;
        }

        public async Task<VaultDto> UpdateVaultAsync(string userId, UpdateVaultRequestDto request)
        {
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(request.Id, userId);
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
            // Verify vault exists and belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(request.VaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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

            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(item.VaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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
            // Verify vault exists and belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(request.VaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
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

            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(folder.VaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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
            // Verify vault belongs to user
            var vaultExists = await _vaultRepository.ExistsAsync(vaultId, userId);
            if (!vaultExists)
            {
                throw new UnauthorizedAccessException("Vault not found or access denied");
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

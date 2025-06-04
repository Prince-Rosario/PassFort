using PassFort.DAL.Entities;
using PassFort.DTO.DTOs;

namespace PassFort.BLL.Mappers
{
    public static class VaultMapper
    {
        public static VaultDto ToDto(Vault vault, int itemCount = 0, int folderCount = 0)
        {
            return new VaultDto
            {
                Id = vault.Id,
                Name = vault.Name, // Already encrypted by client
                Description = vault.Description, // Already encrypted by client
                EncryptedData = vault.EncryptedData,
                CreatedAt = vault.CreatedAt,
                UpdatedAt = vault.UpdatedAt,
                ItemCount = itemCount,
                FolderCount = folderCount,
            };
        }

        public static VaultSummaryDto ToSummaryDto(
            Vault vault,
            int itemCount = 0,
            int folderCount = 0
        )
        {
            return new VaultSummaryDto
            {
                Id = vault.Id,
                Name = vault.Name, // Already encrypted by client
                CreatedAt = vault.CreatedAt,
                UpdatedAt = vault.UpdatedAt,
                ItemCount = itemCount,
                FolderCount = folderCount,
            };
        }

        public static Vault ToEntity(CreateVaultRequestDto dto, string userId)
        {
            return new Vault
            {
                UserId = userId,
                Name = dto.Name, // Client sends this encrypted
                Description = dto.Description, // Client sends this encrypted
                EncryptedData = dto.EncryptedData,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
        }

        public static void UpdateEntity(Vault vault, UpdateVaultRequestDto dto)
        {
            vault.Name = dto.Name; // Client sends this encrypted
            vault.Description = dto.Description; // Client sends this encrypted
            vault.EncryptedData = dto.EncryptedData;
            vault.UpdatedAt = DateTime.UtcNow;
        }

        // Vault Item Mappers
        public static VaultItemDto ToDto(VaultItem vaultItem)
        {
            return new VaultItemDto
            {
                Id = vaultItem.Id,
                VaultId = vaultItem.VaultId,
                FolderId = vaultItem.FolderId,
                ItemType = vaultItem.ItemType,
                EncryptedData = vaultItem.EncryptedData, // Encrypted by client
                SearchableTitle = vaultItem.SearchableTitle, // Encrypted by client
                CreatedAt = vaultItem.CreatedAt,
                UpdatedAt = vaultItem.UpdatedAt,
                IsFavorite = vaultItem.IsFavorite,
                LastAccessedAt = vaultItem.LastAccessedAt,
            };
        }

        public static VaultItem ToEntity(CreateVaultItemRequestDto dto)
        {
            return new VaultItem
            {
                VaultId = dto.VaultId,
                FolderId = dto.FolderId,
                ItemType = dto.ItemType,
                EncryptedData = dto.EncryptedData, // Client sends this encrypted
                SearchableTitle = dto.SearchableTitle, // Client sends this encrypted
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
        }

        public static void UpdateEntity(VaultItem vaultItem, UpdateVaultItemRequestDto dto)
        {
            vaultItem.FolderId = dto.FolderId;
            vaultItem.ItemType = dto.ItemType;
            vaultItem.EncryptedData = dto.EncryptedData; // Client sends this encrypted
            vaultItem.SearchableTitle = dto.SearchableTitle; // Client sends this encrypted
            vaultItem.UpdatedAt = DateTime.UtcNow;
        }

        // Vault Folder Mappers
        public static VaultFolderDto ToDto(
            VaultFolder vaultFolder,
            int itemCount = 0,
            int subFolderCount = 0
        )
        {
            return new VaultFolderDto
            {
                Id = vaultFolder.Id,
                VaultId = vaultFolder.VaultId,
                ParentFolderId = vaultFolder.ParentFolderId,
                EncryptedName = vaultFolder.EncryptedName, // Encrypted by client
                EncryptedDescription = vaultFolder.EncryptedDescription, // Encrypted by client
                CreatedAt = vaultFolder.CreatedAt,
                UpdatedAt = vaultFolder.UpdatedAt,
                ItemCount = itemCount,
                SubFolderCount = subFolderCount,
            };
        }

        public static VaultFolder ToEntity(CreateVaultFolderRequestDto dto)
        {
            return new VaultFolder
            {
                VaultId = dto.VaultId,
                ParentFolderId = dto.ParentFolderId,
                EncryptedName = dto.EncryptedName, // Client sends this encrypted
                EncryptedDescription = dto.EncryptedDescription, // Client sends this encrypted
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
        }

        public static void UpdateEntity(VaultFolder vaultFolder, UpdateVaultFolderRequestDto dto)
        {
            vaultFolder.ParentFolderId = dto.ParentFolderId;
            vaultFolder.EncryptedName = dto.EncryptedName; // Client sends this encrypted
            vaultFolder.EncryptedDescription = dto.EncryptedDescription; // Client sends this encrypted
            vaultFolder.UpdatedAt = DateTime.UtcNow;
        }
    }
}

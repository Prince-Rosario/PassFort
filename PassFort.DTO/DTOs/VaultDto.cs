using System.ComponentModel.DataAnnotations;

namespace PassFort.DTO.DTOs
{
    // Request DTOs
    public class CreateVaultRequestDto
    {
        [Required]
        [MaxLength(500)]
        public string Name { get; set; } = string.Empty; // Client should send this encrypted

        [MaxLength(1000)]
        public string? Description { get; set; } // Client should send this encrypted

        [Required]
        public string EncryptedData { get; set; } = string.Empty; // Contains encrypted vault metadata
    }

    public class UpdateVaultRequestDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Name { get; set; } = string.Empty; // Client should send this encrypted

        [MaxLength(1000)]
        public string? Description { get; set; } // Client should send this encrypted

        [Required]
        public string EncryptedData { get; set; } = string.Empty; // Contains encrypted vault metadata
    }

    // Response DTOs
    public class VaultDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty; // Encrypted
        public string? Description { get; set; } // Encrypted
        public string EncryptedData { get; set; } = string.Empty; // Encrypted vault metadata
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ItemCount { get; set; } // Number of items in vault (for display purposes)
        public int FolderCount { get; set; } // Number of folders in vault
    }

    public class VaultSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty; // Encrypted
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ItemCount { get; set; }
        public int FolderCount { get; set; }
    }

    public class CreateVaultResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public VaultDto? Vault { get; set; }
    }

    // Vault Item DTOs
    public class CreateVaultItemRequestDto
    {
        [Required]
        public Guid VaultId { get; set; }

        public Guid? FolderId { get; set; }

        [Required]
        public string ItemType { get; set; } = "Password"; // Password, Note, CreditCard, etc.

        [Required]
        public string EncryptedData { get; set; } = string.Empty; // All sensitive data encrypted

        [MaxLength(500)]
        public string? SearchableTitle { get; set; } // Encrypted searchable title
    }

    public class UpdateVaultItemRequestDto
    {
        [Required]
        public Guid Id { get; set; }

        public Guid? FolderId { get; set; }

        [Required]
        public string ItemType { get; set; } = "Password";

        [Required]
        public string EncryptedData { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? SearchableTitle { get; set; }
    }

    public class VaultItemDto
    {
        public Guid Id { get; set; }
        public Guid VaultId { get; set; }
        public Guid? FolderId { get; set; }
        public string ItemType { get; set; } = string.Empty;
        public string EncryptedData { get; set; } = string.Empty;
        public string? SearchableTitle { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsFavorite { get; set; }
        public DateTime? LastAccessedAt { get; set; }
    }

    // Vault Folder DTOs
    public class CreateVaultFolderRequestDto
    {
        [Required]
        public Guid VaultId { get; set; }

        public Guid? ParentFolderId { get; set; }

        [Required]
        [MaxLength(500)]
        public string EncryptedName { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? EncryptedDescription { get; set; }
    }

    public class UpdateVaultFolderRequestDto
    {
        [Required]
        public Guid Id { get; set; }

        public Guid? ParentFolderId { get; set; }

        [Required]
        [MaxLength(500)]
        public string EncryptedName { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? EncryptedDescription { get; set; }
    }

    public class VaultFolderDto
    {
        public Guid Id { get; set; }
        public Guid VaultId { get; set; }
        public Guid? ParentFolderId { get; set; }
        public string EncryptedName { get; set; } = string.Empty;
        public string? EncryptedDescription { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ItemCount { get; set; }
        public int SubFolderCount { get; set; }
    }
}

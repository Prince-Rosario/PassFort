using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PassFort.DAL.Entities
{
    public class VaultItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VaultId { get; set; }

        public Guid? FolderId { get; set; } // Optional folder organization

        [Required]
        public string ItemType { get; set; } = "Password"; // Password, Note, CreditCard, etc. (not encrypted for filtering)

        // Zero-Knowledge: All sensitive data encrypted client-side
        [Required]
        public string EncryptedData { get; set; } = string.Empty; // Contains all encrypted item data (title, username, password, notes, etc.)

        [MaxLength(500)]
        public string? SearchableTitle { get; set; } // Encrypted searchable title for client-side search

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Fields for security
        public bool IsFavorite { get; set; } = false;
        public DateTime? LastAccessedAt { get; set; }

        // Navigation properties
        [ForeignKey(nameof(VaultId))]
        public virtual Vault Vault { get; set; } = null!;

        [ForeignKey(nameof(FolderId))]
        public virtual VaultFolder? Folder { get; set; }
    }
}

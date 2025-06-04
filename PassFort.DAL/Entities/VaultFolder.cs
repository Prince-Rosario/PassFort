using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PassFort.DAL.Entities
{
    public class VaultFolder
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VaultId { get; set; }

        public Guid? ParentFolderId { get; set; } // For nested folders

        // Zero-Knowledge: Folder name is encrypted client-side
        [Required]
        [MaxLength(500)]
        public string EncryptedName { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? EncryptedDescription { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(VaultId))]
        public virtual Vault Vault { get; set; } = null!;

        [ForeignKey(nameof(ParentFolderId))]
        public virtual VaultFolder? ParentFolder { get; set; }

        public virtual ICollection<VaultFolder> SubFolders { get; set; } = new List<VaultFolder>();
        public virtual ICollection<VaultItem> VaultItems { get; set; } = new List<VaultItem>();
    }
}

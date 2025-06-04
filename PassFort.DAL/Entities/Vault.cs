using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PassFort.DAL.Entities
{
    public class Vault
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Name { get; set; } = string.Empty; // Encrypted client-side

        [MaxLength(1000)]
        public string? Description { get; set; } // Encrypted client-side

        // Zero-Knowledge: All vault data is encrypted with user's master key
        [Required]
        public string EncryptedData { get; set; } = string.Empty; // Contains encrypted vault metadata

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser User { get; set; } = null!;

        public virtual ICollection<VaultItem> VaultItems { get; set; } = new List<VaultItem>();
        public virtual ICollection<VaultFolder> VaultFolders { get; set; } =
            new List<VaultFolder>();
    }
}

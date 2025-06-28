using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PassFort.DAL.Entities
{
    public enum VaultPermission
    {
        Read = 0,
        Write = 1,
        Admin = 2 // Can manage sharing and delete vault
    }

    public class VaultShare
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid VaultId { get; set; }

        [Required]
        public Guid TeamId { get; set; }

        [Required]
        public VaultPermission Permission { get; set; } = VaultPermission.Read;

        [Required]
        public string SharedByUserId { get; set; } = string.Empty; // Who shared the vault

        public DateTime SharedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastAccessedAt { get; set; }

        // Encrypted vault key for this team (encrypted with team key)
        [Required]
        public string EncryptedVaultKey { get; set; } = string.Empty;

        // Navigation properties
        [ForeignKey(nameof(VaultId))]
        public virtual Vault Vault { get; set; } = null!;

        [ForeignKey(nameof(TeamId))]
        public virtual Team Team { get; set; } = null!;

        [ForeignKey(nameof(SharedByUserId))]
        public virtual ApplicationUser SharedByUser { get; set; } = null!;
    }
} 
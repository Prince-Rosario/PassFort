using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Entities;

namespace PassFort.DAL.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<BlacklistedToken> BlacklistedTokens { get; set; }
        public DbSet<UserRecoveryCode> UserRecoveryCodes { get; set; }
        public DbSet<Vault> Vaults { get; set; }
        public DbSet<VaultItem> VaultItems { get; set; }
        public DbSet<VaultFolder> VaultFolders { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure RefreshToken
            builder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
                entity.Property(e => e.UserId).IsRequired();
                entity.HasIndex(e => e.Token).IsUnique();
                entity.HasIndex(e => e.UserId);

                entity
                    .HasOne(e => e.User)
                    .WithMany(u => u.RefreshTokens)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure BlacklistedToken
            builder.Entity<BlacklistedToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.TokenId).IsRequired().HasMaxLength(100);
                entity.Property(e => e.UserId).IsRequired();
                entity.HasIndex(e => e.TokenId).IsUnique();
                entity.HasIndex(e => e.UserId);

                entity
                    .HasOne(e => e.User)
                    .WithMany(u => u.BlacklistedTokens)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure UserRecoveryCode
            builder.Entity<UserRecoveryCode>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
                entity.Property(e => e.UserId).IsRequired();
                entity.HasIndex(e => new { e.UserId, e.Code }).IsUnique();

                entity
                    .HasOne(e => e.User)
                    .WithMany(u => u.RecoveryCodes)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure ApplicationUser additional properties
            builder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(e => e.MasterPasswordHash).HasMaxLength(500);
                entity.Property(e => e.MasterPasswordSalt).HasMaxLength(500);
                entity.Property(e => e.RecoveryKey).HasMaxLength(500);
                entity.Property(e => e.TwoFactorSecretKey).HasMaxLength(500);
            });

            // Configure Vault
            builder.Entity<Vault>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.EncryptedData).IsRequired();
                entity.Property(e => e.UserId).IsRequired();
                entity.HasIndex(e => e.UserId);

                entity
                    .HasOne(e => e.User)
                    .WithMany(u => u.Vaults)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure VaultItem
            builder.Entity<VaultItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ItemType).IsRequired();
                entity.Property(e => e.EncryptedData).IsRequired();
                entity.Property(e => e.SearchableTitle).HasMaxLength(500);
                entity.HasIndex(e => e.VaultId);
                entity.HasIndex(e => e.FolderId);

                entity
                    .HasOne(e => e.Vault)
                    .WithMany(v => v.VaultItems)
                    .HasForeignKey(e => e.VaultId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity
                    .HasOne(e => e.Folder)
                    .WithMany(f => f.VaultItems)
                    .HasForeignKey(e => e.FolderId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Configure VaultFolder
            builder.Entity<VaultFolder>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.EncryptedName).IsRequired().HasMaxLength(500);
                entity.Property(e => e.EncryptedDescription).HasMaxLength(1000);
                entity.HasIndex(e => e.VaultId);
                entity.HasIndex(e => e.ParentFolderId);

                entity
                    .HasOne(e => e.Vault)
                    .WithMany(v => v.VaultFolders)
                    .HasForeignKey(e => e.VaultId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity
                    .HasOne(e => e.ParentFolder)
                    .WithMany(f => f.SubFolders)
                    .HasForeignKey(e => e.ParentFolderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}

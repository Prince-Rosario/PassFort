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
        }
    }
}

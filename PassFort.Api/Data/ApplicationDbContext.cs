using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PassFort.Api.Models;

namespace PassFort.Api.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<BlacklistedToken> BlacklistedTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure RefreshToken relationships
            builder
                .Entity<RefreshToken>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure index on BlacklistedToken token for faster lookups
            builder.Entity<BlacklistedToken>().HasIndex(b => b.Token);

            // Configure index on BlacklistedToken expiry date for cleanup
            builder.Entity<BlacklistedToken>().HasIndex(b => b.ExpiryDate);
        }
    }
}

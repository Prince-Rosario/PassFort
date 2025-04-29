using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using PassFort.Api.Data;
using PassFort.Api.Models;

namespace PassFort.Api.Services
{
    public class TokenBlacklistService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(1);

        public TokenBlacklistService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        public async Task<bool> IsTokenBlacklisted(string token)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            return await dbContext.BlacklistedTokens.AnyAsync(b => b.Token == token);
        }

        public async Task BlacklistTokenAsync(string token)
        {
            if (string.IsNullOrEmpty(token))
                return;

            // Parse the token to get its expiry date
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(token);

            var expiryDate = jwtToken.ValidTo;

            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Check if the token is already blacklisted
            var existingToken = await dbContext.BlacklistedTokens.FirstOrDefaultAsync(b =>
                b.Token == token
            );

            if (existingToken != null)
                return;

            // Add the token to the blacklist
            var blacklistedToken = new BlacklistedToken
            {
                Token = token,
                ExpiryDate = expiryDate,
                BlacklistedAt = DateTime.UtcNow,
            };

            await dbContext.BlacklistedTokens.AddAsync(blacklistedToken);
            await dbContext.SaveChangesAsync();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await RemoveExpiredTokensAsync();
                await Task.Delay(_cleanupInterval, stoppingToken);
            }
        }

        private async Task RemoveExpiredTokensAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTime.UtcNow;
            var expiredTokens = await dbContext
                .BlacklistedTokens.Where(b => b.ExpiryDate < now)
                .ToListAsync();

            if (expiredTokens.Any())
            {
                dbContext.BlacklistedTokens.RemoveRange(expiredTokens);
                await dbContext.SaveChangesAsync();
            }
        }
    }
}

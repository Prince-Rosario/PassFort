using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class VaultShareRepository : IVaultShareRepository
    {
        private readonly ApplicationDbContext _context;

        public VaultShareRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<VaultShare?> GetByIdAsync(Guid id)
        {
            return await _context.VaultShares
                .Include(vs => vs.Vault)
                .Include(vs => vs.Team)
                    .ThenInclude(t => t.AdminUser)
                .Include(vs => vs.SharedByUser)
                .FirstOrDefaultAsync(vs => vs.Id == id);
        }

        public async Task<VaultShare?> GetByVaultIdAndTeamIdAsync(Guid vaultId, Guid teamId)
        {
            return await _context.VaultShares
                .Include(vs => vs.Vault)
                .Include(vs => vs.Team)
                .Include(vs => vs.SharedByUser)
                .FirstOrDefaultAsync(vs => vs.VaultId == vaultId && vs.TeamId == teamId);
        }

        public async Task<IEnumerable<VaultShare>> GetByVaultIdAsync(Guid vaultId)
        {
            return await _context.VaultShares
                .Include(vs => vs.Team)
                    .ThenInclude(t => t.AdminUser)
                .Include(vs => vs.SharedByUser)
                .Where(vs => vs.VaultId == vaultId)
                .OrderBy(vs => vs.Team.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<VaultShare>> GetByTeamIdAsync(Guid teamId)
        {
            return await _context.VaultShares
                .Include(vs => vs.Vault)
                    .ThenInclude(v => v.User)
                .Include(vs => vs.SharedByUser)
                .Where(vs => vs.TeamId == teamId)
                .OrderBy(vs => vs.Vault.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<VaultShare>> GetByUserIdAsync(string userId)
        {
            return await _context.VaultShares
                .Include(vs => vs.Vault)
                    .ThenInclude(v => v.User)
                .Include(vs => vs.Team)
                    .ThenInclude(t => t.AdminUser)
                .Include(vs => vs.SharedByUser)
                .Where(vs => vs.Team.AdminUserId == userId ||
                            vs.Team.TeamMembers.Any(tm => tm.UserId == userId && !tm.IsInvitePending))
                .OrderBy(vs => vs.Vault.Name)
                .ToListAsync();
        }

        public async Task<VaultShare> AddAsync(VaultShare vaultShare)
        {
            _context.VaultShares.Add(vaultShare);
            await _context.SaveChangesAsync();
            return vaultShare;
        }

        public async Task UpdateAsync(VaultShare vaultShare)
        {
            _context.VaultShares.Update(vaultShare);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(VaultShare vaultShare)
        {
            _context.VaultShares.Remove(vaultShare);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid vaultId, Guid teamId)
        {
            return await _context.VaultShares
                .AnyAsync(vs => vs.VaultId == vaultId && vs.TeamId == teamId);
        }

        public async Task<bool> HasUserAccessToVaultAsync(Guid vaultId, string userId, VaultPermission? requiredPermission = null)
        {
            var query = _context.VaultShares
                .Where(vs => vs.VaultId == vaultId &&
                            (vs.Team.AdminUserId == userId ||
                             vs.Team.TeamMembers.Any(tm => tm.UserId == userId && !tm.IsInvitePending)));

            if (requiredPermission.HasValue)
            {
                query = query.Where(vs => vs.Permission >= requiredPermission.Value);
            }

            return await query.AnyAsync();
        }

        public async Task<VaultPermission?> GetUserPermissionForVaultAsync(Guid vaultId, string userId)
        {
            var vaultShare = await _context.VaultShares
                .Where(vs => vs.VaultId == vaultId &&
                            (vs.Team.AdminUserId == userId ||
                             vs.Team.TeamMembers.Any(tm => tm.UserId == userId && !tm.IsInvitePending)))
                .OrderByDescending(vs => vs.Permission)
                .FirstOrDefaultAsync();

            return vaultShare?.Permission;
        }

        public async Task UpdateLastAccessedAsync(Guid vaultShareId)
        {
            var vaultShare = await _context.VaultShares.FindAsync(vaultShareId);
            if (vaultShare != null)
            {
                vaultShare.LastAccessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetSharedVaultCountByTeamAsync(Guid teamId)
        {
            return await _context.VaultShares
                .CountAsync(vs => vs.TeamId == teamId);
        }
    }
} 
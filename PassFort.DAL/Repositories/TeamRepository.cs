using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class TeamRepository : ITeamRepository
    {
        private readonly ApplicationDbContext _context;

        public TeamRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Team?> GetByIdAsync(Guid id)
        {
            return await _context.Teams.FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<Team?> GetByIdWithMembersAsync(Guid id)
        {
            return await _context.Teams
                .Include(t => t.AdminUser)
                .Include(t => t.TeamMembers)
                    .ThenInclude(tm => tm.User)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<Team?> GetByIdWithDetailsAsync(Guid id)
        {
            return await _context.Teams
                .Include(t => t.AdminUser)
                .Include(t => t.TeamMembers)
                    .ThenInclude(tm => tm.User)
                .Include(t => t.TeamMembers)
                    .ThenInclude(tm => tm.InvitedByUser)
                .Include(t => t.SharedVaults)
                    .ThenInclude(vs => vs.Vault)
                .Include(t => t.SharedVaults)
                    .ThenInclude(vs => vs.SharedByUser)
                .FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<IEnumerable<Team>> GetByAdminUserIdAsync(string adminUserId)
        {
            return await _context.Teams
                .Where(t => t.AdminUserId == adminUserId)
                .OrderBy(t => t.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<Team>> GetTeamsByUserIdAsync(string userId)
        {
            return await _context.Teams
                .Where(t => t.AdminUserId == userId || 
                           t.TeamMembers.Any(tm => tm.UserId == userId && !tm.IsInvitePending))
                .Include(t => t.AdminUser)
                .OrderBy(t => t.Name)
                .ToListAsync();
        }

        public async Task<Team> AddAsync(Team team)
        {
            _context.Teams.Add(team);
            await _context.SaveChangesAsync();
            return team;
        }

        public async Task UpdateAsync(Team team)
        {
            team.UpdatedAt = DateTime.UtcNow;
            _context.Teams.Update(team);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Team team)
        {
            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid id)
        {
            return await _context.Teams.AnyAsync(t => t.Id == id);
        }

        public async Task<bool> IsUserTeamAdminAsync(Guid teamId, string userId)
        {
            return await _context.Teams
                .AnyAsync(t => t.Id == teamId && t.AdminUserId == userId);
        }

        public async Task<bool> IsUserTeamMemberAsync(Guid teamId, string userId)
        {
            return await _context.Teams
                .AnyAsync(t => t.Id == teamId && 
                              (t.AdminUserId == userId || 
                               t.TeamMembers.Any(tm => tm.UserId == userId && !tm.IsInvitePending)));
        }
    }
} 
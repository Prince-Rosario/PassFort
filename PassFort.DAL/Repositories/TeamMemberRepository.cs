using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class TeamMemberRepository : ITeamMemberRepository
    {
        private readonly ApplicationDbContext _context;

        public TeamMemberRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<TeamMember?> GetByIdAsync(Guid id)
        {
            return await _context.TeamMembers
                .Include(tm => tm.User)
                .Include(tm => tm.Team)
                .Include(tm => tm.InvitedByUser)
                .FirstOrDefaultAsync(tm => tm.Id == id);
        }

        public async Task<TeamMember?> GetByTeamIdAndUserIdAsync(Guid teamId, string userId)
        {
            return await _context.TeamMembers
                .Include(tm => tm.User)
                .Include(tm => tm.Team)
                .Include(tm => tm.InvitedByUser)
                .FirstOrDefaultAsync(tm => tm.TeamId == teamId && tm.UserId == userId);
        }

        public async Task<TeamMember?> GetByInviteTokenAsync(string inviteToken)
        {
            return await _context.TeamMembers
                .Include(tm => tm.User)
                .Include(tm => tm.Team)
                .Include(tm => tm.InvitedByUser)
                .FirstOrDefaultAsync(tm => tm.InviteToken == inviteToken && 
                                          tm.IsInvitePending && 
                                          tm.InviteExpiresAt > DateTime.UtcNow);
        }

        public async Task<IEnumerable<TeamMember>> GetByTeamIdAsync(Guid teamId)
        {
            return await _context.TeamMembers
                .Include(tm => tm.User)
                .Include(tm => tm.InvitedByUser)
                .Where(tm => tm.TeamId == teamId)
                .OrderBy(tm => tm.User.Email)
                .ToListAsync();
        }

        public async Task<IEnumerable<TeamMember>> GetByUserIdAsync(string userId)
        {
            return await _context.TeamMembers
                .Include(tm => tm.Team)
                    .ThenInclude(t => t.AdminUser)
                .Include(tm => tm.InvitedByUser)
                .Where(tm => tm.UserId == userId)
                .OrderBy(tm => tm.Team.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<TeamMember>> GetPendingInvitesByUserIdAsync(string userId)
        {
            return await _context.TeamMembers
                .Include(tm => tm.Team)
                    .ThenInclude(t => t.AdminUser)
                .Include(tm => tm.InvitedByUser)
                .Where(tm => tm.UserId == userId && 
                            tm.IsInvitePending && 
                            tm.InviteExpiresAt > DateTime.UtcNow)
                .OrderBy(tm => tm.Team.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<TeamMember>> GetPendingInvitesByTeamIdAsync(Guid teamId)
        {
            return await _context.TeamMembers
                .Include(tm => tm.User)
                .Include(tm => tm.InvitedByUser)
                .Where(tm => tm.TeamId == teamId && 
                            tm.IsInvitePending && 
                            tm.InviteExpiresAt > DateTime.UtcNow)
                .OrderBy(tm => tm.User.Email)
                .ToListAsync();
        }

        public async Task<TeamMember> AddAsync(TeamMember teamMember)
        {
            _context.TeamMembers.Add(teamMember);
            await _context.SaveChangesAsync();
            return teamMember;
        }

        public async Task UpdateAsync(TeamMember teamMember)
        {
            _context.TeamMembers.Update(teamMember);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(TeamMember teamMember)
        {
            _context.TeamMembers.Remove(teamMember);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid teamId, string userId)
        {
            return await _context.TeamMembers
                .AnyAsync(tm => tm.TeamId == teamId && tm.UserId == userId);
        }

        public async Task<int> GetMemberCountAsync(Guid teamId)
        {
            return await _context.TeamMembers
                .CountAsync(tm => tm.TeamId == teamId && !tm.IsInvitePending);
        }

        public async Task UpdateLastActivityAsync(Guid teamMemberId)
        {
            var teamMember = await _context.TeamMembers.FindAsync(teamMemberId);
            if (teamMember != null)
            {
                teamMember.LastActivityAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteExpiredInvitesAsync()
        {
            var expiredInvites = await _context.TeamMembers
                .Where(tm => tm.IsInvitePending && tm.InviteExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            if (expiredInvites.Any())
            {
                _context.TeamMembers.RemoveRange(expiredInvites);
                await _context.SaveChangesAsync();
            }
        }
    }
} 
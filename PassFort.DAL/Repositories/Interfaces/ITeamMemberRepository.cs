using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface ITeamMemberRepository
    {
        Task<TeamMember?> GetByIdAsync(Guid id);
        Task<TeamMember?> GetByTeamIdAndUserIdAsync(Guid teamId, string userId);
        Task<TeamMember?> GetByInviteTokenAsync(string inviteToken);
        Task<IEnumerable<TeamMember>> GetByTeamIdAsync(Guid teamId);
        Task<IEnumerable<TeamMember>> GetByUserIdAsync(string userId);
        Task<IEnumerable<TeamMember>> GetPendingInvitesByUserIdAsync(string userId);
        Task<IEnumerable<TeamMember>> GetPendingInvitesByTeamIdAsync(Guid teamId);
        Task<TeamMember> AddAsync(TeamMember teamMember);
        Task UpdateAsync(TeamMember teamMember);
        Task DeleteAsync(TeamMember teamMember);
        Task<bool> ExistsAsync(Guid teamId, string userId);
        Task<int> GetMemberCountAsync(Guid teamId);
        Task UpdateLastActivityAsync(Guid teamMemberId);
        Task DeleteExpiredInvitesAsync();
    }
} 
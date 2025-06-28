using PassFort.DAL.Entities;

namespace PassFort.DAL.Repositories.Interfaces
{
    public interface ITeamRepository
    {
        Task<Team?> GetByIdAsync(Guid id);
        Task<Team?> GetByIdWithMembersAsync(Guid id);
        Task<Team?> GetByIdWithDetailsAsync(Guid id);
        Task<IEnumerable<Team>> GetByAdminUserIdAsync(string adminUserId);
        Task<IEnumerable<Team>> GetTeamsByUserIdAsync(string userId);
        Task<Team> AddAsync(Team team);
        Task UpdateAsync(Team team);
        Task DeleteAsync(Team team);
        Task<bool> ExistsAsync(Guid id);
        Task<bool> IsUserTeamAdminAsync(Guid teamId, string userId);
        Task<bool> IsUserTeamMemberAsync(Guid teamId, string userId);
    }
} 
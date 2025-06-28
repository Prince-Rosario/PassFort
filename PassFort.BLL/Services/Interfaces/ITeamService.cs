using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services.Interfaces
{
    public interface ITeamService
    {
        // Team operations
        Task<TeamDto> CreateTeamAsync(string adminUserId, CreateTeamRequestDto request);
        Task<TeamDto?> GetTeamByIdAsync(Guid teamId, string userId);
        Task<IEnumerable<TeamDto>> GetUserTeamsAsync(string userId);
        Task<TeamDto> UpdateTeamAsync(string userId, UpdateTeamRequestDto request);
        Task<bool> DeleteTeamAsync(Guid teamId, string userId);
        
        // Team member operations
        Task<TeamMemberDto> InviteTeamMemberAsync(string inviterUserId, InviteTeamMemberRequestDto request);
        Task<TeamMemberDto> AcceptTeamInviteAsync(string userId, AcceptTeamInviteRequestDto request);
        Task<bool> RemoveTeamMemberAsync(Guid teamMemberId, string userId);
        Task<TeamMemberDto> UpdateTeamMemberRoleAsync(string userId, UpdateTeamMemberRoleRequestDto request);
        Task<IEnumerable<TeamMemberDto>> GetTeamMembersAsync(Guid teamId, string userId);
        Task<IEnumerable<TeamMemberDto>> GetPendingInvitesAsync(Guid teamId, string userId);
        Task<IEnumerable<TeamMemberDto>> GetUserPendingInvitesAsync(string userId);
        
        // Vault sharing operations
        Task<VaultShareDto> ShareVaultAsync(string userId, ShareVaultRequestDto request);
        Task<bool> UnshareVaultAsync(Guid vaultShareId, string userId);
        Task<VaultShareDto> UpdateVaultSharePermissionAsync(string userId, UpdateVaultSharePermissionRequestDto request);
        Task<IEnumerable<VaultShareDto>> GetVaultSharesAsync(Guid vaultId, string userId);
        Task<IEnumerable<VaultShareDto>> GetSharedVaultsAsync(string userId);
        
        // Permission checks
        Task<bool> HasTeamPermissionAsync(Guid teamId, string userId, string permission);
        Task<bool> HasVaultPermissionAsync(Guid vaultId, string userId, string permission);
        Task<bool> IsUserTeamAdminAsync(Guid teamId, string userId);
        Task<bool> IsUserTeamMemberAsync(Guid teamId, string userId);
    }
} 
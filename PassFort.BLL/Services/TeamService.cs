using Microsoft.AspNetCore.Identity;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.DTOs;
using System.Security.Cryptography;
using System.Text;

namespace PassFort.BLL.Services
{
    public class TeamService : ITeamService
    {
        private readonly ITeamRepository _teamRepository;
        private readonly ITeamMemberRepository _teamMemberRepository;
        private readonly IVaultShareRepository _vaultShareRepository;
        private readonly IVaultRepository _vaultRepository;
        private readonly UserManager<ApplicationUser> _userManager;

        public TeamService(
            ITeamRepository teamRepository,
            ITeamMemberRepository teamMemberRepository,
            IVaultShareRepository vaultShareRepository,
            IVaultRepository vaultRepository,
            UserManager<ApplicationUser> userManager)
        {
            _teamRepository = teamRepository;
            _teamMemberRepository = teamMemberRepository;
            _vaultShareRepository = vaultShareRepository;
            _vaultRepository = vaultRepository;
            _userManager = userManager;
        }

        #region Team Operations

        public async Task<TeamDto> CreateTeamAsync(string adminUserId, CreateTeamRequestDto request)
        {
            var team = new Team
            {
                Name = request.Name,
                Description = request.Description,
                AdminUserId = adminUserId
            };

            var createdTeam = await _teamRepository.AddAsync(team);
            return await MapToTeamDtoAsync(createdTeam);
        }

        public async Task<TeamDto?> GetTeamByIdAsync(Guid teamId, string userId)
        {
            var team = await _teamRepository.GetByIdWithDetailsAsync(teamId);
            if (team == null)
                return null;

            // Check if user has access to this team
            var hasAccess = await IsUserTeamMemberAsync(teamId, userId);
            if (!hasAccess)
                throw new UnauthorizedAccessException("You don't have access to this team");

            return await MapToTeamDtoAsync(team);
        }

        public async Task<IEnumerable<TeamDto>> GetUserTeamsAsync(string userId)
        {
            var teams = await _teamRepository.GetTeamsByUserIdAsync(userId);
            var teamDtos = new List<TeamDto>();

            foreach (var team in teams)
            {
                teamDtos.Add(await MapToTeamDtoAsync(team));
            }

            return teamDtos;
        }

        public async Task<TeamDto> UpdateTeamAsync(string userId, UpdateTeamRequestDto request)
        {
            var team = await _teamRepository.GetByIdAsync(request.Id);
            if (team == null)
                throw new InvalidOperationException("Team not found");

            // Only team admin can update team details
            if (!await IsUserTeamAdminAsync(request.Id, userId))
                throw new UnauthorizedAccessException("Only team admin can update team details");

            team.Name = request.Name;
            team.Description = request.Description;

            await _teamRepository.UpdateAsync(team);
            return await MapToTeamDtoAsync(team);
        }

        public async Task<bool> DeleteTeamAsync(Guid teamId, string userId)
        {
            var team = await _teamRepository.GetByIdAsync(teamId);
            if (team == null)
                return false;

            // Only team admin can delete team
            if (!await IsUserTeamAdminAsync(teamId, userId))
                throw new UnauthorizedAccessException("Only team admin can delete team");

            await _teamRepository.DeleteAsync(team);
            return true;
        }

        #endregion

        #region Team Member Operations

        public async Task<TeamMemberDto> InviteTeamMemberAsync(string inviterUserId, InviteTeamMemberRequestDto request)
        {
            // Verify team exists and user is admin
            var team = await _teamRepository.GetByIdAsync(request.TeamId);
            if (team == null)
                throw new InvalidOperationException("Team not found");

            if (!await IsUserTeamAdminAsync(request.TeamId, inviterUserId))
                throw new UnauthorizedAccessException("Only team admin can invite members");

            // Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
                throw new InvalidOperationException("User not found");

            // Check if user is already a member
            var existingMember = await _teamMemberRepository.GetByTeamIdAndUserIdAsync(request.TeamId, user.Id);
            if (existingMember != null)
                throw new InvalidOperationException("User is already a team member or has a pending invite");

            // Create team member with pending invite
            var teamMember = new TeamMember
            {
                TeamId = request.TeamId,
                UserId = user.Id,
                Role = request.Role,
                IsInvitePending = true,
                InviteToken = GenerateInviteToken(),
                InviteExpiresAt = DateTime.UtcNow.AddDays(7), // 7 days to accept
                InvitedByUserId = inviterUserId
            };

            var createdMember = await _teamMemberRepository.AddAsync(teamMember);
            return await MapToTeamMemberDtoAsync(createdMember);
        }

        public async Task<TeamMemberDto> AcceptTeamInviteAsync(string userId, AcceptTeamInviteRequestDto request)
        {
            var teamMember = await _teamMemberRepository.GetByInviteTokenAsync(request.InviteToken);
            if (teamMember == null)
                throw new InvalidOperationException("Invalid or expired invite token");

            if (teamMember.UserId != userId)
                throw new UnauthorizedAccessException("This invite is not for you");

            // Accept the invite
            teamMember.IsInvitePending = false;
            teamMember.InviteToken = null;
            teamMember.InviteExpiresAt = null;

            await _teamMemberRepository.UpdateAsync(teamMember);
            return await MapToTeamMemberDtoAsync(teamMember);
        }

        public async Task<bool> RemoveTeamMemberAsync(Guid teamMemberId, string userId)
        {
            var teamMember = await _teamMemberRepository.GetByIdAsync(teamMemberId);
            if (teamMember == null)
                return false;

            // Only team admin or the member themselves can remove membership
            var isAdmin = await IsUserTeamAdminAsync(teamMember.TeamId, userId);
            var isSelf = teamMember.UserId == userId;

            if (!isAdmin && !isSelf)
                throw new UnauthorizedAccessException("You don't have permission to remove this member");

            await _teamMemberRepository.DeleteAsync(teamMember);
            return true;
        }

        public async Task<TeamMemberDto> UpdateTeamMemberRoleAsync(string userId, UpdateTeamMemberRoleRequestDto request)
        {
            var teamMember = await _teamMemberRepository.GetByIdAsync(request.TeamMemberId);
            if (teamMember == null)
                throw new InvalidOperationException("Team member not found");

            // Only team admin can update member roles
            if (!await IsUserTeamAdminAsync(teamMember.TeamId, userId))
                throw new UnauthorizedAccessException("Only team admin can update member roles");

            teamMember.Role = request.Role;
            await _teamMemberRepository.UpdateAsync(teamMember);

            return await MapToTeamMemberDtoAsync(teamMember);
        }

        public async Task<IEnumerable<TeamMemberDto>> GetTeamMembersAsync(Guid teamId, string userId)
        {
            // Verify user has access to this team
            if (!await IsUserTeamMemberAsync(teamId, userId))
                throw new UnauthorizedAccessException("You don't have access to this team");

            var members = await _teamMemberRepository.GetByTeamIdAsync(teamId);
            var memberDtos = new List<TeamMemberDto>();

            foreach (var member in members)
            {
                memberDtos.Add(await MapToTeamMemberDtoAsync(member));
            }

            return memberDtos;
        }

        public async Task<IEnumerable<TeamMemberDto>> GetPendingInvitesAsync(Guid teamId, string userId)
        {
            // Only team admin can view pending invites
            if (!await IsUserTeamAdminAsync(teamId, userId))
                throw new UnauthorizedAccessException("Only team admin can view pending invites");

            var pendingInvites = await _teamMemberRepository.GetPendingInvitesByTeamIdAsync(teamId);
            var inviteDtos = new List<TeamMemberDto>();

            foreach (var invite in pendingInvites)
            {
                inviteDtos.Add(await MapToTeamMemberDtoAsync(invite));
            }

            return inviteDtos;
        }

        public async Task<IEnumerable<TeamMemberDto>> GetUserPendingInvitesAsync(string userId)
        {
            var pendingInvites = await _teamMemberRepository.GetPendingInvitesByUserIdAsync(userId);
            var inviteDtos = new List<TeamMemberDto>();

            foreach (var invite in pendingInvites)
            {
                inviteDtos.Add(await MapToTeamMemberDtoAsync(invite));
            }

            return inviteDtos;
        }

        #endregion

        #region Vault Sharing Operations

        public async Task<VaultShareDto> ShareVaultAsync(string userId, ShareVaultRequestDto request)
        {
            // Verify vault exists and user owns it
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(request.VaultId, userId);
            if (vault == null)
                throw new UnauthorizedAccessException("Vault not found or you don't own it");

            // Verify team exists and user is a member
            if (!await IsUserTeamMemberAsync(request.TeamId, userId))
                throw new UnauthorizedAccessException("You don't have access to this team");

            // Check if vault is already shared with this team
            var existingShare = await _vaultShareRepository.GetByVaultIdAndTeamIdAsync(request.VaultId, request.TeamId);
            if (existingShare != null)
                throw new InvalidOperationException("Vault is already shared with this team");

            var vaultShare = new VaultShare
            {
                VaultId = request.VaultId,
                TeamId = request.TeamId,
                Permission = request.Permission,
                SharedByUserId = userId,
                EncryptedVaultKey = request.EncryptedVaultKey
            };

            var createdShare = await _vaultShareRepository.AddAsync(vaultShare);
            return await MapToVaultShareDtoAsync(createdShare);
        }

        public async Task<bool> UnshareVaultAsync(Guid vaultShareId, string userId)
        {
            var vaultShare = await _vaultShareRepository.GetByIdAsync(vaultShareId);
            if (vaultShare == null)
                return false;

            // Only vault owner or team admin can unshare
            var isVaultOwner = vaultShare.Vault.UserId == userId;
            var isTeamAdmin = await IsUserTeamAdminAsync(vaultShare.TeamId, userId);

            if (!isVaultOwner && !isTeamAdmin)
                throw new UnauthorizedAccessException("You don't have permission to unshare this vault");

            await _vaultShareRepository.DeleteAsync(vaultShare);
            return true;
        }

        public async Task<VaultShareDto> UpdateVaultSharePermissionAsync(string userId, UpdateVaultSharePermissionRequestDto request)
        {
            var vaultShare = await _vaultShareRepository.GetByIdAsync(request.VaultShareId);
            if (vaultShare == null)
                throw new InvalidOperationException("Vault share not found");

            // Only vault owner can update permissions
            if (vaultShare.Vault.UserId != userId)
                throw new UnauthorizedAccessException("Only vault owner can update share permissions");

            vaultShare.Permission = request.Permission;
            await _vaultShareRepository.UpdateAsync(vaultShare);

            return await MapToVaultShareDtoAsync(vaultShare);
        }

        public async Task<IEnumerable<VaultShareDto>> GetVaultSharesAsync(Guid vaultId, string userId)
        {
            // Verify user owns the vault
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(vaultId, userId);
            if (vault == null)
                throw new UnauthorizedAccessException("Vault not found or you don't own it");

            var shares = await _vaultShareRepository.GetByVaultIdAsync(vaultId);
            var shareDtos = new List<VaultShareDto>();

            foreach (var share in shares)
            {
                shareDtos.Add(await MapToVaultShareDtoAsync(share));
            }

            return shareDtos;
        }

        public async Task<IEnumerable<VaultShareDto>> GetSharedVaultsAsync(string userId)
        {
            var shares = await _vaultShareRepository.GetByUserIdAsync(userId);
            var shareDtos = new List<VaultShareDto>();

            foreach (var share in shares)
            {
                shareDtos.Add(await MapToVaultShareDtoAsync(share));
            }

            return shareDtos;
        }

        #endregion

        #region Permission Checks

        public async Task<bool> HasTeamPermissionAsync(Guid teamId, string userId, string permission)
        {
            // For now, we'll use simple role-based permissions
            // Admin can do everything, members can view/edit, viewers can only view
            return permission.ToLower() switch
            {
                "admin" => await IsUserTeamAdminAsync(teamId, userId),
                "member" => await IsUserTeamMemberAsync(teamId, userId),
                "viewer" => await IsUserTeamMemberAsync(teamId, userId),
                _ => false
            };
        }

        public async Task<bool> HasVaultPermissionAsync(Guid vaultId, string userId, string permission)
        {
            // Check if user owns the vault
            var vault = await _vaultRepository.GetByIdAndUserIdAsync(vaultId, userId);
            if (vault != null)
                return true; // Owner has all permissions

            // Check shared vault permissions
            var vaultPermission = await _vaultShareRepository.GetUserPermissionForVaultAsync(vaultId, userId);
            if (vaultPermission == null)
                return false;

            return permission.ToLower() switch
            {
                "read" => vaultPermission >= VaultPermission.Read,
                "write" => vaultPermission >= VaultPermission.Write,
                "admin" => vaultPermission >= VaultPermission.Admin,
                _ => false
            };
        }

        public async Task<bool> IsUserTeamAdminAsync(Guid teamId, string userId)
        {
            return await _teamRepository.IsUserTeamAdminAsync(teamId, userId);
        }

        public async Task<bool> IsUserTeamMemberAsync(Guid teamId, string userId)
        {
            return await _teamRepository.IsUserTeamMemberAsync(teamId, userId);
        }

        #endregion

        #region Private Helper Methods

        private async Task<TeamDto> MapToTeamDtoAsync(Team team)
        {
            var memberCount = await _teamMemberRepository.GetMemberCountAsync(team.Id);
            var sharedVaultCount = await _vaultShareRepository.GetSharedVaultCountByTeamAsync(team.Id);

            return new TeamDto
            {
                Id = team.Id,
                Name = team.Name,
                Description = team.Description,
                AdminUserId = team.AdminUserId,
                AdminUserEmail = team.AdminUser?.Email ?? "",
                CreatedAt = team.CreatedAt,
                UpdatedAt = team.UpdatedAt,
                MemberCount = memberCount + 1, // +1 for admin
                SharedVaultCount = sharedVaultCount,
                Members = team.TeamMembers?.Select(tm => MapToTeamMemberDto(tm)).ToList() ?? new List<TeamMemberDto>(),
                SharedVaults = team.SharedVaults?.Select(vs => MapToVaultShareDto(vs)).ToList() ?? new List<VaultShareDto>()
            };
        }

        private Task<TeamMemberDto> MapToTeamMemberDtoAsync(TeamMember teamMember)
        {
            return Task.FromResult(MapToTeamMemberDto(teamMember));
        }

        private TeamMemberDto MapToTeamMemberDto(TeamMember teamMember)
        {
            return new TeamMemberDto
            {
                Id = teamMember.Id,
                TeamId = teamMember.TeamId,
                TeamName = teamMember.Team?.Name ?? "",
                UserId = teamMember.UserId,
                UserEmail = teamMember.User?.Email ?? "",
                UserFullName = GetUserFullName(teamMember.User),
                Role = teamMember.Role,
                JoinedAt = teamMember.JoinedAt,
                LastActivityAt = teamMember.LastActivityAt,
                IsInvitePending = teamMember.IsInvitePending,
                InviteToken = teamMember.InviteToken,
                InviteExpiresAt = teamMember.InviteExpiresAt,
                InvitedByUserEmail = teamMember.InvitedByUser?.Email
            };
        }

        private Task<VaultShareDto> MapToVaultShareDtoAsync(VaultShare vaultShare)
        {
            return Task.FromResult(MapToVaultShareDto(vaultShare));
        }

        private VaultShareDto MapToVaultShareDto(VaultShare vaultShare)
        {
            return new VaultShareDto
            {
                Id = vaultShare.Id,
                VaultId = vaultShare.VaultId,
                VaultName = vaultShare.Vault?.Name ?? "",
                TeamId = vaultShare.TeamId,
                TeamName = vaultShare.Team?.Name ?? "",
                Permission = vaultShare.Permission,
                SharedByUserId = vaultShare.SharedByUserId,
                SharedByUserEmail = vaultShare.SharedByUser?.Email ?? "",
                SharedAt = vaultShare.SharedAt,
                LastAccessedAt = vaultShare.LastAccessedAt,
                EncryptedVaultKey = vaultShare.EncryptedVaultKey
            };
        }

        private string GetUserFullName(ApplicationUser? user)
        {
            if (user == null)
                return "";

            var firstName = user.FirstName ?? "";
            var lastName = user.LastName ?? "";

            return (firstName + " " + lastName).Trim();
        }

        private string GenerateInviteToken()
        {
            const int tokenLength = 32;
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            
            using var rng = RandomNumberGenerator.Create();
            var bytes = new byte[tokenLength];
            rng.GetBytes(bytes);
            
            var token = new StringBuilder(tokenLength);
            for (int i = 0; i < tokenLength; i++)
            {
                token.Append(chars[bytes[i] % chars.Length]);
            }
            
            return token.ToString();
        }

        #endregion
    }
} 
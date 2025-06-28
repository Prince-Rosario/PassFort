using System.ComponentModel.DataAnnotations;
using PassFort.DAL.Entities;

namespace PassFort.DTO.DTOs
{
    // Team DTOs
    public class TeamDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string AdminUserId { get; set; } = string.Empty;
        public string AdminUserEmail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int MemberCount { get; set; }
        public int SharedVaultCount { get; set; }
        public List<TeamMemberDto> Members { get; set; } = new();
        public List<VaultShareDto> SharedVaults { get; set; } = new();
    }

    public class CreateTeamRequestDto
    {
        [Required]
        [StringLength(200, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }
    }

    public class UpdateTeamRequestDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [StringLength(200, MinimumLength = 1)]
        public string Name { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Description { get; set; }
    }

    // Team Member DTOs
    public class TeamMemberDto
    {
        public Guid Id { get; set; }
        public Guid TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string? UserFullName { get; set; }
        public TeamRole Role { get; set; }
        public DateTime JoinedAt { get; set; }
        public DateTime? LastActivityAt { get; set; }
        public bool IsInvitePending { get; set; }
        public string? InviteToken { get; set; }
        public DateTime? InviteExpiresAt { get; set; }
        public string? InvitedByUserEmail { get; set; }
    }

    public class InviteTeamMemberRequestDto
    {
        [Required]
        public Guid TeamId { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public TeamRole Role { get; set; } = TeamRole.Member;
    }

    public class UpdateTeamMemberRoleRequestDto
    {
        [Required]
        public Guid TeamMemberId { get; set; }

        [Required]
        public TeamRole Role { get; set; }
    }

    public class AcceptTeamInviteRequestDto
    {
        [Required]
        public string InviteToken { get; set; } = string.Empty;
    }

    // Vault Share DTOs
    public class VaultShareDto
    {
        public Guid Id { get; set; }
        public Guid VaultId { get; set; }
        public string VaultName { get; set; } = string.Empty;
        public Guid TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public VaultPermission Permission { get; set; }
        public string SharedByUserId { get; set; } = string.Empty;
        public string SharedByUserEmail { get; set; } = string.Empty;
        public DateTime SharedAt { get; set; }
        public DateTime? LastAccessedAt { get; set; }
    }

    public class ShareVaultRequestDto
    {
        [Required]
        public Guid VaultId { get; set; }

        [Required]
        public Guid TeamId { get; set; }

        [Required]
        public VaultPermission Permission { get; set; } = VaultPermission.Read;

        // TODO: Make this required when team encryption is fully implemented
        public string EncryptedVaultKey { get; set; } = string.Empty;
    }

    public class UpdateVaultSharePermissionRequestDto
    {
        [Required]
        public Guid VaultShareId { get; set; }

        [Required]
        public VaultPermission Permission { get; set; }
    }
} 
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PassFort.DAL.Entities
{
    public enum TeamRole
    {
        Admin = 0,
        Member = 1,
        Viewer = 2
    }

    public class TeamMember
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TeamId { get; set; }

        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public TeamRole Role { get; set; } = TeamRole.Member;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastActivityAt { get; set; }

        // Invitation properties
        public bool IsInvitePending { get; set; } = false;
        public string? InviteToken { get; set; }
        public DateTime? InviteExpiresAt { get; set; }
        public string? InvitedByUserId { get; set; }

        // Navigation properties
        [ForeignKey(nameof(TeamId))]
        public virtual Team Team { get; set; } = null!;

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser User { get; set; } = null!;

        [ForeignKey(nameof(InvitedByUserId))]
        public virtual ApplicationUser? InvitedByUser { get; set; }
    }
} 
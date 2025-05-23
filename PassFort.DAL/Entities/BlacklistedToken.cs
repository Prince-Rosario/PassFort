using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PassFort.DAL.Entities
{
    public class BlacklistedToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string TokenId { get; set; } = string.Empty;

        [Required]
        public string UserId { get; set; } = string.Empty;

        public DateTime ExpiryDate { get; set; }

        public DateTime BlacklistedAt { get; set; } = DateTime.UtcNow;

        public string? Reason { get; set; }

        // Navigation property
        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser User { get; set; } = null!;
    }
}

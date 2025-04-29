using System.ComponentModel.DataAnnotations;

namespace PassFort.Api.Models
{
    public class BlacklistedToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        public DateTime ExpiryDate { get; set; }

        public DateTime BlacklistedAt { get; set; } = DateTime.UtcNow;
    }
}

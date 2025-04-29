using System;
using Microsoft.AspNetCore.Identity;

namespace PassFort.Api.Models
{
    public class ApplicationUser : IdentityUser
    {
        // Additional properties for our password manager
        public override bool TwoFactorEnabled { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
        public string? MasterPasswordHash { get; set; }
        public string? MasterPasswordSalt { get; set; }
        public string? RecoveryKey { get; set; }
        public bool IsLocked { get; set; } = false;
        public int FailedLoginAttempts { get; set; } = 0;
    }
}

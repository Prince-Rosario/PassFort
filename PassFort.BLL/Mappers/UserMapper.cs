using PassFort.DAL.Entities;
using PassFort.DTO.DTOs;

namespace PassFort.BLL.Mappers
{
    public static class UserMapper
    {
        public static UserDto ToDto(ApplicationUser user)
        {
            return new UserDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                EmailConfirmed = user.EmailConfirmed,
                TwoFactorEnabled = user.TwoFactorEnabled,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt,
                IsLocked = user.IsLocked,
                FailedLoginAttempts = user.FailedLoginAttempts,
            };
        }

        public static ApplicationUser ToEntity(RegisterRequestDto dto)
        {
            return new ApplicationUser
            {
                UserName = dto.Email, // Using email as username
                Email = dto.Email,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                SecurityStamp = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.UtcNow,
            };
        }
    }
}

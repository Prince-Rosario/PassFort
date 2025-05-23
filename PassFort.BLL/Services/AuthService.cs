using BCrypt.Net;
using Microsoft.AspNetCore.Identity;
using PassFort.BLL.Mappers;
using PassFort.BLL.Services.Interfaces;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;
using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ITokenService _tokenService;
        private readonly IBlacklistedTokenRepository _blacklistedTokenRepository;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ITokenService tokenService,
            IBlacklistedTokenRepository blacklistedTokenRepository
        )
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _blacklistedTokenRepository = blacklistedTokenRepository;
        }

        public async Task<TokenResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                throw new InvalidOperationException("User with this email already exists");
            }

            var user = UserMapper.ToEntity(request);
            user.MasterPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.MasterPassword);
            user.MasterPasswordSalt = Guid.NewGuid().ToString();
            user.RecoveryKey = Guid.NewGuid().ToString("N");

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"User registration failed: {errors}");
            }

            var jwtToken = await _tokenService.GenerateJwtTokenAsync(user);
            var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user.Id);

            return new TokenResponseDto
            {
                AccessToken = jwtToken,
                RefreshToken = refreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                User = UserMapper.ToDto(user),
            };
        }

        public async Task<TokenResponseDto> LoginAsync(LoginRequestDto request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            if (user.IsLocked)
            {
                throw new UnauthorizedAccessException("Account is locked. Please contact support.");
            }

            var result = await _signInManager.CheckPasswordSignInAsync(
                user,
                request.Password,
                lockoutOnFailure: false
            );
            if (!result.Succeeded)
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.IsLocked = true;
                }
                await _userManager.UpdateAsync(user);
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            user.FailedLoginAttempts = 0;
            user.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            var jwtToken = await _tokenService.GenerateJwtTokenAsync(user);
            var refreshToken = await _tokenService.GenerateRefreshTokenAsync(user.Id);

            return new TokenResponseDto
            {
                AccessToken = jwtToken,
                RefreshToken = refreshToken.Token,
                ExpiresAt = DateTime.UtcNow.AddMinutes(60),
                User = UserMapper.ToDto(user),
            };
        }

        public async Task<bool> LogoutAsync(string userId, string refreshToken, string jwtToken)
        {
            await _tokenService.RevokeTokenAsync(refreshToken);

            var tokenId = _tokenService.GetTokenIdFromJwt(jwtToken);
            if (!string.IsNullOrEmpty(tokenId))
            {
                var blacklistedToken = new BlacklistedToken
                {
                    TokenId = tokenId,
                    UserId = userId,
                    ExpiryDate = DateTime.UtcNow.AddMinutes(60),
                    Reason = "User logout",
                };
                await _blacklistedTokenRepository.AddAsync(blacklistedToken);
            }

            return true;
        }

        public async Task<TokenResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request)
        {
            return await _tokenService.RefreshTokenAsync(request.RefreshToken);
        }

        public async Task<bool> ChangePasswordAsync(string userId, ChangePasswordRequestDto request)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            var result = await _userManager.ChangePasswordAsync(
                user,
                request.CurrentPassword,
                request.NewPassword
            );
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Password change failed: {errors}");
            }

            await _tokenService.RevokeAllUserTokensAsync(userId);
            return true;
        }

        public async Task<UserDto> GetUserAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            return UserMapper.ToDto(user);
        }

        public async Task<bool> RevokeAllTokensAsync(string userId)
        {
            return await _tokenService.RevokeAllUserTokensAsync(userId);
        }
    }
}

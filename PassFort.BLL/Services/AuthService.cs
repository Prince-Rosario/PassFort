using BCrypt.Net;
using Microsoft.AspNetCore.Identity;
using OtpNet;
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
        private readonly IUserRecoveryCodeRepository _recoveryCodeRepository;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ITokenService tokenService,
            IBlacklistedTokenRepository blacklistedTokenRepository,
            IUserRecoveryCodeRepository recoveryCodeRepository
        )
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _blacklistedTokenRepository = blacklistedTokenRepository;
            _recoveryCodeRepository = recoveryCodeRepository;
        }

        public async Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request)
        {
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                throw new InvalidOperationException("User with this email already exists");
            }

            var user = UserMapper.ToEntity(request);
            user.MasterPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.MasterPasswordHash);
            user.MasterPasswordSalt = Guid.NewGuid().ToString();
            user.RecoveryKey = Guid.NewGuid().ToString("N");

            // Zero-knowledge registration: Create user without password for Identity
            // The derived hash is already stored in user.MasterPasswordHash
            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"User registration failed: {errors}");
            }

            // Do not generate tokens during registration - only return user info
            return new RegisterResponseDto
            {
                Success = true,
                Message = "User registered successfully. Please log in to access your account.",
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

            // Zero-knowledge authentication: verify the derived hash, not raw password
            var isValidHash = BCrypt.Net.BCrypt.Verify(request.MasterPasswordHash, user.MasterPasswordHash);
            if (!isValidHash)
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.IsLocked = true;
                }
                await _userManager.UpdateAsync(user);
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Check if 2FA is enabled and code is required
            if (user.TwoFactorEnabled)
            {
                // If no 2FA code provided, throw exception indicating 2FA is required
                if (string.IsNullOrEmpty(request.TwoFactorCode))
                {
                    throw new UnauthorizedAccessException(
                        "Two-factor authentication code is required"
                    );
                }

                // Verify the 2FA code
                var is2FaValid = await VerifyTwoFactorCodeAsync(user, request.TwoFactorCode);

                if (!is2FaValid)
                {
                    throw new UnauthorizedAccessException("Invalid two-factor authentication code");
                }
            }

            // Reset failed login attempts on successful login
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

            // Zero-knowledge authentication: verify current password hash
            var isCurrentPasswordValid = BCrypt.Net.BCrypt.Verify(request.CurrentMasterPasswordHash, user.MasterPasswordHash);
            if (!isCurrentPasswordValid)
            {
                throw new InvalidOperationException("Current master password is incorrect");
            }

            // Update the master password hash for vault encryption
            user.MasterPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewMasterPasswordHash);
            await _userManager.UpdateAsync(user);

            // Revoke all existing tokens to force re-authentication
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

        public async Task<string> GetUserSecurityLevelAsync(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            return user.SecurityLevel ?? "balanced"; // Default to balanced if not set
        }

        public async Task<bool> ChangeSecurityLevelAsync(string userId, ChangeSecurityLevelRequestDto request)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            // Verify current password hash (derived with current security level)
            var isCurrentPasswordValid = BCrypt.Net.BCrypt.Verify(request.CurrentMasterPasswordHash, user.MasterPasswordHash);
            if (!isCurrentPasswordValid)
            {
                throw new InvalidOperationException("Current master password is incorrect");
            }

            // Update both the security level and the password hash (derived with new security level)
            user.SecurityLevel = request.NewSecurityLevel;
            user.MasterPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewMasterPasswordHash);
            
            await _userManager.UpdateAsync(user);

            // Revoke all existing tokens to force re-authentication with new security level
            await _tokenService.RevokeAllUserTokensAsync(userId);
            
            return true;
        }

        #region Private 2FA Helper Methods

        private async Task<bool> VerifyTwoFactorCodeAsync(ApplicationUser user, string code)
        {
            // Try to verify as TOTP code first
            if (
                !string.IsNullOrEmpty(user.TwoFactorSecretKey)
                && VerifyTotpCode(user.TwoFactorSecretKey, code)
            )
            {
                return true;
            }

            // If TOTP fails, try recovery code
            return await VerifyRecoveryCodeAsync(user.Id, code);
        }

        private static bool VerifyTotpCode(string secretKey, string code)
        {
            try
            {
                var keyBytes = Base32Encoding.ToBytes(secretKey);
                var totp = new Totp(keyBytes);
                return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> VerifyRecoveryCodeAsync(string userId, string recoveryCode)
        {
            var recoveryCodeEntity = await _recoveryCodeRepository.GetByUserIdAndCodeAsync(
                userId,
                recoveryCode
            );
            if (recoveryCodeEntity == null)
            {
                return false;
            }

            // Mark the recovery code as used
            recoveryCodeEntity.IsUsed = true;
            recoveryCodeEntity.UsedAt = DateTime.UtcNow;
            await _recoveryCodeRepository.UpdateAsync(recoveryCodeEntity);

            // Update the remaining count
            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                user.RecoveryCodesRemaining = Math.Max(0, user.RecoveryCodesRemaining - 1);
                await _userManager.UpdateAsync(user);
            }

            return true;
        }

        #endregion
    }
}

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PassFort.Api.Data;
using PassFort.Api.Models;
using PassFort.Api.Models.Authentication;

namespace PassFort.Api.Services
{
    public class AuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly TokenService _tokenService;
        private readonly TokenBlacklistService _tokenBlacklistService;
        private readonly ApplicationDbContext _context;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            TokenService tokenService,
            TokenBlacklistService tokenBlacklistService,
            ApplicationDbContext context
        )
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _tokenBlacklistService = tokenBlacklistService;
            _context = context;
        }

        public async Task<AuthResponseModel> Register(RegisterRequestModel model)
        {
            // Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(model.Email);
            if (existingUser != null)
            {
                return new AuthResponseModel
                {
                    Success = false,
                    Message = "User with this email already exists",
                };
            }

            // Create new user
            var user = new ApplicationUser
            {
                UserName = model.Username,
                Email = model.Email,
                SecurityStamp = Guid.NewGuid().ToString(),
                MasterPasswordHash = BCrypt.Net.BCrypt.HashPassword(model.MasterPassword),
                MasterPasswordSalt = Guid.NewGuid().ToString(), // In a real app, you'd use a proper salt
                RecoveryKey = Guid.NewGuid()
                    .ToString(
                        "N"
                    ) // Generate recovery key
                ,
            };

            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                return new AuthResponseModel
                {
                    Success = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description)),
                };
            }

            // Add default role to user
            await _userManager.AddToRoleAsync(user, "User");

            // Generate tokens
            var token = await _tokenService.GenerateJwtToken(user);
            var refreshToken = await _tokenService.GenerateRefreshToken(user.Id);

            return new AuthResponseModel
            {
                Success = true,
                Message = "User registered successfully",
                Token = token,
                RefreshToken = refreshToken.Token,
                Expiration = DateTime.UtcNow.AddMinutes(60), // Based on your JWT configuration
                UserId = user.Id,
                Username = user.UserName,
                Email = user.Email,
            };
        }

        public async Task<AuthResponseModel> Login(LoginRequestModel model)
        {
            // Find user by email
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                return new AuthResponseModel
                {
                    Success = false,
                    Message = "Invalid email or password",
                };
            }

            // Check if account is locked
            if (user.IsLocked)
            {
                return new AuthResponseModel
                {
                    Success = false,
                    Message = "Account is locked. Please contact support.",
                };
            }

            // Verify master password
            bool passwordValid = BCrypt.Net.BCrypt.Verify(
                model.MasterPassword,
                user.MasterPasswordHash
            );
            if (!passwordValid)
            {
                // Increment failed login attempts
                user.FailedLoginAttempts++;

                // Lock account if too many failed attempts (e.g., 5)
                if (user.FailedLoginAttempts >= 5)
                {
                    user.IsLocked = true;
                }

                await _userManager.UpdateAsync(user);

                return new AuthResponseModel
                {
                    Success = false,
                    Message = "Invalid email or password",
                };
            }

            // Reset failed login attempts on successful login
            user.FailedLoginAttempts = 0;
            user.LastLoginAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            // Check if 2FA is required
            if (user.TwoFactorEnabled)
            {
                // If 2FA code not provided, return that 2FA is required
                if (string.IsNullOrEmpty(model.TwoFactorCode))
                {
                    return new AuthResponseModel
                    {
                        Success = false,
                        RequiresTwoFactor = true,
                        Message = "Two-factor authentication code required",
                        UserId = user.Id,
                    };
                }

                // Verify 2FA code (simplified for now)
                bool isValid2FA = await _userManager.VerifyTwoFactorTokenAsync(
                    user,
                    _userManager.Options.Tokens.AuthenticatorTokenProvider,
                    model.TwoFactorCode
                );

                if (!isValid2FA)
                {
                    return new AuthResponseModel
                    {
                        Success = false,
                        RequiresTwoFactor = true,
                        Message = "Invalid two-factor authentication code",
                        UserId = user.Id,
                    };
                }
            }

            // Generate tokens
            var token = await _tokenService.GenerateJwtToken(user);
            var refreshToken = await _tokenService.GenerateRefreshToken(user.Id);

            return new AuthResponseModel
            {
                Success = true,
                Message = "Login successful",
                Token = token,
                RefreshToken = refreshToken.Token,
                Expiration = DateTime.UtcNow.AddMinutes(60), // Based on your JWT settings
                UserId = user.Id,
                Username = user.UserName,
                Email = user.Email,
            };
        }

        public async Task<AuthResponseModel> Logout(
            string userId,
            string refreshToken,
            string jwtToken
        )
        {
            // Find the refresh token in the database
            var token = await _context.RefreshTokens.FirstOrDefaultAsync(rt =>
                rt.UserId == userId && rt.Token == refreshToken && !rt.IsRevoked
            );

            if (token == null)
            {
                return new AuthResponseModel { Success = false, Message = "Invalid refresh token" };
            }

            // Revoke the refresh token
            token.IsRevoked = true;
            token.IsUsed = true;

            await _context.SaveChangesAsync();

            // Blacklist the JWT token
            if (!string.IsNullOrEmpty(jwtToken))
            {
                await _tokenBlacklistService.BlacklistTokenAsync(jwtToken);
            }

            // Get the user for updating last activity
            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                // Update last activity timestamp (optional)
                await _userManager.UpdateAsync(user);
            }

            return new AuthResponseModel { Success = true, Message = "Logout successful" };
        }
    }
}

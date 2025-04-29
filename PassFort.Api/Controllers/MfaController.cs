using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using PassFort.Api.Models;
using PassFort.Api.Services;

namespace PassFort.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowSpecificOrigins")]
    [Authorize]
    public class MfaController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly MfaService _mfaService;

        public MfaController(UserManager<ApplicationUser> userManager, MfaService mfaService)
        {
            _userManager = userManager;
            _mfaService = mfaService;
        }

        [HttpGet("generate-setup")]
        public async Task<IActionResult> GenerateSetup()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // Check if 2FA is already enabled
            if (user.TwoFactorEnabled)
            {
                return BadRequest(
                    new { success = false, message = "2FA is already enabled for this account" }
                );
            }

            var setupInfo = await _mfaService.GenerateTwoFactorSetupAsync(user);

            return Ok(setupInfo);
        }

        [HttpPost("enable")]
        public async Task<IActionResult> EnableTwoFactor([FromBody] VerifyTwoFactorModel model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // Verify the code the user provided
            var isValidCode = await _mfaService.VerifyTwoFactorCodeAsync(
                user,
                model.VerificationCode
            );
            if (!isValidCode)
            {
                return BadRequest(new { success = false, message = "Invalid verification code" });
            }

            // Enable 2FA
            user.TwoFactorEnabled = true;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(
                    new
                    {
                        success = false,
                        message = "Failed to enable 2FA",
                        errors = result.Errors,
                    }
                );
            }

            return Ok(
                new
                {
                    success = true,
                    message = "Two-factor authentication has been enabled successfully",
                }
            );
        }

        [HttpPost("disable")]
        public async Task<IActionResult> DisableTwoFactor([FromBody] VerifyTwoFactorModel model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // Verify the code the user provided
            var isValidCode = await _mfaService.VerifyTwoFactorCodeAsync(
                user,
                model.VerificationCode
            );
            if (!isValidCode)
            {
                return BadRequest(new { success = false, message = "Invalid verification code" });
            }

            // Disable 2FA
            user.TwoFactorEnabled = false;
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                return BadRequest(
                    new
                    {
                        success = false,
                        message = "Failed to disable 2FA",
                        errors = result.Errors,
                    }
                );
            }

            return Ok(
                new
                {
                    success = true,
                    message = "Two-factor authentication has been disabled successfully",
                }
            );
        }
    }

    public class VerifyTwoFactorModel
    {
        public string VerificationCode { get; set; } = string.Empty;
    }
}

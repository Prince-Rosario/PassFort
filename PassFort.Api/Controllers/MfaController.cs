using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using PassFort.BLL.Services.Interfaces;
using PassFort.DTO.DTOs;

namespace PassFort.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MfaController : ControllerBase
    {
        private readonly IMfaService _mfaService;

        public MfaController(IMfaService mfaService)
        {
            _mfaService = mfaService;
        }

        [HttpPost("enable")]
        public async Task<IActionResult> EnableTwoFactor(
            [FromBody] EnableTwoFactorRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _mfaService.EnableTwoFactorAsync(userId, request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new { message = "An error occurred while enabling 2FA", details = ex.Message }
                );
            }
        }

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyTwoFactor(
            [FromBody] VerifyTwoFactorRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var isValid = await _mfaService.VerifyTwoFactorAsync(userId, request);
                if (isValid)
                {
                    return Ok(
                        new
                        {
                            success = true,
                            message = "Two-factor authentication verified successfully",
                        }
                    );
                }
                else
                {
                    return BadRequest(
                        new { success = false, message = "Invalid verification code" }
                    );
                }
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new { message = "An error occurred while verifying 2FA", details = ex.Message }
                );
            }
        }

        [HttpPost("disable")]
        public async Task<IActionResult> DisableTwoFactor(
            [FromBody] DisableTwoFactorRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _mfaService.DisableTwoFactorAsync(userId, request);
                return Ok(
                    new
                    {
                        success = result,
                        message = "Two-factor authentication disabled successfully",
                    }
                );
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new { message = "An error occurred while disabling 2FA", details = ex.Message }
                );
            }
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetTwoFactorStatus()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var status = await _mfaService.GetTwoFactorStatusAsync(userId);
                return Ok(status);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving 2FA status",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPost("recovery-codes/generate")]
        public async Task<IActionResult> GenerateRecoveryCodes()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var recoveryCodes = await _mfaService.GenerateRecoveryCodesAsync(userId);
                return Ok(
                    new { recoveryCodes, message = "New recovery codes generated successfully" }
                );
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while generating recovery codes",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPost("recovery-codes/verify")]
        public async Task<IActionResult> VerifyRecoveryCode(
            [FromBody] VerifyRecoveryCodeRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var isValid = await _mfaService.VerifyRecoveryCodeAsync(
                    userId,
                    request.RecoveryCode
                );
                if (isValid)
                {
                    return Ok(
                        new { success = true, message = "Recovery code verified successfully" }
                    );
                }
                else
                {
                    return BadRequest(new { success = false, message = "Invalid recovery code" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while verifying recovery code",
                        details = ex.Message,
                    }
                );
            }
        }
    }
}
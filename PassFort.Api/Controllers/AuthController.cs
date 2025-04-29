using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using PassFort.Api.Models.Authentication;
using PassFort.Api.Services;

namespace PassFort.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowSpecificOrigins")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly TokenService _tokenService;

        public AuthController(AuthService authService, TokenService tokenService)
        {
            _authService = authService;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.Register(model);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.Login(model);
            if (!result.Success)
            {
                // If 2FA is required, return 200 OK with the 2FA required flag
                if (result.RequiresTwoFactor)
                {
                    return Ok(result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] TokenRefreshRequestModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _tokenService.RefreshToken(model.RefreshToken);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout([FromBody] LogoutRequestModel model)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new { success = false, message = "User not authenticated" });
            }

            // Extract the JWT token from the Authorization header
            string jwtToken = string.Empty;
            if (Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                var authHeaderValue = authHeader.FirstOrDefault();
                if (
                    !string.IsNullOrEmpty(authHeaderValue)
                    && authHeaderValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                )
                {
                    jwtToken = authHeaderValue.Substring("Bearer ".Length).Trim();
                }
            }

            var result = await _authService.Logout(userId, model.RefreshToken, jwtToken);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}

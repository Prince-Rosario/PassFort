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
    [EnableCors("AllowSpecificOrigins")]
    [Authorize] // All team operations require authentication
    public class TeamController : ControllerBase
    {
        private readonly ITeamService _teamService;

        public TeamController(ITeamService teamService)
        {
            _teamService = teamService;
        }

        #region Team Operations

        [HttpPost]
        public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.CreateTeamAsync(userId, request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while creating the team",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("{teamId}")]
        public async Task<IActionResult> GetTeam(Guid teamId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetTeamByIdAsync(teamId, userId);
                if (result == null)
                {
                    return NotFound(new { message = "Team not found" });
                }

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving the team",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetUserTeams()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetUserTeamsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving user teams",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPut("{teamId}")]
        public async Task<IActionResult> UpdateTeam(Guid teamId, [FromBody] UpdateTeamRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (teamId != request.Id)
                {
                    return BadRequest(new { message = "Team ID mismatch" });
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.UpdateTeamAsync(userId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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
                        message = "An error occurred while updating the team",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpDelete("{teamId}")]
        public async Task<IActionResult> DeleteTeam(Guid teamId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.DeleteTeamAsync(teamId, userId);
                if (!result)
                {
                    return NotFound(new { message = "Team not found" });
                }

                return Ok(new { message = "Team deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while deleting the team",
                        details = ex.Message,
                    }
                );
            }
        }

        #endregion

        #region Team Member Operations

        [HttpPost("{teamId}/members/invite")]
        public async Task<IActionResult> InviteTeamMember(Guid teamId, [FromBody] InviteTeamMemberRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (teamId != request.TeamId)
                {
                    return BadRequest(new { message = "Team ID mismatch" });
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.InviteTeamMemberAsync(userId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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
                        message = "An error occurred while inviting the team member",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPost("invites/accept")]
        public async Task<IActionResult> AcceptTeamInvite([FromBody] AcceptTeamInviteRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.AcceptTeamInviteAsync(userId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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
                        message = "An error occurred while accepting the team invite",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("{teamId}/members")]
        public async Task<IActionResult> GetTeamMembers(Guid teamId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetTeamMembersAsync(teamId, userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving team members",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("{teamId}/invites")]
        public async Task<IActionResult> GetPendingInvites(Guid teamId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetPendingInvitesAsync(teamId, userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving pending invites",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("invites/me")]
        public async Task<IActionResult> GetUserPendingInvites()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetUserPendingInvitesAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving your pending invites",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPut("members/{memberId}/role")]
        public async Task<IActionResult> UpdateTeamMemberRole(Guid memberId, [FromBody] UpdateTeamMemberRoleRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (memberId != request.TeamMemberId)
                {
                    return BadRequest(new { message = "Member ID mismatch" });
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.UpdateTeamMemberRoleAsync(userId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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
                        message = "An error occurred while updating member role",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpDelete("members/{memberId}")]
        public async Task<IActionResult> RemoveTeamMember(Guid memberId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.RemoveTeamMemberAsync(memberId, userId);
                if (!result)
                {
                    return NotFound(new { message = "Team member not found" });
                }

                return Ok(new { message = "Team member removed successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while removing team member",
                        details = ex.Message,
                    }
                );
            }
        }

        #endregion

        #region Vault Sharing Operations

        [HttpPost("vaults/share")]
        public async Task<IActionResult> ShareVault([FromBody] ShareVaultRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.ShareVaultAsync(userId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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
                        message = "An error occurred while sharing the vault",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("vaults/{vaultId}/shares")]
        public async Task<IActionResult> GetVaultShares(Guid vaultId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetVaultSharesAsync(vaultId, userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving vault shares",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("vaults/shared")]
        public async Task<IActionResult> GetSharedVaults()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.GetSharedVaultsAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving shared vaults",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPut("vaults/shares/{shareId}/permission")]
        public async Task<IActionResult> UpdateVaultSharePermission(Guid shareId, [FromBody] UpdateVaultSharePermissionRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (shareId != request.VaultShareId)
                {
                    return BadRequest(new { message = "Share ID mismatch" });
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.UpdateVaultSharePermissionAsync(userId, request);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
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
                        message = "An error occurred while updating vault share permission",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpDelete("vaults/shares/{shareId}")]
        public async Task<IActionResult> UnshareVault(Guid shareId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var result = await _teamService.UnshareVaultAsync(shareId, userId);
                if (!result)
                {
                    return NotFound(new { message = "Vault share not found" });
                }

                return Ok(new { message = "Vault unshared successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while unsharing the vault",
                        details = ex.Message,
                    }
                );
            }
        }

        #endregion

        #region Permission Checks

        [HttpGet("{teamId}/permissions/{permission}")]
        public async Task<IActionResult> CheckTeamPermission(Guid teamId, string permission)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var hasPermission = await _teamService.HasTeamPermissionAsync(teamId, userId, permission);
                return Ok(new { hasPermission });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while checking team permission",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("vaults/{vaultId}/permissions/{permission}")]
        public async Task<IActionResult> CheckVaultPermission(Guid vaultId, string permission)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var hasPermission = await _teamService.HasVaultPermissionAsync(vaultId, userId, permission);
                return Ok(new { hasPermission });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while checking vault permission",
                        details = ex.Message,
                    }
                );
            }
        }

        #endregion

        #region Helper Methods

        private string GetUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        }

        #endregion
    }
} 
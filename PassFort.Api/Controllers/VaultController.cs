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
    [Authorize] // All vault operations require authentication
    public class VaultController : ControllerBase
    {
        private readonly IVaultService _vaultService;

        public VaultController(IVaultService vaultService)
        {
            _vaultService = vaultService;
        }

        #region Vault Operations

        [HttpPost]
        public async Task<IActionResult> CreateVault([FromBody] CreateVaultRequestDto request)
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

                var result = await _vaultService.CreateVaultAsync(userId, request);
                return Ok(result);
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
                        message = "An error occurred while creating the vault",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetUserVaults()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var vaults = await _vaultService.GetUserVaultsAsync(userId);
                return Ok(vaults);
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message = "An error occurred while retrieving vaults",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("{vaultId:guid}")]
        public async Task<IActionResult> GetVault(Guid vaultId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var vault = await _vaultService.GetVaultAsync(userId, vaultId);
                return Ok(vault);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
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
                        message = "An error occurred while retrieving the vault",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPut("{vaultId:guid}")]
        public async Task<IActionResult> UpdateVault(
            Guid vaultId,
            [FromBody] UpdateVaultRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (vaultId != request.Id)
                {
                    return BadRequest(
                        new { message = "Vault ID in URL does not match request body" }
                    );
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var vault = await _vaultService.UpdateVaultAsync(userId, request);
                return Ok(vault);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
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
                        message = "An error occurred while updating the vault",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpDelete("{vaultId:guid}")]
        public async Task<IActionResult> DeleteVault(Guid vaultId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var success = await _vaultService.DeleteVaultAsync(userId, vaultId);
                if (!success)
                {
                    return NotFound(new { message = "Vault not found" });
                }

                return Ok(new { success = true, message = "Vault deleted successfully" });
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
                        message = "An error occurred while deleting the vault",
                        details = ex.Message,
                    }
                );
            }
        }

        #endregion

        #region Vault Item Operations

        [HttpPost("{vaultId:guid}/items")]
        public async Task<IActionResult> CreateVaultItem(
            Guid vaultId,
            [FromBody] CreateVaultItemRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (vaultId != request.VaultId)
                {
                    return BadRequest(
                        new { message = "Vault ID in URL does not match request body" }
                    );
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var item = await _vaultService.CreateVaultItemAsync(userId, request);
                return Ok(item);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
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
                        message = "An error occurred while creating the vault item",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("{vaultId:guid}/items")]
        public async Task<IActionResult> GetVaultItems(
            Guid vaultId,
            [FromQuery] string? itemType = null,
            [FromQuery] Guid? folderId = null,
            [FromQuery] bool favoritesOnly = false
        )
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                IEnumerable<VaultItemDto> items;

                if (favoritesOnly)
                {
                    items = await _vaultService.GetFavoriteItemsAsync(userId, vaultId);
                }
                else if (!string.IsNullOrEmpty(itemType))
                {
                    items = await _vaultService.GetVaultItemsByTypeAsync(userId, vaultId, itemType);
                }
                else if (folderId.HasValue)
                {
                    items = await _vaultService.GetVaultItemsByFolderAsync(
                        userId,
                        vaultId,
                        folderId.Value
                    );
                }
                else
                {
                    items = await _vaultService.GetVaultItemsAsync(userId, vaultId);
                }

                return Ok(items);
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
                        message = "An error occurred while retrieving vault items",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpGet("{vaultId:guid}/items/{itemId:guid}")]
        public async Task<IActionResult> GetVaultItem(Guid vaultId, Guid itemId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var item = await _vaultService.GetVaultItemAsync(userId, vaultId, itemId);
                return Ok(item);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
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
                        message = "An error occurred while retrieving the vault item",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPut("{vaultId:guid}/items/{itemId:guid}")]
        public async Task<IActionResult> UpdateVaultItem(
            Guid vaultId,
            Guid itemId,
            [FromBody] UpdateVaultItemRequestDto request
        )
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                if (itemId != request.Id)
                {
                    return BadRequest(
                        new { message = "Item ID in URL does not match request body" }
                    );
                }

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var item = await _vaultService.UpdateVaultItemAsync(userId, request);
                return Ok(item);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
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
                        message = "An error occurred while updating the vault item",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpDelete("{vaultId:guid}/items/{itemId:guid}")]
        public async Task<IActionResult> DeleteVaultItem(Guid vaultId, Guid itemId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var success = await _vaultService.DeleteVaultItemAsync(userId, vaultId, itemId);
                if (!success)
                {
                    return NotFound(new { message = "Vault item not found" });
                }

                return Ok(new { success = true, message = "Vault item deleted successfully" });
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
                        message = "An error occurred while deleting the vault item",
                        details = ex.Message,
                    }
                );
            }
        }

        [HttpPost("{vaultId:guid}/items/{itemId:guid}/toggle-favorite")]
        public async Task<IActionResult> ToggleFavorite(Guid vaultId, Guid itemId)
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var success = await _vaultService.ToggleFavoriteAsync(userId, vaultId, itemId);
                if (!success)
                {
                    return NotFound(new { message = "Vault item not found" });
                }

                return Ok(new { success = true, message = "Favorite status toggled successfully" });
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
                        message = "An error occurred while toggling favorite status",
                        details = ex.Message,
                    }
                );
            }
        }

        #endregion

        #region Helper Methods

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        }

        #endregion
    }
}

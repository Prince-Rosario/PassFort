using PassFort.DTO.DTOs;

namespace PassFort.BLL.Services.Interfaces
{
    public interface IMfaService
    {
        Task<EnableTwoFactorResponseDto> EnableTwoFactorAsync(
            string userId,
            EnableTwoFactorRequestDto request
        );
        Task<bool> VerifyTwoFactorAsync(string userId, VerifyTwoFactorRequestDto request);
        Task<bool> DisableTwoFactorAsync(string userId, DisableTwoFactorRequestDto request);
        Task<TwoFactorStatusDto> GetTwoFactorStatusAsync(string userId);
        Task<string[]> GenerateRecoveryCodesAsync(string userId);
        Task<bool> VerifyRecoveryCodeAsync(string userId, string recoveryCode);
    }
}

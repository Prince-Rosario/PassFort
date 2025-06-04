using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class VaultRepository : IVaultRepository
    {
        private readonly ApplicationDbContext _context;

        public VaultRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Vault?> GetByIdAsync(Guid id)
        {
            return await _context
                .Vaults.Include(v => v.VaultItems)
                .Include(v => v.VaultFolders)
                .FirstOrDefaultAsync(v => v.Id == id);
        }

        public async Task<Vault?> GetByIdAndUserIdAsync(Guid id, string userId)
        {
            return await _context
                .Vaults.Include(v => v.VaultItems)
                .Include(v => v.VaultFolders)
                .FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId);
        }

        public async Task<IEnumerable<Vault>> GetByUserIdAsync(string userId)
        {
            return await _context
                .Vaults.Where(v => v.UserId == userId)
                .OrderBy(v => v.CreatedAt)
                .ToListAsync();
        }

        public async Task<Vault> AddAsync(Vault vault)
        {
            _context.Vaults.Add(vault);
            await _context.SaveChangesAsync();
            return vault;
        }

        public async Task UpdateAsync(Vault vault)
        {
            vault.UpdatedAt = DateTime.UtcNow;
            _context.Vaults.Update(vault);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Vault vault)
        {
            _context.Vaults.Remove(vault);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid id, string userId)
        {
            return await _context.Vaults.AnyAsync(v => v.Id == id && v.UserId == userId);
        }

        public async Task<int> GetItemCountAsync(Guid vaultId)
        {
            return await _context.VaultItems.CountAsync(vi => vi.VaultId == vaultId);
        }

        public async Task<int> GetFolderCountAsync(Guid vaultId)
        {
            return await _context.VaultFolders.CountAsync(vf => vf.VaultId == vaultId);
        }
    }
}

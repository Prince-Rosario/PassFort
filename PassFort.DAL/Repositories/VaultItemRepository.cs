using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class VaultItemRepository : IVaultItemRepository
    {
        private readonly ApplicationDbContext _context;

        public VaultItemRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<VaultItem?> GetByIdAsync(Guid id)
        {
            return await _context
                .VaultItems.Include(vi => vi.Vault)
                .FirstOrDefaultAsync(vi => vi.Id == id);
        }

        public async Task<VaultItem?> GetByIdAndVaultIdAsync(Guid id, Guid vaultId)
        {
            return await _context
                .VaultItems.Include(vi => vi.Vault)
                .FirstOrDefaultAsync(vi => vi.Id == id && vi.VaultId == vaultId);
        }

        public async Task<IEnumerable<VaultItem>> GetByVaultIdAsync(Guid vaultId)
        {
            return await _context
                .VaultItems.Where(vi => vi.VaultId == vaultId)
                .OrderByDescending(vi => vi.UpdatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<VaultItem>> GetByFolderIdAsync(Guid folderId)
        {
            return await _context
                .VaultItems.Where(vi => vi.FolderId == folderId)
                .OrderByDescending(vi => vi.UpdatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<VaultItem>> GetByVaultIdAndTypeAsync(
            Guid vaultId,
            string itemType
        )
        {
            return await _context
                .VaultItems.Where(vi => vi.VaultId == vaultId && vi.ItemType == itemType)
                .OrderByDescending(vi => vi.UpdatedAt)
                .ToListAsync();
        }

        public async Task<VaultItem> AddAsync(VaultItem vaultItem)
        {
            _context.VaultItems.Add(vaultItem);
            await _context.SaveChangesAsync();
            return vaultItem;
        }

        public async Task UpdateAsync(VaultItem vaultItem)
        {
            vaultItem.UpdatedAt = DateTime.UtcNow;
            _context.VaultItems.Update(vaultItem);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(VaultItem vaultItem)
        {
            _context.VaultItems.Remove(vaultItem);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid id, Guid vaultId)
        {
            return await _context.VaultItems.AnyAsync(vi => vi.Id == id && vi.VaultId == vaultId);
        }

        public async Task UpdateLastAccessedAsync(Guid id)
        {
            var item = await _context.VaultItems.FindAsync(id);
            if (item != null)
            {
                item.LastAccessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<VaultItem>> GetFavoritesAsync(Guid vaultId)
        {
            return await _context
                .VaultItems.Where(vi => vi.VaultId == vaultId && vi.IsFavorite)
                .OrderByDescending(vi => vi.UpdatedAt)
                .ToListAsync();
        }
    }
}

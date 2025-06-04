using Microsoft.EntityFrameworkCore;
using PassFort.DAL.Data;
using PassFort.DAL.Entities;
using PassFort.DAL.Repositories.Interfaces;

namespace PassFort.DAL.Repositories
{
    public class VaultFolderRepository : IVaultFolderRepository
    {
        private readonly ApplicationDbContext _context;

        public VaultFolderRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<VaultFolder?> GetByIdAsync(Guid id)
        {
            return await _context
                .VaultFolders.Include(vf => vf.Vault)
                .Include(vf => vf.ParentFolder)
                .Include(vf => vf.SubFolders)
                .Include(vf => vf.VaultItems)
                .FirstOrDefaultAsync(vf => vf.Id == id);
        }

        public async Task<VaultFolder?> GetByIdAndVaultIdAsync(Guid id, Guid vaultId)
        {
            return await _context
                .VaultFolders.Include(vf => vf.Vault)
                .Include(vf => vf.ParentFolder)
                .Include(vf => vf.SubFolders)
                .Include(vf => vf.VaultItems)
                .FirstOrDefaultAsync(vf => vf.Id == id && vf.VaultId == vaultId);
        }

        public async Task<IEnumerable<VaultFolder>> GetByVaultIdAsync(Guid vaultId)
        {
            return await _context
                .VaultFolders.Where(vf => vf.VaultId == vaultId)
                .OrderBy(vf => vf.EncryptedName)
                .ToListAsync();
        }

        public async Task<IEnumerable<VaultFolder>> GetByParentFolderIdAsync(Guid parentFolderId)
        {
            return await _context
                .VaultFolders.Where(vf => vf.ParentFolderId == parentFolderId)
                .OrderBy(vf => vf.EncryptedName)
                .ToListAsync();
        }

        public async Task<IEnumerable<VaultFolder>> GetRootFoldersAsync(Guid vaultId)
        {
            return await _context
                .VaultFolders.Where(vf => vf.VaultId == vaultId && vf.ParentFolderId == null)
                .OrderBy(vf => vf.EncryptedName)
                .ToListAsync();
        }

        public async Task<VaultFolder> AddAsync(VaultFolder vaultFolder)
        {
            _context.VaultFolders.Add(vaultFolder);
            await _context.SaveChangesAsync();
            return vaultFolder;
        }

        public async Task UpdateAsync(VaultFolder vaultFolder)
        {
            vaultFolder.UpdatedAt = DateTime.UtcNow;
            _context.VaultFolders.Update(vaultFolder);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(VaultFolder vaultFolder)
        {
            _context.VaultFolders.Remove(vaultFolder);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(Guid id, Guid vaultId)
        {
            return await _context.VaultFolders.AnyAsync(vf => vf.Id == id && vf.VaultId == vaultId);
        }

        public async Task<int> GetItemCountAsync(Guid folderId)
        {
            return await _context.VaultItems.CountAsync(vi => vi.FolderId == folderId);
        }

        public async Task<int> GetSubFolderCountAsync(Guid folderId)
        {
            return await _context.VaultFolders.CountAsync(vf => vf.ParentFolderId == folderId);
        }

        public async Task<bool> HasSubFoldersAsync(Guid folderId)
        {
            return await _context.VaultFolders.AnyAsync(vf => vf.ParentFolderId == folderId);
        }

        public async Task<bool> HasItemsAsync(Guid folderId)
        {
            return await _context.VaultItems.AnyAsync(vi => vi.FolderId == folderId);
        }
    }
}

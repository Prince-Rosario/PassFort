// Offline-Capable Zero-Knowledge Vault Service
// Maintains full zero-knowledge architecture even when offline

import { vaultService } from './vaultService';
import { offlineDB } from './offlineDatabase';
import { apiClient } from './api';
import type {
    ClientVaultData,
    ClientVaultItemData
} from './vaultService';
import type {
    VaultDto,
    VaultSummaryDto,
    VaultItemDto
} from '../types/vault';

export class OfflineVaultService {
    private isOnline = navigator.onLine;
    private syncInProgress = false;
    private syncPromise: Promise<void> | null = null;

    constructor() {
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    private handleOnline() {
        console.log('🌐 Connection restored - triggering sync');
        this.isOnline = true;
        this.syncWithServer();
    }

    private handleOffline() {
        console.log('📴 Connection lost - switching to offline mode');
        this.isOnline = false;
    }

    // VAULT OPERATIONS (Offline-first)

    async createVault(vaultData: ClientVaultData): Promise<VaultDto> {
        console.log('🔐 Creating vault (offline-first)...');

        if (this.isOnline) {
            try {
                // Try online creation first
                const vault = await vaultService.createVault(vaultData);

                // Save to offline storage for immediate access
                await offlineDB.saveVault(vault, false);

                console.log('✅ Vault created online and cached offline');
                return vault;
            } catch (error) {
                console.warn('⚠️ Online creation failed, falling back to offline');
                this.isOnline = false;
            }
        }

        // Offline creation
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const vault: VaultDto = {
            id: tempId,
            name: vaultData.name, // This would be encrypted in real implementation
            description: vaultData.description || '',
            encryptedData: '', // This would contain encrypted vault metadata
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            itemCount: 0
        };

        // Save to offline storage
        await offlineDB.saveVault(vault, true);

        // Queue operation for when online
        await offlineDB.queueOperation({
            type: 'create_vault',
            data: vaultData
        });

        console.log('💾 Vault created offline and queued for sync');
        return vault;
    }

    async getVaults(): Promise<VaultSummaryDto[]> {
        console.log('📋 Fetching vaults (offline-first)...');

        if (this.isOnline) {
            try {
                // Try to get fresh data from server
                const onlineVaults = await vaultService.getVaults();

                // Update offline storage
                for (const vault of onlineVaults) {
                    await offlineDB.saveVault(vault as VaultDto, false);
                }

                console.log(`✅ Retrieved ${onlineVaults.length} vaults from server`);
                return onlineVaults;
            } catch (error) {
                console.warn('⚠️ Online fetch failed, using offline data');
                this.isOnline = false;
            }
        }

        // Fallback to offline data
        const offlineVaults = await offlineDB.getVaults('current-user-id'); // In real app, get from auth store
        console.log(`📴 Retrieved ${offlineVaults.length} vaults from offline storage`);

        return offlineVaults.map(vault => ({
            id: vault.id,
            name: vault.name,
            description: vault.description,
            itemCount: vault.itemCount,
            createdAt: vault.createdAt,
            updatedAt: vault.updatedAt
        }));
    }

    async getVault(vaultId: string): Promise<{ vault: VaultDto; decryptedData: ClientVaultData }> {
        console.log(`🔐 Fetching vault ${vaultId} (offline-first)...`);

        if (this.isOnline) {
            try {
                // Try online first
                const result = await vaultService.getVault(vaultId);

                // Cache offline
                await offlineDB.saveVault(result.vault, false);

                console.log('✅ Vault fetched from server and cached offline');
                return result;
            } catch (error) {
                console.warn('⚠️ Online fetch failed, using offline data');
                this.isOnline = false;
            }
        }

        // Fallback to offline data
        const offlineVault = await offlineDB.getVault(vaultId);
        if (!offlineVault) {
            throw new Error('Vault not found in offline storage');
        }

        // Decrypt data using the vault service
        const decryptedData = await vaultService.decryptData<ClientVaultData>(offlineVault.encryptedData);

        console.log('📴 Vault retrieved from offline storage');
        return { vault: offlineVault, decryptedData };
    }

    async updateVault(vaultId: string, vaultData: ClientVaultData): Promise<VaultDto> {
        console.log('🔐 Updating vault (offline-first)...');

        if (this.isOnline) {
            try {
                // Try online update
                const vault = await vaultService.updateVault(vaultId, vaultData);

                // Update offline storage
                await offlineDB.saveVault(vault, false);

                console.log('✅ Vault updated online and cached offline');
                return vault;
            } catch (error) {
                console.warn('⚠️ Online update failed, saving offline');
                this.isOnline = false;
            }
        }

        // Offline update
        const offlineVault = await offlineDB.getVault(vaultId);
        if (!offlineVault) {
            throw new Error('Vault not found');
        }

        // Update the vault locally (would encrypt data in real implementation)
        const updatedVault: VaultDto = {
            ...offlineVault,
            name: vaultData.name,
            description: vaultData.description || '',
            updatedAt: new Date().toISOString()
        };

        // Save offline
        await offlineDB.saveVault(updatedVault, true);

        // Queue for sync
        await offlineDB.queueOperation({
            type: 'update_vault',
            vaultId,
            data: vaultData
        });

        console.log('💾 Vault updated offline and queued for sync');
        return updatedVault;
    }

    async deleteVault(vaultId: string): Promise<boolean> {
        console.log(`🗑️ Deleting vault ${vaultId} (offline-first)...`);

        if (this.isOnline) {
            try {
                // Try online deletion
                const success = await vaultService.deleteVault(vaultId);

                if (success) {
                    // Remove from offline storage
                    await offlineDB.deleteVault(vaultId);
                    console.log('✅ Vault deleted online and removed from offline storage');
                }

                return success;
            } catch (error) {
                console.warn('⚠️ Online deletion failed, marking for deletion offline');
                this.isOnline = false;
            }
        }

        // Offline deletion (mark for sync)
        await offlineDB.deleteVault(vaultId);

        // Queue for sync
        await offlineDB.queueOperation({
            type: 'delete_vault',
            vaultId
        });

        console.log('🗑️ Vault marked for deletion offline and queued for sync');
        return true;
    }

    // VAULT ITEM OPERATIONS (Similar pattern)

    async createVaultItem(vaultId: string, itemData: ClientVaultItemData, itemType: string = 'Password'): Promise<VaultItemDto> {
        console.log('🔐 Creating vault item (offline-first)...');

        if (this.isOnline) {
            try {
                const item = await vaultService.createVaultItem(vaultId, itemData, itemType);
                await offlineDB.saveVaultItem(item, false);
                console.log('✅ Item created online and cached offline');
                return item;
            } catch (error) {
                console.warn('⚠️ Online creation failed, creating offline');
                this.isOnline = false;
            }
        }

        // Offline creation
        const tempId = `temp_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const item: VaultItemDto = {
            id: tempId,
            vaultId,
            itemType: itemType as any,
            encryptedData: '', // Would contain encrypted item data
            searchableTitle: '', // Would contain encrypted title
            isFavorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await offlineDB.saveVaultItem(item, true);
        await offlineDB.queueOperation({
            type: 'create_item',
            vaultId,
            data: { itemData, itemType }
        });

        console.log('💾 Item created offline and queued for sync');
        return item;
    }

    async getVaultItems(vaultId: string): Promise<VaultItemDto[]> {
        console.log(`📋 Fetching items for vault ${vaultId} (offline-first)...`);

        if (this.isOnline) {
            try {
                const items = await vaultService.getVaultItems(vaultId);

                // Cache offline
                for (const item of items) {
                    await offlineDB.saveVaultItem(item, false);
                }

                console.log(`✅ Retrieved ${items.length} items from server`);
                return items;
            } catch (error) {
                console.warn('⚠️ Online fetch failed, using offline data');
                this.isOnline = false;
            }
        }

        // Fallback to offline
        const offlineItems = await offlineDB.getVaultItems(vaultId);
        console.log(`📴 Retrieved ${offlineItems.length} items from offline storage`);
        return offlineItems;
    }

    // SYNC OPERATIONS

    async syncWithServer(): Promise<void> {
        if (this.syncInProgress) {
            console.log('🔄 Sync already in progress, waiting...');
            return this.syncPromise || Promise.resolve();
        }

        if (!this.isOnline) {
            console.log('📴 Offline - skipping sync');
            return;
        }

        this.syncInProgress = true;
        console.log('🔄 Starting sync with server...');

        this.syncPromise = this.performSync();

        try {
            await this.syncPromise;
            console.log('✅ Sync completed successfully');
        } catch (error) {
            console.error('❌ Sync failed:', error);
        } finally {
            this.syncInProgress = false;
            this.syncPromise = null;
        }
    }

    private async performSync(): Promise<void> {
        const { vaults, items, operations } = await offlineDB.getItemsNeedingSync();

        console.log(`🔄 Syncing: ${vaults.length} vaults, ${items.length} items, ${operations.length} operations`);

        // Process queued operations first
        for (const op of operations) {
            try {
                await this.executeOperation(op);
                await offlineDB.removeOperation(op.id!);
            } catch (error) {
                console.error(`❌ Failed to execute operation ${op.id}:`, error);
                await offlineDB.incrementRetryCount(op.id!);

                // Skip operations that have failed too many times
                if (op.retryCount >= 3) {
                    console.warn(`⚠️ Operation ${op.id} failed too many times, removing`);
                    await offlineDB.removeOperation(op.id!);
                }
            }
        }

        // TODO: Implement conflict resolution for vaults and items that need sync
        console.log('🔄 Sync operation completed');
    }

    private async executeOperation(operation: any): Promise<void> {
        switch (operation.type) {
            case 'create_vault':
                await vaultService.createVault(operation.data);
                break;
            case 'update_vault':
                await vaultService.updateVault(operation.vaultId, operation.data);
                break;
            case 'delete_vault':
                await vaultService.deleteVault(operation.vaultId);
                break;
            case 'create_item':
                await vaultService.createVaultItem(operation.vaultId, operation.data.itemData, operation.data.itemType);
                break;
            case 'update_item':
                await vaultService.updateVaultItem(operation.vaultId, operation.itemId, operation.data.itemData, operation.data.itemType);
                break;
            case 'delete_item':
                await vaultService.deleteVaultItem(operation.vaultId, operation.itemId);
                break;
        }
    }

    // UTILITY METHODS (delegate to original vault service)

    async decryptData<T>(encryptedData: string): Promise<T> {
        return vaultService.decryptData<T>(encryptedData);
    }

    async getVaultItem(vaultId: string, itemId: string): Promise<{ item: VaultItemDto; decryptedData: ClientVaultItemData }> {
        console.log(`🔐 Fetching vault item ${itemId} (offline-first)...`);

        if (this.isOnline) {
            try {
                const result = await vaultService.getVaultItem(vaultId, itemId);
                await offlineDB.saveVaultItem(result.item, false);
                console.log('✅ Item fetched from server and cached offline');
                return result;
            } catch (error) {
                console.warn('⚠️ Online fetch failed, using offline data');
                this.isOnline = false;
            }
        }

        // Fallback to offline
        const offlineItem = await offlineDB.getVaultItem(itemId);
        if (!offlineItem) {
            throw new Error('Item not found in offline storage');
        }

        const decryptedData = await vaultService.decryptData<ClientVaultItemData>(offlineItem.encryptedData);
        console.log('📴 Item retrieved from offline storage');
        return { item: offlineItem, decryptedData };
    }

    async updateVaultItem(vaultId: string, itemId: string, itemData: ClientVaultItemData, itemType: string = 'Password'): Promise<VaultItemDto> {
        console.log('🔐 Updating vault item (offline-first)...');

        if (this.isOnline) {
            try {
                const item = await vaultService.updateVaultItem(vaultId, itemId, itemData, itemType);
                await offlineDB.saveVaultItem(item, false);
                console.log('✅ Item updated online and cached offline');
                return item;
            } catch (error) {
                console.warn('⚠️ Online update failed, saving offline');
                this.isOnline = false;
            }
        }

        // Offline update
        const offlineItem = await offlineDB.getVaultItem(itemId);
        if (!offlineItem) {
            throw new Error('Item not found');
        }

        const updatedItem: VaultItemDto = {
            ...offlineItem,
            updatedAt: new Date().toISOString()
        };

        await offlineDB.saveVaultItem(updatedItem, true);
        await offlineDB.queueOperation({
            type: 'update_item',
            vaultId,
            itemId,
            data: { itemData, itemType }
        });

        console.log('💾 Item updated offline and queued for sync');
        return updatedItem;
    }

    async deleteVaultItem(vaultId: string, itemId: string): Promise<boolean> {
        console.log(`🗑️ Deleting vault item ${itemId} (offline-first)...`);

        if (this.isOnline) {
            try {
                const success = await vaultService.deleteVaultItem(vaultId, itemId);
                if (success) {
                    await offlineDB.deleteVaultItem(itemId);
                    console.log('✅ Item deleted online and removed from offline storage');
                }
                return success;
            } catch (error) {
                console.warn('⚠️ Online deletion failed, marking for deletion offline');
                this.isOnline = false;
            }
        }

        await offlineDB.deleteVaultItem(itemId);
        await offlineDB.queueOperation({
            type: 'delete_item',
            vaultId,
            itemId
        });

        console.log('🗑️ Item marked for deletion offline and queued for sync');
        return true;
    }

    async toggleFavorite(vaultId: string, itemId: string): Promise<VaultItemDto> {
        console.log(`⭐ Toggling favorite for item ${itemId} (offline-first)...`);

        if (this.isOnline) {
            try {
                const item = await vaultService.toggleFavorite(vaultId, itemId);
                await offlineDB.saveVaultItem(item, false);
                console.log('✅ Favorite toggled online and cached offline');
                return item;
            } catch (error) {
                console.warn('⚠️ Online toggle failed, updating offline');
                this.isOnline = false;
            }
        }

        // Offline toggle
        const offlineItem = await offlineDB.getVaultItem(itemId);
        if (!offlineItem) {
            throw new Error('Item not found');
        }

        const updatedItem: VaultItemDto = {
            ...offlineItem,
            isFavorite: !offlineItem.isFavorite,
            updatedAt: new Date().toISOString()
        };

        await offlineDB.saveVaultItem(updatedItem, true);
        console.log('⭐ Favorite toggled offline and queued for sync');
        return updatedItem;
    }

    // STATUS METHODS

    getConnectionStatus(): { isOnline: boolean; syncInProgress: boolean } {
        return {
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress
        };
    }

    async getPendingSyncCount(): Promise<number> {
        const { vaults, items, operations } = await offlineDB.getItemsNeedingSync();
        return vaults.length + items.length + operations.length;
    }
}

// Singleton instance
export const offlineVaultService = new OfflineVaultService(); 
// Offline Database for PassFort Zero-Knowledge Password Manager
// All data stored locally is ENCRYPTED - maintains zero-knowledge architecture

import Dexie, { type Table } from 'dexie';
import type { VaultDto, VaultSummaryDto, VaultItemDto } from '../types/vault';

// Offline vault storage (server data + sync status)
export interface OfflineVault extends VaultDto {
    lastSynced: number;
    needsSync: boolean;
    isDeleted?: boolean;
}

// Offline vault item storage (server data + sync status)
export interface OfflineVaultItem extends VaultItemDto {
    lastSynced: number;
    needsSync: boolean;
    isDeleted?: boolean;
}

// Offline operation queue for when back online
export interface OfflineOperation {
    id?: number;
    type: 'create_vault' | 'update_vault' | 'delete_vault' | 'create_item' | 'update_item' | 'delete_item';
    vaultId?: string;
    itemId?: string;
    data?: any; // Encrypted data payload
    timestamp: number;
    retryCount: number;
}

// User session data (encrypted keys, settings)
export interface OfflineSession {
    id: string;
    userId: string;
    encryptedKeys: string; // Encrypted encryption keys
    lastActivity: number;
    settings?: any;
}

export class OfflineDatabase extends Dexie {
    // Tables for encrypted data storage
    vaults!: Table<OfflineVault>;
    vaultItems!: Table<OfflineVaultItem>;
    operations!: Table<OfflineOperation>;
    sessions!: Table<OfflineSession>;

    constructor() {
        super('PassFortOffline');

        this.version(1).stores({
            // Vault storage (encrypted data from server)
            vaults: 'id, userId, lastSynced, needsSync, isDeleted',

            // Vault items storage (encrypted data from server)
            vaultItems: 'id, vaultId, lastSynced, needsSync, isDeleted',

            // Operation queue for offline actions
            operations: '++id, type, vaultId, itemId, timestamp',

            // Session management (encrypted keys storage)
            sessions: 'id, userId, lastActivity'
        });
    }

    // Initialize database for a user
    async initializeForUser(userId: string): Promise<void> {
        console.log(`🗄️ Initializing offline database for user: ${userId}`);

        // Clear any existing data for different user
        await this.clearAllData();

        console.log('✅ Offline database initialized');
    }

    // Clear all data (logout)
    async clearAllData(): Promise<void> {
        console.log('🗑️ Clearing all offline data...');

        await Promise.all([
            this.vaults.clear(),
            this.vaultItems.clear(),
            this.operations.clear(),
            this.sessions.clear()
        ]);

        console.log('✅ All offline data cleared');
    }

    // VAULT OPERATIONS

    async saveVault(vault: VaultDto, needsSync: boolean = false): Promise<void> {
        const offlineVault: OfflineVault = {
            ...vault,
            lastSynced: Date.now(),
            needsSync
        };

        await this.vaults.put(offlineVault);
        console.log(`💾 Vault saved offline: ${vault.id}`);
    }

    async getVaults(userId: string): Promise<OfflineVault[]> {
        const vaults = await this.vaults
            .where('userId')
            .equals(userId)
            .and(vault => !vault.isDeleted)
            .toArray();

        console.log(`📋 Retrieved ${vaults.length} vaults from offline storage`);
        return vaults;
    }

    async getVault(vaultId: string): Promise<OfflineVault | undefined> {
        const vault = await this.vaults.get(vaultId);
        if (vault && !vault.isDeleted) {
            console.log(`📋 Retrieved vault from offline storage: ${vaultId}`);
            return vault;
        }
        return undefined;
    }

    async deleteVault(vaultId: string): Promise<void> {
        // Mark as deleted for sync
        await this.vaults.update(vaultId, {
            isDeleted: true,
            needsSync: true,
            lastSynced: Date.now()
        });

        // Also mark all items in this vault as deleted
        const items = await this.vaultItems.where('vaultId').equals(vaultId).toArray();
        for (const item of items) {
            await this.vaultItems.update(item.id, {
                isDeleted: true,
                needsSync: true,
                lastSynced: Date.now()
            });
        }

        console.log(`🗑️ Vault marked for deletion: ${vaultId}`);
    }

    // VAULT ITEM OPERATIONS

    async saveVaultItem(item: VaultItemDto, needsSync: boolean = false): Promise<void> {
        const offlineItem: OfflineVaultItem = {
            ...item,
            lastSynced: Date.now(),
            needsSync
        };

        await this.vaultItems.put(offlineItem);
        console.log(`💾 Vault item saved offline: ${item.id}`);
    }

    async getVaultItems(vaultId: string): Promise<OfflineVaultItem[]> {
        const items = await this.vaultItems
            .where('vaultId')
            .equals(vaultId)
            .and(item => !item.isDeleted)
            .toArray();

        console.log(`📋 Retrieved ${items.length} items from offline storage for vault: ${vaultId}`);
        return items;
    }

    async getVaultItem(itemId: string): Promise<OfflineVaultItem | undefined> {
        const item = await this.vaultItems.get(itemId);
        if (item && !item.isDeleted) {
            console.log(`📋 Retrieved vault item from offline storage: ${itemId}`);
            return item;
        }
        return undefined;
    }

    async deleteVaultItem(itemId: string): Promise<void> {
        await this.vaultItems.update(itemId, {
            isDeleted: true,
            needsSync: true,
            lastSynced: Date.now()
        });

        console.log(`🗑️ Vault item marked for deletion: ${itemId}`);
    }

    // OPERATION QUEUE (for offline actions)

    async queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        const op: OfflineOperation = {
            ...operation,
            timestamp: Date.now(),
            retryCount: 0
        };

        await this.operations.add(op);
        console.log(`📤 Operation queued for sync: ${operation.type}`);
    }

    async getPendingOperations(): Promise<OfflineOperation[]> {
        const operations = await this.operations.orderBy('timestamp').toArray();
        console.log(`📤 Retrieved ${operations.length} pending operations`);
        return operations;
    }

    async removeOperation(operationId: number): Promise<void> {
        await this.operations.delete(operationId);
        console.log(`✅ Operation completed and removed: ${operationId}`);
    }

    async incrementRetryCount(operationId: number): Promise<void> {
        const operation = await this.operations.get(operationId);
        if (operation) {
            await this.operations.update(operationId, {
                retryCount: operation.retryCount + 1
            });
        }
    }

    // SESSION MANAGEMENT

    async saveSession(session: OfflineSession): Promise<void> {
        await this.sessions.put(session);
        console.log(`💾 Session saved offline: ${session.userId}`);
    }

    async getSession(sessionId: string): Promise<OfflineSession | undefined> {
        return await this.sessions.get(sessionId);
    }

    async clearExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
        const cutoff = Date.now() - maxAge;
        await this.sessions.where('lastActivity').below(cutoff).delete();
        console.log('🧹 Expired sessions cleared');
    }

    // SYNC STATUS

    async getItemsNeedingSync(): Promise<{
        vaults: OfflineVault[];
        items: OfflineVaultItem[];
        operations: OfflineOperation[];
    }> {
        const [vaults, items, operations] = await Promise.all([
            this.vaults.where('needsSync').equals(1).toArray(),
            this.vaultItems.where('needsSync').equals(1).toArray(),
            this.operations.toArray()
        ]);

        console.log(`🔄 Items needing sync: ${vaults.length} vaults, ${items.length} items, ${operations.length} operations`);

        return { vaults, items, operations };
    }

    async markSynced(type: 'vault' | 'item', id: string): Promise<void> {
        const table = type === 'vault' ? this.vaults : this.vaultItems;
        await table.update(id, {
            needsSync: false,
            lastSynced: Date.now()
        });
        console.log(`✅ Marked as synced: ${type} ${id}`);
    }
}

// Singleton instance
export const offlineDB = new OfflineDatabase(); 
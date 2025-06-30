// Zero-Knowledge Vault Service for PassFort Password Manager

import { apiClient } from './api';
import {
    SecureKeyManager,
    generateVaultKey,
    encryptVaultKey,
    decryptVaultKey,
    encryptWithKey,
    decryptWithKey
} from '../utils/crypto';
import type {
    CreateVaultRequestDto,
    VaultDto,
    VaultSummaryDto,
    CreateVaultItemRequestDto,
    UpdateVaultItemRequestDto,
    UpdateVaultRequestDto,
    VaultItemDto
} from '../types/vault';

// Client-side vault data structure (decrypted)
export interface ClientVaultData {
    name: string;
    description?: string;
    // Add other vault metadata as needed
}

// Client-side vault item data structure (decrypted)
export interface ClientVaultItemData {
    title: string;
    username?: string;
    password?: string;
    url?: string;
    notes?: string;
    customFields?: Record<string, string>;
}

class VaultService {
    private keyManager = SecureKeyManager.getInstance();

    // Encrypt data before sending to server
    private async encryptData(data: any): Promise<string> {
        const encryptionKey = this.keyManager.getEncryptionKey();
        if (!encryptionKey) {
            throw new Error('Encryption key not available. Please log in again.');
        }

        const jsonString = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(jsonString);

        // Generate a random IV for each encryption
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            encryptionKey,
            dataBytes
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encryptedData.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedData), iv.length);

        // Convert to base64 for transmission
        return btoa(String.fromCharCode(...combined));
    }

    // Decrypt data received from server
    async decryptData<T>(encryptedData: string): Promise<T> {
        const encryptionKey = this.keyManager.getEncryptionKey();
        console.log(`🔐 VaultService.decryptData - Key check:`, {
            hasKey: !!encryptionKey,
            keyType: encryptionKey?.constructor?.name,
            keyAlgorithm: encryptionKey?.algorithm
        });

        if (!encryptionKey) {
            throw new Error('Encryption key not available. Please log in again.');
        }

        try {
            // Convert from base64
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            console.log(`🔓 Attempting decryption with IV length: ${iv.length}, encrypted length: ${encrypted.length}`);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                encryptionKey,
                encrypted
            );

            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            console.log(`✅ Decryption successful, JSON length: ${jsonString.length}`);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error(`❌ Decryption failed:`, error);
            console.error(`🔐 Key info during error:`, {
                hasKey: !!encryptionKey,
                keyUsages: encryptionKey?.usages,
                keyExtractable: encryptionKey?.extractable
            });
            throw error;
        }
    }

    async getVaultKey(vaultId: string): Promise<CryptoKey | null> {
        // Check if vault key is already cached
        const cachedKey = this.keyManager.getVaultKey(vaultId);
        if (cachedKey) {
            console.log(`🔑 Using cached vault key for vault ${vaultId}`);
            return cachedKey;
        }

        // Get user's personal key
        const userKey = this.keyManager.getEncryptionKey();
        if (!userKey) {
            console.log('❌ No user encryption key available');
            return null;
        }

        try {
            // Get vault info to access the encrypted vault key
            const vaults = await this.getVaults();
            const vaultInfo = vaults.find(v => v.id === vaultId);

            if (!vaultInfo) {
                console.log(`❌ Vault ${vaultId} not found in user's vaults`);
                return null;
            }

            let encryptedVaultKey: string;

            if (vaultInfo.isShared && vaultInfo.encryptedVaultKey) {
                // For shared vaults, use the shared encrypted key
                encryptedVaultKey = vaultInfo.encryptedVaultKey;
                console.log(`🔐 Using shared vault key for vault ${vaultId}`);
            } else {
                // For owned vaults, get the vault details which include the encrypted vault key
                const vaultDetails = await apiClient.getVault(vaultId);
                encryptedVaultKey = vaultDetails.encryptedVaultKey;
                console.log(`🔐 Using owned vault key for vault ${vaultId}`);
            }

            // Check if this is a legacy vault (no encrypted vault key)
            if (!encryptedVaultKey || encryptedVaultKey.trim() === '') {
                console.log(`🔄 Legacy vault detected (${vaultId}) - using user's personal key directly`);
                // For legacy vaults, use the user's personal key directly
                this.keyManager.setVaultKey(vaultId, userKey);
                return userKey;
            }

            let vaultKey: CryptoKey;

            if (vaultInfo.isShared) {
                // For shared vaults, decrypt with team-based key
                const { deriveTeamKey } = await import('../utils/crypto');
                // Find the team ID for this shared vault
                const teamId = this.getTeamIdForSharedVault(vaultId, vaults);
                if (!teamId) {
                    throw new Error(`Could not determine team ID for shared vault ${vaultId}`);
                }
                const teamKey = await deriveTeamKey(teamId);
                vaultKey = await decryptVaultKey(encryptedVaultKey, teamKey);
                console.log(`🔓 Decrypted shared vault key using team-based key`);
            } else {
                // For owned vaults, decrypt with user's personal key
                vaultKey = await decryptVaultKey(encryptedVaultKey, userKey);
                console.log(`🔓 Decrypted owned vault key using personal key`);
            }

            // Cache the decrypted vault key
            this.keyManager.setVaultKey(vaultId, vaultKey);

            console.log(`✅ Successfully decrypted and cached vault key for vault ${vaultId}`);
            return vaultKey;

        } catch (error) {
            console.error(`❌ Failed to get vault key for vault ${vaultId}:`, error);
            console.log(`🔄 Falling back to user's personal key for vault ${vaultId}`);
            // Fallback: use user's personal key (for legacy vaults)
            this.keyManager.setVaultKey(vaultId, userKey);
            return userKey;
        }
    }

    private getTeamIdForSharedVault(vaultId: string, vaults: VaultSummaryDto[]): string | null {
        // Find the vault and check if we can extract team info from the API
        // For now, we'll need to get team shares to find the team ID
        // This is a limitation of the current API structure

        // TODO: In a production system, the VaultSummaryDto should include teamId for shared vaults
        // For now, we'll try to get it from localStorage or make an API call

        // Temporary solution: check if we have team context in localStorage
        const currentTeamId = localStorage.getItem('current_team_id');
        if (currentTeamId) {
            console.log(`🔄 Using current team ID ${currentTeamId} for shared vault ${vaultId}`);
            return currentTeamId;
        }

        console.warn(`⚠️ Could not determine team ID for shared vault ${vaultId}`);
        return null;
    }

    private async trySharedVaultDecryption(vaultId: string, encryptedData: string): Promise<ClientVaultItemData | null> {
        try {
            console.log(`🔄 Attempting proper shared vault decryption for vault ${vaultId}...`);

            // Get the vault-specific key
            const vaultKey = await this.getVaultKey(vaultId);
            if (!vaultKey) {
                console.log(`❌ Could not obtain vault key for vault ${vaultId}`);
                return null;
            }

            // Decrypt the data with the vault key
            const decryptedData = await decryptWithKey<ClientVaultItemData>(encryptedData, vaultKey);

            console.log(`✅ Successfully decrypted shared vault item for vault ${vaultId}`);
            return decryptedData;

        } catch (error) {
            console.log(`❌ Shared vault decryption failed for vault ${vaultId}:`, error);
            return null;
        }
    }

    // VAULT OPERATIONS

    // Decrypt vault name using vault-specific key
    async decryptVaultName(vaultId: string, encryptedName: string): Promise<string> {
        try {
            // Get the vault key (handles both new vault-specific keys and legacy user keys)
            const vaultKey = await this.getVaultKey(vaultId);
            if (!vaultKey) {
                console.warn(`Could not obtain vault key for vault ${vaultId}`);
                return 'Encrypted Vault';
            }

            // Try decrypting with the vault key (could be vault-specific or user's personal key for legacy vaults)
            const decryptedNameData = await decryptWithKey<{ value: string }>(encryptedName, vaultKey);
            return decryptedNameData.value;

        } catch (error) {
            console.warn(`Failed to decrypt vault name for vault ${vaultId}:`, error);
            return 'Encrypted Vault';
        }
    }

    async createVault(vaultData: ClientVaultData): Promise<VaultDto> {
        console.log('🔐 Creating vault with proper vault key generation...');

        const userKey = this.keyManager.getEncryptionKey();
        if (!userKey) {
            throw new Error('User encryption key not available. Please log in again.');
        }

        // Generate a unique encryption key for this vault
        const vaultKey = await generateVaultKey();
        console.log('🔑 Generated unique vault encryption key');

        // Encrypt vault data with the vault key
        const encryptedData = await encryptWithKey(vaultData, vaultKey);
        const encryptedName = await encryptWithKey({ value: vaultData.name }, vaultKey);
        const encryptedDescription = vaultData.description
            ? await encryptWithKey({ value: vaultData.description }, vaultKey)
            : undefined;

        // Encrypt the vault key with the user's personal key for storage
        const encryptedVaultKey = await encryptVaultKey(vaultKey, userKey);
        console.log('🔐 Encrypted vault key with user key for storage');

        const request: CreateVaultRequestDto = {
            name: encryptedName, // Server receives encrypted name
            description: encryptedDescription, // Server receives encrypted description
            encryptedData: encryptedData, // Server receives encrypted metadata
            encryptedVaultKey: encryptedVaultKey // Server receives encrypted vault key
        };

        const response = await apiClient.createVault(request);

        // Cache the vault key for immediate use
        this.keyManager.setVaultKey(response.vault.id, vaultKey);

        console.log('✅ Vault created with proper key management');
        return response.vault;
    }

    async getVaults(): Promise<VaultSummaryDto[]> {
        console.log('📋 Fetching user vaults...');
        const vaults = await apiClient.getVaults();
        console.log(`✅ Retrieved ${vaults.length} vaults`);
        return vaults;
    }

    async getVault(vaultId: string): Promise<{ vault: VaultDto; decryptedData: ClientVaultData }> {
        console.log(`🔐 Fetching vault ${vaultId} with decryption...`);

        const vault = await apiClient.getVault(vaultId);

        // Get vault-specific key
        const vaultKey = await this.getVaultKey(vaultId);
        if (!vaultKey) {
            throw new Error(`Could not obtain encryption key for vault ${vaultId}`);
        }

        // Decrypt vault data with vault-specific key
        const decryptedData = await decryptWithKey<ClientVaultData>(vault.encryptedData, vaultKey);

        console.log('✅ Vault fetched and decrypted with vault-specific key');
        return { vault, decryptedData };
    }

    async updateVault(vaultId: string, vaultData: ClientVaultData): Promise<VaultDto> {
        console.log('🔐 Updating vault with vault-specific encryption...');

        // Get vault-specific key
        const vaultKey = await this.getVaultKey(vaultId);
        if (!vaultKey) {
            throw new Error(`Could not obtain encryption key for vault ${vaultId}`);
        }

        const encryptedData = await encryptWithKey(vaultData, vaultKey);
        const encryptedName = await encryptWithKey({ value: vaultData.name }, vaultKey);
        const encryptedDescription = vaultData.description
            ? await encryptWithKey({ value: vaultData.description }, vaultKey)
            : undefined;

        const request: UpdateVaultRequestDto = {
            name: encryptedName,
            description: encryptedDescription,
            encryptedData: encryptedData
        };

        const response = await apiClient.updateVault(vaultId, request);
        console.log('✅ Vault updated with vault-specific encryption');
        return response;
    }

    // VAULT ITEM OPERATIONS

    async createVaultItem(vaultId: string, itemData: ClientVaultItemData, itemType: string = 'Password'): Promise<VaultItemDto> {
        console.log('🔐 Creating vault item with vault-specific encryption...');

        // Get vault-specific key
        const vaultKey = await this.getVaultKey(vaultId);
        if (!vaultKey) {
            throw new Error(`Could not obtain encryption key for vault ${vaultId}`);
        }

        const encryptedData = await encryptWithKey(itemData, vaultKey);
        const encryptedTitle = await encryptWithKey({ value: itemData.title }, vaultKey);

        const request: CreateVaultItemRequestDto = {
            vaultId: vaultId,
            itemType: itemType as any, // Not encrypted - used for filtering
            encryptedData: encryptedData,
            searchableTitle: encryptedTitle // Encrypted but searchable on client
        };

        const response = await apiClient.createVaultItem(vaultId, request);
        console.log('✅ Vault item created with vault-specific encryption');
        return response.vaultItem;
    }

    async getVaultItems(vaultId: string): Promise<VaultItemDto[]> {
        console.log(`📋 Fetching vault items for vault ${vaultId}...`);
        const items = await apiClient.getVaultItems(vaultId);
        console.log(`✅ Retrieved ${items.length} vault items`);
        return items;
    }

    async getVaultItem(vaultId: string, itemId: string): Promise<{ item: VaultItemDto; decryptedData: ClientVaultItemData }> {
        console.log(`🔐 Fetching vault item ${itemId} with proper vault key decryption...`);

        const item = await apiClient.getVaultItem(vaultId, itemId);

        // Get the vault-specific key (which handles both legacy and new vaults)
        const vaultKey = await this.getVaultKey(vaultId);
        if (!vaultKey) {
            throw new Error(`Could not obtain encryption key for vault ${vaultId}`);
        }

        try {
            // Try decrypting with the vault key
            const decryptedData = await decryptWithKey<ClientVaultItemData>(item.encryptedData, vaultKey);
            console.log('✅ Vault item fetched and decrypted with vault-specific key');
            return { item, decryptedData };
        } catch (error) {
            console.error(`❌ Failed to decrypt vault item ${itemId} from vault ${vaultId}:`, error);

            // Fallback: try with the old decryptData method (for very old items)
            try {
                console.log(`🔄 Trying fallback decryption with legacy method for item ${itemId}...`);
                const fallbackDecryptedData = await this.decryptData<ClientVaultItemData>(item.encryptedData);
                console.log('✅ Vault item decrypted with fallback legacy method');
                return { item, decryptedData: fallbackDecryptedData };
            } catch (fallbackError) {
                console.error(`❌ Fallback decryption also failed for item ${itemId}:`, fallbackError);
                throw error; // Throw the original error
            }
        }
    }

    async updateVaultItem(vaultId: string, itemId: string, itemData: ClientVaultItemData, itemType: string = 'Password'): Promise<VaultItemDto> {
        console.log('🔐 Updating vault item with vault-specific encryption...');
        console.log('🔍 Debug - vaultId:', vaultId);
        console.log('🔍 Debug - itemId:', itemId);

        // Get vault-specific key
        const vaultKey = await this.getVaultKey(vaultId);
        if (!vaultKey) {
            throw new Error(`Could not obtain encryption key for vault ${vaultId}`);
        }

        const encryptedData = await encryptWithKey(itemData, vaultKey);
        const encryptedTitle = await encryptWithKey({ value: itemData.title }, vaultKey);

        const request: UpdateVaultItemRequestDto = {
            id: itemId,
            folderId: undefined, // Not supporting folders yet
            itemType: itemType,
            encryptedData: encryptedData,
            searchableTitle: encryptedTitle
        };

        console.log('🔍 Debug - request object:', {
            id: request.id,
            encryptedDataLength: request.encryptedData.length,
            searchableTitleLength: request.searchableTitle?.length
        });

        const response = await apiClient.updateVaultItem(vaultId, itemId, request);
        console.log('✅ Vault item updated with vault-specific encryption');
        return response.vaultItem;
    }

    async deleteVaultItem(vaultId: string, itemId: string): Promise<boolean> {
        console.log(`🗑️ Deleting vault item ${itemId}...`);
        const response = await apiClient.deleteVaultItem(vaultId, itemId);
        console.log('✅ Vault item deleted');
        return response.success;
    }

    async deleteVault(vaultId: string): Promise<boolean> {
        console.log(`🗑️ Deleting vault ${vaultId}...`);
        const response = await apiClient.deleteVault(vaultId);
        console.log('✅ Vault deleted');
        return response.success;
    }

    async toggleFavorite(vaultId: string, itemId: string): Promise<VaultItemDto> {
        console.log(`⭐ Toggling favorite for item ${itemId}...`);
        const response = await apiClient.toggleFavorite(vaultId, itemId);
        console.log('✅ Favorite status toggled');
        return response;
    }

    // CLIENT-SIDE SEARCH (Zero-Knowledge)
    async searchVaultItems(vaultId: string, searchTerm: string): Promise<Array<{ item: VaultItemDto; decryptedData: ClientVaultItemData }>> {
        console.log(`🔍 Performing client-side zero-knowledge search for: "${searchTerm}"`);

        // Get vault-specific key
        const vaultKey = await this.getVaultKey(vaultId);
        if (!vaultKey) {
            console.warn(`Could not obtain encryption key for vault ${vaultId} - search will fail`);
            return [];
        }

        // Get all items (they come encrypted)
        const encryptedItems = await this.getVaultItems(vaultId);
        const searchResults: Array<{ item: VaultItemDto; decryptedData: ClientVaultItemData }> = [];

        // Decrypt and search on client-side (Zero-Knowledge)
        for (const item of encryptedItems) {
            try {
                // Decrypt with vault-specific key
                const decryptedData = await decryptWithKey<ClientVaultItemData>(item.encryptedData, vaultKey);

                // Search in decrypted data
                const searchLower = searchTerm.toLowerCase();
                const titleMatch = decryptedData.title?.toLowerCase().includes(searchLower);
                const usernameMatch = decryptedData.username?.toLowerCase().includes(searchLower);
                const urlMatch = decryptedData.url?.toLowerCase().includes(searchLower);
                const notesMatch = decryptedData.notes?.toLowerCase().includes(searchLower);

                if (titleMatch || usernameMatch || urlMatch || notesMatch) {
                    searchResults.push({ item, decryptedData });
                }
            } catch (error) {
                console.warn(`Failed to decrypt item ${item.id} for search:`, error);
            }
        }

        console.log(`✅ Zero-knowledge search completed: ${searchResults.length} results`);
        return searchResults;
    }
}

export const vaultService = new VaultService(); 
// Zero-Knowledge Vault Service for PassFort Password Manager

import { apiClient } from './api';
import { SecureKeyManager } from '../utils/crypto';
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

    // VAULT OPERATIONS

    async createVault(vaultData: ClientVaultData): Promise<VaultDto> {
        console.log('🔐 Creating vault with zero-knowledge encryption...');

        const encryptedData = await this.encryptData(vaultData);
        const encryptedName = await this.encryptData({ value: vaultData.name });
        const encryptedDescription = vaultData.description
            ? await this.encryptData({ value: vaultData.description })
            : undefined;

        const request: CreateVaultRequestDto = {
            name: encryptedName, // Server receives encrypted name
            description: encryptedDescription, // Server receives encrypted description
            encryptedData: encryptedData // Server receives encrypted metadata
        };

        const response = await apiClient.createVault(request);
        console.log('✅ Vault created with zero-knowledge encryption');
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

        // Decrypt vault data
        const decryptedData = await this.decryptData<ClientVaultData>(vault.encryptedData);

        console.log('✅ Vault fetched and decrypted');
        return { vault, decryptedData };
    }

    async updateVault(vaultId: string, vaultData: ClientVaultData): Promise<VaultDto> {
        console.log('🔐 Updating vault with zero-knowledge encryption...');

        const encryptedData = await this.encryptData(vaultData);
        const encryptedName = await this.encryptData({ value: vaultData.name });
        const encryptedDescription = vaultData.description
            ? await this.encryptData({ value: vaultData.description })
            : undefined;

        const request: UpdateVaultRequestDto = {
            id: vaultId,
            name: encryptedName,
            description: encryptedDescription,
            encryptedData: encryptedData
        };

        const response = await apiClient.updateVault(vaultId, request);
        console.log('✅ Vault updated with zero-knowledge encryption');
        return response;
    }

    // VAULT ITEM OPERATIONS

    async createVaultItem(vaultId: string, itemData: ClientVaultItemData, itemType: string = 'Password'): Promise<VaultItemDto> {
        console.log('🔐 Creating vault item with zero-knowledge encryption...');

        const encryptedData = await this.encryptData(itemData);
        const encryptedTitle = await this.encryptData({ value: itemData.title });

        const request: CreateVaultItemRequestDto = {
            vaultId: vaultId,
            itemType: itemType as any, // Not encrypted - used for filtering
            encryptedData: encryptedData,
            searchableTitle: encryptedTitle // Encrypted but searchable on client
        };

        const response = await apiClient.createVaultItem(vaultId, request);
        console.log('✅ Vault item created with zero-knowledge encryption');
        return response.vaultItem;
    }

    async getVaultItems(vaultId: string): Promise<VaultItemDto[]> {
        console.log(`📋 Fetching vault items for vault ${vaultId}...`);
        const items = await apiClient.getVaultItems(vaultId);
        console.log(`✅ Retrieved ${items.length} vault items`);
        return items;
    }

    async getVaultItem(vaultId: string, itemId: string): Promise<{ item: VaultItemDto; decryptedData: ClientVaultItemData }> {
        console.log(`🔐 Fetching vault item ${itemId} with decryption...`);

        const item = await apiClient.getVaultItem(vaultId, itemId);

        // Decrypt item data
        const decryptedData = await this.decryptData<ClientVaultItemData>(item.encryptedData);

        console.log('✅ Vault item fetched and decrypted');
        return { item, decryptedData };
    }

    async updateVaultItem(itemId: string, itemData: ClientVaultItemData): Promise<VaultItemDto> {
        console.log('🔐 Updating vault item with zero-knowledge encryption...');

        const encryptedData = await this.encryptData(itemData);
        const encryptedTitle = await this.encryptData({ value: itemData.title });

        const request: UpdateVaultItemRequestDto = {
            encryptedData: encryptedData,
            searchableTitle: encryptedTitle
        };

        const response = await apiClient.updateVaultItem(itemId, request);
        console.log('✅ Vault item updated with zero-knowledge encryption');
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

        // Get all items (they come encrypted)
        const encryptedItems = await this.getVaultItems(vaultId);
        const searchResults: Array<{ item: VaultItemDto; decryptedData: ClientVaultItemData }> = [];

        // Decrypt and search on client-side (Zero-Knowledge)
        for (const item of encryptedItems) {
            try {
                const decryptedData = await this.decryptData<ClientVaultItemData>(item.encryptedData);

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
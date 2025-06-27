// Zero-Knowledge Backup/Restore Service for PassFort Password Manager

import { vaultService, type ClientVaultData, type ClientVaultItemData } from './vaultService';
import { SecureKeyManager, deriveEncryptionKey } from '../utils/crypto';
import type { VaultSummaryDto, VaultItemDto } from '../types/vault';
import { apiClient } from './api';

export interface BackupData {
    version: string;
    timestamp: string;
    encryptedVaults: EncryptedVaultBackup[];
    metadata: BackupMetadata;
}

interface BackupMetadata {
    vaultCount: number;
    itemCount: number;
    createdBy: string;
    securityLevel: string;
}

interface EncryptedVaultBackup {
    id: string;
    encryptedData: string;
    items: EncryptedItemBackup[];
    metadata: {
        itemCount: number;
        createdAt: string;
        updatedAt: string;
    };
}

interface EncryptedItemBackup {
    id: string;
    itemType: string;
    encryptedData: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BackupProgress {
    stage: 'preparing' | 'encrypting' | 'finalizing' | 'complete';
    progress: number;
    message: string;
}

export interface RestoreProgress {
    stage: 'validating' | 'decrypting' | 'importing' | 'complete';
    progress: number;
    message: string;
}

interface MFAStatusData {
    isEnabled: boolean;
    hasRecoveryCodes: boolean;
    recoveryCodesLeft: number;
}

class BackupService {
    private keyManager = SecureKeyManager.getInstance();

    /**
     * Check if user has MFA enabled
     */
    async checkMFAStatus(): Promise<MFAStatusData> {
        try {
            return await apiClient.get<MFAStatusData>('/Mfa/status');
        } catch (error) {
            console.error('Failed to check MFA status:', error);
            throw new Error('Failed to check MFA status');
        }
    }

    /**
     * Verify MFA code for sensitive operations
     */
    async verifyMFACode(code: string): Promise<boolean> {
        try {
            const response = await apiClient.post<{ success: boolean; message: string }>('/Mfa/verify', {
                code: code
            });
            return response.success === true;
        } catch (error) {
            console.error('MFA verification failed:', error);
            return false;
        }
    }

    /**
     * Decrypt data with a specific key (for cross-account restore)
     */
    private async decryptDataWithKey<T>(encryptedData: string, decryptionKey: CryptoKey): Promise<T> {
        try {
            // Convert from base64
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            console.log(`🔓 Decrypting with provided key, IV length: ${iv.length}, encrypted length: ${encrypted.length}`);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                decryptionKey,
                encrypted
            );

            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            console.log(`✅ Cross-account decryption successful, JSON length: ${jsonString.length}`);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error(`❌ Cross-account decryption failed:`, error);
            throw error;
        }
    }

    /**
     * Creates an encrypted backup of all user vaults
     */
    async createBackup(
        userEmail: string,
        onProgress?: (progress: BackupProgress) => void,
        mfaCode?: string
    ): Promise<BackupData> {
        const encryptionKey = this.keyManager.getEncryptionKey();
        if (!encryptionKey) {
            throw new Error('Encryption key not available. Please log in again.');
        }

        // Check if MFA is required
        const mfaStatus = await this.checkMFAStatus();
        if (mfaStatus.isEnabled) {
            if (!mfaCode) {
                throw new Error('MFA_REQUIRED');
            }

            onProgress?.({
                stage: 'preparing',
                progress: 5,
                message: 'Verifying 2FA code...'
            });

            const mfaValid = await this.verifyMFACode(mfaCode);
            if (!mfaValid) {
                throw new Error('Invalid 2FA code');
            }
        }

        onProgress?.({
            stage: 'preparing',
            progress: 10,
            message: 'Preparing backup...'
        });

        console.log('🔐 Creating zero-knowledge backup...');

        // Get all vaults
        const vaults = await vaultService.getVaults();
        const encryptedVaults: EncryptedVaultBackup[] = [];
        let totalItems = 0;

        onProgress?.({
            stage: 'encrypting',
            progress: 0,
            message: 'Encrypting vault data...'
        });

        // Process each vault
        for (let i = 0; i < vaults.length; i++) {
            const vault = vaults[i];
            const vaultData = await vaultService.getVault(vault.id);
            const vaultItems = await vaultService.getVaultItems(vault.id);

            // Encrypt vault items
            const encryptedItems: EncryptedItemBackup[] = [];
            for (const item of vaultItems) {
                encryptedItems.push({
                    id: item.id,
                    itemType: item.itemType,
                    encryptedData: item.encryptedData, // Already encrypted
                    isFavorite: item.isFavorite,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt
                });
            }

            encryptedVaults.push({
                id: vault.id,
                encryptedData: vaultData.vault.encryptedData, // Already encrypted
                items: encryptedItems,
                metadata: {
                    itemCount: vaultItems.length,
                    createdAt: vault.createdAt,
                    updatedAt: vault.updatedAt
                }
            });

            totalItems += vaultItems.length;

            onProgress?.({
                stage: 'encrypting',
                progress: Math.round(((i + 1) / vaults.length) * 100),
                message: `Processed ${i + 1} of ${vaults.length} vaults...`
            });
        }

        onProgress?.({
            stage: 'finalizing',
            progress: 90,
            message: 'Finalizing backup...'
        });

        const backup: BackupData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            encryptedVaults,
            metadata: {
                vaultCount: vaults.length,
                itemCount: totalItems,
                createdBy: userEmail,
                securityLevel: 'balanced' // Fixed security level
            }
        };

        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: 'Backup created successfully!'
        });

        console.log(`✅ Backup created: ${vaults.length} vaults, ${totalItems} items`);
        return backup;
    }

    /**
     * Downloads backup as an encrypted JSON file
     */
    async downloadBackup(userEmail: string, onProgress?: (progress: BackupProgress) => void, mfaCode?: string): Promise<void> {
        const backup = await this.createBackup(userEmail, onProgress, mfaCode);

        const backupJson = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `passfort-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Validates a backup file
     */
    validateBackup(backupData: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!backupData.version) {
            errors.push('Missing backup version');
        }

        if (!backupData.timestamp) {
            errors.push('Missing backup timestamp');
        }

        if (!Array.isArray(backupData.encryptedVaults)) {
            errors.push('Invalid vaults data');
        }

        if (!backupData.metadata) {
            errors.push('Missing backup metadata');
        }

        // Check version compatibility
        if (backupData.version && !this.isVersionCompatible(backupData.version)) {
            errors.push(`Incompatible backup version: ${backupData.version}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Restores vaults from backup with optional master password for cross-account restore
     */
    async restoreFromBackup(
        backupData: BackupData,
        onProgress?: (progress: RestoreProgress) => void,
        originalMasterPassword?: string,
        mfaCode?: string
    ): Promise<{ success: boolean; importedVaults: number; importedItems: number }> {
        let decryptionKey: CryptoKey;

        if (originalMasterPassword && backupData.metadata.createdBy) {
            // Cross-account restore: derive key from original account's master password
            console.log('🔑 Cross-account restore: deriving key from original master password');
            decryptionKey = await deriveEncryptionKey(
                backupData.metadata.createdBy,
                originalMasterPassword
            );
        } else {
            // Same-account restore: use current encryption key
            const currentKey = this.keyManager.getEncryptionKey();
            if (!currentKey) {
                throw new Error('Encryption key not available. Please log in again.');
            }
            decryptionKey = currentKey;
        }

        // Check if MFA is required for current user
        const mfaStatus = await this.checkMFAStatus();
        if (mfaStatus.isEnabled) {
            if (!mfaCode) {
                throw new Error('MFA_REQUIRED');
            }

            onProgress?.({
                stage: 'validating',
                progress: 5,
                message: 'Verifying 2FA code...'
            });

            const mfaValid = await this.verifyMFACode(mfaCode);
            if (!mfaValid) {
                throw new Error('Invalid 2FA code');
            }
        }

        onProgress?.({
            stage: 'validating',
            progress: 10,
            message: 'Validating backup...'
        });

        const validation = this.validateBackup(backupData);
        if (!validation.isValid) {
            throw new Error(`Invalid backup file: ${validation.errors.join(', ')}`);
        }

        console.log('🔄 Starting restore from backup...');

        onProgress?.({
            stage: 'decrypting',
            progress: 0,
            message: 'Decrypting backup data...'
        });

        let importedVaults = 0;
        let importedItems = 0;

        // Restore each vault
        for (let i = 0; i < backupData.encryptedVaults.length; i++) {
            const vaultBackup = backupData.encryptedVaults[i];

            try {
                onProgress?.({
                    stage: 'importing',
                    progress: Math.round((i / backupData.encryptedVaults.length) * 100),
                    message: `Importing vault ${i + 1} of ${backupData.encryptedVaults.length}...`
                });

                // Decrypt vault data to get the name for creating new vault
                const vaultData = originalMasterPassword
                    ? await this.decryptDataWithKey<ClientVaultData>(vaultBackup.encryptedData, decryptionKey)
                    : await vaultService.decryptData<ClientVaultData>(vaultBackup.encryptedData);

                // Create new vault with imported name
                const newVault = await vaultService.createVault({
                    name: `${vaultData.name} (Restored)`,
                    description: vaultData.description
                });

                // Import items into the new vault
                for (const itemBackup of vaultBackup.items) {
                    try {
                        // Decrypt item data
                        const itemData = originalMasterPassword
                            ? await this.decryptDataWithKey<ClientVaultItemData>(itemBackup.encryptedData, decryptionKey)
                            : await vaultService.decryptData<ClientVaultItemData>(itemBackup.encryptedData);

                        // Create new item
                        await vaultService.createVaultItem(newVault.id, itemData, itemBackup.itemType);

                        // Set favorite status if needed
                        if (itemBackup.isFavorite) {
                            // Note: Would need to implement toggleFavorite after creation
                        }

                        importedItems++;
                    } catch (error) {
                        console.warn(`Failed to import item ${itemBackup.id}:`, error);
                    }
                }

                importedVaults++;
            } catch (error) {
                console.error(`Failed to import vault ${vaultBackup.id}:`, error);
            }
        }

        onProgress?.({
            stage: 'complete',
            progress: 100,
            message: 'Restore completed successfully!'
        });

        console.log(`✅ Restore completed: ${importedVaults} vaults, ${importedItems} items`);

        return {
            success: true,
            importedVaults,
            importedItems
        };
    }

    /**
     * Handles file upload for restore
     */
    async restoreFromFile(
        file: File,
        onProgress?: (progress: RestoreProgress) => void,
        originalMasterPassword?: string,
        mfaCode?: string
    ): Promise<{ success: boolean; importedVaults: number; importedItems: number }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const backupJson = e.target?.result as string;
                    const backupData = JSON.parse(backupJson);

                    const result = await this.restoreFromBackup(backupData, onProgress, originalMasterPassword, mfaCode);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse backup file: ${error}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read backup file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Checks if backup version is compatible
     */
    private isVersionCompatible(version: string): boolean {
        // For now, only support version 1.0.0
        return version === '1.0.0';
    }
}

export const backupService = new BackupService(); 
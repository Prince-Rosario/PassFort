// Zero-Knowledge Cryptographic Utilities for PassFort Password Manager

/**
 * ZERO-KNOWLEDGE SECURITY IMPLEMENTATION
 * 
 * This ensures that:
 * 1. Master password NEVER leaves the device
 * 2. Server only receives derived authentication hash
 * 3. Encryption keys are derived locally for vault encryption
 */

import { scrypt } from 'scrypt-js';

// Security level configurations
export const SecurityLevel = {
    FAST: 'fast' as const,           // N=8192  (2^13) - ~8.5 MiB  - ~170ms
    BALANCED: 'balanced' as const,   // N=16384 (2^14) - ~17 MiB   - ~336ms (current)
    STRONG: 'strong' as const,       // N=32768 (2^15) - ~34 MiB   - ~650ms
    MAXIMUM: 'maximum' as const      // N=131072 (2^17) - ~134 MiB - ~2600ms (OWASP)
} as const;

export type SecurityLevel = typeof SecurityLevel[keyof typeof SecurityLevel];

// Scrypt parameter configurations
const SCRYPT_CONFIGS = {
    [SecurityLevel.FAST]: {
        N: 8192,   // 2^13
        r: 8,
        p: 1,
        dkLen: 32,
        memoryMiB: 8.5,
        estimatedMs: 170
    },
    [SecurityLevel.BALANCED]: {
        N: 16384,  // 2^14 (current default)
        r: 8,
        p: 1,
        dkLen: 32,
        memoryMiB: 17,
        estimatedMs: 336
    },
    [SecurityLevel.STRONG]: {
        N: 32768,  // 2^15
        r: 8,
        p: 1,
        dkLen: 32,
        memoryMiB: 34,
        estimatedMs: 650
    },
    [SecurityLevel.MAXIMUM]: {
        N: 131072, // 2^17 (OWASP recommended)
        r: 8,
        p: 1,
        dkLen: 32,
        memoryMiB: 134,
        estimatedMs: 2600
    }
};

const AUTH_SALT_SUFFIX = 'auth';
const ENCRYPTION_SALT_SUFFIX = 'encryption';

// Fixed security level to prevent vault decryption issues
const FIXED_SECURITY_LEVEL: SecurityLevel = SecurityLevel.BALANCED;

/**
 * Gets the security level (always BALANCED for consistency)
 */
export function getSecurityLevel(): SecurityLevel {
    return FIXED_SECURITY_LEVEL;
}

/**
 * Derives a deterministic salt from email for consistent key derivation
 */
function deriveSalt(email: string, suffix: string): Uint8Array {
    const combined = `${email.toLowerCase()}:${suffix}`;
    const encoder = new TextEncoder();
    return encoder.encode(combined);
}

/**
 * Derives authentication hash from master password for server authentication
 * This hash is sent to the server instead of the raw master password
 */
export async function deriveAuthHash(email: string, masterPassword: string, securityLevel?: SecurityLevel): Promise<string> {
    const salt = deriveSalt(email, AUTH_SALT_SUFFIX);
    const passwordBytes = new TextEncoder().encode(masterPassword);
    const levelToUse = securityLevel || FIXED_SECURITY_LEVEL;
    const config = SCRYPT_CONFIGS[levelToUse];

    console.log(`🔐 Deriving auth hash with ${levelToUse.toUpperCase()} security (${config.memoryMiB} MiB)`);
    const startTime = performance.now();

    const derivedKey = await scrypt(
        passwordBytes,
        salt,
        config.N,
        config.r,
        config.p,
        config.dkLen
    );

    const actualTime = Math.round(performance.now() - startTime);
    console.log(`✅ Auth hash derived in ${actualTime}ms (estimated: ${config.estimatedMs}ms)`);

    // Convert to base64 for transmission
    return btoa(String.fromCharCode(...derivedKey));
}

/**
 * Derives encryption key from master password for vault encryption/decryption
 * This key NEVER leaves the device
 */
export async function deriveEncryptionKey(email: string, masterPassword: string, securityLevel?: SecurityLevel): Promise<CryptoKey> {
    const salt = deriveSalt(email, ENCRYPTION_SALT_SUFFIX);
    const passwordBytes = new TextEncoder().encode(masterPassword);
    const levelToUse = securityLevel || FIXED_SECURITY_LEVEL;
    const config = SCRYPT_CONFIGS[levelToUse];

    console.log(`🔐 Deriving encryption key with ${levelToUse.toUpperCase()} security`);
    const startTime = performance.now();

    const derivedKey = await scrypt(
        passwordBytes,
        salt,
        config.N,
        config.r,
        config.p,
        config.dkLen
    );

    const actualTime = Math.round(performance.now() - startTime);
    console.log(`✅ Encryption key derived in ${actualTime}ms`);

    // Import as a CryptoKey for use with Web Crypto API
    return await crypto.subtle.importKey(
        'raw',
        derivedKey,
        { name: 'AES-GCM' },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
    );
}

/**
 * Stores encryption key securely in memory (not persistent storage)
 */
export class SecureKeyManager {
    private static instance: SecureKeyManager;
    private encryptionKey: CryptoKey | null = null;
    private vaultKeys: Map<string, CryptoKey> = new Map(); // Cache for vault-specific keys

    static getInstance(): SecureKeyManager {
        if (!SecureKeyManager.instance) {
            SecureKeyManager.instance = new SecureKeyManager();
        }
        return SecureKeyManager.instance;
    }

    setEncryptionKey(key: CryptoKey): void {
        this.encryptionKey = key;
    }

    getEncryptionKey(): CryptoKey | null {
        return this.encryptionKey;
    }

    // Vault-specific key management
    setVaultKey(vaultId: string, key: CryptoKey): void {
        this.vaultKeys.set(vaultId, key);
    }

    getVaultKey(vaultId: string): CryptoKey | null {
        return this.vaultKeys.get(vaultId) || null;
    }

    clearVaultKey(vaultId: string): void {
        this.vaultKeys.delete(vaultId);
    }

    clearKeys(): void {
        this.encryptionKey = null;
        this.vaultKeys.clear();
    }
}

/**
 * Validates master password strength for zero-knowledge security
 */
export function validateMasterPasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    issues: string[];
} {
    const issues: string[] = [];
    let score = 0;

    // Minimum length
    if (password.length < 12) {
        issues.push('Password must be at least 12 characters long');
    } else {
        score += 1;
    }

    // Character variety
    if (!/[a-z]/.test(password)) {
        issues.push('Password must contain lowercase letters');
    } else {
        score += 1;
    }

    if (!/[A-Z]/.test(password)) {
        issues.push('Password must contain uppercase letters');
    } else {
        score += 1;
    }

    if (!/\d/.test(password)) {
        issues.push('Password must contain numbers');
    } else {
        score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        issues.push('Password must contain special characters');
    } else {
        score += 1;
    }

    // Length bonus
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;

    return {
        isValid: issues.length === 0 && password.length >= 12,
        score,
        issues
    };
}

/**
 * Generates a new random encryption key for vault-specific encryption
 */
export async function generateVaultKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true, // extractable for key sharing
        ['encrypt', 'decrypt']
    );
}

/**
 * Derives a team-based encryption key that any team member can access
 * This is a demonstration approach for shared vault access
 */
export async function deriveTeamKey(teamId: string): Promise<CryptoKey> {
    // Create a deterministic salt from the team ID
    const teamSalt = new TextEncoder().encode(`team:${teamId}:shared`);

    // Get current user's email for consistent key derivation
    const userEmail = localStorage.getItem('user_email') || 'default';

    // Create a base key material from team ID and user context
    const keyMaterial = new TextEncoder().encode(`${teamId}:${userEmail}:teamkey`);

    // Use PBKDF2 to derive a deterministic key
    const baseKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Derive the team key
    const teamKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: teamSalt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, // Not extractable
        ['encrypt', 'decrypt']
    );

    console.log(`🔑 Derived team-based key for team ${teamId}`);
    return teamKey;
}

/**
 * Encrypts a vault key with another key (for sharing or storage)
 */
export async function encryptVaultKey(vaultKey: CryptoKey, encryptionKey: CryptoKey): Promise<string> {
    // Export the vault key as raw bytes
    const rawKey = await crypto.subtle.exportKey('raw', vaultKey);

    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the raw key
    const encryptedKey = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        encryptionKey,
        rawKey
    );

    // Combine IV and encrypted key
    const combined = new Uint8Array(iv.length + encryptedKey.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedKey), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts an encrypted vault key
 */
export async function decryptVaultKey(encryptedVaultKey: string, decryptionKey: CryptoKey): Promise<CryptoKey> {
    try {
        // Convert from base64
        const combined = new Uint8Array(
            atob(encryptedVaultKey).split('').map(char => char.charCodeAt(0))
        );

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt the key
        const decryptedKeyData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            decryptionKey,
            encrypted
        );

        // Import as a CryptoKey
        return await crypto.subtle.importKey(
            'raw',
            decryptedKeyData,
            { name: 'AES-GCM' },
            true, // extractable for further sharing
            ['encrypt', 'decrypt']
        );
    } catch (error) {
        console.error('Failed to decrypt vault key:', error);
        throw new Error('Failed to decrypt vault key');
    }
}

/**
 * Encrypts data using AES-GCM
 */
export async function encryptWithKey(data: any, key: CryptoKey): Promise<string> {
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
        key,
        dataBytes
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for transmission
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data using AES-GCM
 */
export async function decryptWithKey<T>(encryptedData: string, key: CryptoKey): Promise<T> {
    try {
        // Convert from base64
        const combined = new Uint8Array(
            atob(encryptedData).split('').map(char => char.charCodeAt(0))
        );

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decryptedData);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw error;
    }
} 
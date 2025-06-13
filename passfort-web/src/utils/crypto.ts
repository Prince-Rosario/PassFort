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

    clearKeys(): void {
        this.encryptionKey = null;
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
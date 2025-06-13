// Vault and Item Types for PassFort Zero-Knowledge Password Manager

// Item Types
export enum VaultItemType {
    LOGIN = 'login',
    SECURE_NOTE = 'secure_note',
    CREDIT_CARD = 'credit_card',
    IDENTITY = 'identity',
    SSH_KEY = 'ssh_key',
    API_KEY = 'api_key',
    SOFTWARE_LICENSE = 'software_license'
}

// Base vault item structure
export interface VaultItemDto {
    id: string;
    vaultId: string;
    itemType: VaultItemType;
    searchableTitle?: string;
    encryptedData: string;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
    lastAccessedAt?: string;
}

// Client-side decrypted item data structures
export interface BaseItemData {
    title: string;
    notes?: string;
    tags?: string[];
    favorite?: boolean;
}

export interface LoginItemData extends BaseItemData {
    username: string;
    password: string;
    url: string;
    totpSecret?: string; // For 2FA codes
}

export interface SecureNoteData extends BaseItemData {
    content: string;
}

export interface CreditCardData extends BaseItemData {
    cardholderName: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    brand?: string; // Visa, Mastercard, etc.
}

export interface IdentityData extends BaseItemData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    // ID Documents
    passportNumber?: string;
    driverLicenseNumber?: string;
    socialSecurityNumber?: string;
}

export interface SSHKeyData extends BaseItemData {
    keyName: string;
    publicKey: string;
    privateKey: string;
    passphrase?: string;
    fingerprint?: string;
    keyType: 'rsa' | 'ed25519' | 'ecdsa' | 'dsa';
    keySize?: number;
}

export interface APIKeyData extends BaseItemData {
    serviceName: string;
    apiKey: string;
    apiSecret?: string;
    endpoint?: string;
    documentation?: string;
}

export interface SoftwareLicenseData extends BaseItemData {
    softwareName: string;
    licenseKey: string;
    version: string;
    email?: string;
    company?: string;
    purchaseDate?: string;
    expiryDate?: string;
}

// Union type for all item data
export type VaultItemData =
    | LoginItemData
    | SecureNoteData
    | CreditCardData
    | IdentityData
    | SSHKeyData
    | APIKeyData
    | SoftwareLicenseData;

// Client-side vault data structure
export interface ClientVaultData {
    name: string;
    description?: string;
}

// Vault summary from server
export interface VaultSummaryDto {
    id: string;
    name: string; // Encrypted
    description?: string; // Encrypted
    itemCount: number;
    createdAt: string;
    updatedAt: string;
}

// Full vault details
export interface VaultDto extends VaultSummaryDto {
    encryptedData: string;
}

// Request DTOs for API
export interface CreateVaultRequestDto {
    name: string; // Will be encrypted client-side
    description?: string; // Will be encrypted client-side
    encryptedData: string; // Encrypted vault metadata
}

export interface UpdateVaultRequestDto {
    name?: string;
    description?: string;
    encryptedData?: string;
}

export interface CreateVaultItemRequestDto {
    vaultId: string;
    itemType: VaultItemType;
    encryptedData: string; // All item data encrypted client-side
    searchableTitle?: string; // Encrypted searchable title
}

export interface UpdateVaultItemRequestDto {
    encryptedData: string;
    searchableTitle?: string;
}

// Item type metadata for UI
export interface ItemTypeConfig {
    type: VaultItemType;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    fields: string[]; // Key fields for display
}

// Form data interfaces (for React Hook Form)
export interface LoginFormData {
    title: string;
    username: string;
    password: string;
    url: string;
    notes?: string;
    totpSecret?: string;
}

export interface SecureNoteFormData {
    title: string;
    content: string;
    notes?: string;
}

export interface CreditCardFormData {
    title: string;
    cardholderName: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    brand?: string;
    notes?: string;
}

export interface IdentityFormData {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    passportNumber?: string;
    driverLicenseNumber?: string;
    socialSecurityNumber?: string;
    notes?: string;
}

export interface SSHKeyFormData {
    title: string;
    keyName: string;
    publicKey: string;
    privateKey: string;
    passphrase?: string;
    keyType: 'rsa' | 'ed25519' | 'ecdsa' | 'dsa';
    keySize?: number;
    notes?: string;
}

export interface APIKeyFormData {
    title: string;
    serviceName: string;
    apiKey: string;
    apiSecret?: string;
    endpoint?: string;
    documentation?: string;
    notes?: string;
}

export interface SoftwareLicenseFormData {
    title: string;
    softwareName: string;
    licenseKey: string;
    version: string;
    email?: string;
    company?: string;
    purchaseDate?: string;
    expiryDate?: string;
    notes?: string;
}

// Response DTOs
export interface CreateVaultResponseDto {
    success: boolean;
    message: string;
    vault: VaultDto;
}

export interface CreateVaultItemResponseDto {
    success: boolean;
    message: string;
    vaultItem: VaultItemDto;
}

export interface UpdateVaultItemResponseDto {
    success: boolean;
    message: string;
    vaultItem: VaultItemDto;
}

// Folder types (for future implementation)
export interface VaultFolderDto {
    id: string;
    vaultId: string;
    parentFolderId?: string;
    encryptedName: string; // Encrypted client-side
    encryptedDescription?: string; // Encrypted client-side
    createdAt: string;
    updatedAt: string;
} 
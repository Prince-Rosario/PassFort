// Authentication Types for PassFort Zero-Knowledge Password Manager

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  masterPassword: string;
}

export interface RegisterRequest {
  email: string;
  masterPassword: string;
  confirmMasterPassword: string;
  firstName: string;
  lastName: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface AuthError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Crypto-related types for zero-knowledge architecture
export interface CryptoKeys {
  masterKey: Uint8Array;
  encryptionKey: Uint8Array;
  authKey: Uint8Array;
  salt: Uint8Array;
}

export interface EncryptedData {
  data: string;
  nonce: string;
}

export interface KeyDerivationParams {
  password: string;
  salt: Uint8Array;
  iterations?: number;
  memory?: number;
  parallelism?: number;
} 
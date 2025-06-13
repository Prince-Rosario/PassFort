// Authentication Store for PassFort Zero-Knowledge Password Manager

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, LoginRequest, RegisterRequest, SecureLoginRequest, SecureRegisterRequest } from '../types/auth';
import { apiClient, ApiError } from '../services/api';
import { deriveAuthHash, deriveEncryptionKey, SecureKeyManager, getSecurityLevel } from '../utils/crypto';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<any>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (userData: any) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          console.log('🔐 ZERO-KNOWLEDGE LOGIN: Getting user security level...');

          // First, get the user's security level to use correct Scrypt parameters
          const { securityLevel } = await apiClient.getUserSecurityLevel(credentials.email);
          console.log(`📋 User security level: ${securityLevel.toUpperCase()}`);

          // Additional debug info
          console.log('🔐 Login credentials check:', {
            hasEmail: !!credentials.email,
            hasPassword: !!credentials.masterPassword,
            hasTwoFactorCode: !!credentials.twoFactorCode,
            securityLevel: securityLevel
          });

          console.log('🔐 Deriving authentication hash with user security level...');

          // Derive authentication hash using the user's stored security level
          const authHash = await deriveAuthHash(credentials.email, credentials.masterPassword, securityLevel as any);

          console.log('✅ Authentication hash derived, calling API with hash...');

          // Send only the derived hash to the server, not the raw password
          const secureCredentials: SecureLoginRequest = {
            email: credentials.email,
            masterPasswordHash: authHash, // Server receives hash, not password
            rememberMe: credentials.rememberMe,
            twoFactorCode: credentials.twoFactorCode
          };

          const response = await apiClient.login(secureCredentials);

          console.log('🔑 Deriving encryption key for vault...');

          // Derive encryption key for vault using the same security level
          const encryptionKey = await deriveEncryptionKey(credentials.email, credentials.masterPassword, securityLevel as any);

          // Store encryption key securely in memory
          const keyManager = SecureKeyManager.getInstance();
          keyManager.setEncryptionKey(encryptionKey);

          // Verify key was stored correctly
          const storedKey = keyManager.getEncryptionKey();
          console.log('🔐 Encryption key storage verification:', {
            keyDerived: !!encryptionKey,
            keyStored: !!storedKey,
            keysMatch: encryptionKey === storedKey,
            keyAlgorithm: storedKey?.algorithm,
            keyUsages: storedKey?.usages
          });

          console.log('✅ Zero-knowledge login complete!');

          // Set the access token in the API client
          apiClient.setAccessToken(response.accessToken);

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof ApiError
            ? error.message
            : 'Login failed. Please try again.';

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });

          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          console.log('🔐 ZERO-KNOWLEDGE REGISTRATION: Deriving password hash...');

          // Derive authentication hash from master password (NEVER send raw password)
          const authHash = await deriveAuthHash(userData.email, userData.masterPassword);
          const confirmAuthHash = await deriveAuthHash(userData.email, userData.confirmMasterPassword);

          console.log('✅ Password hashes derived for registration');

          // Send only the derived hashes to the server, not the raw passwords
          const secureUserData: SecureRegisterRequest = {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            masterPasswordHash: authHash,
            confirmMasterPasswordHash: confirmAuthHash,
            securityLevel: getSecurityLevel(), // Always BALANCED for consistency
          };

          const response = await apiClient.register(secureUserData);

          console.log('✅ Zero-knowledge registration complete!');

          set({
            isLoading: false,
            error: null,
          });

          // Note: Registration doesn't automatically log in the user
          // as per the zero-knowledge architecture
          return response;
        } catch (error) {
          const errorMessage = error instanceof ApiError
            ? error.message
            : 'Registration failed. Please try again.';

          set({
            isLoading: false,
            error: errorMessage,
          });

          throw error;
        }
      },

      logout: async () => {
        console.log('Logout started...');
        const { refreshToken, accessToken } = get();

        console.log('Current state:', {
          hasRefreshToken: !!refreshToken,
          hasAccessToken: !!accessToken,
          refreshTokenLength: refreshToken?.length,
          accessTokenLength: accessToken?.length
        });

        set({ isLoading: true, error: null });

        // Ensure API client has the current access token
        if (accessToken) {
          apiClient.setAccessToken(accessToken);
        }

        try {
          // Only call logout API if we have a refresh token
          if (refreshToken) {
            console.log('Calling API logout with refresh token...');
            await apiClient.logout(refreshToken);
            console.log('API logout successful');
          } else {
            console.log('No refresh token, skipping API call');
          }
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error);

          // Set error but don't throw - we still want to clear local state
          set({ error: error instanceof ApiError ? error.message : 'Logout failed on server, but clearing local session.' });
        }

        console.log('Clearing local state...');
        // Always clear local state regardless of API success/failure
        // Clear the access token from the API client
        apiClient.setAccessToken(null);

        // Clear all auth state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          // Don't clear error here - let it show briefly if there was an API error
        });

        // Clear encryption keys from memory (CRITICAL for zero-knowledge security)
        SecureKeyManager.getInstance().clearKeys();

        // Clear persisted storage completely
        if (typeof window !== 'undefined') {
          console.log('Clearing localStorage...');
          // Clear all PassFort related data
          localStorage.removeItem('passfort-auth');
          localStorage.removeItem('cryptoKeys');
          sessionStorage.clear();

          // Clear any other app-specific storage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('passfort-') || key.startsWith('vault-')) {
              localStorage.removeItem(key);
            }
          });
        }

        console.log('🔐 Zero-knowledge logout completed - all keys cleared from memory');
      },

      refreshAuth: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.refreshToken(refreshToken);

          // Set the new access token in the API client
          apiClient.setAccessToken(response.accessToken);

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof ApiError
            ? error.message
            : 'Session refresh failed. Please log in again.';

          // Clear auth state on refresh failure
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });

          // Clear the access token from the API client
          apiClient.setAccessToken(null);

          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      updateUser: (userData: any) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }));
      },
    }),
    {
      name: 'passfort-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          apiClient.setAccessToken(state.accessToken);
        }
      },
    }
  )
); 
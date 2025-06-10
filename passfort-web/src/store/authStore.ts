// Authentication Store for PassFort Zero-Knowledge Password Manager

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, LoginRequest, RegisterRequest } from '../types/auth';
import { apiClient, ApiError } from '../services/api';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<any>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
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
          const response = await apiClient.login(credentials);
          
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
          const response = await apiClient.register(userData);
          
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
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error);
        }
        
        // Clear the access token from the API client
        apiClient.setAccessToken(null);
        
        // Clear all auth state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        
        // Clear any crypto keys from memory (for security)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cryptoKeys');
          sessionStorage.clear();
        }
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
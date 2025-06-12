// API Service for PassFort Zero-Knowledge Password Manager

import type {
  SecureLoginRequest,
  SecureRegisterRequest,
  TokenResponse,
  RegisterResponse,
  AuthError,
  User
} from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5123/api';

class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// HTTP client with automatic token handling
class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add any existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    }

    if (this.accessToken && !endpoint.includes('/Auth/login') && !endpoint.includes('/Auth/register')) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: AuthError;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new ApiError(
          errorData.message || 'An error occurred',
          response.status,
          errorData.errors
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }

      throw new ApiError('Network error occurred', 0);
    }
  }

  // Authentication endpoints
  async login(credentials: SecureLoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/Auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: SecureRegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/Auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    return this.request<TokenResponse>('/Auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(refreshToken: string): Promise<void> {
    return this.request<void>('/Auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/Auth/me');
  }

  async getUserSecurityLevel(email: string): Promise<{ securityLevel: string }> {
    return this.request<{ securityLevel: string }>('/Auth/security-level', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Generic CRUD methods for future use
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError }; 
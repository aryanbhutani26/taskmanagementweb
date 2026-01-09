import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import {
  AuthResponse,
  TokenResponse,
  RegisterRequest,
  LoginRequest,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQuery,
  PaginatedTasks,
  ErrorResponse
} from '@/types';

class APIClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(this.enhanceError(error));
      }
    );

    // Response interceptor to handle token refresh and errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Enhance error with additional context
        const enhancedError = this.enhanceError(error);

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(this.enhanceError(refreshError as AxiosError));
          }
        }

        return Promise.reject(enhancedError);
      }
    );
  }

  private enhanceError(error: AxiosError): AxiosError & { isNetworkError?: boolean; isTimeoutError?: boolean } {
    const enhancedError = error as AxiosError & { isNetworkError?: boolean; isTimeoutError?: boolean };
    
    // Mark network errors
    if (!error.response) {
      enhancedError.isNetworkError = true;
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        enhancedError.isTimeoutError = true;
      }
    }

    return enhancedError;
  }

  private getAccessToken(): string | null {
    return Cookies.get('accessToken') || null;
  }

  private getRefreshToken(): string | null {
    return Cookies.get('refreshToken') || null;
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    // Set access token with 15 minute expiry
    Cookies.set('accessToken', accessToken, { 
      expires: 1/96, // 15 minutes in days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Set refresh token with 7 day expiry
    Cookies.set('refreshToken', refreshToken, { 
      expires: 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  private clearTokens(): void {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  private async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<TokenResponse>(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/refresh`,
      { refreshToken }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    this.setTokens(accessToken, newRefreshToken);
    
    return accessToken;
  }

  // Authentication methods
  auth = {
    register: async (data: RegisterRequest): Promise<AuthResponse> => {
      const response: AxiosResponse<AuthResponse> = await this.client.post('/api/auth/register', data);
      const { accessToken, refreshToken } = response.data;
      this.setTokens(accessToken, refreshToken);
      return response.data;
    },

    login: async (data: LoginRequest): Promise<AuthResponse> => {
      const response: AxiosResponse<AuthResponse> = await this.client.post('/api/auth/login', data);
      const { accessToken, refreshToken } = response.data;
      this.setTokens(accessToken, refreshToken);
      return response.data;
    },

    refresh: async (): Promise<TokenResponse> => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response: AxiosResponse<TokenResponse> = await this.client.post('/api/auth/refresh', {
        refreshToken
      });
      
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      this.setTokens(accessToken, newRefreshToken);
      
      return response.data;
    },

    logout: async (): Promise<void> => {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          await this.client.post('/api/auth/logout', { refreshToken });
        } catch (error) {
          // Continue with logout even if server request fails
          console.warn('Logout request failed:', error);
        }
      }
      this.clearTokens();
    },

    getCurrentUser: (): { accessToken: string | null; refreshToken: string | null } => {
      return {
        accessToken: this.getAccessToken(),
        refreshToken: this.getRefreshToken()
      };
    }
  };

  // Task methods
  tasks = {
    create: async (data: CreateTaskRequest): Promise<Task> => {
      const response: AxiosResponse<Task> = await this.client.post('/api/tasks', data);
      return response.data;
    },

    getAll: async (query: TaskQuery = {}): Promise<PaginatedTasks> => {
      const params = new URLSearchParams();
      
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);

      const response: AxiosResponse<PaginatedTasks> = await this.client.get(
        `/api/tasks?${params.toString()}`
      );
      return response.data;
    },

    getById: async (id: string): Promise<Task> => {
      const response: AxiosResponse<Task> = await this.client.get(`/api/tasks/${id}`);
      return response.data;
    },

    update: async (id: string, data: UpdateTaskRequest): Promise<Task> => {
      const response: AxiosResponse<Task> = await this.client.patch(`/api/tasks/${id}`, data);
      return response.data;
    },

    toggle: async (id: string): Promise<Task> => {
      const response: AxiosResponse<Task> = await this.client.patch(`/api/tasks/${id}/toggle`);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await this.client.delete(`/api/tasks/${id}`);
    }
  };
}

// Create and export a singleton instance
export const apiClient = new APIClient();
export default apiClient;
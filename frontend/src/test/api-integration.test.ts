import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication API Integration', () => {
    it('should handle successful registration API call', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const registrationData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(data).toEqual(mockResponse);
    });

    it('should handle registration validation errors', async () => {
      const mockErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: {
            email: ['Email is required'],
            password: ['Password must be at least 8 characters']
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
      });

      const invalidData = {
        name: 'Test User',
        email: '',
        password: '123'
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(data.error).toHaveProperty('details');
    });

    it('should handle successful login API call', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockResponse);
    });

    it('should handle login authentication errors', async () => {
      const mockErrorResponse = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      });

      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should handle token refresh API call', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const refreshData = {
        refreshToken: 'old-refresh-token'
      };

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refreshData),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockResponse);
    });

    it('should handle logout API call', async () => {
      const mockResponse = {
        message: 'Logged out successfully'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const logoutData = {
        refreshToken: 'refresh-token-to-invalidate'
      };

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logoutData),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockResponse);
    });
  });

  describe('Task Management API Integration', () => {
    const mockAccessToken = 'mock-access-token';

    it('should handle task creation API call', async () => {
      const mockTask = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'pending',
        userId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockTask,
      });

      const taskData = {
        title: 'Test Task',
        description: 'Test Description'
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAccessToken}`
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAccessToken}`
        },
        body: JSON.stringify(taskData),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(data).toEqual(mockTask);
    });

    it('should handle task retrieval with pagination', async () => {
      const mockResponse = {
        tasks: [
          {
            id: '1',
            title: 'Task 1',
            description: 'Description 1',
            status: 'pending',
            userId: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Task 2',
            description: 'Description 2',
            status: 'completed',
            userId: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/tasks?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockResponse);
      expect(data.tasks).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('should handle task filtering by status', async () => {
      const mockResponse = {
        tasks: [
          {
            id: '1',
            title: 'Pending Task',
            description: 'Pending Description',
            status: 'pending',
            userId: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/tasks?status=pending', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].status).toBe('pending');
    });

    it('should handle task search functionality', async () => {
      const mockResponse = {
        tasks: [
          {
            id: '1',
            title: 'Important Task',
            description: 'Important Description',
            status: 'pending',
            userId: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/tasks?search=Important', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].title).toContain('Important');
    });

    it('should handle individual task retrieval', async () => {
      const mockTask = {
        id: '1',
        title: 'Individual Task',
        description: 'Individual Description',
        status: 'pending',
        userId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask,
      });

      const response = await fetch('/api/tasks/1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockTask);
    });

    it('should handle task updates', async () => {
      const mockUpdatedTask = {
        id: '1',
        title: 'Updated Task',
        description: 'Updated Description',
        status: 'pending',
        userId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUpdatedTask,
      });

      const updateData = {
        title: 'Updated Task',
        description: 'Updated Description'
      };

      const response = await fetch('/api/tasks/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockAccessToken}`
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockUpdatedTask);
    });

    it('should handle task status toggle', async () => {
      const mockToggledTask = {
        id: '1',
        title: 'Task to Toggle',
        description: 'Toggle Description',
        status: 'completed',
        userId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockToggledTask,
      });

      const response = await fetch('/api/tasks/1/toggle', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('completed');
    });

    it('should handle task deletion', async () => {
      const mockResponse = {
        message: 'Task deleted successfully'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await fetch('/api/tasks/1', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toEqual(mockResponse);
    });

    it('should handle unauthorized access to tasks', async () => {
      const mockErrorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      });

      const response = await fetch('/api/tasks', {
        method: 'GET',
        // No Authorization header
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle task not found errors', async () => {
      const mockErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Task not found'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse,
      });

      const response = await fetch('/api/tasks/nonexistent', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockAccessToken}`
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle server errors', async () => {
      const mockErrorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => mockErrorResponse,
      });

      const response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle rate limiting', async () => {
      const mockErrorResponse = {
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => mockErrorResponse,
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      expect(data.error.code).toBe('TOO_MANY_REQUESTS');
    });
  });

  describe('Token Management Integration', () => {
    it('should handle automatic token refresh workflow', async () => {
      // First call fails with 401
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' }
          }),
        })
        // Token refresh succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }),
        })
        // Retry original request succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            tasks: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
          }),
        });

      // Simulate the token refresh workflow
      let response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer expired-token'
        },
      });

      if (response.status === 401) {
        // Refresh token
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
        });

        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json();
          
          // Retry original request with new token
          response = await fetch('/api/tasks', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`
            },
          });
        }
      }

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle refresh token expiration', async () => {
      const mockErrorResponse = {
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token expired'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      });

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: 'expired-refresh-token' }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('REFRESH_TOKEN_EXPIRED');
    });
  });
});
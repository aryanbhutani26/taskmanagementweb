import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api';

// Feature: task-management-system, Property 26: Frontend token management
// **Validates: Requirements 3.5, 10.5**

describe('Frontend Token Management Properties', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    Object.keys(Cookies.get()).forEach(cookieName => {
      Cookies.remove(cookieName);
    });
    
    // Mock axios to prevent actual HTTP requests
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    Object.keys(Cookies.get()).forEach(cookieName => {
      Cookies.remove(cookieName);
    });
  });

  it('Property 26: Frontend token management - token storage and retrieval', () => {
    fc.assert(fc.property(
      fc.record({
        accessToken: fc.string({ minLength: 10, maxLength: 200 }),
        refreshToken: fc.string({ minLength: 10, maxLength: 200 }),
        email: fc.emailAddress(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        userId: fc.uuid()
      }),
      (tokenData) => {
        // Mock successful login response
        const mockAuthResponse = {
          user: {
            id: tokenData.userId,
            email: tokenData.email,
            name: tokenData.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken
        };

        // Mock the axios post method for login
        const mockPost = vi.fn().mockResolvedValue({ data: mockAuthResponse });
        (apiClient as any).client.post = mockPost;

        // Perform login which should store tokens
        return apiClient.auth.login({
          email: tokenData.email,
          password: 'testpassword'
        }).then(() => {
          // Verify tokens are stored in cookies
          const storedAccessToken = Cookies.get('accessToken');
          const storedRefreshToken = Cookies.get('refreshToken');

          expect(storedAccessToken).toBe(tokenData.accessToken);
          expect(storedRefreshToken).toBe(tokenData.refreshToken);

          // Verify getCurrentUser returns the stored tokens
          const currentTokens = apiClient.auth.getCurrentUser();
          expect(currentTokens.accessToken).toBe(tokenData.accessToken);
          expect(currentTokens.refreshToken).toBe(tokenData.refreshToken);
        });
      }
    ), { numRuns: 100 });
  });

  it('Property 26: Frontend token management - automatic token refresh on 401', () => {
    fc.assert(fc.property(
      fc.record({
        originalAccessToken: fc.string({ minLength: 10, maxLength: 200 }),
        newAccessToken: fc.string({ minLength: 10, maxLength: 200 }),
        refreshToken: fc.string({ minLength: 10, maxLength: 200 }),
        newRefreshToken: fc.string({ minLength: 10, maxLength: 200 })
      }),
      async (tokenData) => {
        // Set initial tokens
        Cookies.set('accessToken', tokenData.originalAccessToken);
        Cookies.set('refreshToken', tokenData.refreshToken);

        // Mock the client to simulate 401 error then successful refresh
        let callCount = 0;
        const mockRequest = vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First call returns 401
            const error = new Error('Unauthorized');
            (error as any).response = { status: 401 };
            (error as any).config = { _retry: false, headers: {} };
            throw error;
          } else {
            // Second call (after refresh) succeeds
            return Promise.resolve({ data: { tasks: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } } });
          }
        });

        // Mock the refresh endpoint
        const mockPost = vi.fn().mockImplementation((url: string) => {
          if (url.includes('/auth/refresh')) {
            return Promise.resolve({
              data: {
                accessToken: tokenData.newAccessToken,
                refreshToken: tokenData.newRefreshToken
              }
            });
          }
          return mockRequest();
        });

        (apiClient as any).client.get = mockRequest;
        (apiClient as any).client.post = mockPost;

        try {
          // Make a request that should trigger token refresh
          await apiClient.tasks.getAll();

          // Verify new tokens are stored
          const storedAccessToken = Cookies.get('accessToken');
          const storedRefreshToken = Cookies.get('refreshToken');

          expect(storedAccessToken).toBe(tokenData.newAccessToken);
          expect(storedRefreshToken).toBe(tokenData.newRefreshToken);

          // Verify refresh was called
          expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
            refreshToken: tokenData.refreshToken
          });

        } catch (error) {
          // If refresh fails, tokens should be cleared
          const storedAccessToken = Cookies.get('accessToken');
          const storedRefreshToken = Cookies.get('refreshToken');
          
          expect(storedAccessToken).toBeUndefined();
          expect(storedRefreshToken).toBeUndefined();
        }
      }
    ), { numRuns: 50 });
  });

  it('Property 26: Frontend token management - logout clears all tokens', () => {
    fc.assert(fc.property(
      fc.record({
        accessToken: fc.string({ minLength: 10, maxLength: 200 }),
        refreshToken: fc.string({ minLength: 10, maxLength: 200 })
      }),
      async (tokenData) => {
        // Set initial tokens
        Cookies.set('accessToken', tokenData.accessToken);
        Cookies.set('refreshToken', tokenData.refreshToken);

        // Verify tokens are set
        expect(Cookies.get('accessToken')).toBe(tokenData.accessToken);
        expect(Cookies.get('refreshToken')).toBe(tokenData.refreshToken);

        // Mock logout endpoint
        const mockPost = vi.fn().mockResolvedValue({ data: {} });
        (apiClient as any).client.post = mockPost;

        // Perform logout
        await apiClient.auth.logout();

        // Verify tokens are cleared
        const storedAccessToken = Cookies.get('accessToken');
        const storedRefreshToken = Cookies.get('refreshToken');

        expect(storedAccessToken).toBeUndefined();
        expect(storedRefreshToken).toBeUndefined();

        // Verify getCurrentUser returns null tokens
        const currentTokens = apiClient.auth.getCurrentUser();
        expect(currentTokens.accessToken).toBeNull();
        expect(currentTokens.refreshToken).toBeNull();
      }
    ), { numRuns: 100 });
  });

  it('Property 26: Frontend token management - token expiry handling', () => {
    fc.assert(fc.property(
      fc.record({
        accessToken: fc.string({ minLength: 10, maxLength: 200 }),
        refreshToken: fc.string({ minLength: 10, maxLength: 200 })
      }),
      (tokenData) => {
        // Set tokens with very short expiry (simulate expired tokens)
        Cookies.set('accessToken', tokenData.accessToken, { expires: -1 }); // Already expired
        Cookies.set('refreshToken', tokenData.refreshToken, { expires: 7 });

        // After expiry, access token should not be available
        const storedAccessToken = Cookies.get('accessToken');
        const storedRefreshToken = Cookies.get('refreshToken');

        // Expired access token should be undefined
        expect(storedAccessToken).toBeUndefined();
        // Refresh token should still be available
        expect(storedRefreshToken).toBe(tokenData.refreshToken);

        // getCurrentUser should reflect this state
        const currentTokens = apiClient.auth.getCurrentUser();
        expect(currentTokens.accessToken).toBeNull();
        expect(currentTokens.refreshToken).toBe(tokenData.refreshToken);
      }
    ), { numRuns: 100 });
  });
});
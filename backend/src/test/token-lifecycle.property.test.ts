import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken
} from '../utils/auth';

describe('Token Lifecycle Property Tests', () => {
  // Feature: task-management-system, Property 6: Access token expiration
  it('Property 6: Access token expiration - tokens have limited lifetime', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate access token
          const accessToken = generateAccessToken(userId);
          
          // Token should be valid immediately after generation
          const decoded = verifyAccessToken(accessToken);
          expect(decoded.userId).toBe(userId);
          expect(decoded.type).toBe('access');
          
          // Token should have an expiration time (JWT includes exp claim)
          const tokenParts = accessToken.split('.');
          expect(tokenParts).toHaveLength(3);
          
          // Decode payload to check expiration
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          expect(payload.exp).toBeDefined();
          expect(typeof payload.exp).toBe('number');
          
          // Expiration should be in the future (within 15 minutes)
          const now = Math.floor(Date.now() / 1000);
          const maxExpiration = now + (15 * 60); // 15 minutes from now
          expect(payload.exp).toBeGreaterThan(now);
          expect(payload.exp).toBeLessThanOrEqual(maxExpiration);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: task-management-system, Property 7: Refresh token lifecycle
  it('Property 7: Refresh token lifecycle - tokens have 7-day lifetime', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate refresh token
          const refreshToken = generateRefreshToken(userId);
          
          // Token should be valid immediately after generation
          const decoded = verifyRefreshToken(refreshToken);
          expect(decoded.userId).toBe(userId);
          expect(decoded.type).toBe('refresh');
          
          // Token should have an expiration time (JWT includes exp claim)
          const tokenParts = refreshToken.split('.');
          expect(tokenParts).toHaveLength(3);
          
          // Decode payload to check expiration
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          expect(payload.exp).toBeDefined();
          expect(typeof payload.exp).toBe('number');
          
          // Expiration should be in the future (within 7 days)
          const now = Math.floor(Date.now() / 1000);
          const maxExpiration = now + (7 * 24 * 60 * 60); // 7 days from now
          expect(payload.exp).toBeGreaterThan(now);
          expect(payload.exp).toBeLessThanOrEqual(maxExpiration);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: task-management-system, Property 8: Token refresh functionality
  it('Property 8: Token refresh functionality - JWT token generation consistency', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate refresh token
          const refreshToken = generateRefreshToken(userId);
          
          // Verify refresh token is valid
          const decoded = verifyRefreshToken(refreshToken);
          expect(decoded.userId).toBe(userId);
          expect(decoded.type).toBe('refresh');
          
          // Generate new access token using the same userId
          const newAccessToken = generateAccessToken(userId);
          
          // New access token should be valid
          const decodedAccess = verifyAccessToken(newAccessToken);
          expect(decodedAccess.userId).toBe(userId);
          expect(decodedAccess.type).toBe('access');
          
          // Tokens should be different (different types and expiration times)
          expect(refreshToken).not.toBe(newAccessToken);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: task-management-system, Property 9: Invalid refresh token handling
  it('Property 9: Invalid refresh token handling - invalid tokens are rejected', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('invalid-token'),
          fc.constant(''),
          fc.constant('not.a.jwt.token'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(str => !str.includes('.')),
          fc.string({ minLength: 50, maxLength: 100 }).filter(str => !str.includes('.'))
        ),
        (invalidToken) => {
          // Invalid token format should throw error when verified
          expect(() => verifyRefreshToken(invalidToken)).toThrow();
          expect(() => verifyAccessToken(invalidToken)).toThrow();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('JWT token generation and verification round-trip', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate access token
          const accessToken = generateAccessToken(userId);
          expect(accessToken).toBeDefined();
          expect(typeof accessToken).toBe('string');
          expect(accessToken.length).toBeGreaterThan(0);
          
          // Verify access token
          const decodedAccess = verifyAccessToken(accessToken);
          expect(decodedAccess.userId).toBe(userId);
          expect(decodedAccess.type).toBe('access');
          
          // Generate refresh token
          const refreshToken = generateRefreshToken(userId);
          expect(refreshToken).toBeDefined();
          expect(typeof refreshToken).toBe('string');
          expect(refreshToken.length).toBeGreaterThan(0);
          
          // Verify refresh token
          const decodedRefresh = verifyRefreshToken(refreshToken);
          expect(decodedRefresh.userId).toBe(userId);
          expect(decodedRefresh.type).toBe('refresh');
          
          // Tokens should be different
          expect(accessToken).not.toBe(refreshToken);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Access tokens should not be accepted as refresh tokens', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate access token
          const accessToken = generateAccessToken(userId);
          
          // Access token should not be valid as refresh token
          expect(() => verifyRefreshToken(accessToken)).toThrow();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Refresh tokens should not be accepted as access tokens', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate refresh token
          const refreshToken = generateRefreshToken(userId);
          
          // Refresh token should not be valid as access token
          expect(() => verifyAccessToken(refreshToken)).toThrow();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
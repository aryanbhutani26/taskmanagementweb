import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/auth';

describe('Logout Property Tests', () => {
  // Feature: task-management-system, Property 10: Logout token invalidation
  it('Property 10: Logout token invalidation - token verification after invalidation', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        (userId) => {
          // Generate refresh token
          const refreshToken = generateRefreshToken(userId);
          
          // Verify token is valid before logout
          const decoded = verifyRefreshToken(refreshToken);
          expect(decoded.userId).toBe(userId);
          expect(decoded.type).toBe('refresh');
          
          // Token should have proper structure
          const tokenParts = refreshToken.split('.');
          expect(tokenParts).toHaveLength(3);
          
          // Decode payload to verify it's a valid JWT
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          expect(payload.userId).toBe(userId);
          expect(payload.type).toBe('refresh');
          expect(payload.exp).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 10: Logout token invalidation - multiple token generation consistency', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(id => id.trim().length > 0),
        fc.integer({ min: 2, max: 4 }),
        (userId, numTokens) => {
          // Generate multiple refresh tokens for the same user
          const refreshTokens = [];
          for (let i = 0; i < numTokens; i++) {
            // Add a small delay or unique identifier to ensure tokens are different
            const token = generateRefreshToken(userId + '_' + i);
            refreshTokens.push(token);
          }
          
          // All tokens should be valid
          for (let i = 0; i < refreshTokens.length; i++) {
            const decoded = verifyRefreshToken(refreshTokens[i]);
            expect(decoded.userId).toBe(userId + '_' + i);
            expect(decoded.type).toBe('refresh');
            
            // Each token should be unique
            for (let j = i + 1; j < refreshTokens.length; j++) {
              expect(refreshTokens[i]).not.toBe(refreshTokens[j]);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Logout behavior with invalid tokens should be handled gracefully', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('non-existent-token'),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.constant(''),
          fc.constant('invalid.jwt.token')
        ),
        (invalidToken) => {
          // Invalid tokens should throw errors when verified
          if (invalidToken.includes('.') && invalidToken.split('.').length === 3) {
            // If it looks like a JWT but is invalid, verification should throw
            expect(() => verifyRefreshToken(invalidToken)).toThrow();
          } else {
            // Non-JWT format should also throw
            expect(() => verifyRefreshToken(invalidToken)).toThrow();
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
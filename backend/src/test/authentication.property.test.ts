import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { loginSchema } from '../schemas/authSchemas';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/auth';

// Custom generator for valid emails that pass our validation
const validEmailGen = fc.tuple(
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-j]+$/.test(s)),
  fc.constantFrom('gmail.com', 'yahoo.com', 'hotmail.com', 'test.com')
).map(([name, domain]) => `${name}@${domain}`);

describe('Authentication Property Tests', () => {
  // Feature: task-management-system, Property 4: Valid login returns tokens
  it('Property 4: Valid login returns tokens - schema validation', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          email: validEmailGen,
          password: fc.string({ minLength: 1, maxLength: 100 })
        }),
        (loginData) => {
          // Valid login data should pass validation
          const result = loginSchema.safeParse(loginData);
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Email should be normalized to lowercase
            expect(result.data.email).toBe(loginData.email.toLowerCase());
            // Password should remain unchanged
            expect(result.data.password).toBe(loginData.password);
          }
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  // Feature: task-management-system, Property 5: Invalid login rejection
  it('Property 5: Invalid login rejection - invalid email format', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(str => !str.includes('@')), // No @ symbol
          fc.string().filter(str => !str.includes('.')), // No dot
          fc.constantFrom('', ' ', 'invalid', 'test@', '@test.com', 'test@.com')
        ),
        fc.string({ minLength: 1, maxLength: 100 }),
        (invalidEmail, password) => {
          const loginData = {
            email: invalidEmail,
            password: password
          };
          
          // Invalid email should fail validation
          const result = loginSchema.safeParse(loginData);
          expect(result.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  it('Property 5: Invalid login rejection - empty password', async () => {
    await fc.assert(
      fc.property(
        validEmailGen,
        fc.constant(''),
        (validEmail, emptyPassword) => {
          const loginData = {
            email: validEmail,
            password: emptyPassword
          };
          
          // Empty password should fail validation
          const result = loginSchema.safeParse(loginData);
          expect(result.success).toBe(false);
          
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
      { numRuns: 3 }
    );
  });

  it('Invalid JWT tokens should be rejected', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('invalid'),
          fc.constant(''),
          fc.constant('not.a.jwt'),
          fc.constant('too.many.parts.here.invalid'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(str => !str.includes('.'))
        ),
        (invalidToken) => {
          // Invalid token format should throw error
          expect(() => verifyAccessToken(invalidToken)).toThrow();
          expect(() => verifyRefreshToken(invalidToken)).toThrow();
          
          return true;
        }
      ),
      { numRuns: 3 }
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
      { numRuns: 3 }
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
      { numRuns: 3 }
    );
  });
});
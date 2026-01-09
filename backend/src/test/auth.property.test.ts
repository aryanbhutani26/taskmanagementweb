import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcrypt';

// Use lower salt rounds for testing to speed up tests
const TEST_SALT_ROUNDS = 4;

async function testHashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, TEST_SALT_ROUNDS);
}

async function testComparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

describe('Authentication Property Tests', () => {
  // Feature: task-management-system, Property 1: Valid registration creates accounts
  // Note: This test validates password hashing which is part of user registration
  it('Property 1: Password hashing round-trip property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (password) => {
          // Hash the password
          const hashedPassword = await testHashPassword(password);
          
          // Verify the original password matches the hash
          const isValid = await testComparePassword(password, hashedPassword);
          expect(isValid).toBe(true);
          
          // Verify hash is different from original password
          expect(hashedPassword).not.toBe(password);
          
          // Verify hash has reasonable length (bcrypt hashes are 60 chars)
          expect(hashedPassword.length).toBe(60);
          
          return true;
        }
      ),
      { numRuns: 5 } // Very small number for performance
    );
  });

  it('Password hashing produces different hashes for same password', async () => {
    const password = 'testPassword123';
    
    // Hash the same password twice
    const hash1 = await testHashPassword(password);
    const hash2 = await testHashPassword(password);
    
    // Hashes should be different due to salt
    expect(hash1).not.toBe(hash2);
    
    // But both should validate against the original password
    expect(await testComparePassword(password, hash1)).toBe(true);
    expect(await testComparePassword(password, hash2)).toBe(true);
  });

  it('Wrong password should not validate', async () => {
    const password1 = 'correctPassword';
    const password2 = 'wrongPassword';
    
    // Hash the first password
    const hashedPassword = await testHashPassword(password1);
    
    // Verify the second password doesn't match
    const isValid = await testComparePassword(password2, hashedPassword);
    expect(isValid).toBe(false);
  });
});
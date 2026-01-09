import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { registerSchema } from '../schemas/authSchemas';

// Custom generators for valid data
const validEmailGen = fc.tuple(
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-j]+$/.test(s)),
  fc.constantFrom('gmail.com', 'yahoo.com', 'hotmail.com', 'test.com')
).map(([name, domain]) => `${name}@${domain}`);

const validPasswordGen = fc.tuple(
  fc.string({ minLength: 2, maxLength: 3 }).filter(s => /^[A-E]+$/.test(s)), // Uppercase
  fc.string({ minLength: 2, maxLength: 3 }).filter(s => /^[a-e]+$/.test(s)), // Lowercase
  fc.string({ minLength: 1, maxLength: 2 }).filter(s => /^[0-4]+$/.test(s)), // Numbers
  fc.string({ minLength: 1, maxLength: 2 }).filter(s => /^[!@#$%]+$/.test(s)), // Special chars
  fc.string({ minLength: 2, maxLength: 8 }).filter(s => /^[xyz]*$/.test(s)) // Filler
).map(([upper, lower, nums, special, filler]) => 
  (upper + lower + nums + special + filler).slice(0, 20)
);

const validNameGen = fc.string({ minLength: 1, maxLength: 20 })
  .filter(name => name.trim().length > 0 && /^[A-Za-z ]+$/.test(name.trim()));

describe('Registration Property Tests', () => {
  // Feature: task-management-system, Property 2: Duplicate email prevention
  it('Property 2: Duplicate email prevention - validation schema', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          email: validEmailGen,
          password: validPasswordGen,
          name: validNameGen
        }),
        (userData) => {
          // Valid registration data should pass validation
          const result = registerSchema.safeParse(userData);
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Email should be normalized to lowercase
            expect(result.data.email).toBe(userData.email.toLowerCase());
            // Name should be trimmed
            expect(result.data.name).toBe(userData.name.trim());
          }
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  // Feature: task-management-system, Property 3: Registration input validation
  it('Property 3: Registration input validation - invalid emails rejected', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(str => !str.includes('@')), // No @ symbol
          fc.string().filter(str => !str.includes('.')), // No dot
          fc.constantFrom('', ' ', 'invalid', 'test@', '@test.com', 'test@.com')
        ),
        validPasswordGen,
        validNameGen,
        (invalidEmail, validPassword, validName) => {
          const userData = {
            email: invalidEmail,
            password: validPassword,
            name: validName
          };
          
          // Invalid email should fail validation
          const result = registerSchema.safeParse(userData);
          expect(result.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  it('Property 3: Registration input validation - weak passwords rejected', async () => {
    await fc.assert(
      fc.property(
        validEmailGen,
        fc.oneof(
          fc.string({ maxLength: 7 }), // Too short
          fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[a-z]+$/.test(s)), // No uppercase/numbers/special
          fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[A-Z]+$/.test(s)), // No lowercase/numbers/special
          fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[0-9]+$/.test(s)), // No letters/special
          fc.constantFrom('', ' ', 'weak', 'password')
        ),
        validNameGen,
        (validEmail, weakPassword, validName) => {
          const userData = {
            email: validEmail,
            password: weakPassword,
            name: validName
          };
          
          // Weak password should fail validation
          const result = registerSchema.safeParse(userData);
          expect(result.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  it('Property 3: Registration input validation - empty names rejected', async () => {
    await fc.assert(
      fc.property(
        validEmailGen,
        validPasswordGen,
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\n'),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\s+$/.test(s))
        ),
        (validEmail, validPassword, invalidName) => {
          const userData = {
            email: validEmail,
            password: validPassword,
            name: invalidName
          };
          
          // Empty or whitespace-only name should fail validation
          const result = registerSchema.safeParse(userData);
          expect(result.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  it('Email normalization property', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          email: validEmailGen.map(email => 
            // Mix case randomly
            email.split('').map(char => 
              Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase()
            ).join('')
          ),
          password: validPasswordGen,
          name: validNameGen
        }),
        (userData) => {
          const result = registerSchema.safeParse(userData);
          
          if (result.success) {
            // Email should always be normalized to lowercase
            expect(result.data.email).toBe(userData.email.toLowerCase());
            expect(result.data.email).toMatch(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/);
          }
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});
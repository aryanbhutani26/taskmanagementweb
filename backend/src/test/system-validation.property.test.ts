import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import { errorHandler, notFoundHandler, sanitizeRequest, validateBody, validateQuery, validateParams } from '../middleware';
import { createTaskSchema, updateTaskSchema, taskQuerySchema, taskIdSchema } from '../schemas/taskSchemas';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/authSchemas';
import { setupTestDatabase, teardownTestDatabase } from './setup';

// Create a test app with validation middleware
function createTestApp() {
  const app = express();
  
  app.use(express.json());
  app.use(sanitizeRequest());
  
  // Test endpoints with validation
  app.post('/test/task', validateBody(createTaskSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  app.patch('/test/task/:id', validateParams(taskIdSchema), validateBody(updateTaskSchema), (req, res) => {
    res.json({ success: true, params: req.params, data: req.body });
  });
  
  app.get('/test/tasks', validateQuery(taskQuerySchema), (req, res) => {
    res.json({ success: true, query: req.query });
  });
  
  app.post('/test/register', validateBody(registerSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  app.post('/test/login', validateBody(loginSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  app.post('/test/refresh', validateBody(refreshTokenSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
}

// Generators for invalid data
const invalidTaskDataGen = fc.oneof(
  // Empty title
  fc.record({
    title: fc.constant(''),
    description: fc.option(fc.string(), { nil: undefined })
  }),
  // Whitespace-only title
  fc.record({
    title: fc.constant('   '),
    description: fc.option(fc.string(), { nil: undefined })
  }),
  // Too long title
  fc.record({
    title: fc.string({ minLength: 201, maxLength: 300 }),
    description: fc.option(fc.string(), { nil: undefined })
  }),
  // Missing title
  fc.record({
    description: fc.option(fc.string(), { nil: undefined })
  }),
  // Invalid type for title
  fc.record({
    title: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string())),
    description: fc.option(fc.string(), { nil: undefined })
  })
);

const invalidEmailGen = fc.oneof(
  fc.constant(''), // Empty email
  fc.constant('invalid-email'), // No @ symbol
  fc.constant('@domain.com'), // Missing local part
  fc.constant('user@'), // Missing domain
  fc.constant('user@domain'), // Missing TLD
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes('@')), // Random string without @
  fc.integer(), // Non-string type
  fc.boolean() // Non-string type
);

const invalidPasswordGen = fc.oneof(
  fc.constant(''), // Empty password
  fc.constant('short'), // Too short
  fc.constant('nouppercase123!'), // No uppercase
  fc.constant('NOLOWERCASE123!'), // No lowercase
  fc.constant('NoNumbers!'), // No numbers
  fc.constant('NoSpecialChars123'), // No special characters
  fc.integer(), // Non-string type
  fc.boolean() // Non-string type
);

const invalidRegisterDataGen = fc.oneof(
  // Invalid email
  fc.record({
    email: invalidEmailGen,
    password: fc.constant('ValidPass123!'),
    name: fc.constant('Valid Name')
  }),
  // Invalid password
  fc.record({
    email: fc.constant('valid@email.com'),
    password: invalidPasswordGen,
    name: fc.constant('Valid Name')
  }),
  // Invalid name
  fc.record({
    email: fc.constant('valid@email.com'),
    password: fc.constant('ValidPass123!'),
    name: fc.oneof(fc.constant(''), fc.constant('   '), fc.integer(), fc.boolean())
  }),
  // Missing fields
  fc.record({
    email: fc.constant('valid@email.com')
    // Missing password and name
  }),
  // Extra malicious fields
  fc.record({
    email: fc.constant('valid@email.com'),
    password: fc.constant('ValidPass123!'),
    name: fc.constant('Valid Name'),
    __proto__: fc.constant({ malicious: true }),
    constructor: fc.constant({ malicious: true })
  })
);

const invalidQueryParamsGen = fc.oneof(
  // Invalid page number
  fc.record({
    page: fc.oneof(fc.constant('0'), fc.constant('-1'), fc.constant('abc'), fc.constant(''))
  }),
  // Invalid limit
  fc.record({
    limit: fc.oneof(fc.constant('0'), fc.constant('-1'), fc.constant('abc'), fc.constant(''))
  }),
  // Invalid status
  fc.record({
    status: fc.oneof(fc.constant('INVALID_STATUS'), fc.constant(''), fc.integer())
  }),
  // Invalid combinations
  fc.record({
    page: fc.constant('abc'),
    limit: fc.constant('xyz'),
    status: fc.constant('INVALID')
  })
);

describe('System Validation Property Tests', () => {
  let app: express.Application;

  beforeEach(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 24: Input validation coverage
  it('Property 24: Input validation coverage - invalid task data is rejected', async () => {
    await fc.assert(
      fc.property(
        invalidTaskDataGen,
        async (invalidData) => {
          const response = await request(app)
            .post('/test/task')
            .send(invalidData);

          // Should return 400 Bad Request for invalid data
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('path');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Input validation coverage - invalid registration data is rejected', async () => {
    await fc.assert(
      fc.property(
        invalidRegisterDataGen,
        async (invalidData) => {
          const response = await request(app)
            .post('/test/register')
            .send(invalidData);

          // Should return 400 Bad Request for invalid data
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('path');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Input validation coverage - invalid query parameters are rejected', async () => {
    await fc.assert(
      fc.property(
        invalidQueryParamsGen,
        async (invalidQuery) => {
          const response = await request(app)
            .get('/test/tasks')
            .query(invalidQuery);

          // Should return 400 Bad Request for invalid query params
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('path');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Input validation coverage - invalid route parameters are rejected', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''), // Empty ID
          fc.constant('   '), // Whitespace ID
          fc.constant('invalid-id-format'), // Invalid format
          fc.integer().map(String), // Numeric string (might be invalid depending on ID format)
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => !/^[a-zA-Z0-9_-]+$/.test(s)) // Invalid characters
        ),
        async (invalidId) => {
          const response = await request(app)
            .patch(`/test/task/${invalidId}`)
            .send({ title: 'Valid Title' });

          // Should return 400 Bad Request for invalid ID format
          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error.code).toBe('VALIDATION_ERROR');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Input validation coverage - malicious input is sanitized', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          title: fc.constant('Valid Title'),
          description: fc.constant('Valid Description'),
          __proto__: fc.constant({ malicious: true }),
          constructor: fc.constant({ evil: 'payload' }),
          prototype: fc.constant({ hack: 'attempt' })
        }),
        async (maliciousData) => {
          const response = await request(app)
            .post('/test/task')
            .send(maliciousData);

          if (response.status === 200 || response.status === 201) {
            // If request succeeds, malicious fields should be removed
            expect(response.body.data).not.toHaveProperty('__proto__');
            expect(response.body.data).not.toHaveProperty('constructor');
            expect(response.body.data).not.toHaveProperty('prototype');
            expect(response.body.data).toHaveProperty('title');
            expect(response.body.data).toHaveProperty('description');
          } else {
            // If request fails, it should be due to validation, not malicious content
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Input validation coverage - consistent error response format', async () => {
    await fc.assert(
      fc.property(
        fc.oneof(invalidTaskDataGen, invalidRegisterDataGen),
        async (invalidData) => {
          const endpoint = Math.random() > 0.5 ? '/test/task' : '/test/register';
          
          const response = await request(app)
            .post(endpoint)
            .send(invalidData);

          // All validation errors should have consistent format
          if (response.status === 400) {
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toHaveProperty('code');
            expect(response.body.error).toHaveProperty('message');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('path');
            
            // Timestamp should be valid ISO string
            expect(() => new Date(response.body.timestamp)).not.toThrow();
            
            // Path should match the request path
            expect(response.body.path).toBe(endpoint);
            
            // Error code should be appropriate
            expect(['VALIDATION_ERROR', 'BAD_REQUEST']).toContain(response.body.error.code);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 24: Input validation coverage - proper HTTP status codes', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          endpoint: fc.constantFrom('/test/task', '/test/register', '/test/login', '/test/refresh'),
          data: fc.oneof(invalidTaskDataGen, invalidRegisterDataGen)
        }),
        async ({ endpoint, data }) => {
          const response = await request(app)
            .post(endpoint)
            .send(data);

          // Invalid input should return 4xx status codes
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.status).toBeLessThan(500);
          
          // Most validation errors should be 400 Bad Request
          if (response.body.error?.code === 'VALIDATION_ERROR') {
            expect(response.status).toBe(400);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
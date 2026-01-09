import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/authRoutes';
import taskRoutes from '../routes/taskRoutes';
import { errorHandler, notFoundHandler, sanitizeRequest, basicRateLimit } from '../middleware';
import { setupTestDatabase, teardownTestDatabase } from './setup';

// Create test app instance
function createTestApp() {
  const app = express();
  
  // Security and rate limiting middleware
  app.use(helmet());
  app.use(basicRateLimit(100, 15 * 60 * 1000));
  
  // CORS configuration
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request sanitization
  app.use(sanitizeRequest());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  
  // API routes
  app.get('/api', (req, res) => {
    res.json({ message: 'Task Management API' });
  });
  
  // Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Task routes
  app.use('/api/tasks', taskRoutes);
  
  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
}

describe('Integration Workflows', () => {
  let app: express.Application;

  beforeEach(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('System Health and Basic Functionality', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should respond to API root endpoint', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Task Management API');
    });

    it('should handle 404 for unknown routes', async () => {
      await request(app)
        .get('/unknown-route')
        .expect(404);
    });

    it('should apply security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('Authentication Workflow Integration', () => {
    it('should complete user registration workflow', async () => {
      const registrationData = {
        email: 'integration@example.com',
        password: 'SecurePassword123!',
        name: 'Integration Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      
      // Verify user data
      expect(response.body.user.email).toBe(registrationData.email);
      expect(response.body.user.name).toBe(registrationData.name);
      expect(response.body.user).not.toHaveProperty('password');
      
      // Verify tokens are strings
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.refreshToken.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate email registration', async () => {
      const registrationData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        name: 'First User'
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      // Second registration with same email should fail
      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send({ ...registrationData, name: 'Second User' })
        .expect(409);

      expect(duplicateResponse.body).toHaveProperty('error');
      expect(duplicateResponse.body.error.message).toContain('already exists');
    });

    it('should validate registration input', async () => {
      // Test empty email
      const emptyEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: '', password: 'SecurePassword123!', name: 'Test User' })
        .expect(400);

      expect(emptyEmailResponse.body).toHaveProperty('error');

      // Test invalid email format
      const invalidEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'SecurePassword123!', name: 'Test User' })
        .expect(400);

      expect(invalidEmailResponse.body).toHaveProperty('error');

      // Test weak password
      const weakPasswordResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '123', name: 'Test User' })
        .expect(400);

      expect(weakPasswordResponse.body).toHaveProperty('error');
    });

    it('should complete login workflow after registration', async () => {
      // First register a user
      const registrationData = {
        email: 'loginworkflow@example.com',
        password: 'SecurePassword123!',
        name: 'Login Workflow User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      // Then login with the same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        })
        .expect(200);

      // Verify login response
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body.user.email).toBe(registrationData.email);
    });

    it('should reject invalid login credentials', async () => {
      // Try to login with non-existent user
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
        .expect(401);

      expect(nonExistentResponse.body).toHaveProperty('error');

      // Register a user then try wrong password
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'wrongpass@example.com',
          password: 'CorrectPassword123!',
          name: 'Wrong Pass User'
        })
        .expect(201);

      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(wrongPasswordResponse.body).toHaveProperty('error');
    });
  });

  describe('Authentication Protection Integration', () => {
    it('should protect task endpoints with authentication', async () => {
      // Try to access tasks without token
      await request(app)
        .get('/api/tasks')
        .expect(401);

      // Try to create task without token
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task', description: 'Test Description' })
        .expect(401);

      // Try with invalid token
      await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Try with malformed authorization header
      await request(app)
        .get('/api/tasks')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should allow access with valid authentication token', async () => {
      // Register and get token
      const registrationData = {
        email: 'validtoken@example.com',
        password: 'SecurePassword123!',
        name: 'Valid Token User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const accessToken = registerResponse.body.accessToken;

      // Should be able to access tasks with valid token
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(tasksResponse.body).toHaveProperty('tasks');
      expect(tasksResponse.body).toHaveProperty('pagination');
      expect(Array.isArray(tasksResponse.body.tasks)).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should return consistent error format', async () => {
      // Test validation error
      const validationErrorResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid', password: '123', name: '' })
        .expect(400);

      expect(validationErrorResponse.body).toHaveProperty('error');
      expect(validationErrorResponse.body.error).toHaveProperty('code');
      expect(validationErrorResponse.body.error).toHaveProperty('message');

      // Test authentication error
      const authErrorResponse = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(authErrorResponse.body).toHaveProperty('error');
      expect(authErrorResponse.body.error).toHaveProperty('code');
      expect(authErrorResponse.body.error).toHaveProperty('message');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle oversized requests', async () => {
      const largeData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'A'.repeat(1000000) // Very large name
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largeData)
        .expect(413);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to requests', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed (rate limit is set high for tests)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      // Check that rate limit headers are present
      const response = await request(app).get('/health');
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Input Sanitization Integration', () => {
    it('should sanitize malicious input', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: '<script>alert("xss")</script>Malicious User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(201);

      // Name should be sanitized (script tags removed)
      expect(response.body.user.name).not.toContain('<script>');
      expect(response.body.user.name).not.toContain('</script>');
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "test'; DROP TABLE users; --@example.com",
        password: 'SecurePassword123!',
        name: 'SQL Injection User'
      };

      // Should handle gracefully (either validation error or safe processing)
      const response = await request(app)
        .post('/api/auth/register')
        .send(sqlInjectionData);

      expect([400, 201]).toContain(response.status);
      
      if (response.status === 201) {
        // If it succeeds, the email should be safely stored
        expect(response.body.user.email).toBe(sqlInjectionData.email);
      }
    });
  });
});
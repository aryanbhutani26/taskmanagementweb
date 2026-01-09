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

describe('End-to-End User Workflows', () => {
  let app: express.Application;
  let userTokens: { accessToken: string; refreshToken: string };
  let userId: string;
  let taskId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Complete User Registration and Login Flow', () => {
    it('should complete full user registration workflow', async () => {
      // Test user registration
      const registrationData = {
        email: 'testuser@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('refreshToken');
      expect(registerResponse.body.user.email).toBe(registrationData.email);
      expect(registerResponse.body.user.name).toBe(registrationData.name);
      expect(registerResponse.body.user).not.toHaveProperty('password');

      userId = registerResponse.body.user.id;
      userTokens = {
        accessToken: registerResponse.body.accessToken,
        refreshToken: registerResponse.body.refreshToken
      };
    });

    it('should complete full user login workflow', async () => {
      // First register a user
      const registrationData = {
        email: 'logintest@example.com',
        password: 'SecurePassword123!',
        name: 'Login Test User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      // Test user login
      const loginData = {
        email: registrationData.email,
        password: registrationData.password
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('refreshToken');
      expect(loginResponse.body.user.email).toBe(loginData.email);
      expect(loginResponse.body.user).not.toHaveProperty('password');

      userTokens = {
        accessToken: loginResponse.body.accessToken,
        refreshToken: loginResponse.body.refreshToken
      };
    });

    it('should handle authentication state management correctly', async () => {
      // Register user
      const registrationData = {
        email: 'authstate@example.com',
        password: 'SecurePassword123!',
        name: 'Auth State User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const { accessToken, refreshToken } = registerResponse.body;

      // Test accessing protected route with valid token
      await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Test token refresh
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');

      // Test logout
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: refreshResponse.body.refreshToken })
        .expect(200);

      // Test that tokens are invalidated after logout
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshResponse.body.refreshToken })
        .expect(401);
    });
  });

  describe('Full Task Management Lifecycle', () => {
    beforeEach(async () => {
      // Setup authenticated user for task tests
      const registrationData = {
        email: 'taskuser@example.com',
        password: 'SecurePassword123!',
        name: 'Task User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      userTokens = {
        accessToken: registerResponse.body.accessToken,
        refreshToken: registerResponse.body.refreshToken
      };
      userId = registerResponse.body.user.id;
    });

    it('should complete full task CRUD lifecycle', async () => {
      // Create task
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task for E2E testing'
      };

      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(taskData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.title).toBe(taskData.title);
      expect(createResponse.body.description).toBe(taskData.description);
      expect(createResponse.body.status).toBe('pending');
      expect(createResponse.body.userId).toBe(userId);

      taskId = createResponse.body.id;

      // Retrieve individual task
      const getResponse = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(getResponse.body.id).toBe(taskId);
      expect(getResponse.body.title).toBe(taskData.title);

      // Update task
      const updateData = {
        title: 'Updated Test Task',
        description: 'Updated description for E2E testing'
      };

      const updateResponse = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.title).toBe(updateData.title);
      expect(updateResponse.body.description).toBe(updateData.description);
      expect(new Date(updateResponse.body.updatedAt)).toBeInstanceOf(Date);

      // Toggle task status
      const toggleResponse = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(toggleResponse.body.status).toBe('completed');

      // Toggle back to pending
      const toggleBackResponse = await request(app)
        .patch(`/api/tasks/${taskId}/toggle`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(toggleBackResponse.body.status).toBe('pending');

      // Delete task
      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      // Verify task is deleted
      await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(404);
    });

    it('should handle task querying and filtering correctly', async () => {
      // Create multiple tasks with different statuses
      const tasks = [
        { title: 'Pending Task 1', description: 'First pending task' },
        { title: 'Pending Task 2', description: 'Second pending task' },
        { title: 'Task to Complete', description: 'Task that will be completed' }
      ];

      const createdTasks = [];
      for (const task of tasks) {
        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${userTokens.accessToken}`)
          .send(task)
          .expect(201);
        createdTasks.push(response.body);
      }

      // Complete one task
      await request(app)
        .patch(`/api/tasks/${createdTasks[2].id}/toggle`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      // Test pagination
      const paginatedResponse = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(paginatedResponse.body.tasks).toHaveLength(2);
      expect(paginatedResponse.body.pagination.page).toBe(1);
      expect(paginatedResponse.body.pagination.limit).toBe(2);
      expect(paginatedResponse.body.pagination.total).toBe(3);

      // Test status filtering
      const pendingResponse = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(pendingResponse.body.tasks).toHaveLength(2);
      pendingResponse.body.tasks.forEach((task: any) => {
        expect(task.status).toBe('pending');
      });

      const completedResponse = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(completedResponse.body.tasks).toHaveLength(1);
      expect(completedResponse.body.tasks[0].status).toBe('completed');

      // Test search functionality
      const searchResponse = await request(app)
        .get('/api/tasks?search=Pending')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(searchResponse.body.tasks).toHaveLength(2);
      searchResponse.body.tasks.forEach((task: any) => {
        expect(task.title.toLowerCase()).toContain('pending');
      });
    });

    it('should enforce proper user isolation', async () => {
      // Create a second user
      const secondUserData = {
        email: 'seconduser@example.com',
        password: 'SecurePassword123!',
        name: 'Second User'
      };

      const secondUserResponse = await request(app)
        .post('/api/auth/register')
        .send(secondUserData)
        .expect(201);

      const secondUserToken = secondUserResponse.body.accessToken;

      // Create task with first user
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send({ title: 'First User Task', description: 'Task for first user' })
        .expect(201);

      const firstUserTaskId = taskResponse.body.id;

      // Second user should not be able to access first user's task
      await request(app)
        .get(`/api/tasks/${firstUserTaskId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(403);

      // Second user should not be able to update first user's task
      await request(app)
        .patch(`/api/tasks/${firstUserTaskId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({ title: 'Hacked Task' })
        .expect(403);

      // Second user should not be able to delete first user's task
      await request(app)
        .delete(`/api/tasks/${firstUserTaskId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(403);

      // Second user should only see their own tasks
      const secondUserTasksResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(secondUserTasksResponse.body.tasks).toHaveLength(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid authentication gracefully', async () => {
      // Test with invalid token
      await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with no token
      await request(app)
        .get('/api/tasks')
        .expect(401);

      // Test with malformed authorization header
      await request(app)
        .get('/api/tasks')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should handle validation errors properly', async () => {
      // Register user for testing
      const registrationData = {
        email: 'validationtest@example.com',
        password: 'SecurePassword123!',
        name: 'Validation Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const accessToken = registerResponse.body.accessToken;

      // Test invalid task creation
      const invalidTaskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '', description: 'Invalid task with empty title' })
        .expect(400);

      expect(invalidTaskResponse.body).toHaveProperty('error');

      // Test invalid registration
      const invalidRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: '123', name: '' })
        .expect(400);

      expect(invalidRegisterResponse.body).toHaveProperty('error');

      // Test duplicate email registration
      await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(409);
    });

    it('should handle non-existent resources properly', async () => {
      // Register user for testing
      const registrationData = {
        email: 'notfoundtest@example.com',
        password: 'SecurePassword123!',
        name: 'Not Found Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      const accessToken = registerResponse.body.accessToken;

      // Test accessing non-existent task
      await request(app)
        .get('/api/tasks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      // Test updating non-existent task
      await request(app)
        .patch('/api/tasks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      // Test deleting non-existent task
      await request(app)
        .delete('/api/tasks/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('System Health and API Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
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
  });
});
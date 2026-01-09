import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { toggleTaskStatus } from '../services/taskService';
import { createTask } from '../services/taskService';
import { createUser } from '../services/userService';
import { TaskStatus } from '../types';
import { setupTestDatabase, teardownTestDatabase, prisma } from './setup';

// Generator for user data
const validUserDataGen = fc.record({
  email: fc.tuple(
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-j]+$/.test(s)),
    fc.constantFrom('test.com', 'example.com')
  ).map(([name, domain]) => `${name}@${domain}`),
  password: fc.constant('TestPass123!'),
  name: fc.string({ minLength: 1, maxLength: 20 })
    .filter(name => name.trim().length > 0 && /^[A-Za-z ]+$/.test(name.trim()))
});

// Generator for valid task data
const validTaskDataGen = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 })
    .filter(title => title.trim().length > 0),
  description: fc.option(
    fc.string({ maxLength: 1000 }),
    { nil: undefined }
  )
});

describe('Task Status Toggle Property Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 20: Task status toggle
  it('Property 20: Task status toggle - owner can toggle status', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED), // Initial status
        async (userData, taskData, initialStatus) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, taskData);
          
          // Set initial status by updating the task in database
          await prisma.task.update({
            where: { id: createdTask.id },
            data: { status: initialStatus }
          });
          
          // Store original updatedAt timestamp
          const taskBeforeToggle = await prisma.task.findUnique({
            where: { id: createdTask.id }
          });
          const originalUpdatedAt = taskBeforeToggle!.updatedAt;
          
          // Wait a small amount to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Owner should be able to toggle their task status
          const toggledTask = await toggleTaskStatus(user.id, createdTask.id);
          
          expect(toggledTask).toBeTruthy();
          expect(toggledTask!.id).toBe(createdTask.id);
          expect(toggledTask!.userId).toBe(user.id);
          
          // Status should be toggled
          const expectedStatus = initialStatus === TaskStatus.PENDING 
            ? TaskStatus.COMPLETED 
            : TaskStatus.PENDING;
          expect(toggledTask!.status).toBe(expectedStatus);
          
          // Updated timestamp should be newer
          expect(toggledTask!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
          
          // Other fields should remain unchanged
          expect(toggledTask!.title).toBe(createdTask.title);
          expect(toggledTask!.description).toBe(createdTask.description);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 20: Task status toggle - non-owner cannot toggle', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validUserDataGen,
        validTaskDataGen,
        async (ownerData, otherUserData, taskData) => {
          // Ensure different users
          if (ownerData.email === otherUserData.email) {
            otherUserData.email = `other_${otherUserData.email}`;
          }
          
          // Create two different users
          const owner = await createUser(ownerData);
          const otherUser = await createUser(otherUserData);
          
          // Create a task for the owner
          const createdTask = await createTask(owner.id, taskData);
          
          // Other user should not be able to toggle the task status
          const result = await toggleTaskStatus(otherUser.id, createdTask.id);
          
          expect(result).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 20: Task status toggle - non-existent task returns null', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.string({ minLength: 10, maxLength: 30 }), // Random task ID
        async (userData, fakeTaskId) => {
          // Create a user
          const user = await createUser(userData);
          
          // Try to toggle non-existent task
          const result = await toggleTaskStatus(user.id, fakeTaskId);
          
          expect(result).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 20: Task status toggle - double toggle returns to original state', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED), // Initial status
        async (userData, taskData, initialStatus) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, taskData);
          
          // Set initial status
          await prisma.task.update({
            where: { id: createdTask.id },
            data: { status: initialStatus }
          });
          
          // Toggle once
          const firstToggle = await toggleTaskStatus(user.id, createdTask.id);
          expect(firstToggle).toBeTruthy();
          
          const expectedFirstStatus = initialStatus === TaskStatus.PENDING 
            ? TaskStatus.COMPLETED 
            : TaskStatus.PENDING;
          expect(firstToggle!.status).toBe(expectedFirstStatus);
          
          // Wait a small amount to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Toggle again
          const secondToggle = await toggleTaskStatus(user.id, createdTask.id);
          expect(secondToggle).toBeTruthy();
          
          // Should be back to original status
          expect(secondToggle!.status).toBe(initialStatus);
          
          // Updated timestamp should be newer than first toggle
          expect(secondToggle!.updatedAt.getTime()).toBeGreaterThan(firstToggle!.updatedAt.getTime());
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { getTaskById } from '../services/taskService';
import { createTask } from '../services/taskService';
import { createUser } from '../services/userService';
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

describe('Task Retrieval Property Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 23: Individual task retrieval
  it('Property 23: Individual task retrieval - owner can access task', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        async (userData, taskData) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, taskData);
          
          // Owner should be able to retrieve their task
          const retrievedTask = await getTaskById(user.id, createdTask.id);
          
          expect(retrievedTask).toBeTruthy();
          expect(retrievedTask!.id).toBe(createdTask.id);
          expect(retrievedTask!.userId).toBe(user.id);
          expect(retrievedTask!.title).toBe(createdTask.title);
          expect(retrievedTask!.description).toBe(createdTask.description);
          expect(retrievedTask!.status).toBe(createdTask.status);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 23: Individual task retrieval - non-owner cannot access task', async () => {
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
          
          // Other user should not be able to retrieve the task
          const retrievedTask = await getTaskById(otherUser.id, createdTask.id);
          
          expect(retrievedTask).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 23: Individual task retrieval - non-existent task returns null', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.string({ minLength: 10, maxLength: 30 }), // Random task ID
        async (userData, fakeTaskId) => {
          // Create a user
          const user = await createUser(userData);
          
          // Try to retrieve non-existent task
          const retrievedTask = await getTaskById(user.id, fakeTaskId);
          
          expect(retrievedTask).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
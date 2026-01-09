import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { deleteTask } from '../services/taskService';
import { createTask, getTaskById } from '../services/taskService';
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

describe('Task Deletion Property Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 21: Task operation authorization
  it('Property 21: Task operation authorization - non-owner cannot delete', async () => {
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
          
          // Other user should not be able to delete the task
          const result = await deleteTask(otherUser.id, createdTask.id);
          
          expect(result).toBe(false);
          
          // Verify task still exists
          const taskStillExists = await getTaskById(owner.id, createdTask.id);
          expect(taskStillExists).toBeTruthy();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 21: Task operation authorization - non-existent task returns false', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.string({ minLength: 10, maxLength: 30 }), // Random task ID
        async (userData, fakeTaskId) => {
          // Create a user
          const user = await createUser(userData);
          
          // Try to delete non-existent task
          const result = await deleteTask(user.id, fakeTaskId);
          
          expect(result).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: task-management-system, Property 22: Task deletion
  it('Property 22: Task deletion - owner can delete their tasks', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        async (userData, taskData) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, taskData);
          
          // Verify task exists before deletion
          const taskBeforeDeletion = await getTaskById(user.id, createdTask.id);
          expect(taskBeforeDeletion).toBeTruthy();
          
          // Owner should be able to delete their task
          const result = await deleteTask(user.id, createdTask.id);
          
          expect(result).toBe(true);
          
          // Verify task no longer exists
          const taskAfterDeletion = await getTaskById(user.id, createdTask.id);
          expect(taskAfterDeletion).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 22: Task deletion - permanent removal from database', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        async (userData, taskData) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, taskData);
          
          // Count tasks before deletion
          const tasksBeforeDeletion = await prisma.task.count({
            where: { userId: user.id }
          });
          
          // Delete the task
          const result = await deleteTask(user.id, createdTask.id);
          expect(result).toBe(true);
          
          // Count tasks after deletion
          const tasksAfterDeletion = await prisma.task.count({
            where: { userId: user.id }
          });
          
          // Should have one less task
          expect(tasksAfterDeletion).toBe(tasksBeforeDeletion - 1);
          
          // Task should not exist in database at all
          const deletedTask = await prisma.task.findUnique({
            where: { id: createdTask.id }
          });
          expect(deletedTask).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
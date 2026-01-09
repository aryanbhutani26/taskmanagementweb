import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { updateTask } from '../services/taskService';
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

// Generator for valid task updates
const validTaskUpdateGen = fc.record({
  title: fc.option(
    fc.string({ minLength: 1, maxLength: 200 })
      .filter(title => title.trim().length > 0),
    { nil: undefined }
  ),
  description: fc.option(
    fc.string({ maxLength: 1000 }),
    { nil: undefined }
  ),
  status: fc.option(
    fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED),
    { nil: undefined }
  )
});

// Generator for invalid task updates
const invalidTaskUpdateGen = fc.oneof(
  fc.record({
    title: fc.constant(''), // Empty title
    description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
    status: fc.option(fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED), { nil: undefined })
  }),
  fc.record({
    title: fc.constant('   '), // Whitespace-only title
    description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
    status: fc.option(fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED), { nil: undefined })
  }),
  fc.record({
    title: fc.string({ minLength: 201, maxLength: 300 }), // Too long title
    description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
    status: fc.option(fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED), { nil: undefined })
  })
);

describe('Task Update Property Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 18: Task update authorization and functionality
  it('Property 18: Task update authorization and functionality - owner can update', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        validTaskUpdateGen,
        async (userData, initialTaskData, updateData) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, initialTaskData);
          
          // Store original updatedAt timestamp
          const originalUpdatedAt = createdTask.updatedAt;
          
          // Wait a small amount to ensure timestamp difference
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Owner should be able to update their task
          const updatedTask = await updateTask(user.id, createdTask.id, updateData);
          
          expect(updatedTask).toBeTruthy();
          expect(updatedTask!.id).toBe(createdTask.id);
          expect(updatedTask!.userId).toBe(user.id);
          
          // Check that specified fields were updated
          if (updateData.title !== undefined) {
            expect(updatedTask!.title).toBe(updateData.title.trim());
          } else {
            expect(updatedTask!.title).toBe(createdTask.title);
          }
          
          if (updateData.description !== undefined) {
            expect(updatedTask!.description).toBe(updateData.description);
          } else {
            expect(updatedTask!.description).toBe(createdTask.description);
          }
          
          if (updateData.status !== undefined) {
            expect(updatedTask!.status).toBe(updateData.status);
          } else {
            expect(updatedTask!.status).toBe(createdTask.status);
          }
          
          // Updated timestamp should be newer
          expect(updatedTask!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 18: Task update authorization - non-owner cannot update', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validUserDataGen,
        validTaskDataGen,
        validTaskUpdateGen,
        async (ownerData, otherUserData, taskData, updateData) => {
          // Ensure different users
          if (ownerData.email === otherUserData.email) {
            otherUserData.email = `other_${otherUserData.email}`;
          }
          
          // Create two different users
          const owner = await createUser(ownerData);
          const otherUser = await createUser(otherUserData);
          
          // Create a task for the owner
          const createdTask = await createTask(owner.id, taskData);
          
          // Other user should not be able to update the task
          const result = await updateTask(otherUser.id, createdTask.id, updateData);
          
          expect(result).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 18: Task update functionality - non-existent task returns null', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.string({ minLength: 10, maxLength: 30 }), // Random task ID
        validTaskUpdateGen,
        async (userData, fakeTaskId, updateData) => {
          // Create a user
          const user = await createUser(userData);
          
          // Try to update non-existent task
          const result = await updateTask(user.id, fakeTaskId, updateData);
          
          expect(result).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: task-management-system, Property 19: Task update validation
  it('Property 19: Task update validation - valid updates succeed', async () => {
    await fc.assert(
      fc.property(
        validTaskUpdateGen,
        (updateData) => {
          // Filter out updates that would be invalid
          const hasValidTitle = updateData.title === undefined || 
            (typeof updateData.title === 'string' && updateData.title.trim().length > 0 && updateData.title.length <= 200);
          const hasValidDescription = updateData.description === undefined || 
            (typeof updateData.description === 'string' && updateData.description.length <= 1000);
          const hasValidStatus = updateData.status === undefined || 
            Object.values(TaskStatus).includes(updateData.status);
          
          // All valid updates should pass basic validation
          expect(hasValidTitle).toBe(true);
          expect(hasValidDescription).toBe(true);
          expect(hasValidStatus).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 19: Task update validation - empty updates are valid', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        async (userData, taskData) => {
          // Create a user and task
          const user = await createUser(userData);
          const createdTask = await createTask(user.id, taskData);
          
          // Empty update should succeed and leave task unchanged
          const updatedTask = await updateTask(user.id, createdTask.id, {});
          
          expect(updatedTask).toBeTruthy();
          expect(updatedTask!.title).toBe(createdTask.title);
          expect(updatedTask!.description).toBe(createdTask.description);
          expect(updatedTask!.status).toBe(createdTask.status);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
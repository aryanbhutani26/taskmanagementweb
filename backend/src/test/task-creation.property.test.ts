import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { createTaskSchema } from '../schemas/taskSchemas';
import { createTask } from '../services/taskService';
import { createUser } from '../services/userService';
import { TaskStatus } from '../types';
import { setupTestDatabase, teardownTestDatabase, prisma } from './setup';

// Custom generators for task data
const validTitleGen = fc.string({ minLength: 1, maxLength: 200 })
  .filter(title => title.trim().length > 0);

const validDescriptionGen = fc.option(
  fc.string({ maxLength: 1000 }),
  { nil: undefined }
);

const validTaskDataGen = fc.record({
  title: validTitleGen,
  description: validDescriptionGen
});

// Generator for invalid task data
const invalidTitleGen = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n'),
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\s+$/.test(s)), // Only whitespace
  fc.string({ minLength: 201, maxLength: 300 }) // Too long
);

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

describe('Task Creation Property Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 11: Task creation with user association
  it('Property 11: Task creation with user association', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        async (userData, taskData) => {
          // Create a user first
          const user = await createUser(userData);
          
          // Create a task for this user
          const task = await createTask(user.id, taskData);
          
          // Verify task is created with correct user association
          expect(task.id).toBeDefined();
          expect(task.userId).toBe(user.id);
          expect(task.title).toBe(taskData.title.trim());
          expect(task.description).toBe(taskData.description);
          expect(task.createdAt).toBeInstanceOf(Date);
          expect(task.updatedAt).toBeInstanceOf(Date);
          
          // Verify task exists in database and belongs to user
          const dbTask = await prisma.task.findUnique({
            where: { id: task.id }
          });
          expect(dbTask).toBeTruthy();
          expect(dbTask!.userId).toBe(user.id);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: task-management-system, Property 12: Task creation validation
  it('Property 12: Task creation validation - invalid titles rejected', async () => {
    await fc.assert(
      fc.property(
        invalidTitleGen,
        validDescriptionGen,
        (invalidTitle, validDescription) => {
          const taskData = {
            title: invalidTitle,
            description: validDescription
          };
          
          // Invalid task data should fail validation
          const result = createTaskSchema.safeParse(taskData);
          expect(result.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Property 12: Task creation validation - valid data passes', async () => {
    await fc.assert(
      fc.property(
        validTaskDataGen,
        (taskData) => {
          // Valid task data should pass validation
          const result = createTaskSchema.safeParse(taskData);
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Title should be trimmed
            expect(result.data.title).toBe(taskData.title.trim());
            // Description should be preserved
            expect(result.data.description).toBe(taskData.description);
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: task-management-system, Property 13: Task default values
  it('Property 13: Task default values', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        validTaskDataGen,
        async (userData, taskData) => {
          // Create a user first
          const user = await createUser(userData);
          
          // Create a task for this user
          const task = await createTask(user.id, taskData);
          
          // Verify default values are set correctly
          expect(task.status).toBe(TaskStatus.PENDING); // Default status should be PENDING
          expect(task.createdAt).toBeInstanceOf(Date);
          expect(task.updatedAt).toBeInstanceOf(Date);
          
          // Verify timestamps are recent (within last 5 seconds)
          const now = new Date();
          const timeDiff = now.getTime() - task.createdAt.getTime();
          expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds
          
          // CreatedAt and updatedAt should be the same for new tasks
          expect(task.createdAt.getTime()).toBe(task.updatedAt.getTime());
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Title trimming property', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `  ${s}  `), // Add whitespace
        validDescriptionGen,
        async (userData, titleWithWhitespace, description) => {
          // Create a user first
          const user = await createUser(userData);
          
          const taskData = {
            title: titleWithWhitespace,
            description
          };
          
          // Validate that schema trims the title
          const validationResult = createTaskSchema.safeParse(taskData);
          if (validationResult.success) {
            expect(validationResult.data.title).toBe(titleWithWhitespace.trim());
            
            // Create task and verify trimming persists
            const task = await createTask(user.id, validationResult.data);
            expect(task.title).toBe(titleWithWhitespace.trim());
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
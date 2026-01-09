import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { taskQuerySchema } from '../schemas/taskSchemas';
import { getUserTasks, createTask } from '../services/taskService';
import { createUser } from '../services/userService';
import { TaskStatus } from '../types';
import { setupTestDatabase, teardownTestDatabase, prisma } from './setup';

// Custom generators for query parameters
const validPageGen = fc.integer({ min: 1, max: 10 });
const validLimitGen = fc.integer({ min: 1, max: 100 });
const validStatusGen = fc.constantFrom(TaskStatus.PENDING, TaskStatus.COMPLETED);
const validSearchGen = fc.string({ minLength: 1, maxLength: 20 });

const validQueryGen = fc.record({
  page: validPageGen,
  limit: validLimitGen,
  status: fc.option(validStatusGen, { nil: undefined }),
  search: fc.option(validSearchGen, { nil: undefined })
});

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

// Generator for task data
const validTaskDataGen = fc.record({
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(title => title.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
});

describe('Task Querying Property Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Feature: task-management-system, Property 14: User task isolation
  it('Property 14: User task isolation', async () => {
    await fc.assert(
      fc.property(
        fc.tuple(validUserDataGen, validUserDataGen).filter(([user1, user2]) => user1.email !== user2.email),
        fc.array(validTaskDataGen, { minLength: 1, maxLength: 5 }),
        fc.array(validTaskDataGen, { minLength: 1, maxLength: 5 }),
        validQueryGen,
        async ([user1Data, user2Data], user1Tasks, user2Tasks, query) => {
          // Create two different users
          const user1 = await createUser(user1Data);
          const user2 = await createUser(user2Data);
          
          // Create tasks for each user
          for (const taskData of user1Tasks) {
            await createTask(user1.id, taskData);
          }
          for (const taskData of user2Tasks) {
            await createTask(user2.id, taskData);
          }
          
          // Get tasks for user1
          const user1Result = await getUserTasks(user1.id, query);
          
          // Get tasks for user2
          const user2Result = await getUserTasks(user2.id, query);
          
          // Verify user task isolation - each user only sees their own tasks
          for (const task of user1Result.tasks) {
            expect(task.userId).toBe(user1.id);
          }
          
          for (const task of user2Result.tasks) {
            expect(task.userId).toBe(user2.id);
          }
          
          // Verify no cross-contamination
          const user1TaskIds = user1Result.tasks.map(t => t.id);
          const user2TaskIds = user2Result.tasks.map(t => t.id);
          
          // No task should appear in both users' results
          const intersection = user1TaskIds.filter(id => user2TaskIds.includes(id));
          expect(intersection).toHaveLength(0);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  // Feature: task-management-system, Property 15: Pagination consistency
  it('Property 15: Pagination consistency', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.array(validTaskDataGen, { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }), // page size
        async (userData, taskDataArray, pageSize) => {
          // Create user and tasks
          const user = await createUser(userData);
          
          for (const taskData of taskDataArray) {
            await createTask(user.id, taskData);
          }
          
          // Get all tasks to verify total
          const allTasksResult = await getUserTasks(user.id, { page: 1, limit: 100 });
          const totalTasks = allTasksResult.pagination.total;
          
          // Test pagination consistency
          const totalPages = Math.ceil(totalTasks / pageSize);
          let collectedTasks: any[] = [];
          
          for (let page = 1; page <= totalPages; page++) {
            const result = await getUserTasks(user.id, { page, limit: pageSize });
            
            // Verify pagination metadata
            expect(result.pagination.page).toBe(page);
            expect(result.pagination.limit).toBe(pageSize);
            expect(result.pagination.total).toBe(totalTasks);
            expect(result.pagination.totalPages).toBe(totalPages);
            
            // Verify page size (except possibly last page)
            if (page < totalPages) {
              expect(result.tasks).toHaveLength(pageSize);
            } else {
              // Last page can have fewer items
              expect(result.tasks.length).toBeLessThanOrEqual(pageSize);
              expect(result.tasks.length).toBeGreaterThan(0);
            }
            
            collectedTasks.push(...result.tasks);
          }
          
          // Verify total collected tasks equals total tasks
          expect(collectedTasks).toHaveLength(totalTasks);
          
          // Verify no duplicates across pages
          const taskIds = collectedTasks.map(t => t.id);
          const uniqueTaskIds = [...new Set(taskIds)];
          expect(uniqueTaskIds).toHaveLength(taskIds.length);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  // Feature: task-management-system, Property 16: Status filtering accuracy
  it('Property 16: Status filtering accuracy', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.array(validTaskDataGen, { minLength: 3, maxLength: 10 }),
        validStatusGen,
        async (userData, taskDataArray, filterStatus) => {
          // Create user
          const user = await createUser(userData);
          
          // Create tasks with mixed statuses
          const createdTasks = [];
          for (const taskData of taskDataArray) {
            const task = await createTask(user.id, taskData);
            createdTasks.push(task);
          }
          
          // Randomly update some tasks to COMPLETED status
          for (let i = 0; i < createdTasks.length; i++) {
            if (Math.random() > 0.5) {
              await prisma.task.update({
                where: { id: createdTasks[i].id },
                data: { status: TaskStatus.COMPLETED }
              });
            }
          }
          
          // Query with status filter
          const result = await getUserTasks(user.id, { 
            page: 1, 
            limit: 100, 
            status: filterStatus 
          });
          
          // Verify all returned tasks have the filtered status
          for (const task of result.tasks) {
            expect(task.status).toBe(filterStatus);
            expect(task.userId).toBe(user.id);
          }
          
          // Verify count matches database reality
          const dbCount = await prisma.task.count({
            where: {
              userId: user.id,
              status: filterStatus
            }
          });
          
          expect(result.pagination.total).toBe(dbCount);
          expect(result.tasks).toHaveLength(Math.min(dbCount, 100)); // Limited by page size
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  // Feature: task-management-system, Property 17: Title search functionality
  it('Property 17: Title search functionality', async () => {
    await fc.assert(
      fc.property(
        validUserDataGen,
        fc.string({ minLength: 2, maxLength: 10 }).filter(s => /^[a-zA-Z]+$/.test(s)), // Search term
        async (userData, searchTerm) => {
          // Create user
          const user = await createUser(userData);
          
          // Create tasks with titles that contain and don't contain the search term
          const tasksWithTerm = [
            { title: `${searchTerm} task`, description: 'Test task' },
            { title: `Task with ${searchTerm}`, description: 'Another test' },
            { title: `${searchTerm.toUpperCase()} TASK`, description: 'Uppercase test' }
          ];
          
          const tasksWithoutTerm = [
            { title: 'Different task', description: 'No match' },
            { title: 'Another task', description: 'Also no match' }
          ];
          
          // Create all tasks
          for (const taskData of [...tasksWithTerm, ...tasksWithoutTerm]) {
            await createTask(user.id, taskData);
          }
          
          // Search for tasks containing the term
          const result = await getUserTasks(user.id, { 
            page: 1, 
            limit: 100, 
            search: searchTerm 
          });
          
          // Verify all returned tasks contain the search term (case-insensitive)
          for (const task of result.tasks) {
            expect(task.title.toLowerCase()).toContain(searchTerm.toLowerCase());
            expect(task.userId).toBe(user.id);
          }
          
          // Verify we found the expected number of matching tasks
          expect(result.tasks.length).toBeGreaterThanOrEqual(tasksWithTerm.length);
          
          // Verify pagination metadata
          expect(result.pagination.total).toBe(result.tasks.length);
          
          return true;
        }
      ),
      { numRuns: 3 }
    );
  });

  it('Query parameter validation property', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          page: fc.oneof(
            fc.integer({ max: 0 }), // Invalid: <= 0
            fc.float(), // Invalid: not integer
            fc.string() // Invalid: not number
          ),
          limit: fc.oneof(
            fc.integer({ max: 0 }), // Invalid: <= 0
            fc.integer({ min: 101 }), // Invalid: > 100
            fc.string() // Invalid: not number
          ),
          status: fc.string().filter(s => !Object.values(TaskStatus).includes(s as TaskStatus)), // Invalid status
          search: fc.oneof(
            fc.integer(), // Invalid: not string
            fc.boolean() // Invalid: not string
          )
        }),
        (invalidQuery) => {
          // Invalid query parameters should fail validation
          const result = taskQuerySchema.safeParse(invalidQuery);
          expect(result.success).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  it('Valid query parameters property', async () => {
    await fc.assert(
      fc.property(
        validQueryGen,
        (validQuery) => {
          // Valid query parameters should pass validation
          const result = taskQuerySchema.safeParse(validQuery);
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Verify defaults and constraints
            expect(result.data.page).toBeGreaterThanOrEqual(1);
            expect(result.data.limit).toBeGreaterThanOrEqual(1);
            expect(result.data.limit).toBeLessThanOrEqual(100);
            
            if (result.data.status) {
              expect(Object.values(TaskStatus)).toContain(result.data.status);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
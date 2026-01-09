import { z } from 'zod';
import { TaskStatus } from '../types';

// Task title validation schema
const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be less than 200 characters');

// Task description validation schema
const descriptionSchema = z
  .string()
  .trim()
  .max(1000, 'Description must be less than 1000 characters')
  .optional();

// Task status validation schema
const taskStatusSchema = z.enum([TaskStatus.PENDING, TaskStatus.COMPLETED]);

// Create task request schema
export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
});

// Update task request schema
export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema,
  status: taskStatusSchema.optional(),
});

// Task query parameters schema
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: taskStatusSchema.optional(),
  search: z.string().trim().optional(),
});

// Task ID parameter schema
export const taskIdSchema = z.object({
  id: z.string().cuid('Invalid task ID format'),
});

// Types derived from schemas
export type CreateTaskRequest = z.infer<typeof createTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
export type TaskIdParams = z.infer<typeof taskIdSchema>;
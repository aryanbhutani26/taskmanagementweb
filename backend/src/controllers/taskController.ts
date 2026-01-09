import { Request, Response, NextFunction } from 'express';
import { 
  createTask, 
  getUserTasks, 
  getTaskById, 
  updateTask, 
  toggleTaskStatus, 
  deleteTask 
} from '../services/taskService';
import { User } from '../types';
import { asyncHandler, AppError } from '../middleware';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Create a new task
 */
export const createTaskHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const task = await createTask(req.user.id, req.body);
  res.status(201).json(task);
});

/**
 * Get tasks for the authenticated user
 */
export const getTasksHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const result = await getUserTasks(req.user.id, req.query as any);
  res.json(result);
});

/**
 * Get a single task by ID
 */
export const getTaskByIdHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const task = await getTaskById(req.user.id, req.params.id);
  
  if (!task) {
    throw new AppError(
      'Task not found or you do not have permission to access it',
      404,
      'TASK_NOT_FOUND'
    );
  }
  
  res.json(task);
});

/**
 * Update a task
 */
export const updateTaskHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const task = await updateTask(req.user.id, req.params.id, req.body);
  
  if (!task) {
    throw new AppError(
      'Task not found or you do not have permission to update it',
      404,
      'TASK_NOT_FOUND'
    );
  }
  
  res.json(task);
});

/**
 * Toggle task status
 */
export const toggleTaskStatusHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const task = await toggleTaskStatus(req.user.id, req.params.id);
  
  if (!task) {
    throw new AppError(
      'Task not found or you do not have permission to update it',
      404,
      'TASK_NOT_FOUND'
    );
  }
  
  res.json(task);
});

/**
 * Delete a task
 */
export const deleteTaskHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const success = await deleteTask(req.user.id, req.params.id);
  
  if (!success) {
    throw new AppError(
      'Task not found or you do not have permission to delete it',
      404,
      'TASK_NOT_FOUND'
    );
  }
  
  res.json({
    message: 'Task deleted successfully',
  });
});
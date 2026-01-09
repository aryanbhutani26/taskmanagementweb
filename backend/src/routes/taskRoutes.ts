import { Router } from 'express';
import { 
  createTaskHandler, 
  getTasksHandler, 
  getTaskByIdHandler, 
  updateTaskHandler, 
  toggleTaskStatusHandler, 
  deleteTaskHandler 
} from '../controllers/taskController';
import { authenticateToken, validateBody, validateQuery, validateParams } from '../middleware';
import { createTaskSchema, updateTaskSchema, taskQuerySchema, taskIdSchema } from '../schemas/taskSchemas';

const router = Router();

// Apply authentication middleware to all task routes
router.use(authenticateToken);

// POST /tasks - Create a new task
router.post('/', validateBody(createTaskSchema), createTaskHandler);

// GET /tasks - Get tasks with pagination and filtering
router.get('/', validateQuery(taskQuerySchema), getTasksHandler);

// GET /tasks/:id - Get a single task by ID
router.get('/:id', validateParams(taskIdSchema), getTaskByIdHandler);

// PATCH /tasks/:id - Update a task
router.patch('/:id', validateParams(taskIdSchema), validateBody(updateTaskSchema), updateTaskHandler);

// PATCH /tasks/:id/toggle - Toggle task status
router.patch('/:id/toggle', validateParams(taskIdSchema), toggleTaskStatusHandler);

// DELETE /tasks/:id - Delete a task
router.delete('/:id', validateParams(taskIdSchema), deleteTaskHandler);

export default router;
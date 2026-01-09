import { PrismaClient, Task } from '@prisma/client';
import { CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../schemas/taskSchemas';

const prisma = new PrismaClient();

// Define task status constants since we're using strings in SQLite
export const TaskStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED'
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// Define a consistent task response type
export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: TaskStatusType;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedTasksResponse {
  tasks: TaskResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create a new task for a user
 */
export async function createTask(userId: string, taskData: CreateTaskRequest): Promise<TaskResponse> {
  const task = await prisma.task.create({
    data: {
      title: taskData.title,
      description: taskData.description,
      userId,
      status: TaskStatus.PENDING, // Default status
    },
  });

  return {
    ...task,
    status: task.status as TaskStatusType,
    description: task.description ?? undefined,
  };
}

/**
 * Get tasks for a user with pagination and filtering
 */
export async function getUserTasks(userId: string, query: TaskQuery): Promise<PaginatedTasksResponse> {
  const { page, limit, status, search } = query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    userId,
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.title = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Get total count for pagination
  const total = await prisma.task.count({ where });

  // Get tasks with pagination
  const tasks = await prisma.task.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Convert null descriptions to undefined for consistency with TypeScript types
  const formattedTasks = tasks.map(task => ({
    ...task,
    status: task.status as TaskStatusType,
    description: task.description ?? undefined,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    tasks: formattedTasks,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Get a single task by ID for a user
 */
export async function getTaskById(userId: string, taskId: string): Promise<TaskResponse | null> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!task) {
    return null;
  }

  return {
    ...task,
    status: task.status as TaskStatusType,
    description: task.description ?? undefined,
  };
}

/**
 * Update a task for a user
 */
export async function updateTask(userId: string, taskId: string, updates: UpdateTaskRequest): Promise<TaskResponse | null> {
  // First check if the task exists and belongs to the user
  const existingTask = await getTaskById(userId, taskId);
  
  if (!existingTask) {
    return null;
  }

  // Update the task
  const updatedTask = await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  });

  return {
    ...updatedTask,
    status: updatedTask.status as TaskStatusType,
    description: updatedTask.description ?? undefined,
  };
}

/**
 * Toggle task status between PENDING and COMPLETED
 */
export async function toggleTaskStatus(userId: string, taskId: string): Promise<TaskResponse | null> {
  // First check if the task exists and belongs to the user
  const existingTask = await getTaskById(userId, taskId);
  
  if (!existingTask) {
    return null;
  }

  // Toggle status
  const newStatus = existingTask.status === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;

  const updatedTask = await prisma.task.update({
    where: {
      id: taskId,
    },
    data: {
      status: newStatus,
      updatedAt: new Date(),
    },
  });

  return {
    ...updatedTask,
    status: updatedTask.status as TaskStatusType,
    description: updatedTask.description ?? undefined,
  };
}

/**
 * Delete a task for a user
 */
export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  // First check if the task exists and belongs to the user
  const existingTask = await getTaskById(userId, taskId);
  
  if (!existingTask) {
    return false;
  }

  await prisma.task.delete({
    where: {
      id: taskId,
    },
  });

  return true;
}
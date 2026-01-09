import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorResponse } from '../types';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Convert Zod validation errors to a structured format
 */
function formatZodError(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const field = err.path.join('.');
    if (!details[field]) {
      details[field] = [];
    }
    details[field].push(err.message);
  });
  
  return details;
}

/**
 * Comprehensive error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: Record<string, string[]> | undefined;

  // Handle different types of errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid input data';
    details = formatZodError(err);
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma database errors
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      errorCode = 'DUPLICATE_ENTRY';
      message = 'A record with this information already exists';
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      message = 'The requested record was not found';
    } else {
      statusCode = 500;
      errorCode = 'DATABASE_ERROR';
      message = 'A database error occurred';
    }
  } else if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    errorCode = 'INVALID_DATA';
    message = 'Invalid data provided to database';
  }

  // Log error for debugging (in production, use proper logging service)
  if (statusCode >= 500) {
    console.error('Server Error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    },
    timestamp: new Date().toISOString(),
    path: req.path
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper to catch async errors in route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    timestamp: new Date().toISOString(),
    path: req.path
  };

  res.status(404).json(errorResponse);
}
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';

/**
 * Middleware to validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize the request body
      const validatedData = schema.parse(req.body);
      
      // Replace the original body with validated/sanitized data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Let the error handler deal with Zod errors
      } else {
        next(new AppError('Validation failed', 400, 'VALIDATION_ERROR'));
      }
    }
  };
}

/**
 * Middleware to validate request query parameters against a Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize the query parameters
      const validatedQuery = schema.parse(req.query);
      
      // Replace the original query with validated/sanitized data
      req.query = validatedQuery as any;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Let the error handler deal with Zod errors
      } else {
        next(new AppError('Query validation failed', 400, 'VALIDATION_ERROR'));
      }
    }
  };
}

/**
 * Middleware to validate request parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize the route parameters
      const validatedParams = schema.parse(req.params);
      
      // Replace the original params with validated/sanitized data
      req.params = validatedParams as any;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Let the error handler deal with Zod errors
      } else {
        next(new AppError('Parameter validation failed', 400, 'VALIDATION_ERROR'));
      }
    }
  };
}

/**
 * Middleware to sanitize and limit request body size
 */
export function sanitizeRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove any potentially dangerous properties
    if (req.body && typeof req.body === 'object') {
      // Remove prototype pollution attempts
      delete req.body.__proto__;
      delete req.body.constructor;
      delete req.body.prototype;
      
      // Trim string values to prevent excessive whitespace
      Object.keys(req.body).forEach(key => {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].trim();
        }
      });
    }
    
    next();
  };
}

/**
 * Rate limiting helper (basic implementation)
 * In production, use a proper rate limiting library like express-rate-limit
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function basicRateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize counter
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
    } else if (clientData.count < maxRequests) {
      // Increment counter
      clientData.count++;
      next();
    } else {
      // Rate limit exceeded
      const resetTimeSeconds = Math.ceil((clientData.resetTime - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString(),
        'Retry-After': resetTimeSeconds.toString()
      });
      
      const error = new AppError(
        `Too many requests. Try again in ${resetTimeSeconds} seconds.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
      
      next(error);
    }
  };
}
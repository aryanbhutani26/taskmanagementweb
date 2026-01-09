import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '../utils/auth';
import { User } from '../types';

// Use environment variable to determine which database to use
const prisma = new PrismaClient(
  process.env.NODE_ENV === 'test' 
    ? { datasources: { db: { url: 'file:./test-auth.db' } } }
    : undefined
);

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * JWT Authentication Middleware
 * Extracts and validates JWT tokens from Authorization header
 * Adds user context to authenticated requests
 * Handles token expiration and invalid tokens
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        },
        timestamp: new Date().toISOString(),
        path: req.path
      });
      return;
    }

    // Verify and decode the access token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired access token'
        },
        timestamp: new Date().toISOString(),
        path: req.path
      });
      return;
    }

    // Fetch user from database to ensure user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token no longer exists'
        },
        timestamp: new Date().toISOString(),
        path: req.path
      });
      return;
    }

    // Add user to request context
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error'
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
}

/**
 * Optional authentication middleware
 * Similar to authenticateToken but doesn't require authentication
 * Adds user context if valid token is provided, otherwise continues without user
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      // No token provided, continue without user context
      next();
      return;
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Invalid token, but continue without user context
      console.log('Optional auth: Invalid token provided, continuing without user');
    }

    next();

  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    // Continue without user context on error
    next();
  }
}
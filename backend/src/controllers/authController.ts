import { Request, Response } from 'express';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/authSchemas';
import { createUser, authenticateUser, findUserById } from '../services/userService';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  storeRefreshToken,
  removeRefreshToken,
  isRefreshTokenValid,
  cleanupExpiredTokens
} from '../utils/auth';
import { ErrorResponse } from '../types';

/**
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    
    // Create user
    const user = await createUser(validatedData);
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);
    
    // Clean up any expired tokens for this user
    await cleanupExpiredTokens(user.id);
    
    return res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle validation errors
      if (error.name === 'ZodError') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: (error as any).errors.reduce((acc: Record<string, string[]>, err: any) => {
              const field = err.path.join('.');
              if (!acc[field]) acc[field] = [];
              acc[field].push(err.message);
              return acc;
            }, {}),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        };
        return res.status(400).json(errorResponse);
      }
      
      // Handle duplicate email error
      if (error.message.includes('already exists')) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'A user with this email already exists',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        };
        return res.status(409).json(errorResponse);
      }
    }
    
    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during registration',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    return res.status(500).json(errorResponse);
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response) {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    // Authenticate user
    const user = await authenticateUser(validatedData.email, validatedData.password);
    
    if (!user) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      };
      return res.status(401).json(errorResponse);
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);
    
    // Clean up any expired tokens for this user
    await cleanupExpiredTokens(user.id);
    
    return res.json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: (error as any).errors.reduce((acc: Record<string, string[]>, err: any) => {
            const field = err.path.join('.');
            if (!acc[field]) acc[field] = [];
            acc[field].push(err.message);
            return acc;
          }, {}),
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      };
      return res.status(400).json(errorResponse);
    }
    
    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during login',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    return res.status(500).json(errorResponse);
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    // Validate request body
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    
    // Verify refresh token format
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database and is valid
    const isValid = await isRefreshTokenValid(refreshToken);
    
    if (!isValid) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      };
      return res.status(401).json(errorResponse);
    }
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);
    
    // Remove old refresh token and store new one (token rotation)
    await removeRefreshToken(refreshToken);
    await storeRefreshToken(decoded.userId, newRefreshToken);
    
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: (error as any).errors.reduce((acc: Record<string, string[]>, err: any) => {
              const field = err.path.join('.');
              if (!acc[field]) acc[field] = [];
              acc[field].push(err.message);
              return acc;
            }, {}),
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        };
        return res.status(400).json(errorResponse);
      }
      
      if (error.message.includes('Invalid or expired')) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        };
        return res.status(401).json(errorResponse);
      }
    }
    
    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during token refresh',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    return res.status(500).json(errorResponse);
  }
}

/**
 * Logout user
 */
export async function logout(req: Request, res: Response) {
  try {
    // Validate request body
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    
    // Remove refresh token from database
    await removeRefreshToken(refreshToken);
    
    return res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: (error as any).errors.reduce((acc: Record<string, string[]>, err: any) => {
            const field = err.path.join('.');
            if (!acc[field]) acc[field] = [];
            acc[field].push(err.message);
            return acc;
          }, {}),
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      };
      return res.status(400).json(errorResponse);
    }
    
    // Handle unexpected errors (but still return success for logout)
    return res.json({
      message: 'Logged out successfully',
    });
  }
}
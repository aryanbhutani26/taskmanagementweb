import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Salt rounds for bcrypt
const SALT_ROUNDS = 12;

// JWT configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): { userId: string; type: string } {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string; type: string };
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; type: string } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string };
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

/**
 * Remove refresh token from database
 */
export async function removeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.delete({
    where: { token },
  });
}

/**
 * Check if refresh token exists and is valid
 */
export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!refreshToken) {
    return false;
  }

  // Check if token is expired
  if (refreshToken.expiresAt < new Date()) {
    // Remove expired token
    await removeRefreshToken(token);
    return false;
  }

  return true;
}

/**
 * Clean up expired refresh tokens for a user
 */
export async function cleanupExpiredTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
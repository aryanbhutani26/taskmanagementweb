// Test setup file for backend
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create a global Prisma client for tests
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./test.db'
    }
  }
});

// Setup and teardown for tests
export async function setupTestDatabase() {
  try {
    // Ensure database schema is up to date
    execSync('npx prisma db push --force-reset --accept-data-loss', { 
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db' }
    });
    
    // Clean up any existing data
    await prisma.refreshToken.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn('Database setup warning:', error);
    // Continue with tests even if cleanup fails
  }
}

export async function teardownTestDatabase() {
  try {
    // Clean up test data
    await prisma.refreshToken.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn('Database teardown warning:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export prisma client for tests
export { prisma };

// Global test setup can be added here
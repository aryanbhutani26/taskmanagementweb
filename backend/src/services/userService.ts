import { PrismaClient, User } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/auth';

const prisma = new PrismaClient();

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new user with hashed password
 */
export async function createUser(userData: CreateUserData): Promise<UserWithoutPassword> {
  const { email, password, name } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find user by ID (without password)
 */
export async function findUserById(id: string): Promise<UserWithoutPassword | null> {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
  const user = await findUserByEmail(email);
  
  if (!user) {
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  
  if (!isPasswordValid) {
    return null;
  }

  // Return user without password
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update user information
 */
export async function updateUser(id: string, updates: Partial<CreateUserData>): Promise<UserWithoutPassword> {
  const updateData: any = { ...updates };

  // Hash password if it's being updated
  if (updates.password) {
    updateData.password = await hashPassword(updates.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Delete user by ID
 */
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({
    where: { id },
  });
}
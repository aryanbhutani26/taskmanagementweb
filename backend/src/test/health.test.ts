import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should be able to import express', async () => {
    const express = await import('express');
    expect(express.default).toBeDefined();
  });

  it('should be able to import prisma client', async () => {
    const { PrismaClient } = await import('@prisma/client');
    expect(PrismaClient).toBeDefined();
  });
});
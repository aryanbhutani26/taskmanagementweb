import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have environment variables loaded', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
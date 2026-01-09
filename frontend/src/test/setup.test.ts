import { describe, it, expect } from 'vitest';

describe('Frontend Test Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should be able to run tests', () => {
    expect(typeof window).toBe('object');
  });
});
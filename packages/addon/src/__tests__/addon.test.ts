import { describe, it, expect } from 'vitest';

describe('addon', () => {
  it('should be importable', async () => {
    const addon = await import('../index.js');
    expect(addon).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';

describe('sdk', () => {
  it('should be importable', async () => {
    const sdk = await import('../index.js');
    expect(sdk).toBeDefined();
  });
});

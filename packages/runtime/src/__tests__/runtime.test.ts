import { describe, it, expect } from 'vitest';

describe('runtime', () => {
  it('should be importable', async () => {
    const runtime = await import('../index.js');
    expect(runtime).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';

describe('build', () => {
  it('should be importable', async () => {
    const build = await import('../index.js');
    expect(build).toBeDefined();
  });
});

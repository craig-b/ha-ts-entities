import { describe, it, expect } from 'vitest';

describe('web', () => {
  it('should be importable', async () => {
    const web = await import('../index.js');
    expect(web).toBeDefined();
  });
});

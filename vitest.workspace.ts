import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*/vitest.config.ts',
  {
    test: {
      name: 'integration',
      include: ['tests/**/*.test.ts'],
      globals: true,
    },
  },
]);

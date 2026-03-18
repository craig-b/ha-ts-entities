import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type TypeRegenFn = () => Promise<{ success: boolean; entityCount: number; serviceCount: number; errors: string[] }>;

export interface TypesRouteOptions {
  generatedDir: string;
  regenerateTypes: TypeRegenFn;
}

export function createTypesRoutes(opts: TypesRouteOptions) {
  const app = new Hono();

  // Get type generation status
  app.get('/status', (c) => {
    const metaPath = path.join(opts.generatedDir, 'ha-registry-meta.json');
    if (!fs.existsSync(metaPath)) {
      return c.json({ generated: false, meta: null });
    }

    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      return c.json({ generated: true, meta });
    } catch {
      return c.json({ generated: false, meta: null });
    }
  });

  // Trigger type regeneration
  app.post('/regenerate', async (c) => {
    try {
      const result = await opts.regenerateTypes();
      return c.json(result);
    } catch (err) {
      return c.json({ error: 'Type regeneration failed' }, 500);
    }
  });

  return app;
}

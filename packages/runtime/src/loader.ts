import * as path from 'node:path';
import * as fs from 'node:fs';
import type { EntityDefinition, EntityFactory, ResolvedEntity } from '@ha-ts-entities/sdk';

export interface LoadResult {
  entities: ResolvedEntity[];
  errors: LoadError[];
}

export interface LoadError {
  file: string;
  error: string;
}

/**
 * Load bundled JS files from a directory and extract entity definitions.
 *
 * Each file is expected to export entity definitions (from sensor(), switch(), etc.)
 * or an entity factory (from entityFactory()). Exports can be named or default.
 */
export async function loadBundles(bundleDir: string): Promise<LoadResult> {
  const entities: ResolvedEntity[] = [];
  const errors: LoadError[] = [];

  if (!fs.existsSync(bundleDir)) {
    return { entities, errors };
  }

  const jsFiles = findJsFiles(bundleDir);

  for (const file of jsFiles) {
    try {
      const fileEntities = await loadSingleBundle(file, bundleDir);
      entities.push(...fileEntities);
    } catch (err) {
      errors.push({
        file,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { entities, errors };
}

async function loadSingleBundle(
  filePath: string,
  bundleDir: string,
): Promise<ResolvedEntity[]> {
  // Dynamic import — file:// URL required for absolute paths on all platforms
  const fileUrl = `file://${filePath}`;
  const mod = await import(fileUrl);

  const sourceFile = path.relative(bundleDir, filePath).replace(/\.js$/, '.ts');
  const fileBaseName = path.basename(filePath, '.js');

  const definitions: EntityDefinition[] = [];
  const factories: EntityFactory[] = [];

  // Walk all exports
  for (const [, value] of Object.entries(mod)) {
    if (isEntityDefinition(value)) {
      definitions.push(value);
    } else if (isEntityFactory(value)) {
      factories.push(value);
    }
  }

  // Resolve factories
  for (const factory of factories) {
    try {
      const result = await factory();
      definitions.push(...result);
    } catch (err) {
      throw new Error(
        `Factory in ${sourceFile} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Group entities by device or file
  return definitions.map((definition) => {
    const deviceId = definition.device?.id ?? fileBaseName;
    return {
      definition,
      sourceFile,
      deviceId,
    };
  });
}

function isEntityDefinition(value: unknown): value is EntityDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

function isEntityFactory(value: unknown): value is EntityFactory {
  // A factory is a bare function (not an entity definition which is an object)
  return typeof value === 'function';
}

function findJsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.js.map')) {
      files.push(fullPath);
    }
  }

  return files;
}

import type { MqttCredentials } from '@ha-ts-entities/runtime';

export interface AddonOptions {
  log_level: 'debug' | 'info' | 'warn' | 'error';
  log_retention_days: number;
  validation_schedule_minutes: number;
  auto_build_on_save: boolean;
  auto_rebuild_on_registry_change: boolean;
}

const DEFAULT_OPTIONS: AddonOptions = {
  log_level: 'info',
  log_retention_days: 7,
  validation_schedule_minutes: 60,
  auto_build_on_save: false,
  auto_rebuild_on_registry_change: false,
};

export async function fetchMqttCredentials(): Promise<MqttCredentials> {
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) {
    throw new Error('SUPERVISOR_TOKEN not set — not running as HA add-on?');
  }

  const response = await fetch('http://supervisor/services/mqtt', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get MQTT credentials: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { data: MqttCredentials };
  return data.data;
}

export async function readOptions(): Promise<AddonOptions> {
  try {
    const { readFile } = await import('node:fs/promises');
    const raw = await readFile('/data/options.json', 'utf-8');
    return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] [ts-entities] ${msg}`);
}

async function main(): Promise<void> {
  const options = await readOptions();
  log(`Starting with log_level=${options.log_level}`);
  log(`Node ${process.version}`);

  // Minimal startup — get the web server running first, then wire up services
  log('Step 1: Starting web server...');
  try {
    const http = await import('node:http');
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>TS Entities</h1><p>Add-on is starting...</p>');
    });
    server.listen(8099, () => {
      log('Web server listening on port 8099');
    });
  } catch (err) {
    log(`Web server failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  log('Step 2: Importing runtime...');
  try {
    const runtime = await import('@ha-ts-entities/runtime');
    log(`Runtime loaded: ${Object.keys(runtime).join(', ')}`);
  } catch (err) {
    log(`Runtime import failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  }

  log('Step 3: Initializing SQLite logger...');
  try {
    const { SQLiteLogger } = await import('@ha-ts-entities/runtime');
    const logger = new SQLiteLogger({
      dbPath: '/data/logs.db',
      minLevel: options.log_level,
      retentionDays: options.log_retention_days,
    });
    log('SQLite logger initialized');
    logger.info('Add-on started');
  } catch (err) {
    log(`SQLite logger failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  }

  log('Startup complete — keeping process alive');

  // Keep alive
  process.on('SIGTERM', () => { log('SIGTERM received'); process.exit(0); });
  process.on('SIGINT', () => { log('SIGINT received'); process.exit(0); });
}

// Only run main if this is the entry point
const isMain = process.argv[1]?.endsWith('addon/dist/index.js') ||
               process.argv[1]?.endsWith('addon/src/index.ts');
if (isMain) {
  process.on('uncaughtException', (err) => {
    console.error('[ts-entities] Uncaught exception:', err);
  });
  process.on('unhandledRejection', (err) => {
    console.error('[ts-entities] Unhandled rejection:', err);
  });
  main().catch((err) => {
    console.error('[ts-entities] Fatal error:', err);
    process.exit(1);
  });
}

import type { SensorConfig, SensorDefinition, EntityContext } from '../types.js';

export interface SensorOptions {
  id: string;
  name: string;
  device?: SensorDefinition['device'];
  category?: SensorDefinition['category'];
  icon?: string;
  config?: SensorConfig;
  init?(this: EntityContext<string | number>): string | number | Promise<string | number>;
  destroy?(this: EntityContext<string | number>): void | Promise<void>;
}

export function sensor(options: SensorOptions): SensorDefinition {
  return {
    ...options,
    type: 'sensor',
  };
}

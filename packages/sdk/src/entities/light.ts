import type { LightConfig, LightDefinition, LightCommand, LightState, EntityContext } from '../types.js';

export interface LightOptions {
  id: string;
  name: string;
  device?: LightDefinition['device'];
  category?: LightDefinition['category'];
  icon?: string;
  config: LightConfig;
  onCommand(this: EntityContext<LightState>, command: LightCommand): void | Promise<void>;
  init?(this: EntityContext<LightState>): LightState | Promise<LightState>;
  destroy?(this: EntityContext<LightState>): void | Promise<void>;
}

export function light(options: LightOptions): LightDefinition {
  return {
    ...options,
    type: 'light',
  };
}

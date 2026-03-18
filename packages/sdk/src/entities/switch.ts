import type { SwitchConfig, SwitchDefinition, EntityContext } from '../types.js';

export interface SwitchOptions {
  id: string;
  name: string;
  device?: SwitchDefinition['device'];
  category?: SwitchDefinition['category'];
  icon?: string;
  config?: SwitchConfig;
  onCommand(this: EntityContext<'on' | 'off'>, command: 'ON' | 'OFF'): void | Promise<void>;
  init?(this: EntityContext<'on' | 'off'>): 'on' | 'off' | Promise<'on' | 'off'>;
  destroy?(this: EntityContext<'on' | 'off'>): void | Promise<void>;
}

export function defineSwitch(options: SwitchOptions): SwitchDefinition {
  return {
    ...options,
    type: 'switch',
  };
}

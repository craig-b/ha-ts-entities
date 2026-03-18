import type { ClimateConfig, ClimateDefinition, ClimateCommand, ClimateState, EntityContext } from '../types.js';

export interface ClimateOptions {
  id: string;
  name: string;
  device?: ClimateDefinition['device'];
  category?: ClimateDefinition['category'];
  icon?: string;
  config: ClimateConfig;
  onCommand(this: EntityContext<ClimateState>, command: ClimateCommand): void | Promise<void>;
  init?(this: EntityContext<ClimateState>): ClimateState | Promise<ClimateState>;
  destroy?(this: EntityContext<ClimateState>): void | Promise<void>;
}

export function climate(options: ClimateOptions): ClimateDefinition {
  return {
    ...options,
    type: 'climate',
  };
}

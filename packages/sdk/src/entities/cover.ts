import type { CoverConfig, CoverDefinition, CoverCommand, CoverState, EntityContext } from '../types.js';

export interface CoverOptions {
  id: string;
  name: string;
  device?: CoverDefinition['device'];
  category?: CoverDefinition['category'];
  icon?: string;
  config?: CoverConfig;
  onCommand(this: EntityContext<CoverState>, command: CoverCommand): void | Promise<void>;
  init?(this: EntityContext<CoverState>): CoverState | Promise<CoverState>;
  destroy?(this: EntityContext<CoverState>): void | Promise<void>;
}

export function cover(options: CoverOptions): CoverDefinition {
  return {
    ...options,
    type: 'cover',
  };
}

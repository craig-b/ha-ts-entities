import type { EntityDefinition, EntityFactory } from '../types.js';

export function entityFactory(
  factory: () => EntityDefinition[] | Promise<EntityDefinition[]>,
): EntityFactory {
  return factory;
}

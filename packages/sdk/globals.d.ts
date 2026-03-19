import type { SensorOptions } from '@ha-ts-entities/sdk';
import type { SwitchOptions } from '@ha-ts-entities/sdk';
import type { LightOptions } from '@ha-ts-entities/sdk';
import type { CoverOptions } from '@ha-ts-entities/sdk';
import type { ClimateOptions } from '@ha-ts-entities/sdk';
import type {
  SensorDefinition,
  SwitchDefinition,
  LightDefinition,
  CoverDefinition,
  ClimateDefinition,
  EntityDefinition,
  EntityFactory,
  HAClient,
} from '@ha-ts-entities/sdk';

declare global {
  function sensor(options: SensorOptions): SensorDefinition;
  function defineSwitch(options: SwitchOptions): SwitchDefinition;
  function light(options: LightOptions): LightDefinition;
  function cover(options: CoverOptions): CoverDefinition;
  function climate(options: ClimateOptions): ClimateDefinition;
  function entityFactory(factory: () => EntityDefinition[] | Promise<EntityDefinition[]>): EntityFactory;
  const ha: HAClient;
}

export {};

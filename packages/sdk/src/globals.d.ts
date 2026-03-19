import type { SensorOptions } from './entities/sensor.js';
import type { SwitchOptions } from './entities/switch.js';
import type { LightOptions } from './entities/light.js';
import type { CoverOptions } from './entities/cover.js';
import type { ClimateOptions } from './entities/climate.js';
import type {
  SensorDefinition,
  SwitchDefinition,
  LightDefinition,
  CoverDefinition,
  ClimateDefinition,
  EntityDefinition,
  EntityFactory,
  HAClient,
} from './types.js';

declare global {
  function sensor(options: SensorOptions): SensorDefinition;
  function defineSwitch(options: SwitchOptions): SwitchDefinition;
  function light(options: LightOptions): LightDefinition;
  function cover(options: CoverOptions): CoverDefinition;
  function climate(options: ClimateOptions): ClimateDefinition;
  function entityFactory(factory: () => EntityDefinition[] | Promise<EntityDefinition[]>): EntityFactory;
  const ha: HAClient;
}

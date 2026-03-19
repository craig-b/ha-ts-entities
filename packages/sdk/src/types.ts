// ---- Branded numeric type ----

export type NumberInRange<Min extends number, Max extends number> = number & {
  readonly __min: Min;
  readonly __max: Max;
  readonly __brand: 'RangeValidated';
};

// ---- Entity types ----

export type EntityType =
  | 'sensor'
  | 'binary_sensor'
  | 'switch'
  | 'light'
  | 'cover'
  | 'climate'
  | 'fan'
  | 'lock'
  | 'humidifier'
  | 'valve'
  | 'water_heater'
  | 'vacuum'
  | 'lawn_mower'
  | 'siren'
  | 'number'
  | 'select'
  | 'text'
  | 'button'
  | 'scene'
  | 'event'
  | 'device_tracker'
  | 'camera'
  | 'alarm_control_panel'
  | 'notify'
  | 'update'
  | 'image';

// ---- Device info ----

export interface DeviceInfo {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  sw_version?: string;
  suggested_area?: string;
}

// ---- Logging ----

export interface EntityLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

// ---- State changed event (from HA WebSocket) ----

export interface StateChangedEvent {
  entity_id: string;
  old_state: string;
  new_state: string;
  old_attributes: Record<string, unknown>;
  new_attributes: Record<string, unknown>;
  timestamp: number;
}

export interface TypedStateChangedEvent<TState, TAttrs, TEntityId extends string = string> {
  entity_id: TEntityId;
  old_state: TState;
  new_state: TState;
  old_attributes: TAttrs;
  new_attributes: TAttrs;
  timestamp: number;
}

export type StateChangedCallback = (event: StateChangedEvent) => void;

// ---- Reaction rule for declarative reactions ----

export interface ReactionRule {
  to?: string;
  when?: (event: StateChangedEvent) => boolean;
  do: () => void | Promise<void>;
  after?: number;
}

// ---- HA API interfaces ----

// Base interface — only methods that don't need registry-generated types.
// The full HAClient (with on/callService/getState) is defined either by
// generated ha-registry.d.ts or by a fallback declaration appended at serve time.
// This split ensures typed overloads appear BEFORE the string fallback in Monaco.
export interface HAClientBase {
  log: EntityLogger;
  getEntities(domain?: string): Promise<string[]>;
  fireEvent(eventType: string, eventData?: Record<string, unknown>): Promise<void>;
}

// Full client interface used at compile time in the monorepo.
// For Monaco, this interface is stripped from the SDK declaration and replaced
// by either generated typed overloads or an untyped fallback — both extending
// HAClientBase with string fallbacks appearing last.
export interface HAClient extends HAClientBase {
  on(entityOrDomain: string | string[], callback: StateChangedCallback): () => void;
  callService(entity: string, service: string, data?: Record<string, unknown>): Promise<void>;
  getState(entityId: string): Promise<{
    state: string;
    attributes: Record<string, unknown>;
    last_changed: string;
    last_updated: string;
  } | null>;
  reactions(rules: Record<string, ReactionRule>): () => void;
}

// ---- Entity context (bound as `this` in callbacks) ----

export interface EntityContext<TState = unknown> {
  update(value: TState, attributes?: Record<string, unknown>): void;
  poll(fn: () => TState | Promise<TState>, opts: { interval: number }): void;
  log: EntityLogger;
  setTimeout(fn: () => void, ms: number): void;
  setInterval(fn: () => void, ms: number): void;
  fetch: typeof globalThis.fetch;
  ha: HAClient;
  mqtt: {
    publish(topic: string, payload: string, opts?: { retain?: boolean }): void;
    subscribe(topic: string, handler: (payload: string) => void): void;
  };
}

// ---- Base entity definition ----

export interface BaseEntity<TState, TConfig = Record<string, never>> {
  id: string;
  name: string;
  type: EntityType;
  device?: DeviceInfo;
  category?: 'config' | 'diagnostic';
  icon?: string;
  config?: TConfig;
  init?(this: EntityContext<TState>): TState | Promise<TState>;
  destroy?(this: EntityContext<TState>): void | Promise<void>;
}

// ---- Sensor ----

export type SensorDeviceClass =
  | 'apparent_power'
  | 'aqi'
  | 'atmospheric_pressure'
  | 'battery'
  | 'carbon_dioxide'
  | 'carbon_monoxide'
  | 'current'
  | 'data_rate'
  | 'data_size'
  | 'date'
  | 'distance'
  | 'duration'
  | 'energy'
  | 'energy_storage'
  | 'enum'
  | 'frequency'
  | 'gas'
  | 'humidity'
  | 'illuminance'
  | 'irradiance'
  | 'moisture'
  | 'monetary'
  | 'nitrogen_dioxide'
  | 'nitrogen_monoxide'
  | 'nitrous_oxide'
  | 'ozone'
  | 'ph'
  | 'pm1'
  | 'pm10'
  | 'pm25'
  | 'power'
  | 'power_factor'
  | 'precipitation'
  | 'precipitation_intensity'
  | 'pressure'
  | 'reactive_power'
  | 'signal_strength'
  | 'sound_pressure'
  | 'speed'
  | 'sulphur_dioxide'
  | 'temperature'
  | 'timestamp'
  | 'volatile_organic_compounds'
  | 'volatile_organic_compounds_parts'
  | 'voltage'
  | 'volume'
  | 'volume_flow_rate'
  | 'volume_storage'
  | 'water'
  | 'weight'
  | 'wind_speed';

export interface SensorConfig {
  device_class?: SensorDeviceClass;
  unit_of_measurement?: string;
  state_class?: 'measurement' | 'total' | 'total_increasing';
  suggested_display_precision?: number;
}

export interface SensorDefinition extends BaseEntity<string | number, SensorConfig> {
  type: 'sensor';
}

// ---- Binary sensor ----

export type BinarySensorDeviceClass =
  | 'battery'
  | 'battery_charging'
  | 'carbon_monoxide'
  | 'cold'
  | 'connectivity'
  | 'door'
  | 'garage_door'
  | 'gas'
  | 'heat'
  | 'light'
  | 'lock'
  | 'moisture'
  | 'motion'
  | 'moving'
  | 'occupancy'
  | 'opening'
  | 'plug'
  | 'power'
  | 'presence'
  | 'problem'
  | 'running'
  | 'safety'
  | 'smoke'
  | 'sound'
  | 'tamper'
  | 'update'
  | 'vibration'
  | 'window';

export interface BinarySensorConfig {
  device_class?: BinarySensorDeviceClass;
}

export interface BinarySensorDefinition extends BaseEntity<'on' | 'off', BinarySensorConfig> {
  type: 'binary_sensor';
}

// ---- Switch ----

export interface SwitchConfig {
  device_class?: 'outlet' | 'switch';
}

export interface SwitchDefinition extends BaseEntity<'on' | 'off', SwitchConfig> {
  type: 'switch';
  onCommand(this: EntityContext<'on' | 'off'>, command: 'ON' | 'OFF'): void | Promise<void>;
}

// ---- Light ----

export type ColorMode =
  | 'onoff'
  | 'brightness'
  | 'color_temp'
  | 'hs'
  | 'rgb'
  | 'rgbw'
  | 'rgbww'
  | 'xy'
  | 'white';

export interface LightConfig {
  supported_color_modes: ColorMode[];
  effect_list?: string[];
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
}

export interface LightCommand {
  state: 'ON' | 'OFF';
  brightness?: number;
  color_temp?: number;
  color?: { r: number; g: number; b: number };
  color_temp_kelvin?: number;
  hs_color?: [number, number];
  xy_color?: [number, number];
  rgb_color?: [number, number, number];
  rgbw_color?: [number, number, number, number];
  rgbww_color?: [number, number, number, number, number];
  white?: number;
  effect?: string;
  transition?: number;
}

export interface LightState {
  state: 'on' | 'off';
  brightness?: number;
  color_mode?: ColorMode;
  color_temp?: number;
  color_temp_kelvin?: number;
  hs_color?: [number, number];
  xy_color?: [number, number];
  rgb_color?: [number, number, number];
  rgbw_color?: [number, number, number, number];
  rgbww_color?: [number, number, number, number, number];
  effect?: string;
}

export interface LightDefinition extends BaseEntity<LightState, LightConfig> {
  type: 'light';
  onCommand(this: EntityContext<LightState>, command: LightCommand): void | Promise<void>;
}

// ---- Cover ----

export type CoverDeviceClass =
  | 'awning'
  | 'blind'
  | 'curtain'
  | 'damper'
  | 'door'
  | 'garage'
  | 'gate'
  | 'shade'
  | 'shutter'
  | 'window';

export interface CoverConfig {
  device_class?: CoverDeviceClass;
  position?: boolean;
  tilt?: boolean;
}

export type CoverCommand =
  | { action: 'open' }
  | { action: 'close' }
  | { action: 'stop' }
  | { action: 'set_position'; position: number }
  | { action: 'set_tilt'; tilt: number };

export type CoverState = 'open' | 'opening' | 'closed' | 'closing' | 'stopped';

export interface CoverDefinition extends BaseEntity<CoverState, CoverConfig> {
  type: 'cover';
  onCommand(this: EntityContext<CoverState>, command: CoverCommand): void | Promise<void>;
}

// ---- Climate ----

export type HVACMode = 'off' | 'heat' | 'cool' | 'heat_cool' | 'auto' | 'dry' | 'fan_only';

export interface ClimateConfig {
  hvac_modes: HVACMode[];
  fan_modes?: string[];
  preset_modes?: string[];
  swing_modes?: string[];
  min_temp?: number;
  max_temp?: number;
  temp_step?: number;
  temperature_unit?: 'C' | 'F';
}

export interface ClimateCommand {
  hvac_mode?: HVACMode;
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  fan_mode?: string;
  swing_mode?: string;
  preset_mode?: string;
}

export interface ClimateState {
  mode: HVACMode;
  current_temperature?: number;
  temperature?: number;
  target_temp_high?: number;
  target_temp_low?: number;
  fan_mode?: string;
  swing_mode?: string;
  preset_mode?: string;
  action?: 'off' | 'heating' | 'cooling' | 'drying' | 'idle' | 'fan';
}

export interface ClimateDefinition extends BaseEntity<ClimateState, ClimateConfig> {
  type: 'climate';
  onCommand(this: EntityContext<ClimateState>, command: ClimateCommand): void | Promise<void>;
}

// ---- Union of all entity definitions ----

export type EntityDefinition =
  | SensorDefinition
  | BinarySensorDefinition
  | SwitchDefinition
  | LightDefinition
  | CoverDefinition
  | ClimateDefinition;

// ---- Entity factory ----

export type EntityFactory = () => EntityDefinition[] | Promise<EntityDefinition[]>;

// ---- Resolved entity (internal, after factory resolution) ----

export interface ResolvedEntity {
  definition: EntityDefinition;
  sourceFile: string;
  deviceId: string;
}

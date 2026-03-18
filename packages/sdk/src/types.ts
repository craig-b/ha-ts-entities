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

// ---- Entity context (bound as `this` in callbacks) ----

export interface EntityContext<TState = unknown> {
  update(value: TState, attributes?: Record<string, unknown>): void;
  poll(fn: () => TState | Promise<TState>, opts: { interval: number }): void;
  log: EntityLogger;
  setTimeout(fn: () => void, ms: number): void;
  setInterval(fn: () => void, ms: number): void;
  fetch: typeof globalThis.fetch;
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

// ---- Union of all entity definitions ----

export type EntityDefinition =
  | SensorDefinition
  | BinarySensorDefinition
  | SwitchDefinition;

// ---- Entity factory ----

export type EntityFactory = () => EntityDefinition[] | Promise<EntityDefinition[]>;

// ---- Resolved entity (internal, after factory resolution) ----

export interface ResolvedEntity {
  definition: EntityDefinition;
  sourceFile: string;
  deviceId: string;
}

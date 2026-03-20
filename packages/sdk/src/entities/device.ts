import type { EntityDefinition, DeviceOptions, DeviceDefinition } from '../types.js';

/**
 * Define a device that groups multiple entities with a shared lifecycle.
 *
 * The device's `init()` receives a context with `this.entities` for updating
 * each entity, plus managed timers, HTTP, HA client, and MQTT access.
 *
 * @example
 * ```ts
 * export default device({
 *   id: 'weather_station',
 *   name: 'Weather Station',
 *   entities: {
 *     temperature: sensor({
 *       id: 'ws_temperature',
 *       name: 'Temperature',
 *       config: { device_class: 'temperature', unit_of_measurement: '°C' },
 *     }),
 *     humidity: sensor({
 *       id: 'ws_humidity',
 *       name: 'Humidity',
 *       config: { device_class: 'humidity', unit_of_measurement: '%' },
 *     }),
 *   },
 *   init() {
 *     this.poll(async () => {
 *       const data = await this.fetch('http://api/weather').then(r => r.json());
 *       this.entities.temperature.update(data.temp);
 *       this.entities.humidity.update(data.humidity);
 *     }, { interval: 60_000 });
 *   },
 * });
 * ```
 */
export function device<TEntities extends Record<string, EntityDefinition>>(
  options: DeviceOptions<TEntities>,
): DeviceDefinition<TEntities> {
  return {
    __kind: 'device',
    ...options,
  };
}

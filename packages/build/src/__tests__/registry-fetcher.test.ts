import { describe, it, expect, vi } from 'vitest';
import { fetchRegistryData } from '../registry-fetcher.js';
import type { RegistryWSClient } from '../registry-fetcher.js';

function createMockClient(): RegistryWSClient {
  return {
    sendCommand: vi.fn(async (type: string) => {
      switch (type) {
        case 'get_services':
          return {
            light: {
              turn_on: { fields: { brightness: { selector: { number: { min: 0, max: 255 } } } } },
              turn_off: { fields: {} },
            },
          };
        case 'get_states':
          return [
            { entity_id: 'light.test', state: 'on', attributes: { brightness: 200 } },
            { entity_id: 'sensor.temp', state: '22', attributes: {} },
          ];
        case 'config/entity_registry/list':
          return [
            { entity_id: 'light.test', unique_id: 'abc', platform: 'mqtt' },
          ];
        case 'config/device_registry/list':
          return [
            { id: 'dev1', name: 'Test Device', manufacturer: 'Acme' },
          ];
        case 'config/area_registry/list':
          return [
            { area_id: 'living_room', name: 'Living Room' },
          ];
        case 'config/label_registry/list':
          return [
            { label_id: 'important', name: 'Important' },
          ];
        default:
          return null;
      }
    }),
    getHAVersion: vi.fn(() => '2024.3.0'),
  };
}

describe('fetchRegistryData()', () => {
  it('fetches all six datasets in parallel', async () => {
    const client = createMockClient();
    const data = await fetchRegistryData(client);

    expect(client.sendCommand).toHaveBeenCalledWith('get_services');
    expect(client.sendCommand).toHaveBeenCalledWith('get_states');
    expect(client.sendCommand).toHaveBeenCalledWith('config/entity_registry/list');
    expect(client.sendCommand).toHaveBeenCalledWith('config/device_registry/list');
    expect(client.sendCommand).toHaveBeenCalledWith('config/area_registry/list');
    expect(client.sendCommand).toHaveBeenCalledWith('config/label_registry/list');
    expect(client.sendCommand).toHaveBeenCalledTimes(6);
  });

  it('returns services data', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.services).toHaveProperty('light');
    expect(data.services.light).toHaveProperty('turn_on');
  });

  it('returns states data', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.states).toHaveLength(2);
    expect(data.states[0].entity_id).toBe('light.test');
  });

  it('returns entity registry data', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.entities).toHaveLength(1);
    expect(data.entities[0].entity_id).toBe('light.test');
  });

  it('returns device registry data', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0].name).toBe('Test Device');
  });

  it('returns area registry data', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.areas).toHaveLength(1);
    expect(data.areas[0].name).toBe('Living Room');
  });

  it('returns label registry data', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.labels).toHaveLength(1);
    expect(data.labels[0].name).toBe('Important');
  });

  it('includes HA version', async () => {
    const data = await fetchRegistryData(createMockClient());
    expect(data.haVersion).toBe('2024.3.0');
  });

  it('handles null results gracefully', async () => {
    const client: RegistryWSClient = {
      sendCommand: vi.fn(async () => null),
      getHAVersion: vi.fn(() => null),
    };

    const data = await fetchRegistryData(client);
    expect(data.services).toEqual({});
    expect(data.states).toEqual([]);
    expect(data.entities).toEqual([]);
    expect(data.devices).toEqual([]);
    expect(data.areas).toEqual([]);
    expect(data.labels).toEqual([]);
    expect(data.haVersion).toBe('unknown');
  });
});

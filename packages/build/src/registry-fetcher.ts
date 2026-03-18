import type {
  HARegistryData,
  HAStateObject,
  HAEntityRegistryEntry,
  HADeviceRegistryEntry,
  HAAreaRegistryEntry,
  HALabelRegistryEntry,
  HAServiceDomain,
} from './type-generator.js';

/**
 * Interface for the WebSocket client used by the registry fetcher.
 * Decoupled from the runtime ws-client to keep the build package
 * independent of the runtime package.
 */
export interface RegistryWSClient {
  sendCommand(type: string, data?: Record<string, unknown>): Promise<unknown>;
  getHAVersion(): string | null;
}

/**
 * Fetches all registry data from HA via WebSocket commands.
 * Requires an authenticated WebSocket client.
 */
export async function fetchRegistryData(client: RegistryWSClient): Promise<HARegistryData> {
  // Fetch all six datasets in parallel
  const [
    servicesResult,
    statesResult,
    entitiesResult,
    devicesResult,
    areasResult,
    labelsResult,
  ] = await Promise.all([
    client.sendCommand('get_services'),
    client.sendCommand('get_states'),
    client.sendCommand('config/entity_registry/list'),
    client.sendCommand('config/device_registry/list'),
    client.sendCommand('config/area_registry/list'),
    client.sendCommand('config/label_registry/list'),
  ]);

  return {
    services: (servicesResult ?? {}) as Record<string, HAServiceDomain>,
    states: (statesResult ?? []) as HAStateObject[],
    entities: (entitiesResult ?? []) as HAEntityRegistryEntry[],
    devices: (devicesResult ?? []) as HADeviceRegistryEntry[],
    areas: (areasResult ?? []) as HAAreaRegistryEntry[],
    labels: (labelsResult ?? []) as HALabelRegistryEntry[],
    haVersion: client.getHAVersion() ?? 'unknown',
  };
}

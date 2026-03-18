# TS Entities for Home Assistant

Define Home Assistant entities, automations, and reactive behaviors in TypeScript.

A Node.js runtime deployed as a Home Assistant add-on. User-authored `.ts` files declare entities using a typed SDK. The runtime registers them with Home Assistant via MQTT discovery.

## Why TypeScript?

The SDK generates types from your live HA installation — every entity ID, state value, attribute, service, and helper option becomes a typed construct. Autocomplete guides you. The compiler catches references to entities that don't exist, services with invalid parameters, and out-of-range values before anything runs.

```typescript
// Every entity ID autocompletes. State values are literal unions.
ha.on('input_select.house_mode', (e) => {
  // e.new_state: 'home' | 'away' | 'sleeping' | 'vacation'
  if (e.new_state === 'away') {
    ha.callService('light.living_room', 'turn_off');
  }
});

// Service parameters are typed with constraints from your HA instance.
ha.callService('light.living_room', 'turn_on', {
  brightness: 200,   // validated against 0–255
  transition: 2,     // validated against 0–300
});
```

## How It Works

1. **Type generation** — connects to HA's WebSocket API, pulls the entity registry, service definitions, and state data. Generates `.d.ts` types and companion runtime validators.
2. **Build** — esbuild bundles your `.ts` files. tsc type-checks in parallel.
3. **Deploy** — entities registered via MQTT discovery. State updates published to MQTT. Commands received via MQTT subscriptions.

## Defining Entities

```typescript
// A sensor that polls an external source
const temp = sensor({
  id: 'backyard_temp',
  name: 'Temperature',
  config: {
    device_class: 'temperature',
    unit_of_measurement: '°C',
    state_class: 'measurement',
  },
  init() {
    this.poll(readSensor, { interval: 30_000 });
    return readSensor();
  },
});

// A bidirectional switch
const garageSwitch = switch({
  id: 'garage_door',
  name: 'Garage Door',
  onCommand(cmd) {
    actuate(cmd); // cmd: 'ON' | 'OFF'
  },
});
```

## Reactive Patterns

Declarative reaction maps with typed keys and values:

```typescript
export default reactions({
  'binary_sensor.front_door': {
    to: 'on',
    do: () => ha.callService('light.porch', 'turn_on', { brightness: 255 }),
  },
  'switch.garage_door': {
    to: 'on',
    after: 600_000, // auto-close after 10 minutes
    do: () => {
      ha.callService('switch.garage_door', 'turn_off');
      ha.callService('notify.mobile_app', 'send_message', {
        message: 'Garage open 10 minutes, closing.',
      });
    },
  },
});
```

## Architecture

- **Add-on**: Node.js LTS in Docker on HAOS. Connects to Mosquitto (MQTT) and HA WebSocket API.
- **Editor**: Ingress-based Monaco editor with full IntelliSense, file tree, dependency management, build controls, entity dashboard, and log viewer.
- **Transport**: MQTT discovery for 28 entity types. Transport-agnostic API allows future native bridge for unsupported types.
- **Health monitoring**: Scheduled type validation detects HA registry drift. Health entities (`binary_sensor.ts_entities_build_healthy`) can trigger HA automations on breakage.

## Supported Entity Types

Sensors, binary sensors, switches, lights, covers, fans, locks, climate, humidifier, valve, water heater, vacuum, lawn mower, siren, number, select, text, button, scene, notify, update, event, device tracker, camera, alarm control panel, image, and tag.

## Requirements

- Home Assistant OS with Mosquitto MQTT broker add-on
- Node.js LTS (bundled in the add-on container)

## Documentation

See [SPEC.md](SPEC.md) for the full technical specification.

Local HA reference docs are available under `docs/` — see [CLAUDE.md](CLAUDE.md) for details.

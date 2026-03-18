import { describe, it, expect } from 'vitest';
import { sensor, defineSwitch, light, cover, climate, entityFactory } from '../index.js';
import { rangeValidator, oneOfValidator, rgbValidator, entityExistsValidator, entityDomainValidator } from '../validate.js';

describe('sensor()', () => {
  it('creates a sensor definition with type "sensor"', () => {
    const s = sensor({
      id: 'test_temp',
      name: 'Temperature',
      config: {
        device_class: 'temperature',
        unit_of_measurement: '°C',
        state_class: 'measurement',
      },
    });

    expect(s.type).toBe('sensor');
    expect(s.id).toBe('test_temp');
    expect(s.name).toBe('Temperature');
    expect(s.config?.device_class).toBe('temperature');
    expect(s.config?.unit_of_measurement).toBe('°C');
    expect(s.config?.state_class).toBe('measurement');
  });

  it('supports optional device info', () => {
    const s = sensor({
      id: 'test',
      name: 'Test',
      device: {
        id: 'my_device',
        name: 'My Device',
        manufacturer: 'Acme',
        model: 'Widget',
      },
    });

    expect(s.device?.id).toBe('my_device');
    expect(s.device?.manufacturer).toBe('Acme');
  });

  it('supports optional icon and category', () => {
    const s = sensor({
      id: 'test',
      name: 'Test',
      icon: 'mdi:thermometer',
      category: 'diagnostic',
    });

    expect(s.icon).toBe('mdi:thermometer');
    expect(s.category).toBe('diagnostic');
  });
});

describe('defineSwitch()', () => {
  it('creates a switch definition with onCommand', () => {
    const s = defineSwitch({
      id: 'pump',
      name: 'Pump',
      config: { device_class: 'switch' },
      onCommand(cmd) {
        // cmd is typed as 'ON' | 'OFF'
        void cmd;
      },
    });

    expect(s.type).toBe('switch');
    expect(s.id).toBe('pump');
    expect(s.config?.device_class).toBe('switch');
    expect(typeof s.onCommand).toBe('function');
  });
});

describe('light()', () => {
  it('creates a light definition with color modes', () => {
    const l = light({
      id: 'desk_light',
      name: 'Desk Light',
      config: {
        supported_color_modes: ['rgb', 'brightness'],
        effect_list: ['rainbow', 'breathe'],
      },
      onCommand(cmd) {
        void cmd;
      },
    });

    expect(l.type).toBe('light');
    expect(l.id).toBe('desk_light');
    expect(l.config?.supported_color_modes).toEqual(['rgb', 'brightness']);
    expect(l.config?.effect_list).toEqual(['rainbow', 'breathe']);
    expect(typeof l.onCommand).toBe('function');
  });

  it('supports color temp range config', () => {
    const l = light({
      id: 'ct_light',
      name: 'CT Light',
      config: {
        supported_color_modes: ['color_temp'],
        min_color_temp_kelvin: 2700,
        max_color_temp_kelvin: 6500,
      },
      onCommand() {},
    });

    expect(l.config?.min_color_temp_kelvin).toBe(2700);
    expect(l.config?.max_color_temp_kelvin).toBe(6500);
  });
});

describe('cover()', () => {
  it('creates a cover definition', () => {
    const c = cover({
      id: 'garage_door',
      name: 'Garage Door',
      config: {
        device_class: 'garage',
        position: true,
      },
      onCommand(cmd) {
        void cmd;
      },
    });

    expect(c.type).toBe('cover');
    expect(c.id).toBe('garage_door');
    expect(c.config?.device_class).toBe('garage');
    expect(c.config?.position).toBe(true);
    expect(typeof c.onCommand).toBe('function');
  });
});

describe('climate()', () => {
  it('creates a climate definition with modes', () => {
    const cl = climate({
      id: 'bedroom_climate',
      name: 'Bedroom',
      config: {
        hvac_modes: ['off', 'heat', 'cool'],
        min_temp: 16,
        max_temp: 30,
        temp_step: 0.5,
        fan_modes: ['low', 'high'],
        preset_modes: ['eco', 'comfort'],
      },
      onCommand(cmd) {
        void cmd;
      },
    });

    expect(cl.type).toBe('climate');
    expect(cl.config?.hvac_modes).toEqual(['off', 'heat', 'cool']);
    expect(cl.config?.min_temp).toBe(16);
    expect(cl.config?.max_temp).toBe(30);
    expect(cl.config?.temp_step).toBe(0.5);
    expect(cl.config?.fan_modes).toEqual(['low', 'high']);
    expect(cl.config?.preset_modes).toEqual(['eco', 'comfort']);
    expect(typeof cl.onCommand).toBe('function');
  });
});

describe('entityFactory()', () => {
  it('wraps a factory function', () => {
    const factory = entityFactory(() => [
      sensor({ id: 'a', name: 'A' }),
      sensor({ id: 'b', name: 'B' }),
    ]);

    expect(typeof factory).toBe('function');
    const result = factory();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('supports async factories', async () => {
    const factory = entityFactory(async () => [
      sensor({ id: 'async_sensor', name: 'Async' }),
    ]);

    const result = await factory();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('async_sensor');
  });
});

describe('rangeValidator()', () => {
  it('accepts values within range', () => {
    const validate = rangeValidator(0, 255);
    expect(validate(100)).toBe(100);
    expect(validate(0)).toBe(0);
    expect(validate(255)).toBe(255);
  });

  it('rejects values outside range', () => {
    const validate = rangeValidator(0, 255);
    expect(() => validate(-1)).toThrow(RangeError);
    expect(() => validate(256)).toThrow(RangeError);
  });

  it('rejects non-numbers', () => {
    const validate = rangeValidator(0, 100);
    expect(() => validate('50' as unknown as number)).toThrow(RangeError);
  });
});

describe('oneOfValidator()', () => {
  it('accepts valid options', () => {
    const validate = oneOfValidator(['home', 'away', 'sleeping'] as const);
    expect(validate('home')).toBe('home');
    expect(validate('away')).toBe('away');
  });

  it('rejects invalid options', () => {
    const validate = oneOfValidator(['home', 'away'] as const);
    expect(() => validate('invalid')).toThrow(TypeError);
  });
});

describe('rgbValidator()', () => {
  it('accepts valid RGB tuples', () => {
    const validate = rgbValidator();
    expect(validate([255, 128, 0])).toEqual([255, 128, 0]);
    expect(validate([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('rejects invalid RGB values', () => {
    const validate = rgbValidator();
    expect(() => validate([256, 0, 0])).toThrow(TypeError);
    expect(() => validate([-1, 0, 0])).toThrow(TypeError);
    expect(() => validate([0, 0])).toThrow(TypeError);
    expect(() => validate('red')).toThrow(TypeError);
  });
});

describe('entityExistsValidator()', () => {
  const knownIds = ['light.living_room', 'light.bedroom', 'switch.pump'];

  it('accepts known entity IDs', () => {
    const validate = entityExistsValidator(knownIds);
    expect(validate('light.living_room')).toBe('light.living_room');
    expect(validate('switch.pump')).toBe('switch.pump');
  });

  it('rejects unknown entity IDs', () => {
    const validate = entityExistsValidator(knownIds);
    expect(() => validate('light.nonexistent')).toThrow(TypeError);
  });

  it('rejects non-string values', () => {
    const validate = entityExistsValidator(knownIds);
    expect(() => validate(42 as unknown as string)).toThrow(TypeError);
  });
});

describe('entityDomainValidator()', () => {
  const knownIds = ['light.living_room', 'light.bedroom', 'switch.pump'];

  it('accepts entity IDs in the specified domain', () => {
    const validate = entityDomainValidator('light', knownIds);
    expect(validate('light.living_room')).toBe('light.living_room');
    expect(validate('light.bedroom')).toBe('light.bedroom');
  });

  it('rejects entity IDs from other domains', () => {
    const validate = entityDomainValidator('light', knownIds);
    expect(() => validate('switch.pump')).toThrow(TypeError);
  });

  it('rejects unknown entity IDs', () => {
    const validate = entityDomainValidator('light', knownIds);
    expect(() => validate('light.nonexistent')).toThrow(TypeError);
  });
});

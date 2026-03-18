import { describe, it, expect } from 'vitest';
import { sensor, entityFactory } from '../index.js';
import { rangeValidator, oneOfValidator, rgbValidator } from '../validate.js';

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

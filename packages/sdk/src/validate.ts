import type { NumberInRange } from './types.js';

export function rangeValidator<Min extends number, Max extends number>(min: Min, max: Max) {
  return (value: number): NumberInRange<Min, Max> => {
    if (typeof value !== 'number' || value < min || value > max) {
      throw new RangeError(`Expected number in range ${min}–${max}, got ${value}`);
    }
    return value as NumberInRange<Min, Max>;
  };
}

export function oneOfValidator<T extends readonly string[]>(options: T) {
  return (value: string): T[number] => {
    if (!options.includes(value)) {
      throw new TypeError(`Expected one of [${options.join(', ')}], got '${value}'`);
    }
    return value as T[number];
  };
}

export function rgbValidator() {
  return (value: unknown): [number, number, number] => {
    if (
      !Array.isArray(value) ||
      value.length !== 3 ||
      !value.every((v) => typeof v === 'number' && v >= 0 && v <= 255)
    ) {
      throw new TypeError(
        `Expected [r, g, b] with values 0–255, got ${JSON.stringify(value)}`,
      );
    }
    return value as [number, number, number];
  };
}

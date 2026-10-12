// The small assert helpers the tests were first written with, on top of vitest.
// Run all tests with `npm test`.

export { test } from 'vitest';

export function assert(condition: unknown, message = 'assertion failed'): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertEqual<T>(actual: T, expected: T, message = ''): void {
  if (actual !== expected) {
    throw new Error(`${message} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertClose(actual: number, expected: number, tolerance: number, message = ''): void {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    throw new Error(`${message} expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

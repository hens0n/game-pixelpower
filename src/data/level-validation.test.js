import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SUPPORTED_COLORS, validateLevel } from './level-validation.js';

const VALID_LEVEL = {
  id: 'valid',
  name: 'Valid Level',
  description: 'test',
  layout: [
    ['red', null],
    [null, 'blue'],
  ],
  bench: [
    { color: 'red', ammo: 1 },
    { color: 'blue', ammo: 1 },
  ],
};

test('SUPPORTED_COLORS is a non-empty set', () => {
  assert.ok(SUPPORTED_COLORS instanceof Set);
  assert.ok(SUPPORTED_COLORS.size > 0);
});

test('validateLevel accepts a level with all supported colors', () => {
  assert.doesNotThrow(() => validateLevel(VALID_LEVEL, 0));
});

test('validateLevel rejects an unknown color in the layout', () => {
  const bad = { ...VALID_LEVEL, layout: [['red'], ['grey']] };
  assert.throws(
    () => validateLevel(bad, 0),
    /level 1.*grey/,
  );
});

test('validateLevel rejects an unknown color in the bench', () => {
  const bad = { ...VALID_LEVEL, bench: [{ color: 'magenta', ammo: 1 }] };
  assert.throws(
    () => validateLevel(bad, 4),
    /level 5.*magenta/,
  );
});

test('validateLevel rejects a non-rectangular layout', () => {
  const bad = { ...VALID_LEVEL, layout: [['red'], ['red', 'blue']] };
  assert.throws(
    () => validateLevel(bad, 0),
    /rectangular/i,
  );
});

test('validateLevel rejects an empty bench', () => {
  const bad = { ...VALID_LEVEL, bench: [] };
  assert.throws(
    () => validateLevel(bad, 0),
    /bench/i,
  );
});

test('validateLevel rejects a missing layout', () => {
  const bad = { ...VALID_LEVEL, layout: undefined };
  assert.throws(
    () => validateLevel(bad, 0),
    /layout/i,
  );
});

test('validateLevel rejects a bench pig with non-positive ammo', () => {
  const bad = { ...VALID_LEVEL, bench: [{ color: 'red', ammo: 0 }] };
  assert.throws(
    () => validateLevel(bad, 0),
    /ammo/i,
  );
});

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { LEVELS } from './levels.js';

test('LEVELS contains no duplicate layouts', () => {
  const seen = new Map();

  LEVELS.forEach((level, index) => {
    const key = JSON.stringify(level.layout);
    const existing = seen.get(key);
    assert.equal(
      existing,
      undefined,
      `duplicate layout at level ${index + 1} (${level.id}), already used by level ${existing?.level} (${existing?.id})`,
    );
    seen.set(key, { level: index + 1, id: level.id });
  });
});

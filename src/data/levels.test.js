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

test('LEVELS ammo exactly matches pixel counts per color', () => {
  LEVELS.forEach((level, index) => {
    const pixelCounts = {};
    for (const row of level.layout) {
      for (const cell of row) {
        if (cell !== null) pixelCounts[cell] = (pixelCounts[cell] || 0) + 1;
      }
    }

    const ammoCounts = {};
    for (const pig of level.bench) {
      ammoCounts[pig.color] = (ammoCounts[pig.color] || 0) + pig.ammo;
    }

    const allColors = new Set([...Object.keys(pixelCounts), ...Object.keys(ammoCounts)]);
    for (const color of allColors) {
      const pixels = pixelCounts[color] || 0;
      const ammo = ammoCounts[color] || 0;
      assert.equal(
        ammo,
        pixels,
        `level ${index + 1} (${level.id}): ${color} has ${ammo} ammo but ${pixels} pixels`,
      );
    }
  });
});

test('LEVELS contains no duplicate names', () => {
  const seen = new Map();

  LEVELS.forEach((level, index) => {
    const existing = seen.get(level.name);
    assert.equal(
      existing,
      undefined,
      `duplicate name at level ${index + 1} (${level.id}), already used by level ${existing?.level} (${existing?.id})`,
    );
    seen.set(level.name, { level: index + 1, id: level.id });
  });
});

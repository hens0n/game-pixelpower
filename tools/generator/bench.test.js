import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildBench } from './bench.js';

test('buildBench total ammo matches cube counts times multiplier', () => {
  const layout = [['red', 'red', 'yellow'], ['red', 'yellow', 'yellow']];
  const bench = buildBench(layout, { ammoMultiplier: 1.0, benchRange: [3, 5] });
  const totalAmmo = bench.reduce((sum, p) => sum + p.ammo, 0);
  assert.equal(totalAmmo, 6);
});

test('buildBench respects ammo multiplier', () => {
  const layout = [['red', 'red'], ['red', 'red']];
  const bench = buildBench(layout, { ammoMultiplier: 1.5, benchRange: [2, 4] });
  const totalAmmo = bench.reduce((sum, p) => sum + p.ammo, 0);
  assert.equal(totalAmmo, 6);
});

test('buildBench produces pigs within benchRange', () => {
  const layout = [['red', 'yellow', 'green'], ['red', 'yellow', 'green'], ['red', 'yellow', 'green']];
  const bench = buildBench(layout, { ammoMultiplier: 1.3, benchRange: [5, 7] });
  assert.ok(bench.length >= 5 && bench.length <= 7, `bench length ${bench.length} not in [5,7]`);
});

test('buildBench only uses colors present in layout', () => {
  const layout = [['red', 'yellow'], ['red', 'yellow']];
  const bench = buildBench(layout, { ammoMultiplier: 1.0, benchRange: [2, 4] });
  const benchColors = new Set(bench.map(p => p.color));
  assert.ok(!benchColors.has('green'));
  assert.ok(!benchColors.has('blue'));
});

test('every pig has ammo >= 1', () => {
  const layout = [['red', 'yellow', 'green'], ['red', 'yellow', 'green']];
  const bench = buildBench(layout, { ammoMultiplier: 1.0, benchRange: [5, 7] });
  for (const pig of bench) {
    assert.ok(pig.ammo >= 1, `pig with 0 ammo: ${JSON.stringify(pig)}`);
  }
});

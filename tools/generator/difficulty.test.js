import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { TIERS, getTierForLevel } from './difficulty.js';

test('TIERS has four entries with required fields', () => {
  assert.equal(Object.keys(TIERS).length, 4);
  for (const [name, tier] of Object.entries(TIERS)) {
    assert.ok(tier.gridSizes.length > 0, `${name} has gridSizes`);
    assert.ok(tier.colors.length > 0, `${name} has colors`);
    assert.ok(typeof tier.ammoMultiplier === 'number', `${name} has ammoMultiplier`);
    assert.ok(tier.patterns.length > 0, `${name} has patterns`);
    assert.ok(tier.benchRange.length === 2, `${name} has benchRange`);
  }
});

test('getTierForLevel returns correct tier', () => {
  assert.equal(getTierForLevel(11).name, 'easy');
  assert.equal(getTierForLevel(15).name, 'easy');
  assert.equal(getTierForLevel(20).name, 'easy');
  assert.equal(getTierForLevel(21).name, 'medium');
  assert.equal(getTierForLevel(30).name, 'medium');
  assert.equal(getTierForLevel(31).name, 'hard');
  assert.equal(getTierForLevel(40).name, 'hard');
  assert.equal(getTierForLevel(41).name, 'expert');
  assert.equal(getTierForLevel(50).name, 'expert');
});

test('ammo multipliers decrease with difficulty', () => {
  assert.ok(TIERS.easy.ammoMultiplier > TIERS.medium.ammoMultiplier);
  assert.ok(TIERS.medium.ammoMultiplier > TIERS.hard.ammoMultiplier);
  assert.ok(TIERS.hard.ammoMultiplier > TIERS.expert.ammoMultiplier);
});

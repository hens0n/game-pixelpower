import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { computeStars, countWastedPigs } from './scoring.js';

test('countWastedPigs counts launched pigs with leftover ammo', () => {
  const launchedHistory = [
    { color: 'red', initialAmmo: 4, finalAmmo: 0 },
    { color: 'blue', initialAmmo: 3, finalAmmo: 2 },
    { color: 'green', initialAmmo: 2, finalAmmo: 0 },
  ];
  assert.equal(countWastedPigs({ launchedHistory, remaining: 0 }), 1);
});

test('countWastedPigs counts remaining pigs as wasted', () => {
  const launchedHistory = [
    { color: 'red', initialAmmo: 4, finalAmmo: 0 },
  ];
  assert.equal(countWastedPigs({ launchedHistory, remaining: 2 }), 2);
});

test('countWastedPigs combines leftover-ammo and remaining pigs', () => {
  const launchedHistory = [
    { color: 'red', initialAmmo: 4, finalAmmo: 1 },
    { color: 'blue', initialAmmo: 3, finalAmmo: 0 },
  ];
  assert.equal(countWastedPigs({ launchedHistory, remaining: 1 }), 2);
});

test('computeStars returns 3 for zero wasted pigs', () => {
  assert.equal(computeStars({ launchedHistory: [
    { color: 'red', initialAmmo: 2, finalAmmo: 0 },
  ], remaining: 0 }), 3);
});

test('computeStars returns 2 for exactly one wasted pig', () => {
  assert.equal(computeStars({ launchedHistory: [
    { color: 'red', initialAmmo: 2, finalAmmo: 1 },
  ], remaining: 0 }), 2);
});

test('computeStars returns 1 for two or more wasted pigs', () => {
  assert.equal(computeStars({ launchedHistory: [
    { color: 'red', initialAmmo: 2, finalAmmo: 1 },
    { color: 'blue', initialAmmo: 2, finalAmmo: 1 },
  ], remaining: 0 }), 1);
  assert.equal(computeStars({ launchedHistory: [], remaining: 5 }), 1);
});

test('computeStars treats a pig with finalAmmo === initialAmmo (never fired) as wasted', () => {
  assert.equal(computeStars({ launchedHistory: [
    { color: 'red', initialAmmo: 3, finalAmmo: 3 },
  ], remaining: 0 }), 2);
});

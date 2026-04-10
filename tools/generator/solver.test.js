import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isSolvable, scoreDifficulty } from './solver.js';

test('single-color column board is solvable', () => {
  const layout = [
    ['red', 'yellow'],
    ['red', 'yellow'],
    ['red', 'yellow'],
  ];
  const bench = [
    { color: 'red', ammo: 3 },
    { color: 'yellow', ammo: 3 },
  ];
  assert.ok(isSolvable(layout, bench));
});

test('impossible board returns false', () => {
  const layout = [
    ['red', 'red'],
    ['red', 'red'],
  ];
  const bench = [
    { color: 'yellow', ammo: 10 },
  ];
  assert.ok(!isSolvable(layout, bench));
});

test('board requiring ordering is solvable', () => {
  const layout = [
    ['yellow', 'red'],
    ['red', 'yellow'],
  ];
  const bench = [
    { color: 'red', ammo: 2 },
    { color: 'yellow', ammo: 2 },
  ];
  assert.ok(isSolvable(layout, bench));
});

test('scoreDifficulty returns a number between 0 and 10', () => {
  const layout = [
    ['red', 'yellow'],
    ['red', 'yellow'],
  ];
  const bench = [
    { color: 'red', ammo: 2 },
    { color: 'yellow', ammo: 2 },
  ];
  const score = scoreDifficulty(layout, bench);
  assert.ok(score >= 0 && score <= 10, `score ${score} out of range`);
});

test('tight ammo scores higher than generous ammo', () => {
  const layout = [
    ['red', 'yellow', 'green'],
    ['red', 'yellow', 'green'],
    ['red', 'yellow', 'green'],
  ];
  const generousBench = [
    { color: 'red', ammo: 5 },
    { color: 'yellow', ammo: 5 },
    { color: 'green', ammo: 5 },
  ];
  const tightBench = [
    { color: 'red', ammo: 3 },
    { color: 'yellow', ammo: 3 },
    { color: 'green', ammo: 3 },
  ];
  assert.ok(scoreDifficulty(layout, tightBench) > scoreDifficulty(layout, generousBench));
});

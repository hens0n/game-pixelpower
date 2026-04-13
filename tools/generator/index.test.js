import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getTierGenerationCounts } from './index.js';

test('getTierGenerationCounts sums exactly to requested count', () => {
  const counts = getTierGenerationCounts(50);
  assert.equal(Object.values(counts).reduce((sum, value) => sum + value, 0), 50);
  assert.deepEqual(counts, {
    easy: 13,
    medium: 13,
    hard: 12,
    expert: 12,
  });
});

test('getTierGenerationCounts handles non-default tier lists', () => {
  const counts = getTierGenerationCounts(7, ['medium', 'hard']);
  assert.deepEqual(counts, {
    medium: 4,
    hard: 3,
  });
});

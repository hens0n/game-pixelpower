import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MILESTONES, getMilestone } from './pixelart.js';
import { COLORS } from './difficulty.js';

test('MILESTONES has 5 entries at levels 11, 21, 31, 41, 50', () => {
  const levels = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
  assert.deepEqual(levels, [11, 21, 31, 41, 50]);
});

test('each milestone has name, layout, and valid colors', () => {
  for (const [level, ms] of Object.entries(MILESTONES)) {
    assert.ok(ms.name, `level ${level} has name`);
    assert.ok(ms.layout.length > 0, `level ${level} has layout`);
    for (const row of ms.layout) {
      for (const cell of row) {
        if (cell !== null) assert.ok(COLORS.includes(cell), `level ${level} has invalid color: ${cell}`);
      }
    }
  }
});

test('getMilestone returns null for non-milestone levels', () => {
  assert.equal(getMilestone(15), null);
  assert.equal(getMilestone(25), null);
});

test('getMilestone returns milestone data for milestone levels', () => {
  const ms = getMilestone(11);
  assert.ok(ms);
  assert.equal(ms.name, 'Heart');
});

test('milestone layouts have consistent row widths', () => {
  for (const [level, ms] of Object.entries(MILESTONES)) {
    const width = ms.layout[0].length;
    for (const row of ms.layout) assert.equal(row.length, width, `level ${level} has inconsistent row width`);
  }
});

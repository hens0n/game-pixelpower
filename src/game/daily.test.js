import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  utcDateString,
  dayDelta,
  dailyPool,
  dailyLevelIndex,
} from './daily.js';

test('utcDateString returns YYYY-MM-DD in UTC', () => {
  const ms = Date.UTC(2026, 3, 23, 12, 30);
  assert.equal(utcDateString(ms), '2026-04-23');
});

test('utcDateString pads month and day', () => {
  const ms = Date.UTC(2026, 0, 5, 0, 0);
  assert.equal(utcDateString(ms), '2026-01-05');
});

test('dayDelta returns 0 for same date', () => {
  assert.equal(dayDelta('2026-04-23', '2026-04-23'), 0);
});

test('dayDelta returns 1 for consecutive days', () => {
  assert.equal(dayDelta('2026-04-23', '2026-04-24'), 1);
});

test('dayDelta handles month rollover', () => {
  assert.equal(dayDelta('2026-04-30', '2026-05-01'), 1);
});

test('dayDelta handles year rollover', () => {
  assert.equal(dayDelta('2026-12-31', '2027-01-01'), 1);
});

test('dayDelta returns negative when first date is after second', () => {
  assert.equal(dayDelta('2026-04-24', '2026-04-23'), -1);
});

test('dailyPool returns indexes of levels with dailyEligible === true', () => {
  const levels = [
    { id: 'a', dailyEligible: false },
    { id: 'b', dailyEligible: true },
    { id: 'c' },
    { id: 'd', dailyEligible: true },
  ];
  assert.deepEqual(dailyPool(levels), [1, 3]);
});

test('dailyPool throws when no levels are flagged', () => {
  const levels = [{ id: 'a' }, { id: 'b', dailyEligible: false }];
  assert.throws(() => dailyPool(levels), /no daily-eligible levels/i);
});

test('dailyLevelIndex is deterministic for the same date', () => {
  const pool = [5, 10, 15, 20];
  const a = dailyLevelIndex('2026-04-23', pool);
  const b = dailyLevelIndex('2026-04-23', pool);
  assert.equal(a, b);
  assert.ok(pool.includes(a));
});

test('dailyLevelIndex varies across dates', () => {
  const pool = Array.from({ length: 30 }, (_, i) => i);
  const seen = new Set();
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.UTC(2026, 3, i + 1));
    seen.add(dailyLevelIndex(utcDateString(d.getTime()), pool));
  }
  assert.ok(seen.size >= 5, `expected at least 5 distinct picks, got ${seen.size}`);
});

test('dailyLevelIndex throws on empty pool', () => {
  assert.throws(() => dailyLevelIndex('2026-04-23', []), /empty/i);
});

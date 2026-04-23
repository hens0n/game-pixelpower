import { strict as assert } from 'node:assert';
import { test, beforeEach } from 'node:test';
import {
  ANALYTICS_EVENTS,
  track,
  getRecordedEvents,
  _resetForTests,
  MAX_BUFFER,
} from './analytics.js';

beforeEach(() => _resetForTests());

test('ANALYTICS_EVENTS includes all spec events', () => {
  const expected = [
    'level_start', 'level_win', 'level_fail', 'level_undo',
    'daily_start', 'daily_win',
    'streak_extended', 'streak_broken',
  ];
  for (const ev of expected) {
    assert.ok(ANALYTICS_EVENTS.includes(ev), `missing ${ev}`);
  }
});

test('track records whitelisted events', () => {
  track('level_start', { levelIndex: 0, mode: 'campaign' });
  const recorded = getRecordedEvents();
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].event, 'level_start');
  assert.deepEqual(recorded[0].payload, { levelIndex: 0, mode: 'campaign' });
  assert.equal(typeof recorded[0].ts, 'number');
});

test('track throws in dev on unknown event names', () => {
  assert.throws(() => track('made_up_event', {}), /unknown analytics event/i);
});

test('getRecordedEvents returns an empty array when nothing tracked', () => {
  assert.deepEqual(getRecordedEvents(), []);
});

test('getRecordedEvents returns a copy that cannot mutate the internal buffer', () => {
  track('level_start', { levelIndex: 0, mode: 'campaign' });
  const events = getRecordedEvents();
  events.push({ event: 'bogus', payload: {}, ts: 0 });
  assert.equal(getRecordedEvents().length, 1);
});

test('ring buffer caps at MAX_BUFFER entries', () => {
  for (let i = 0; i < MAX_BUFFER + 50; i++) {
    track('level_start', { levelIndex: i, mode: 'campaign' });
  }
  const events = getRecordedEvents();
  assert.equal(events.length, MAX_BUFFER);
  assert.equal(events[0].payload.levelIndex, 50);
});

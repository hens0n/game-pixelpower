# Retention Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 3-star efficiency scoring, a daily challenge with streak tracking, and a lightweight analytics event bus — all on localStorage, no backend.

**Architecture:** Pure modules (`scoring.js`, `daily.js`, `analytics.js`) hold all testable logic. `gameState.js` migrates from schema v1 to v2, adding per-level stars and a `daily` block. `GameScene` tracks pig launches to compute stars on win and fires analytics. `MenuScene` renders a 3-star row per level and a daily challenge card.

**Tech Stack:** Phaser 3.90, Vite, vanilla JS (ESM), `node --test` for unit tests, Playwright MCP for browser smoke.

**Spec:** `docs/superpowers/specs/2026-04-23-retention-push-design.md`

---

## File Map

| Path | Change | Responsibility |
|---|---|---|
| `src/game/scoring.js` | **new** | `computeStars({ launchedHistory, remaining })` → 1/2/3 |
| `src/game/scoring.test.js` | **new** | Unit tests for star rubric |
| `src/game/daily.js` | **new** | `utcDateString(ms)`, `dayDelta(a, b)`, `dailyPool(levels)`, `dailyLevelIndex(dateStr, pool)` |
| `src/game/daily.test.js` | **new** | Unit tests for selection + date math |
| `src/analytics.js` | **new** | `track(event, payload)`, `getRecordedEvents()`, `ANALYTICS_EVENTS` |
| `src/analytics.test.js` | **new** | Unit tests for event bus |
| `src/state/gameState.js` | **modify** | Schema v2, migration, `markLevelCompleted(index, total, stars)`, `completeDaily(stars)` |
| `src/state/gameState.test.js` | **new** | Migration + streak + star-merge tests |
| `src/data/levels.js` | **modify** | Auto-tag `dailyEligible` on levels 5..35 |
| `src/data/levels.test.js` | **modify** | Add "all daily-pool levels solvable" test |
| `src/scenes/GameScene.js` | **modify** | Track launches, compute stars, fire analytics, show stars on overlay, accept `mode: 'daily'` |
| `src/scenes/MenuScene.js` | **modify** | 3-star row on level card, daily challenge card, preview-panel star row |

---

## Task 1: Scoring module (pure logic + tests)

**Files:**
- Create: `src/game/scoring.js`
- Create: `src/game/scoring.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/game/scoring.test.js` with this exact content:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/game/scoring.test.js`
Expected: FAIL because `src/game/scoring.js` does not exist (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Write minimal implementation**

Create `src/game/scoring.js`:

```javascript
export function countWastedPigs({ launchedHistory, remaining }) {
  const leftoverAmmo = launchedHistory.filter((pig) => pig.finalAmmo > 0).length;
  return leftoverAmmo + remaining;
}

export function computeStars({ launchedHistory, remaining }) {
  const wasted = countWastedPigs({ launchedHistory, remaining });
  if (wasted === 0) return 3;
  if (wasted === 1) return 2;
  return 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/game/scoring.test.js`
Expected: PASS — 7 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/game/scoring.js src/game/scoring.test.js
git commit -m "feat: add pure scoring module for 3-star efficiency"
```

---

## Task 2: Daily module (date math + level selection)

**Files:**
- Create: `src/game/daily.js`
- Create: `src/game/daily.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/game/daily.test.js`:

```javascript
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  utcDateString,
  dayDelta,
  dailyPool,
  dailyLevelIndex,
} from './daily.js';

test('utcDateString returns YYYY-MM-DD in UTC', () => {
  const ms = Date.UTC(2026, 3, 23, 12, 30); // April is month 3 (0-indexed)
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
    { id: 'c' }, // missing field - excluded
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
  // 14 days across a 30-level pool should produce at least a few distinct picks
  assert.ok(seen.size >= 5, `expected at least 5 distinct picks, got ${seen.size}`);
});

test('dailyLevelIndex throws on empty pool', () => {
  assert.throws(() => dailyLevelIndex('2026-04-23', []), /empty/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/game/daily.test.js`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Write minimal implementation**

Create `src/game/daily.js`:

```javascript
export function utcDateString(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseUtcDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function dayDelta(fromStr, toStr) {
  const msPerDay = 86400000;
  return Math.round((parseUtcDate(toStr) - parseUtcDate(fromStr)) / msPerDay);
}

export function dailyPool(levels) {
  const indexes = [];
  levels.forEach((level, i) => {
    if (level.dailyEligible === true) indexes.push(i);
  });
  if (indexes.length === 0) {
    throw new Error('dailyPool: no daily-eligible levels found');
  }
  return indexes;
}

// FNV-1a 32-bit hash — deterministic, small, no deps.
function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function dailyLevelIndex(dateStr, pool) {
  if (pool.length === 0) {
    throw new Error('dailyLevelIndex: pool is empty');
  }
  const h = hashString(dateStr);
  return pool[h % pool.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/game/daily.test.js`
Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/daily.js src/game/daily.test.js
git commit -m "feat: add daily challenge date math and level selection"
```

---

## Task 3: Analytics event bus

**Files:**
- Create: `src/analytics.js`
- Create: `src/analytics.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/analytics.test.js`:

```javascript
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
  // oldest dropped: first kept entry should have levelIndex === 50
  assert.equal(events[0].payload.levelIndex, 50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/analytics.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/analytics.js`:

```javascript
export const ANALYTICS_EVENTS = [
  'level_start',
  'level_win',
  'level_fail',
  'level_undo',
  'daily_start',
  'daily_win',
  'streak_extended',
  'streak_broken',
];

export const MAX_BUFFER = 500;

const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

let buffer = [];

function installGlobal() {
  if (typeof window !== 'undefined') {
    window.__PIXELPOWER_ANALYTICS__ = {
      events: buffer,
      track,
    };
  }
}

export function track(event, payload = {}) {
  if (!ANALYTICS_EVENTS.includes(event)) {
    throw new Error(`unknown analytics event: "${event}"`);
  }
  const entry = { event, payload, ts: Date.now() };
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.splice(0, buffer.length - MAX_BUFFER);
  }
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', event, payload);
  }
}

export function getRecordedEvents() {
  return buffer.slice();
}

export function _resetForTests() {
  buffer.length = 0;
}

installGlobal();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/analytics.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/analytics.js src/analytics.test.js
git commit -m "feat: add analytics event bus with dev console + ring buffer"
```

---

## Task 4: gameState schema v2 migration + tests

**Files:**
- Modify: `src/state/gameState.js` (full rewrite — small file)
- Create: `src/state/gameState.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/state/gameState.test.js`:

```javascript
import { strict as assert } from 'node:assert';
import { test, beforeEach } from 'node:test';

// Node has no window; shim a localStorage before importing gameState.
function installLocalStorage(initial = {}) {
  const store = { ...initial };
  globalThis.window = globalThis.window || {};
  globalThis.window.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
}

async function freshImport() {
  // Bust ESM cache by appending a query string.
  return import(`../state/gameState.js?cacheBust=${Math.random()}`);
}

beforeEach(() => installLocalStorage());

test('fresh localStorage yields schema v2 defaults', async () => {
  installLocalStorage();
  const mod = await freshImport();
  assert.equal(mod.gameState.completedLevels.length, 0);
  assert.equal(mod.gameState.unlockedLevelCount, 1);
  assert.equal(mod.gameState.daily.streak, 0);
  assert.equal(mod.gameState.daily.bestStreak, 0);
  assert.equal(mod.gameState.daily.lastDate, null);
  assert.equal(mod.gameState.daily.lastStars, null);
});

test('migrates v1 to v2 with stars=null on existing completions', async () => {
  installLocalStorage({
    'pixelpower-progress-v1': JSON.stringify({
      completedLevels: [0, 3, 7],
      unlockedLevelCount: 8,
    }),
  });
  const mod = await freshImport();
  assert.equal(mod.gameState.completedLevels.length, 3);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: null });
  assert.deepEqual(mod.gameState.completedLevels[2], { index: 7, stars: null });
  assert.equal(mod.gameState.unlockedLevelCount, 8);
  // v1 key removed after successful migration
  assert.equal(globalThis.window.localStorage._store['pixelpower-progress-v1'], undefined);
  // v2 key populated
  assert.ok(globalThis.window.localStorage._store['pixelpower-progress-v2']);
});

test('markLevelCompleted stores stars and keeps the max on re-clears', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.markLevelCompleted(0, 100, 2);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: 2 });
  mod.markLevelCompleted(0, 100, 1);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: 2 }); // kept
  mod.markLevelCompleted(0, 100, 3);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: 3 }); // upgraded
});

test('markLevelCompleted unlocks the next level', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.markLevelCompleted(0, 100, 3);
  assert.equal(mod.gameState.unlockedLevelCount, 2);
});

test('getStarsForLevel returns null for uncleared, number for cleared', async () => {
  installLocalStorage();
  const mod = await freshImport();
  assert.equal(mod.getStarsForLevel(5), null);
  mod.markLevelCompleted(5, 100, 3);
  assert.equal(mod.getStarsForLevel(5), 3);
});

test('completeDaily with no prior date sets streak=1', async () => {
  installLocalStorage();
  const mod = await freshImport();
  const result = mod.completeDaily(3, '2026-04-23');
  assert.equal(result.streak, 1);
  assert.equal(result.bestStreak, 1);
  assert.equal(result.extended, true);
  assert.equal(result.broken, false);
  assert.equal(mod.gameState.daily.streak, 1);
  assert.equal(mod.gameState.daily.lastDate, '2026-04-23');
});

test('completeDaily same-day replay updates stars but not streak', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.completeDaily(1, '2026-04-23');
  const r2 = mod.completeDaily(3, '2026-04-23');
  assert.equal(r2.streak, 1);
  assert.equal(r2.extended, false);
  assert.equal(mod.gameState.daily.lastStars, 3);
});

test('completeDaily next-day continues streak', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.completeDaily(3, '2026-04-23');
  const r2 = mod.completeDaily(2, '2026-04-24');
  assert.equal(r2.streak, 2);
  assert.equal(r2.extended, true);
});

test('completeDaily with one-day gap uses grace and extends', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.completeDaily(3, '2026-04-23');
  const r2 = mod.completeDaily(2, '2026-04-25'); // skipped the 24th
  assert.equal(r2.streak, 2);
  assert.equal(r2.extended, true);
});

test('completeDaily with two-day gap breaks and resets to 1', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.completeDaily(3, '2026-04-23');
  const r2 = mod.completeDaily(2, '2026-04-26'); // skipped 24 and 25
  assert.equal(r2.streak, 1);
  assert.equal(r2.broken, true);
  assert.equal(r2.previousStreak, 1);
});

test('completeDaily tracks bestStreak across breaks', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.completeDaily(3, '2026-04-23');
  mod.completeDaily(3, '2026-04-24');
  mod.completeDaily(3, '2026-04-25');
  mod.completeDaily(3, '2026-05-01'); // big gap, resets
  assert.equal(mod.gameState.daily.streak, 1);
  assert.equal(mod.gameState.daily.bestStreak, 3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/state/gameState.test.js`
Expected: FAIL because `markLevelCompleted` still takes 2 args, `completeDaily` / `getStarsForLevel` don't exist, schema is v1.

- [ ] **Step 3: Rewrite gameState.js**

Replace the entire contents of `src/state/gameState.js`:

```javascript
const V1_KEY = 'pixelpower-progress-v1';
const V2_KEY = 'pixelpower-progress-v2';

const EMPTY_DAILY = { lastDate: null, streak: 0, bestStreak: 0, lastStars: null };

function emptyProgress() {
  return {
    schemaVersion: 2,
    completedLevels: [],
    unlockedLevelCount: 1,
    daily: { ...EMPTY_DAILY },
  };
}

function normalizeCompleted(entry) {
  if (typeof entry === 'number') return { index: entry, stars: null };
  if (entry && Number.isInteger(entry.index)) {
    const stars = Number.isInteger(entry.stars) && entry.stars >= 1 && entry.stars <= 3
      ? entry.stars
      : null;
    return { index: entry.index, stars };
  }
  return null;
}

function loadStoredProgress() {
  try {
    const rawV2 = window.localStorage.getItem(V2_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return {
        schemaVersion: 2,
        completedLevels: Array.isArray(parsed.completedLevels)
          ? parsed.completedLevels.map(normalizeCompleted).filter(Boolean)
          : [],
        unlockedLevelCount: Math.max(1, Number(parsed.unlockedLevelCount) || 1),
        daily: {
          lastDate: typeof parsed.daily?.lastDate === 'string' ? parsed.daily.lastDate : null,
          streak: Math.max(0, Number(parsed.daily?.streak) || 0),
          bestStreak: Math.max(0, Number(parsed.daily?.bestStreak) || 0),
          lastStars: Number.isInteger(parsed.daily?.lastStars) ? parsed.daily.lastStars : null,
        },
      };
    }

    const rawV1 = window.localStorage.getItem(V1_KEY);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      const migrated = {
        schemaVersion: 2,
        completedLevels: Array.isArray(parsed.completedLevels)
          ? parsed.completedLevels
              .filter((v) => Number.isInteger(v) && v >= 0)
              .map((v) => ({ index: v, stars: null }))
          : [],
        unlockedLevelCount: Math.max(1, Number(parsed.unlockedLevelCount) || 1),
        daily: { ...EMPTY_DAILY },
      };
      // Write v2 and verify round-trip before deleting v1.
      window.localStorage.setItem(V2_KEY, JSON.stringify(migrated));
      JSON.parse(window.localStorage.getItem(V2_KEY));
      window.localStorage.removeItem(V1_KEY);
      return migrated;
    }
  } catch {
    // Fall through to empty default on any parse / storage failure.
  }
  return emptyProgress();
}

function persistProgress() {
  try {
    window.localStorage.setItem(
      V2_KEY,
      JSON.stringify({
        schemaVersion: 2,
        completedLevels: gameState.completedLevels,
        unlockedLevelCount: gameState.unlockedLevelCount,
        daily: gameState.daily,
      }),
    );
  } catch {
    // Ignore storage failures so gameplay still works in restricted contexts.
  }
}

const stored = loadStoredProgress();

export const gameState = {
  currentScene: 'boot',
  viewport: { width: window.innerWidth, height: window.innerHeight },
  phase: 'initializing',
  progress: 'Milestone 3 level progression',
  notes: [
    'Responsive Phaser project scaffold is active.',
    'Milestone 3 adds level progression, scalable boards, and selectable levels.',
  ],
  selectedLevelIndex: 0,
  completedLevels: stored.completedLevels,
  unlockedLevelCount: stored.unlockedLevelCount,
  daily: stored.daily,
  gameplay: null,
};

export function isLevelUnlocked(index) {
  return index >= 0 && index < gameState.unlockedLevelCount;
}

export function getHighestUnlockedLevelIndex(totalLevels) {
  return Math.max(0, Math.min(gameState.unlockedLevelCount - 1, totalLevels - 1));
}

export function getStarsForLevel(index) {
  const entry = gameState.completedLevels.find((e) => e.index === index);
  return entry ? entry.stars : null;
}

export function isLevelCompleted(index) {
  return gameState.completedLevels.some((e) => e.index === index);
}

export function markLevelCompleted(index, totalLevels, stars) {
  const existing = gameState.completedLevels.find((e) => e.index === index);
  const incoming = Number.isInteger(stars) && stars >= 1 && stars <= 3 ? stars : null;

  if (existing) {
    const best = Math.max(existing.stars ?? 0, incoming ?? 0);
    existing.stars = best > 0 ? best : null;
  } else {
    gameState.completedLevels = [...gameState.completedLevels, { index, stars: incoming }]
      .sort((a, b) => a.index - b.index);
  }

  gameState.unlockedLevelCount = Math.max(
    gameState.unlockedLevelCount,
    Math.min(totalLevels, index + 2),
  );
  persistProgress();
}

export function setSelectedLevelIndex(index, totalLevels) {
  gameState.selectedLevelIndex = Math.max(0, Math.min(index, getHighestUnlockedLevelIndex(totalLevels)));
}

export function syncStoredProgress() {
  persistProgress();
}

/**
 * Record a daily-challenge completion. Returns a summary object describing
 * what changed — callers (and analytics hooks) use it to decide which events
 * to fire.
 */
export function completeDaily(stars, dateStr) {
  const previousStreak = gameState.daily.streak;
  const incoming = Number.isInteger(stars) && stars >= 1 && stars <= 3 ? stars : null;

  if (gameState.daily.lastDate === dateStr) {
    // Same-day replay: update stars if improved, no streak change.
    const prevStars = gameState.daily.lastStars ?? 0;
    gameState.daily.lastStars = Math.max(prevStars, incoming ?? 0) || null;
    persistProgress();
    return {
      streak: gameState.daily.streak,
      bestStreak: gameState.daily.bestStreak,
      previousStreak,
      extended: false,
      broken: false,
    };
  }

  const delta = gameState.daily.lastDate
    ? dayDeltaInline(gameState.daily.lastDate, dateStr)
    : null;

  let broken = false;
  if (delta !== null && delta > 2) {
    broken = true;
    gameState.daily.streak = 1;
  } else if (delta === 1 || delta === 2) {
    gameState.daily.streak += 1;
  } else if (delta === null) {
    gameState.daily.streak = 1;
  } else {
    // delta <= 0 (clock weirdness) — treat as fresh start.
    gameState.daily.streak = 1;
    broken = previousStreak > 0;
  }

  gameState.daily.lastDate = dateStr;
  gameState.daily.lastStars = incoming;
  gameState.daily.bestStreak = Math.max(gameState.daily.bestStreak, gameState.daily.streak);
  persistProgress();

  return {
    streak: gameState.daily.streak,
    bestStreak: gameState.daily.bestStreak,
    previousStreak,
    extended: !broken,
    broken,
  };
}

// Local copy of dayDelta to avoid importing a graphics-layer module into state.
function dayDeltaInline(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}
```

- [ ] **Step 4: Run state tests**

Run: `node --test src/state/gameState.test.js`
Expected: PASS — 11 tests.

- [ ] **Step 5: Run the whole suite to ensure nothing else broke**

Run: `npm test`
Expected: All new tests pass; the one pre-existing difficulty failure (unrelated) remains.

- [ ] **Step 6: Commit**

```bash
git add src/state/gameState.js src/state/gameState.test.js
git commit -m "feat: migrate progress to schema v2 with stars + daily state"
```

---

## Task 5: Tag daily-eligible levels + add solvability guard

**Files:**
- Modify: `src/data/levels.js` (bottom of file)
- Modify: `src/data/levels.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/data/levels.test.js`:

```javascript
import { dailyPool } from '../game/daily.js';
import { isSolvable } from '../../tools/generator/solver.js';

test('daily pool contains a sensible number of levels', () => {
  const pool = dailyPool(LEVELS);
  assert.ok(pool.length >= 20, `expected >= 20 daily levels, got ${pool.length}`);
  assert.ok(pool.length <= 50, `expected <= 50 daily levels, got ${pool.length}`);
});

test('every daily-pool level is solvable', () => {
  const pool = dailyPool(LEVELS);
  for (const i of pool) {
    const level = LEVELS[i];
    assert.ok(
      isSolvable(level.layout, level.bench),
      `daily-eligible level ${i + 1} (${level.id}) is not solvable`,
    );
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/data/levels.test.js`
Expected: FAIL — `dailyPool` throws "no daily-eligible levels found" because no level has the flag yet.

- [ ] **Step 3: Add the auto-tagging helper in levels.js**

At the bottom of `src/data/levels.js`, replace:

```javascript
LEVELS.push(...pixelArtLevels);

validateLevels(LEVELS);
```

with:

```javascript
LEVELS.push(...pixelArtLevels);

// Auto-tag daily-eligible levels: indexes 4..34 (one-based 5..35) inclusive,
// unless a level has already set an explicit dailyEligible flag.
LEVELS.forEach((level, i) => {
  if (level.dailyEligible === undefined) {
    level.dailyEligible = i >= 4 && i <= 34;
  }
});

validateLevels(LEVELS);
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: The new two tests pass. Everything else still passes (except the pre-existing difficulty failure).

- [ ] **Step 5: Commit**

```bash
git add src/data/levels.js src/data/levels.test.js
git commit -m "feat: auto-tag levels 5-35 as daily-eligible with solvability guard"
```

---

## Task 6: GameScene — track pig launches for scoring

**Files:**
- Modify: `src/scenes/GameScene.js`

Rationale: scoring needs `launchedHistory` per run. We populate it when a pig is pushed to the conveyor and update `finalAmmo` when it returns (via the return queue logic) or runs out. No unit test here — this is Phaser-side plumbing that Task 7 verifies via `computeStars`-producing-the-right-star-count during the browser smoke.

- [ ] **Step 1: Add the tracked field in `createInitialState`**

In `src/scenes/GameScene.js`, find `createInitialState()` (around line 803). In the returned state object, add `launchedHistory: [],` alongside `lastAction`:

Locate this block:

```javascript
    return {
      phase: 'playing',
      board,
      bench: this.createBenchColumns(
```

Leave the top unchanged. Find the end of the return object:

```javascript
      destroyedCount: 0,
      totalCubes: board.filter(c => c.alive).length,
      lastAction: 'Level initialized',
    };
```

and change to:

```javascript
      destroyedCount: 0,
      totalCubes: board.filter(c => c.alive).length,
      lastAction: 'Level initialized',
      launchedHistory: [],
    };
```

- [ ] **Step 2: Record the launch**

Find `launchFrontPig()` (~line 882). After the line that constructs the new conveyor entry:

```javascript
    this.state.conveyor.push({
      ...frontPig,
      progress: 0,
      fireCooldown: 100,
      blockedCooldown: 0,
      travelMs: 6200,
    });
```

Add this just above the `this.playSfx('launch');` line:

```javascript
    this.state.launchedHistory.push({
      launchId: this.state.conveyor[this.state.conveyor.length - 1].launchId = `launch-${this.state.launchedHistory.length}`,
      color: frontPig.color,
      initialAmmo: frontPig.ammo,
      finalAmmo: frontPig.ammo,
    });
```

(That single statement both assigns `launchId` onto the conveyor pig and captures it in the history entry.)

- [ ] **Step 3: Update finalAmmo when the pig leaves the conveyor**

Find the spot in `update()` where pigs are removed from the conveyor after completing a loop (search for `this.state.conveyor = this.state.conveyor.filter` or where the conveyor list gets pruned). The prune site should look like:

```javascript
      if (pig.progress >= 1) {
        // ... either return to queue or discard
      }
```

Inspect the actual code (~lines 1100-1160). You'll find two branches: pigs with ammo > 0 return to the queue; pigs with ammo === 0 leave. In **both** branches, update the history entry before the pig disappears from the conveyor:

Insert at the top of the "pig completed its loop" branch:

```javascript
        const historyEntry = this.state.launchedHistory.find((h) => h.launchId === pig.launchId);
        if (historyEntry) historyEntry.finalAmmo = pig.ammo;
```

- [ ] **Step 4: Handle undo — rewind launchedHistory**

`cloneState` uses `JSON.parse(JSON.stringify(...))` so undo already captures `launchedHistory` in the snapshot. No extra work here; `undoMove` restoration is automatic.

- [ ] **Step 5: Smoke-check in the browser**

```bash
npm run dev
```

Navigate to http://localhost:5173, open devtools, press Enter to load Level 1, launch a pig. In the console, inspect:

```javascript
window.__PIXELPOWER__.gameState.gameplay  // may be null while in a scene
// Instead look at the scene directly:
window.__PIXELPOWER__.game.scene.getScene('GameScene').state.launchedHistory
```

Expected: array of `{ launchId, color, initialAmmo, finalAmmo }` entries; `finalAmmo` matches remaining ammo when a pig leaves the conveyor.

Stop the dev server (Ctrl+C) when done.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: track launch history in game state for star scoring"
```

---

## Task 7: GameScene — compute stars at win, fire analytics, pass to gameState

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add imports at the top of GameScene.js**

Find the existing import block (top of file) and replace:

```javascript
import Phaser from 'phaser';
import {
  gameState,
  getHighestUnlockedLevelIndex,
  markLevelCompleted,
  setSelectedLevelIndex,
  syncStoredProgress,
} from '../state/gameState.js';
import { LEVELS } from '../data/levels.js';
```

with:

```javascript
import Phaser from 'phaser';
import {
  gameState,
  getHighestUnlockedLevelIndex,
  markLevelCompleted,
  setSelectedLevelIndex,
  syncStoredProgress,
  completeDaily,
} from '../state/gameState.js';
import { LEVELS } from '../data/levels.js';
import { computeStars, countWastedPigs } from '../game/scoring.js';
import { utcDateString } from '../game/daily.js';
import { track } from '../analytics.js';
```

- [ ] **Step 2: Add a helper method to compute run stats**

Add this method to the `GameScene` class, above `shutdown` / `handleShutdown`:

```javascript
  computeRunStats() {
    const remaining = this.getBenchCount() + this.state.queue.length + this.state.conveyor.length;
    const launchedHistory = this.state.launchedHistory ?? [];
    return {
      stars: computeStars({ launchedHistory, remaining }),
      wastedPigs: countWastedPigs({ launchedHistory, remaining }),
      launched: launchedHistory.length,
      remaining,
    };
  }
```

- [ ] **Step 3: Track level start time + emit `level_start`**

In `loadLevel(index, message)` (~line 556), just after the line `this.state = this.createInitialState();`, add:

```javascript
    this.levelStartMs = performance.now();
    this.undosUsed = 0;
    this.currentMode = this.pendingMode ?? 'campaign';
    this.pendingMode = null;
    track('level_start', { levelIndex: this.currentLevelIndex, mode: this.currentMode });
```

Add a sibling default next to `isSceneTransitioning` in the constructor (~line 178):

```javascript
    this.currentMode = 'campaign';
    this.pendingMode = null;
    this.levelStartMs = 0;
    this.undosUsed = 0;
    this.pendingDailyDate = null;
```

- [ ] **Step 4: Accept `mode: 'daily'` and its date in `create`**

In `create(data = {})` (~line 181), replace:

```javascript
    const requestedLevel = Phaser.Math.Clamp(
      data.levelIndex ?? gameState.selectedLevelIndex ?? 0,
      0,
      getHighestUnlockedLevelIndex(LEVELS.length),
    );
    setSelectedLevelIndex(requestedLevel, LEVELS.length);
    this.loadLevel(requestedLevel, `Level ${requestedLevel + 1} ready. Click a pig stack to launch from the lower dock.`);
```

with:

```javascript
    const requestedLevel = Phaser.Math.Clamp(
      data.levelIndex ?? gameState.selectedLevelIndex ?? 0,
      0,
      data.mode === 'daily' ? LEVELS.length - 1 : getHighestUnlockedLevelIndex(LEVELS.length),
    );
    setSelectedLevelIndex(requestedLevel, LEVELS.length);
    this.pendingMode = data.mode === 'daily' ? 'daily' : 'campaign';
    this.pendingDailyDate = data.dailyDate ?? null;
    const intro = this.pendingMode === 'daily'
      ? `DAILY ${this.pendingDailyDate ?? ''} — Level ${requestedLevel + 1} ready.`
      : `Level ${requestedLevel + 1} ready. Click a pig stack to launch from the lower dock.`;
    this.loadLevel(requestedLevel, intro);
```

- [ ] **Step 5: Emit `level_undo`**

In `undoMove()` (~line 945), at the beginning of the method (before the `if (!this.undoStack.length)` check), insert:

```javascript
    const undoIndex = this.undosUsed;
```

At the end of the method (after the successful undo path — i.e. where `setStatus('Move undone.')` or similar is called; find it near the end of the function), add:

```javascript
    this.undosUsed += 1;
    track('level_undo', {
      levelIndex: this.currentLevelIndex,
      mode: this.currentMode,
      undoIndex,
    });
```

- [ ] **Step 6: Emit `level_win` + compute stars at the two win sites**

Find the first win site (~line 1137):

```javascript
    if (this.state.destroyedCount >= this.state.totalCubes) {
      this.state.phase = 'win';
      markLevelCompleted(this.currentLevelIndex, LEVELS.length);
      const winMessage = this.currentLevelIndex < LEVELS.length - 1
        ? 'Board cleared! Press N for the next level.'
        : 'Final board cleared! You completed the campaign.';
      this.showOverlay('BOARD CLEAR', winMessage);
      this.playSfx('win');
```

Replace with:

```javascript
    if (this.state.destroyedCount >= this.state.totalCubes) {
      this.state.phase = 'win';
      const stats = this.computeRunStats();
      markLevelCompleted(this.currentLevelIndex, LEVELS.length, stats.stars);
      this.lastWinStats = stats;
      track('level_win', {
        levelIndex: this.currentLevelIndex,
        mode: this.currentMode,
        stars: stats.stars,
        wastedPigs: stats.wastedPigs,
        undosUsed: this.undosUsed,
        durationMs: Math.round(performance.now() - this.levelStartMs),
      });
      if (this.currentMode === 'daily' && this.pendingDailyDate) {
        track('daily_start', { levelIndex: this.currentLevelIndex, date: this.pendingDailyDate });
        const daily = completeDaily(stats.stars, this.pendingDailyDate);
        track('daily_win', {
          levelIndex: this.currentLevelIndex,
          date: this.pendingDailyDate,
          stars: stats.stars,
          newStreak: daily.streak,
          bestStreak: daily.bestStreak,
          extended: daily.extended,
        });
        if (daily.broken) {
          track('streak_broken', { previousStreak: daily.previousStreak, newStreak: 1 });
        } else if (daily.extended && daily.streak > daily.previousStreak) {
          track('streak_extended', { newStreak: daily.streak, bestStreak: daily.bestStreak, usedGrace: false });
        }
      }
      const winMessage = this.currentLevelIndex < LEVELS.length - 1
        ? 'Board cleared! Press N for the next level.'
        : 'Final board cleared! You completed the campaign.';
      this.showOverlay('BOARD CLEAR', winMessage);
      this.playSfx('win');
```

Apply the same replacement at the second win site (~line 1296, inside `spawnProjectile`'s onComplete). The block starts with:

```javascript
          if (this.state.destroyedCount >= this.state.totalCubes && this.state.phase === 'playing') {
            this.state.phase = 'win';
            markLevelCompleted(this.currentLevelIndex, LEVELS.length);
```

Replace this `markLevelCompleted(...)` with the same stats block (minus the outer `if (this.state.destroyedCount >= …)` line — it already lives in an if). Extract the common work to avoid duplication: add a method next to `computeRunStats` called `finalizeWin()`:

```javascript
  finalizeWin() {
    const stats = this.computeRunStats();
    markLevelCompleted(this.currentLevelIndex, LEVELS.length, stats.stars);
    this.lastWinStats = stats;
    track('level_win', {
      levelIndex: this.currentLevelIndex,
      mode: this.currentMode,
      stars: stats.stars,
      wastedPigs: stats.wastedPigs,
      undosUsed: this.undosUsed,
      durationMs: Math.round(performance.now() - this.levelStartMs),
    });
    if (this.currentMode === 'daily' && this.pendingDailyDate) {
      track('daily_start', { levelIndex: this.currentLevelIndex, date: this.pendingDailyDate });
      const daily = completeDaily(stats.stars, this.pendingDailyDate);
      track('daily_win', {
        levelIndex: this.currentLevelIndex,
        date: this.pendingDailyDate,
        stars: stats.stars,
        newStreak: daily.streak,
        bestStreak: daily.bestStreak,
        extended: daily.extended,
      });
      if (daily.broken) {
        track('streak_broken', { previousStreak: daily.previousStreak, newStreak: 1 });
      } else if (daily.extended && daily.streak > daily.previousStreak) {
        track('streak_extended', { newStreak: daily.streak, bestStreak: daily.bestStreak, usedGrace: false });
      }
    }
    return stats;
  }
```

Then at each of the two win sites, collapse the new markLevelCompleted + analytics block into a single call:

```javascript
      this.state.phase = 'win';
      this.finalizeWin();
```

- [ ] **Step 7: Emit `level_fail` at the lose sites**

Find the two lose branches:

- "JAMMED" case (around the jam-limit check ~line 890).
- "OUT OF PIGS" case (~line 1153).

Before each `this.showOverlay(...)` call in those branches, insert (adjusting `reason`):

```javascript
      track('level_fail', {
        levelIndex: this.currentLevelIndex,
        mode: this.currentMode,
        reason: 'jam',
        durationMs: Math.round(performance.now() - this.levelStartMs),
      });
```

For "OUT OF PIGS", use `reason: 'out_of_pigs'`.

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS (old pre-existing difficulty failure remains the sole fail).

- [ ] **Step 9: Browser smoke — play and check events**

```bash
npm run dev
```

Use Playwright MCP or a browser:

1. Load menu → press Enter → play Level 1 to win (3 stars likely for the tutorial).
2. In devtools: `window.__PIXELPOWER_ANALYTICS__.events.map(e => e.event)` should include `level_start`, `level_win`.
3. `window.__PIXELPOWER__.gameState.completedLevels.find(e => e.index === 0)` should be `{ index: 0, stars: 3 }`.

- [ ] **Step 10: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: compute 3-star rating on win and emit analytics events"
```

---

## Task 8: GameScene — win overlay shows stars + wasted pig count

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Extend the overlay with a stars row**

Find `createOverlay()` (~line 368). After:

```javascript
    const title = this.add.text(540, 862, '', { ... }).setOrigin(0.5);
```

Add before the `const body = ...` line:

```javascript
    const starRow = this.add.container(540, 800);
    const star1 = this.add.text(-70, 0, '☆', { fontFamily: 'Trebuchet MS', fontSize: '72px', color: '#e6c85a' }).setOrigin(0.5);
    const star2 = this.add.text(0, 0, '☆', { fontFamily: 'Trebuchet MS', fontSize: '72px', color: '#e6c85a' }).setOrigin(0.5);
    const star3 = this.add.text(70, 0, '☆', { fontFamily: 'Trebuchet MS', fontSize: '72px', color: '#e6c85a' }).setOrigin(0.5);
    starRow.add([star1, star2, star3]);
    starRow.setVisible(false);

    const wastedText = this.add.text(540, 920, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#4d6b94',
      align: 'center',
    }).setOrigin(0.5);
```

After the existing `this.overlay.add([...])` block, add:

```javascript
    this.overlay.add([starRow, wastedText]);
    this.overlayStarRow = starRow;
    this.overlayStars = [star1, star2, star3];
    this.overlayWastedText = wastedText;
```

- [ ] **Step 2: Populate stars in `showOverlay`**

Find `showOverlay(title, body)` (~line 1017). Replace:

```javascript
  showOverlay(title, body) {
    const hasNextLevel = this.state?.phase === 'win' && this.currentLevelIndex < LEVELS.length - 1;
```

with:

```javascript
  showOverlay(title, body) {
    const hasNextLevel = this.state?.phase === 'win' && this.currentLevelIndex < LEVELS.length - 1;

    const isWin = this.state?.phase === 'win';
    const stats = isWin ? this.lastWinStats : null;
    if (isWin && stats) {
      const filled = '★';  // ★
      const empty = '☆';   // ☆
      this.overlayStars.forEach((s, i) => s.setText(i < stats.stars ? filled : empty));
      this.overlayStarRow.setVisible(true);
      this.overlayWastedText.setText(
        stats.wastedPigs === 0
          ? 'No pigs wasted — flawless run!'
          : stats.wastedPigs === 1
          ? '1 pig wasted'
          : `${stats.wastedPigs} pigs wasted`,
      );
      this.overlayWastedText.setVisible(true);
    } else {
      this.overlayStarRow.setVisible(false);
      this.overlayWastedText.setVisible(false);
    }
```

- [ ] **Step 3: Clear stars when overlay hides**

There's no explicit hide path; `overlay.setVisible(false)` already hides the star row along with its parent container. No change.

- [ ] **Step 4: Browser smoke**

```bash
npm run dev
```

Play Level 1 to win. Expected: three gold star glyphs above the BOARD CLEAR banner; "No pigs wasted" line below the title. Fail the level intentionally (force a jam on a later level): expected: no stars shown.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: show star rating and wasted-pig count on win overlay"
```

---

## Task 9: MenuScene — 3-star row on each level card

**Files:**
- Modify: `src/scenes/MenuScene.js`

- [ ] **Step 1: Import getStarsForLevel**

At the top of `src/scenes/MenuScene.js`, change:

```javascript
import {
  gameState,
  getHighestUnlockedLevelIndex,
  isLevelUnlocked,
  setSelectedLevelIndex,
} from '../state/gameState.js';
```

to:

```javascript
import {
  gameState,
  getHighestUnlockedLevelIndex,
  isLevelUnlocked,
  setSelectedLevelIndex,
  getStarsForLevel,
  isLevelCompleted,
} from '../state/gameState.js';
```

- [ ] **Step 2: Add a helper to build a star row**

Inside the `MenuScene` class, above `createHeader` (or next to `createPanel`), add:

```javascript
  buildStarRow(x, y, size = 16) {
    const star1 = this.add.text(x - size * 1.2, y, '☆', { fontFamily: 'Trebuchet MS', fontSize: `${size * 1.6}px`, color: '#e6c85a' }).setOrigin(0.5);
    const star2 = this.add.text(x, y, '☆', { fontFamily: 'Trebuchet MS', fontSize: `${size * 1.6}px`, color: '#e6c85a' }).setOrigin(0.5);
    const star3 = this.add.text(x + size * 1.2, y, '☆', { fontFamily: 'Trebuchet MS', fontSize: `${size * 1.6}px`, color: '#e6c85a' }).setOrigin(0.5);
    return [star1, star2, star3];
  }

  paintStarRow(stars, earned) {
    const filled = '★';
    const empty = '☆';
    stars.forEach((s, i) => {
      if (earned === null) {
        s.setText(empty).setColor('#8fa7c7');
      } else {
        s.setText(i < earned ? filled : empty).setColor(i < earned ? '#e6c85a' : '#6d8ab0');
      }
    });
  }
```

- [ ] **Step 3: Replace the single star on each card with the row**

Find the `createLevelBrowser` block (~line 147) where each card is built. Locate:

```javascript
      let star = null;
      if (level.milestone) {
        star = this.add.text(CARD_WIDTH * 0.5 - 30, -CARD_HEIGHT * 0.5 + 10, '★', {
          fontSize: '20px',
          color: '#ffd74f',
        }).setOrigin(0.5).setDepth(15);
      }
```

Replace with:

```javascript
      const starRow = this.buildStarRow(0, CARD_HEIGHT * 0.5 - 14, 12);
      starRow.forEach((s) => s.setDepth(15));
      const star = null;
```

Find the `container.add(containerItems);` line. Just before it, add:

```javascript
      containerItems.push(...starRow);
```

Also add to `this.levelCards.push({...})` the `starRow` field:

```javascript
      this.levelCards.push({ pageIndex, container, shadow, card, number, name, description, meta, bench, status, badge, hit, starRow });
```

- [ ] **Step 4: Paint the stars in `refreshLevelPicker`**

Find `refreshLevelPicker()` (~line 490). Inside the `this.levelCards.forEach((entry, index) => { ... });` block, at the bottom of the block (just before the `});` closing the forEach), add:

```javascript
      if (unlocked) {
        this.paintStarRow(entry.starRow, isLevelCompleted(index) ? getStarsForLevel(index) : 0);
      } else {
        this.paintStarRow(entry.starRow, 0);
      }
```

- [ ] **Step 5: Browser smoke**

```bash
npm run dev
```

With progress cleared (open devtools → `localStorage.clear()` then refresh), verify:
- All level cards show three muted outlined stars.
- Play Level 1 to 3★ win, return to menu.
- Level 1 card shows three filled gold stars. Unplayed cards stay outlined.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MenuScene.js
git commit -m "feat: render 3-star row on each level card in menu"
```

---

## Task 10: MenuScene — daily challenge card

**Files:**
- Modify: `src/scenes/MenuScene.js`

- [ ] **Step 1: Extend imports**

Replace the top-of-file imports with:

```javascript
import Phaser from 'phaser';
import {
  gameState,
  getHighestUnlockedLevelIndex,
  isLevelUnlocked,
  setSelectedLevelIndex,
  getStarsForLevel,
  isLevelCompleted,
} from '../state/gameState.js';
import { LEVELS } from '../data/levels.js';
import { dailyLevelIndex, dailyPool, utcDateString } from '../game/daily.js';
```

- [ ] **Step 2: Add a `createDailyCard` method**

Inside the `MenuScene` class, before `createHeader`:

```javascript
  createDailyCard(width) {
    const today = utcDateString(Date.now());
    const pool = dailyPool(LEVELS);
    const index = dailyLevelIndex(today, pool);
    this.todayDailyIndex = index;
    this.todayDailyDate = today;
    const playedToday = gameState.daily.lastDate === today;
    const stars = playedToday ? (gameState.daily.lastStars ?? 0) : 0;

    const cardX = width * 0.5;
    const cardY = 610;
    this.createPanel(cardX, cardY, width - 120, 78, { tint: 0xfff7e6, alpha: 0.98 });
    this.add.text(cardX - (width / 2) + 110, cardY - 18, 'DAILY CHALLENGE', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#805a15',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.add.text(cardX - (width / 2) + 110, cardY + 14, today, {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#a08050',
    }).setOrigin(0, 0.5);

    const fireLabel = `\u{1F525} ${gameState.daily.streak}`;
    this.add.text(cardX - 40, cardY, fireLabel, {
      fontFamily: 'Trebuchet MS',
      fontSize: '32px',
      color: '#d9541b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cardX - 40, cardY + 22, `Best ${gameState.daily.bestStreak}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '14px',
      color: '#a06540',
    }).setOrigin(0.5);

    this.dailyStarRow = this.buildStarRow(cardX + 40, cardY - 4, 10);
    this.paintStarRow(this.dailyStarRow, playedToday ? stars : 0);

    const buttonLabel = playedToday ? 'PLAYED TODAY' : 'PLAY DAILY';
    const button = this.add.text(cardX + (width / 2) - 180, cardY, buttonLabel, {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: playedToday ? '#92a0b5' : '#d9541b',
      padding: { x: 14, y: 8 },
      fontStyle: 'bold',
    }).setOrigin(0.5);
    if (!playedToday) {
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.startDailyChallenge());
    }
  }

  startDailyChallenge() {
    this.scene.start('GameScene', {
      levelIndex: this.todayDailyIndex,
      mode: 'daily',
      dailyDate: this.todayDailyDate,
    });
  }
```

- [ ] **Step 3: Call `createDailyCard` from `create`**

In `create()` (~line 54), after:

```javascript
    this.createProgressPanel(width);
```

add:

```javascript
    this.createDailyCard(width);
```

- [ ] **Step 4: Adjust layout — shift the level browser down**

Because the daily card takes ~78px, shift the level-browser panel down slightly. In `createLevelBrowser`, change:

```javascript
    this.add.text(92, 624, 'LEVEL BROWSER', {
```

to:

```javascript
    this.add.text(92, 692, 'LEVEL BROWSER', {
```

And the panel itself: change `this.createPanel(width * 0.5, 980, width - 120, 700, …)` to `this.createPanel(width * 0.5, 1024, width - 120, 664, …)`.

Then shift the swipe bounds and nav button Y positions accordingly: `this.browserSwipeBounds = new Phaser.Geom.Rectangle(84, 724, width - 168, 608);` and `this.navButtons.prev = this.createNavButton(126, 1028, '<');` and `this.navButtons.next = this.createNavButton(width - 126, 1028, '>');` and cards starting Y: `const startY = 832;` (was `794`). Indicator Y: `const dot = this.add.circle(indicatorStartX + i * 36, 1322, 9, ...);` (was `1306`) and matching zone.

This is a mechanical re-positioning; if anything looks off in the smoke test, tune by ±20–40px.

- [ ] **Step 5: Browser smoke**

```bash
npm run dev
```

Verify:
- A DAILY CHALLENGE card appears between the progress panel and the level browser with today's date, streak count, and a PLAY DAILY button.
- Clicking PLAY DAILY transitions to the game with the daily level.
- Win the daily → menu shows the button disabled ("PLAYED TODAY"), star row filled, streak incremented.
- `window.__PIXELPOWER_ANALYTICS__.events.filter(e => e.event.startsWith('daily'))` shows `daily_start`, `daily_win`, `streak_extended`.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MenuScene.js
git commit -m "feat: add daily challenge card with streak and launch button"
```

---

## Task 11: MenuScene — star row on preview panel

**Files:**
- Modify: `src/scenes/MenuScene.js`

- [ ] **Step 1: Build and paint a preview star row**

In `createPreviewPanel` (~line 303), just before `this.previewBoard = this.add.container(width - 220, height - 264);`, add:

```javascript
    this.previewStarRow = this.buildStarRow(130, height - 230, 14);
```

In `refreshLevelPicker`, at the end (just before `gameState.notes = [...]`), add:

```javascript
    this.paintStarRow(this.previewStarRow, isLevelCompleted(selectedIndex) ? getStarsForLevel(selectedIndex) : 0);
```

- [ ] **Step 2: Browser smoke**

Reload the dev server and verify that selecting a completed level shows its earned stars in the preview panel below the description.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MenuScene.js
git commit -m "feat: show earned stars on selected-level preview panel"
```

---

## Task 12: Final verification — tests + build + end-to-end browser smoke

**Files:** no code changes.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected:
- All new tests (scoring, daily, analytics, gameState, levels) pass.
- Pre-existing difficulty test still fails (known, pre-dates this work).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS with the usual 500kB warning.

- [ ] **Step 3: Browser end-to-end with Playwright MCP**

Walk this script:

1. `npm run dev` → navigate to http://localhost:5173.
2. In devtools: `localStorage.clear(); location.reload();` to start fresh.
3. Menu: verify DAILY CHALLENGE card exists, shows today's date, `🔥 0`, "Best 0". Verify all level cards show three muted outlined stars.
4. Press Enter → Level 1 loads. Play through to victory.
5. Win overlay: verify three gold stars above "BOARD CLEAR" and "No pigs wasted" text. Press MENU.
6. Menu: Level 1 card shows three filled gold stars; preview panel (for Level 1 if selected) shows three stars too.
7. Click PLAY DAILY. Verify "DAILY 2026-MM-DD" prefix in the intro banner.
8. Win the daily. Back to menu: Daily card shows disabled button "PLAYED TODAY", streak now `🔥 1`, star row filled.
9. In devtools: `window.__PIXELPOWER_ANALYTICS__.events.map(e => e.event)` — confirm ordered presence of `level_start`, `level_win`, `daily_start`, `daily_win`, `streak_extended`.
10. Simulate a two-day gap:
    ```javascript
    const v2 = JSON.parse(localStorage.getItem('pixelpower-progress-v2'));
    v2.daily.lastDate = '2026-04-20'; // 3 days ago if today is 2026-04-23
    localStorage.setItem('pixelpower-progress-v2', JSON.stringify(v2));
    location.reload();
    ```
    Play daily again, win. Expected: `streak_broken` fires; streak resets to 1; `bestStreak` preserves the old max.

- [ ] **Step 4: Stop dev server, confirm clean working tree (aside from .playwright-mcp debug dir if any)**

```bash
git status
```

- [ ] **Step 5: Final commit (only if any tweaks were needed during smoke)**

If the smoke surfaced bugs, fix them in follow-up commits; otherwise no commit needed for this task.

---

## Self-review notes

- **Spec coverage:** 3-star scoring (Tasks 1, 6-9), daily challenge (Tasks 2, 5, 7, 10), analytics (Tasks 3, 7), migration (Task 4), UI on menu card + win overlay + preview panel (Tasks 8, 9, 11), all daily-pool levels solvable (Task 5), browser end-to-end (Task 12). Every spec requirement maps to at least one task.
- **Placeholder scan:** No TBDs, no "similar to task N", every code step contains actual code.
- **Type consistency:** `computeStars({ launchedHistory, remaining })` signature used consistently (Tasks 1, 7). `completeDaily(stars, dateStr)` consistent (Tasks 4, 7). `launchedHistory` entry shape `{ launchId, color, initialAmmo, finalAmmo }` consistent. `daily` block shape `{ lastDate, streak, bestStreak, lastStars }` consistent across gameState and UI.

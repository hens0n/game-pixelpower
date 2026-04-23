import { strict as assert } from 'node:assert';
import { test, beforeEach } from 'node:test';

function installLocalStorage(initial = {}) {
  const store = { ...initial };
  globalThis.window = globalThis.window || {};
  globalThis.window.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
  if (globalThis.window.innerWidth === undefined) {
    globalThis.window.innerWidth = 1080;
    globalThis.window.innerHeight = 1920;
  }
}

async function freshImport() {
  return import(`./gameState.js?cacheBust=${Math.random()}`);
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
  assert.equal(globalThis.window.localStorage._store['pixelpower-progress-v1'], undefined);
  assert.ok(globalThis.window.localStorage._store['pixelpower-progress-v2']);
});

test('markLevelCompleted stores stars and keeps the max on re-clears', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.markLevelCompleted(0, 100, 2);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: 2 });
  mod.markLevelCompleted(0, 100, 1);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: 2 });
  mod.markLevelCompleted(0, 100, 3);
  assert.deepEqual(mod.gameState.completedLevels[0], { index: 0, stars: 3 });
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
  const r2 = mod.completeDaily(2, '2026-04-25');
  assert.equal(r2.streak, 2);
  assert.equal(r2.extended, true);
});

test('completeDaily with two-day gap breaks and resets to 1', async () => {
  installLocalStorage();
  const mod = await freshImport();
  mod.completeDaily(3, '2026-04-23');
  const r2 = mod.completeDaily(2, '2026-04-26');
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
  mod.completeDaily(3, '2026-05-01');
  assert.equal(mod.gameState.daily.streak, 1);
  assert.equal(mod.gameState.daily.bestStreak, 3);
});

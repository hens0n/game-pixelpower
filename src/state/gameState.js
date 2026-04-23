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

export function completeDaily(stars, dateStr) {
  const previousStreak = gameState.daily.streak;
  const incoming = Number.isInteger(stars) && stars >= 1 && stars <= 3 ? stars : null;

  if (gameState.daily.lastDate === dateStr) {
    const prevStars = gameState.daily.lastStars ?? 0;
    gameState.daily.lastStars = Math.max(prevStars, incoming ?? 0) || null;
    persistProgress();
    return {
      streak: gameState.daily.streak,
      bestStreak: gameState.daily.bestStreak,
      previousStreak,
      extended: false,
      broken: false,
      usedGrace: false,
    };
  }

  const delta = gameState.daily.lastDate
    ? dayDeltaInline(gameState.daily.lastDate, dateStr)
    : null;

  let broken = false;
  let usedGrace = false;
  if (delta !== null && delta > 2) {
    broken = true;
    gameState.daily.streak = 1;
  } else if (delta === 1 || delta === 2) {
    gameState.daily.streak += 1;
    usedGrace = delta === 2;
  } else if (delta === null) {
    gameState.daily.streak = 1;
  } else {
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
    usedGrace,
  };
}

function dayDeltaInline(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

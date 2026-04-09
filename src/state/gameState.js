const STORAGE_KEY = 'pixelpower-progress-v1';

function loadStoredProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { completedLevels: [], unlockedLevelCount: 1 };
    }

    const parsed = JSON.parse(raw);
    return {
      completedLevels: Array.isArray(parsed.completedLevels)
        ? parsed.completedLevels.filter((value) => Number.isInteger(value) && value >= 0)
        : [],
      unlockedLevelCount: Math.max(1, Number(parsed.unlockedLevelCount) || 1),
    };
  } catch {
    return { completedLevels: [], unlockedLevelCount: 1 };
  }
}

function persistProgress() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedLevels: gameState.completedLevels,
        unlockedLevelCount: gameState.unlockedLevelCount,
      }),
    );
  } catch {
    // Ignore storage failures so gameplay still works in restricted contexts.
  }
}

const storedProgress = loadStoredProgress();

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
  completedLevels: storedProgress.completedLevels,
  unlockedLevelCount: storedProgress.unlockedLevelCount,
  gameplay: null,
};

export function isLevelUnlocked(index) {
  return index >= 0 && index < gameState.unlockedLevelCount;
}

export function getHighestUnlockedLevelIndex(totalLevels) {
  return Math.max(0, Math.min(gameState.unlockedLevelCount - 1, totalLevels - 1));
}

export function markLevelCompleted(index, totalLevels) {
  if (!gameState.completedLevels.includes(index)) {
    gameState.completedLevels = [...gameState.completedLevels, index].sort((a, b) => a - b);
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

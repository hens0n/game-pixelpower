export const COLORS = ['red', 'yellow', 'green', 'blue'];

export const TIERS = {
  easy: {
    name: 'easy',
    levelRange: [11, 20],
    gridSizes: [[5, 5], [6, 5]],
    colors: COLORS.slice(0, 3),
    colorCounts: [2, 3],
    ammoMultiplier: 1.3,
    patterns: ['columns', 'rows'],
    benchRange: [5, 7],
  },
  medium: {
    name: 'medium',
    levelRange: [21, 30],
    gridSizes: [[6, 6], [7, 6]],
    colors: COLORS.slice(0, 3),
    colorCounts: [3],
    ammoMultiplier: 1.15,
    patterns: ['blocks', 'stripes'],
    benchRange: [7, 10],
  },
  hard: {
    name: 'hard',
    levelRange: [31, 40],
    gridSizes: [[7, 7], [8, 7]],
    colors: COLORS.slice(0, 4),
    colorCounts: [3, 4],
    ammoMultiplier: 1.05,
    patterns: ['checkers', 'spirals'],
    benchRange: [10, 14],
  },
  expert: {
    name: 'expert',
    levelRange: [41, 50],
    gridSizes: [[8, 8]],
    colors: COLORS,
    colorCounts: [4],
    ammoMultiplier: 1.0,
    patterns: ['dense', 'mixed'],
    benchRange: [12, 16],
  },
};

export function getTierForLevel(levelNumber) {
  for (const tier of Object.values(TIERS)) {
    if (levelNumber >= tier.levelRange[0] && levelNumber <= tier.levelRange[1]) {
      return tier;
    }
  }
  return TIERS.easy;
}

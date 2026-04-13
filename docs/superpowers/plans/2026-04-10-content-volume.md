# Content Volume Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale Pixel Power from 10 to 50 campaign levels via a procedural generator CLI, browser-based curation tool, and handcrafted pixel-art milestone levels.

**Architecture:** A Node.js CLI generates candidate puzzle boards with configurable difficulty tiers and pattern strategies, validates solvability via a line-of-sight simulator, and writes candidates to JSON. A vanilla HTML/Canvas preview tool lets you browse, accept/reject, and export curated levels into the game's existing `levels.js` format. Five pixel-art milestone boards are handcrafted at tier boundaries.

**Tech Stack:** Node.js (built-ins only), vanilla HTML/JS/Canvas, Phaser 3 (game changes only)

---

## File Structure

### New files (dev-only tooling)

| File | Responsibility |
|------|---------------|
| `tools/generator/difficulty.js` | Tier definitions: grid ranges, color counts, ammo multipliers, pattern lists, bench sizes |
| `tools/generator/board.js` | Board generation: pattern placement strategies (columns, blocks, checkers, spirals, dense) |
| `tools/generator/solver.js` | Solvability checker: line-of-sight simulation, greedy solver with random restarts, difficulty scoring |
| `tools/generator/bench.js` | Bench loadout builder: distributes ammo across pigs based on cube counts and tier multiplier |
| `tools/generator/pixelart.js` | Pixel-art milestone templates: 5 handcrafted 2D color arrays |
| `tools/generator/index.js` | CLI entry point: argument parsing, orchestration, JSON output |
| `tools/preview/index.html` | Curation UI: sidebar, canvas preview, accept/reject, export |
| `tools/preview/preview.js` | Canvas board renderer + interaction logic |
| `tools/preview/export.js` | Formats accepted levels as `levels.js`-compatible JS module |

### Modified files (game)

| File | Change |
|------|--------|
| `src/scenes/GameScene.js:11-42` | Add blue entry to `COLOR_THEMES` |
| `src/scenes/BootScene.js:9-36` | Add blue pig/cube asset preloading |
| `src/scenes/MenuScene.js:16-20` | Already has blue in `PREVIEW_COLORS` — no change needed |
| `src/data/levels.js` | Append 40 new levels (curated generated + milestones) after existing 10 |
| `package.json:5-8` | Add `"generate"` and `"preview"` npm scripts |
| `.gitignore` | Add `.superpowers/` entry |

---

### Task 1: Difficulty Tier Definitions

**Files:**
- Create: `tools/generator/difficulty.js`
- Test: `tools/generator/difficulty.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tools/generator/difficulty.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { TIERS, getTierForLevel } from './difficulty.js';

test('TIERS has four entries with required fields', () => {
  assert.equal(Object.keys(TIERS).length, 4);
  for (const [name, tier] of Object.entries(TIERS)) {
    assert.ok(tier.gridSizes.length > 0, `${name} has gridSizes`);
    assert.ok(tier.colors.length > 0, `${name} has colors`);
    assert.ok(typeof tier.ammoMultiplier === 'number', `${name} has ammoMultiplier`);
    assert.ok(tier.patterns.length > 0, `${name} has patterns`);
    assert.ok(tier.benchRange.length === 2, `${name} has benchRange`);
  }
});

test('getTierForLevel returns correct tier', () => {
  assert.equal(getTierForLevel(11).name, 'easy');
  assert.equal(getTierForLevel(15).name, 'easy');
  assert.equal(getTierForLevel(20).name, 'easy');
  assert.equal(getTierForLevel(21).name, 'medium');
  assert.equal(getTierForLevel(30).name, 'medium');
  assert.equal(getTierForLevel(31).name, 'hard');
  assert.equal(getTierForLevel(40).name, 'hard');
  assert.equal(getTierForLevel(41).name, 'expert');
  assert.equal(getTierForLevel(50).name, 'expert');
});

test('ammo multipliers decrease with difficulty', () => {
  assert.ok(TIERS.easy.ammoMultiplier > TIERS.medium.ammoMultiplier);
  assert.ok(TIERS.medium.ammoMultiplier > TIERS.hard.ammoMultiplier);
  assert.ok(TIERS.hard.ammoMultiplier > TIERS.expert.ammoMultiplier);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/generator/difficulty.test.js`
Expected: FAIL — `Cannot find module './difficulty.js'`

- [ ] **Step 3: Write the implementation**

```js
// tools/generator/difficulty.js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/generator/difficulty.test.js`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/generator/difficulty.js tools/generator/difficulty.test.js
git commit -m "feat: add difficulty tier definitions for level generator"
```

---

### Task 2: Board Generation — Pattern Strategies

**Files:**
- Create: `tools/generator/board.js`
- Test: `tools/generator/board.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tools/generator/board.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { generateBoard } from './board.js';

test('generateBoard returns a 2D array of the requested size', () => {
  const board = generateBoard({ rows: 5, cols: 5, colors: ['red', 'yellow'], pattern: 'columns' });
  assert.equal(board.length, 5);
  assert.equal(board[0].length, 5);
});

test('generateBoard only uses requested colors', () => {
  const colors = ['red', 'green'];
  const board = generateBoard({ rows: 6, cols: 6, colors, pattern: 'blocks' });
  const usedColors = new Set(board.flat());
  for (const color of usedColors) {
    assert.ok(colors.includes(color), `unexpected color: ${color}`);
  }
});

test('columns pattern creates vertical color lanes', () => {
  const board = generateBoard({ rows: 4, cols: 4, colors: ['red', 'yellow'], pattern: 'columns' });
  for (let col = 0; col < 4; col++) {
    const colColors = board.map(row => row[col]);
    assert.equal(new Set(colColors).size, 1, `column ${col} should be one color`);
  }
});

test('rows pattern creates horizontal color lanes', () => {
  const board = generateBoard({ rows: 4, cols: 4, colors: ['red', 'yellow'], pattern: 'rows' });
  for (let row = 0; row < 4; row++) {
    assert.equal(new Set(board[row]).size, 1, `row ${row} should be one color`);
  }
});

test('all patterns produce boards with every requested color', () => {
  const patterns = ['columns', 'rows', 'blocks', 'stripes', 'checkers', 'spirals', 'dense', 'mixed'];
  const colors = ['red', 'yellow', 'green'];
  for (const pattern of patterns) {
    const board = generateBoard({ rows: 6, cols: 6, colors, pattern });
    const usedColors = new Set(board.flat());
    for (const color of colors) {
      assert.ok(usedColors.has(color), `pattern '${pattern}' missing color '${color}'`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/generator/board.test.js`
Expected: FAIL — `Cannot find module './board.js'`

- [ ] **Step 3: Write the implementation**

```js
// tools/generator/board.js

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function columnsPattern(rows, cols, colors) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => colors[c % colors.length]),
  );
}

function rowsPattern(rows, cols, colors) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, () => colors[r % colors.length]),
  );
}

function blocksPattern(rows, cols, colors) {
  const blockSize = pick([2, 3]);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const blockRow = Math.floor(r / blockSize);
      const blockCol = Math.floor(c / blockSize);
      return colors[(blockRow + blockCol) % colors.length];
    }),
  );
}

function stripesPattern(rows, cols, colors) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => colors[(r + c) % colors.length]),
  );
}

function checkersPattern(rows, cols, colors) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => colors[(r + c) % colors.length]),
  );
}

function spiralsPattern(rows, cols, colors) {
  const board = Array.from({ length: rows }, () => Array(cols).fill(null));
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  let colorIdx = 0;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) board[top][c] = colors[colorIdx % colors.length];
    top++;
    colorIdx++;
    for (let r = top; r <= bottom; r++) board[r][right] = colors[colorIdx % colors.length];
    right--;
    colorIdx++;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) board[bottom][c] = colors[colorIdx % colors.length];
      bottom--;
      colorIdx++;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) board[r][left] = colors[colorIdx % colors.length];
      left++;
      colorIdx++;
    }
  }
  return board;
}

function densePattern(rows, cols, colors) {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => pick(colors)),
  );
  // Force at least one of each color
  for (let i = 0; i < colors.length; i++) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    board[r][c] = colors[i];
  }
  return board;
}

function mixedPattern(rows, cols, colors) {
  const board = blocksPattern(rows, cols, colors);
  const half = Math.floor(rows / 2);
  for (let r = half; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board[r][c] = pick(colors);
    }
  }
  // Ensure all colors present
  for (let i = 0; i < colors.length; i++) {
    board[half + (i % (rows - half))][i % cols] = colors[i];
  }
  return board;
}

const PATTERN_FNS = {
  columns: columnsPattern,
  rows: rowsPattern,
  blocks: blocksPattern,
  stripes: stripesPattern,
  checkers: checkersPattern,
  spirals: spiralsPattern,
  dense: densePattern,
  mixed: mixedPattern,
};

export function generateBoard({ rows, cols, colors, pattern }) {
  const fn = PATTERN_FNS[pattern];
  if (!fn) {
    throw new Error(`Unknown pattern: ${pattern}`);
  }
  return fn(rows, cols, colors);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/generator/board.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/generator/board.js tools/generator/board.test.js
git commit -m "feat: add board generation with 8 pattern strategies"
```

---

### Task 3: Solvability Checker & Difficulty Scorer

**Files:**
- Create: `tools/generator/solver.js`
- Test: `tools/generator/solver.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tools/generator/solver.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/generator/solver.test.js`
Expected: FAIL — `Cannot find module './solver.js'`

- [ ] **Step 3: Write the implementation**

```js
// tools/generator/solver.js

/**
 * Simulates the game's line-of-sight mechanic.
 * A pig traveling the conveyor visits all 4 sides: bottom -> right -> top -> left.
 * On each side it fires at every column/row position along that edge.
 * It only destroys cubes matching its color. Non-matching cubes block the shot.
 */

const SIDES = ['bottom', 'right', 'top', 'left'];

function cloneBoard(layout) {
  return layout.map(row => [...row]);
}

function countCubes(board) {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) count++;
    }
  }
  return count;
}

/**
 * Simulate one pig doing a full conveyor loop.
 * Mutates board in place, returns remaining ammo.
 */
function simulatePig(board, pig) {
  const rows = board.length;
  const cols = board[0].length;
  let ammo = pig.ammo;

  for (const side of SIDES) {
    if (ammo <= 0) break;

    if (side === 'bottom') {
      for (let c = 0; c < cols && ammo > 0; c++) {
        for (let r = rows - 1; r >= 0; r--) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    } else if (side === 'right') {
      for (let r = 0; r < rows && ammo > 0; r++) {
        for (let c = cols - 1; c >= 0; c--) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    } else if (side === 'top') {
      for (let c = 0; c < cols && ammo > 0; c++) {
        for (let r = 0; r < rows; r++) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    } else if (side === 'left') {
      for (let r = 0; r < rows && ammo > 0; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    }
  }

  return ammo;
}

/**
 * Try a specific bench ordering. Returns true if the board is cleared.
 */
function tryOrdering(layout, ordering) {
  const board = cloneBoard(layout);
  const returnQueue = [];

  for (const pig of ordering) {
    const remaining = simulatePig(board, { color: pig.color, ammo: pig.ammo });
    if (remaining > 0) {
      returnQueue.push({ color: pig.color, ammo: remaining });
    }
  }

  for (const pig of returnQueue) {
    simulatePig(board, pig);
  }

  return countCubes(board) === 0;
}

/**
 * Check if a board is solvable with the given bench.
 * Uses random ordering shuffles for larger benches.
 */
export function isSolvable(layout, bench, maxAttempts = 2000) {
  if (tryOrdering(layout, bench)) return true;
  if (tryOrdering(layout, [...bench].reverse())) return true;

  for (let i = 0; i < maxAttempts; i++) {
    const shuffled = [...bench].sort(() => Math.random() - 0.5);
    if (tryOrdering(layout, shuffled)) return true;
  }

  return false;
}

/**
 * Score difficulty 0-10 based on board properties.
 */
export function scoreDifficulty(layout, bench) {
  const rows = layout.length;
  const cols = layout[0].length;
  const totalCubes = layout.flat().filter(c => c !== null).length;
  const uniqueColors = new Set(layout.flat().filter(c => c !== null)).size;
  const totalAmmo = bench.reduce((sum, pig) => sum + pig.ammo, 0);
  const ammoRatio = totalAmmo / totalCubes;

  const sizeFactor = Math.min(3, (rows * cols - 25) / 20);
  const colorFactor = Math.min(2, (uniqueColors - 2) * 1.0);
  const ammoFactor = Math.min(3, Math.max(0, (1.3 - ammoRatio) * 6));

  let blockerCount = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = rows - 1; r > 0; r--) {
      if (layout[r][c] !== null && layout[r - 1][c] !== null && layout[r][c] !== layout[r - 1][c]) {
        blockerCount++;
      }
    }
  }
  const blockerFactor = Math.min(2, (blockerCount / Math.max(1, totalCubes)) * 4);

  return Math.min(10, Math.max(0, sizeFactor + colorFactor + ammoFactor + blockerFactor));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/generator/solver.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/generator/solver.js tools/generator/solver.test.js
git commit -m "feat: add solvability checker and difficulty scorer"
```

---

### Task 4: Bench Loadout Builder

**Files:**
- Create: `tools/generator/bench.js`
- Test: `tools/generator/bench.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tools/generator/bench.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildBench } from './bench.js';

test('buildBench total ammo matches cube counts times multiplier', () => {
  const layout = [
    ['red', 'red', 'yellow'],
    ['red', 'yellow', 'yellow'],
  ];
  const bench = buildBench(layout, { ammoMultiplier: 1.0, benchRange: [3, 5] });
  const totalAmmo = bench.reduce((sum, p) => sum + p.ammo, 0);
  assert.equal(totalAmmo, 6);
});

test('buildBench respects ammo multiplier', () => {
  const layout = [
    ['red', 'red'],
    ['red', 'red'],
  ];
  const bench = buildBench(layout, { ammoMultiplier: 1.5, benchRange: [2, 4] });
  const totalAmmo = bench.reduce((sum, p) => sum + p.ammo, 0);
  assert.equal(totalAmmo, 6);
});

test('buildBench produces pigs within benchRange', () => {
  const layout = [
    ['red', 'yellow', 'green'],
    ['red', 'yellow', 'green'],
    ['red', 'yellow', 'green'],
  ];
  const bench = buildBench(layout, { ammoMultiplier: 1.3, benchRange: [5, 7] });
  assert.ok(bench.length >= 5 && bench.length <= 7, `bench length ${bench.length} not in [5,7]`);
});

test('buildBench only uses colors present in layout', () => {
  const layout = [
    ['red', 'yellow'],
    ['red', 'yellow'],
  ];
  const bench = buildBench(layout, { ammoMultiplier: 1.0, benchRange: [2, 4] });
  const benchColors = new Set(bench.map(p => p.color));
  assert.ok(!benchColors.has('green'));
  assert.ok(!benchColors.has('blue'));
});

test('every pig has ammo >= 1', () => {
  const layout = [
    ['red', 'yellow', 'green'],
    ['red', 'yellow', 'green'],
  ];
  const bench = buildBench(layout, { ammoMultiplier: 1.0, benchRange: [5, 7] });
  for (const pig of bench) {
    assert.ok(pig.ammo >= 1, `pig with 0 ammo: ${JSON.stringify(pig)}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/generator/bench.test.js`
Expected: FAIL — `Cannot find module './bench.js'`

- [ ] **Step 3: Write the implementation**

```js
// tools/generator/bench.js

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function countColors(layout) {
  const counts = {};
  for (const row of layout) {
    for (const color of row) {
      if (color !== null) {
        counts[color] = (counts[color] || 0) + 1;
      }
    }
  }
  return counts;
}

/**
 * Build a bench loadout from a board layout.
 * Total ammo = sum of cubes * ammoMultiplier (rounded).
 * Distributes ammo across benchRange[0]..benchRange[1] pigs,
 * ensuring each pig has at least 1 ammo and only uses colors from the layout.
 */
export function buildBench(layout, { ammoMultiplier, benchRange }) {
  const colorCounts = countColors(layout);
  const colors = Object.keys(colorCounts);
  const totalCubes = Object.values(colorCounts).reduce((a, b) => a + b, 0);
  const totalAmmo = Math.round(totalCubes * ammoMultiplier);

  const [minPigs, maxPigs] = benchRange;
  const pigCount = Math.min(
    maxPigs,
    Math.max(minPigs, Math.min(totalAmmo, minPigs + Math.floor(Math.random() * (maxPigs - minPigs + 1)))),
  );

  // Allocate ammo per color proportionally to cube counts
  const colorAmmo = {};
  let allocated = 0;
  for (const color of colors) {
    const share = Math.round((colorCounts[color] / totalCubes) * totalAmmo);
    colorAmmo[color] = Math.max(1, share);
    allocated += colorAmmo[color];
  }
  // Adjust rounding difference on the largest color
  const largestColor = colors.reduce((a, b) => colorAmmo[a] >= colorAmmo[b] ? a : b);
  colorAmmo[largestColor] += totalAmmo - allocated;

  // Split each color's ammo across pigs
  const pigs = [];
  for (const color of colors) {
    let remaining = colorAmmo[color];
    const pigsForColor = Math.max(1, Math.round((colorAmmo[color] / totalAmmo) * pigCount));
    for (let i = 0; i < pigsForColor && remaining > 0; i++) {
      const isLast = i === pigsForColor - 1;
      const ammo = isLast
        ? remaining
        : Math.max(1, Math.floor(remaining / (pigsForColor - i)) + Math.floor(Math.random() * 2));
      const clamped = Math.min(ammo, remaining);
      pigs.push({ color, ammo: clamped });
      remaining -= clamped;
    }
    if (remaining > 0 && pigs.length > 0) {
      pigs[pigs.length - 1].ammo += remaining;
    }
  }

  // Shuffle so colors aren't grouped
  for (let i = pigs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pigs[i], pigs[j]] = [pigs[j], pigs[i]];
  }

  return pigs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/generator/bench.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/generator/bench.js tools/generator/bench.test.js
git commit -m "feat: add bench loadout builder for generated levels"
```

---

### Task 5: Pixel-Art Milestone Templates

**Files:**
- Create: `tools/generator/pixelart.js`
- Test: `tools/generator/pixelart.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tools/generator/pixelart.test.js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MILESTONES, getMilestone } from './pixelart.js';

test('MILESTONES has 5 entries at levels 11, 21, 31, 41, 50', () => {
  const levels = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
  assert.deepEqual(levels, [11, 21, 31, 41, 50]);
});

test('each milestone has name, layout, and valid colors', () => {
  const validColors = ['red', 'yellow', 'green', 'blue'];
  for (const [level, ms] of Object.entries(MILESTONES)) {
    assert.ok(ms.name, `level ${level} has name`);
    assert.ok(ms.layout.length > 0, `level ${level} has layout`);
    for (const row of ms.layout) {
      for (const cell of row) {
        if (cell !== null) {
          assert.ok(validColors.includes(cell), `level ${level} has invalid color: ${cell}`);
        }
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
    for (const row of ms.layout) {
      assert.equal(row.length, width, `level ${level} has inconsistent row width`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tools/generator/pixelart.test.js`
Expected: FAIL — `Cannot find module './pixelart.js'`

- [ ] **Step 3: Write the implementation**

```js
// tools/generator/pixelart.js

/**
 * Pixel-art milestone templates.
 * null = empty cell (no cube). Colors: red, yellow, green, blue.
 */
export const MILESTONES = {
  11: {
    name: 'Heart',
    description: 'A pixel heart to welcome you to the generated campaign.',
    layout: [
      [null,    'red',    'red',    null,    'red',    'red'   ],
      ['red',   'red',    'red',    'red',   'red',    'red'   ],
      ['red',   'yellow', 'red',    'red',   'yellow', 'red'   ],
      ['red',   'red',    'red',    'red',   'red',    'red'   ],
      [null,    'red',    'red',    'red',   'red',    null    ],
      [null,    null,     'red',    'red',   null,     null    ],
    ],
  },
  21: {
    name: 'Chick',
    description: 'A baby chick marks the start of medium difficulty.',
    layout: [
      [null,     null,     'yellow', 'yellow', 'yellow', null,     null    ],
      [null,     'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null    ],
      ['yellow', 'green',  'yellow', 'yellow', 'yellow', 'green',  'yellow'],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      [null,     'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null    ],
      [null,     null,     'yellow', 'red',    'yellow', null,     null    ],
      [null,     null,     null,     'yellow', null,     null,     null    ],
    ],
  },
  31: {
    name: 'Tree',
    description: 'A sturdy tree opens the hard tier.',
    layout: [
      [null,    null,     'green',  'green',  'green',  null,     null    ],
      [null,    'green',  'green',  'green',  'green',  'green',  null    ],
      ['green', 'green',  'green',  'green',  'green',  'green',  'green' ],
      ['green', 'green',  'green',  'green',  'green',  'green',  'green' ],
      [null,    'yellow', 'green',  'green',  'green',  'yellow', null    ],
      [null,    'yellow', null,     null,     null,     'yellow', null    ],
      [null,    'yellow', 'yellow', null,     'yellow', 'yellow', null    ],
    ],
  },
  41: {
    name: 'Robot',
    description: 'A pixel robot signals the expert tier.',
    layout: [
      [null,   null,     'blue',   'blue',   'blue',   'blue',   null,    null   ],
      [null,   'blue',   'blue',   'blue',   'blue',   'blue',   'blue',  null   ],
      ['blue', 'blue',   'yellow', 'blue',   'blue',   'yellow', 'blue',  'blue' ],
      ['blue', 'blue',   'blue',   'blue',   'blue',   'blue',   'blue',  'blue' ],
      ['blue', 'blue',   'blue',   'blue',   'blue',   'blue',   'blue',  'blue' ],
      [null,   'blue',   'red',    'red',    'red',    'red',    'blue',  null   ],
      [null,   null,     'blue',   'blue',   'blue',   'blue',   null,    null   ],
      ['blue', 'blue',   null,     null,     null,     null,     'blue',  'blue' ],
    ],
  },
  50: {
    name: 'Crown',
    description: 'The ultimate crown — clear this to conquer the campaign.',
    layout: [
      [null,     'yellow', null,     'yellow', null,     'yellow', null,     null    ],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null    ],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      ['yellow', 'red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'red',    'red',    'yellow', 'yellow', 'red',    'red',    'yellow'],
      ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
      [null,     'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null    ],
      [null,     null,     'yellow', 'yellow', 'yellow', 'yellow', null,     null    ],
    ],
  },
};

export function getMilestone(levelNumber) {
  return MILESTONES[levelNumber] || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tools/generator/pixelart.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/generator/pixelart.js tools/generator/pixelart.test.js
git commit -m "feat: add 5 pixel-art milestone level templates"
```

---

### Task 6: Generator CLI Entry Point

**Files:**
- Create: `tools/generator/index.js`
- Modify: `package.json:5-8`

- [ ] **Step 1: Write the CLI implementation**

```js
// tools/generator/index.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { TIERS, getTierForLevel } from './difficulty.js';
import { generateBoard } from './board.js';
import { buildBench } from './bench.js';
import { isSolvable, scoreDifficulty } from './solver.js';
import { getMilestone } from './pixelart.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', '..', 'output');
const OUTPUT_FILE = join(OUTPUT_DIR, 'candidates.json');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const PATTERN_ADJECTIVES = {
  columns: ['Column', 'Lane', 'Stripe'],
  rows: ['Row', 'Band', 'Layer'],
  blocks: ['Block', 'Cluster', 'Grid'],
  stripes: ['Stripe', 'Weave', 'Ribbon'],
  checkers: ['Checker', 'Diamond', 'Lattice'],
  spirals: ['Spiral', 'Vortex', 'Coil'],
  dense: ['Dense', 'Scatter', 'Storm'],
  mixed: ['Hybrid', 'Fusion', 'Blend'],
};

const NOUNS = ['Flow', 'Lock', 'Split', 'Shift', 'Wave', 'Rush', 'Maze', 'Pulse', 'Core', 'Edge', 'Grid', 'Arc'];

function generateName(pattern) {
  const adj = pick(PATTERN_ADJECTIVES[pattern] || ['Pixel']);
  const noun = pick(NOUNS);
  return `${adj} ${noun}`;
}

function generateCandidate(tier) {
  const [rows, cols] = pick(tier.gridSizes);
  const colorCount = pick(tier.colorCounts);
  const colors = tier.colors.slice(0, colorCount);
  const pattern = pick(tier.patterns);

  const layout = generateBoard({ rows, cols, colors, pattern });
  const bench = buildBench(layout, { ammoMultiplier: tier.ammoMultiplier, benchRange: tier.benchRange });

  if (!isSolvable(layout, bench)) return null;

  const name = generateName(pattern);
  const difficulty = scoreDifficulty(layout, bench);

  return {
    id: slugify(name) + '-' + randomInt(100, 999),
    name,
    description: `A ${tier.name}-tier ${pattern} puzzle on a ${cols}x${rows} grid.`,
    layout,
    bench,
    meta: {
      tier: tier.name,
      pattern,
      gridSize: `${cols}x${rows}`,
      colorCount,
      difficulty: Math.round(difficulty * 10) / 10,
      totalCubes: rows * cols,
      totalAmmo: bench.reduce((s, p) => s + p.ammo, 0),
    },
  };
}

function generateMilestoneCandidate(levelNumber) {
  const ms = getMilestone(levelNumber);
  if (!ms) return null;

  const tier = getTierForLevel(levelNumber);
  const bench = buildBench(ms.layout, {
    ammoMultiplier: tier.ammoMultiplier,
    benchRange: tier.benchRange,
  });

  const totalCubes = ms.layout.flat().filter(c => c !== null).length;
  const colorSet = new Set(ms.layout.flat().filter(c => c !== null));

  return {
    id: slugify(ms.name) + '-milestone',
    name: ms.name,
    description: ms.description,
    layout: ms.layout,
    bench,
    meta: {
      tier: tier.name,
      pattern: 'pixel-art',
      gridSize: `${ms.layout[0].length}x${ms.layout.length}`,
      colorCount: colorSet.size,
      difficulty: Math.round(scoreDifficulty(
        ms.layout.map(row => row.map(c => c ?? 'red')),
        bench,
      ) * 10) / 10,
      totalCubes,
      totalAmmo: bench.reduce((s, p) => s + p.ammo, 0),
      milestone: true,
    },
  };
}

function main() {
  const { values } = parseArgs({
    options: {
      tier: { type: 'string', default: 'all' },
      count: { type: 'string', default: '50' },
      milestone: { type: 'string' },
    },
  });

  const count = parseInt(values.count, 10);

  if (values.milestone) {
    const levelNum = parseInt(values.milestone, 10);
    const candidate = generateMilestoneCandidate(levelNum);
    if (!candidate) {
      console.error(`No milestone template for level ${levelNum}`);
      process.exit(1);
    }
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify([candidate], null, 2));
    console.log(`Generated milestone for level ${levelNum} -> ${OUTPUT_FILE}`);
    return;
  }

  const tierNames = values.tier === 'all' ? Object.keys(TIERS) : [values.tier];
  const candidates = [];
  const maxRetries = 20;

  for (const tierName of tierNames) {
    const tier = TIERS[tierName];
    if (!tier) {
      console.error(`Unknown tier: ${tierName}`);
      process.exit(1);
    }

    const tierCount = values.tier === 'all'
      ? Math.round(count * (tier.levelRange[1] - tier.levelRange[0] + 1) / 40)
      : count;

    let generated = 0;
    let retries = 0;
    while (generated < tierCount) {
      const candidate = generateCandidate(tier);
      if (candidate) {
        candidates.push(candidate);
        generated++;
        retries = 0;
        process.stdout.write(`\r${tierName}: ${generated}/${tierCount}`);
      } else {
        retries++;
        if (retries > maxRetries) {
          console.warn(`\nCould only generate ${generated}/${tierCount} for ${tierName} (solvability failures)`);
          break;
        }
      }
    }
    console.log();
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(candidates, null, 2));
  console.log(`\nGenerated ${candidates.length} candidates -> ${OUTPUT_FILE}`);
}

main();
```

- [ ] **Step 2: Add npm scripts to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"generate": "node tools/generator/index.js",
"preview-levels": "serve ."
```

- [ ] **Step 3: Test the CLI end-to-end**

Run: `npm run generate -- --tier easy --count 3`
Expected: Output shows `easy: 3/3` and creates `output/candidates.json` with 3 entries.

Run: `npm run generate -- --milestone 11`
Expected: Output shows `Generated milestone for level 11` and `output/candidates.json` contains 1 Heart entry.

- [ ] **Step 4: Commit**

```bash
git add tools/generator/index.js package.json
git commit -m "feat: add level generator CLI with npm run generate"
```

---

### Task 7: Preview Tool — HTML Shell & Canvas Renderer

**Files:**
- Create: `tools/preview/index.html`
- Create: `tools/preview/preview.js`

- [ ] **Step 1: Create the HTML shell**

```html
<!-- tools/preview/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel Power — Level Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0d1d37; color: #e0e8f0; display: flex; height: 100vh; }

    #sidebar { width: 300px; background: #16213e; border-right: 1px solid rgba(255,255,255,0.1); overflow-y: auto; padding: 16px; flex-shrink: 0; }
    #sidebar h2 { font-size: 14px; margin-bottom: 12px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .filter-btn { padding: 4px 10px; border-radius: 12px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; }
    .filter-btn.active { outline: 2px solid white; }
    .filter-easy { background: #22c55e; color: #000; }
    .filter-medium { background: #eab308; color: #000; }
    .filter-hard { background: #f97316; color: #000; }
    .filter-expert { background: #ef4444; color: #fff; }
    .filter-all { background: #6366f1; color: #fff; }

    .level-card { padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 6px; cursor: pointer; background: rgba(255,255,255,0.03); }
    .level-card:hover { background: rgba(255,255,255,0.08); }
    .level-card.selected { border-color: #3b82f6; background: rgba(59,130,246,0.15); }
    .level-card.accepted { border-color: #22c55e; background: rgba(34,197,94,0.1); }
    .level-card.rejected { opacity: 0.35; text-decoration: line-through; }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-name { font-size: 13px; font-weight: 600; }
    .card-meta { font-size: 11px; opacity: 0.5; margin-top: 2px; }

    #main { flex: 1; padding: 32px; display: flex; flex-direction: column; overflow-y: auto; }
    #empty-state { display: flex; align-items: center; justify-content: center; flex: 1; opacity: 0.4; font-size: 16px; }

    #detail { display: none; flex-direction: column; gap: 20px; flex: 1; }
    .detail-header h2 { font-size: 20px; margin-bottom: 4px; }
    .detail-header p { font-size: 13px; opacity: 0.6; }
    .detail-body { display: flex; gap: 32px; align-items: flex-start; }
    #board-canvas { border-radius: 8px; background: rgba(0,0,0,0.3); }
    .info-panel { font-size: 13px; line-height: 2; }
    .bench-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
    .bench-chip { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }

    .actions { display: flex; gap: 12px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto; }
    .btn { padding: 10px 28px; border-radius: 8px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; }
    .btn-accept { background: #22c55e; color: #000; }
    .btn-reject { background: #ef4444; color: #fff; }
    .btn-export { background: rgba(255,255,255,0.1); color: #fff; margin-left: auto; }
    .btn:hover { filter: brightness(1.15); }
  </style>
</head>
<body>
  <div id="sidebar">
    <h2>Candidates (<span id="total-count">0</span>)</h2>
    <div class="filters" id="filters"></div>
    <div id="card-list"></div>
  </div>
  <div id="main">
    <div id="empty-state">Load candidates.json to begin</div>
    <div id="detail">
      <div class="detail-header">
        <h2 id="detail-name"></h2>
        <p id="detail-desc"></p>
      </div>
      <div class="detail-body">
        <canvas id="board-canvas" width="300" height="300"></canvas>
        <div class="info-panel" id="info-panel"></div>
      </div>
      <div class="actions">
        <button class="btn btn-accept" id="btn-accept">Accept</button>
        <button class="btn btn-reject" id="btn-reject">Reject</button>
        <button class="btn btn-export" id="btn-export">Export Accepted (0)</button>
      </div>
    </div>
  </div>
  <script type="module" src="preview.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the canvas renderer and interaction logic**

```js
// tools/preview/preview.js
import { formatExport } from './export.js';

const COLOR_MAP = {
  red: '#ff6e7a',
  yellow: '#ffd74f',
  green: '#6be49a',
  blue: '#77c2ff',
};

const TIER_CLASSES = {
  easy: 'filter-easy',
  medium: 'filter-medium',
  hard: 'filter-hard',
  expert: 'filter-expert',
};

let candidates = [];
let decisions = loadDecisions();
let selectedIndex = -1;
let activeFilter = 'all';

function loadDecisions() {
  try {
    return JSON.parse(localStorage.getItem('pp-preview-decisions') || '{}');
  } catch { return {}; }
}

function saveDecisions() {
  localStorage.setItem('pp-preview-decisions', JSON.stringify(decisions));
}

function getDecision(id) {
  return decisions[id] || 'pending';
}

function setDecision(id, status) {
  decisions[id] = status;
  saveDecisions();
}

async function loadCandidates() {
  try {
    const res = await fetch('../../output/candidates.json');
    if (!res.ok) throw new Error('Not found');
    candidates = await res.json();
  } catch {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const text = await e.target.files[0].text();
      candidates = JSON.parse(text);
      render();
    };
    const emptyState = document.getElementById('empty-state');
    emptyState.textContent = '';
    const msg = document.createElement('div');
    msg.style.textAlign = 'center';
    const p1 = document.createElement('p');
    p1.textContent = 'Could not load output/candidates.json';
    const p2 = document.createElement('p');
    p2.textContent = 'Drop a JSON file or click to browse:';
    p2.style.marginTop = '8px';
    msg.appendChild(p1);
    msg.appendChild(p2);
    msg.appendChild(input);
    emptyState.appendChild(msg);
    return;
  }
  render();
}

function render() {
  renderFilters();
  renderCards();
  updateExportCount();
  if (candidates.length > 0 && selectedIndex === -1) {
    selectCandidate(0);
  }
}

function renderFilters() {
  const container = document.getElementById('filters');
  container.textContent = '';
  const tiers = ['all', ...new Set(candidates.map(c => c.meta.tier))];
  for (const tier of tiers) {
    const btn = document.createElement('button');
    const tierClass = tier === 'all' ? 'filter-all' : TIER_CLASSES[tier];
    btn.className = `filter-btn ${tierClass} ${tier === activeFilter ? 'active' : ''}`;
    const count = tier === 'all' ? candidates.length : candidates.filter(c => c.meta.tier === tier).length;
    btn.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} (${count})`;
    btn.onclick = () => { activeFilter = tier; renderCards(); };
    container.appendChild(btn);
  }
}

function getFilteredCandidates() {
  return activeFilter === 'all' ? candidates : candidates.filter(c => c.meta.tier === activeFilter);
}

function renderCards() {
  const container = document.getElementById('card-list');
  container.textContent = '';
  const filtered = getFilteredCandidates();
  document.getElementById('total-count').textContent = String(filtered.length);

  for (const c of filtered) {
    const globalIdx = candidates.indexOf(c);
    const status = getDecision(c.id);
    const card = document.createElement('div');
    card.className = `level-card ${globalIdx === selectedIndex ? 'selected' : ''} ${status}`;

    const header = document.createElement('div');
    header.className = 'card-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'card-name';
    nameSpan.textContent = c.name;
    const tierSpan = document.createElement('span');
    tierSpan.className = `card-tier ${TIER_CLASSES[c.meta.tier]}`;
    tierSpan.textContent = c.meta.tier;
    header.appendChild(nameSpan);
    header.appendChild(tierSpan);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = `${c.meta.gridSize} \u00b7 ${c.meta.colorCount} colors \u00b7 score ${c.meta.difficulty}`;

    card.appendChild(header);
    card.appendChild(meta);

    if (status !== 'pending') {
      const statusDiv = document.createElement('div');
      statusDiv.style.fontSize = '10px';
      statusDiv.style.marginTop = '4px';
      statusDiv.style.fontWeight = '600';
      statusDiv.style.color = status === 'accepted' ? '#22c55e' : '#ef4444';
      statusDiv.textContent = status.toUpperCase();
      card.appendChild(statusDiv);
    }

    card.onclick = () => selectCandidate(globalIdx);
    container.appendChild(card);
  }
}

function selectCandidate(globalIdx) {
  selectedIndex = globalIdx;
  const c = candidates[globalIdx];
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('detail').style.display = 'flex';
  document.getElementById('detail-name').textContent = c.name;
  document.getElementById('detail-desc').textContent = c.description;
  renderBoard(c.layout);
  renderInfo(c);
  renderCards();
}

function renderBoard(layout) {
  const canvas = document.getElementById('board-canvas');
  const ctx = canvas.getContext('2d');
  const rows = layout.length;
  const cols = layout[0].length;
  const cellSize = Math.min(300 / cols, 300 / rows);
  canvas.width = cols * cellSize + 4;
  canvas.height = rows * cellSize + 4;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = layout[r][c];
      if (color === null) continue;
      ctx.fillStyle = COLOR_MAP[color] || '#888';
      ctx.beginPath();
      ctx.roundRect(c * cellSize + 2, r * cellSize + 2, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
    }
  }
}

function renderInfo(candidate) {
  const panel = document.getElementById('info-panel');
  panel.textContent = '';
  const m = candidate.meta;

  const fields = [
    ['Grid', m.gridSize],
    ['Colors', String(m.colorCount)],
    ['Total cubes', String(m.totalCubes)],
    ['Tier', m.tier],
    ['Difficulty', `${m.difficulty} / 10`],
    ['Pattern', m.pattern],
    ['Ammo budget', `${m.totalAmmo} (${(m.totalAmmo / m.totalCubes).toFixed(2)}x)`],
  ];

  for (const [label, value] of fields) {
    const div = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    div.appendChild(strong);
    div.appendChild(document.createTextNode(value));
    panel.appendChild(div);
  }

  const benchLabel = document.createElement('div');
  benchLabel.style.marginTop = '12px';
  const benchStrong = document.createElement('strong');
  benchStrong.textContent = 'Bench:';
  benchLabel.appendChild(benchStrong);
  panel.appendChild(benchLabel);

  const chips = document.createElement('div');
  chips.className = 'bench-chips';
  for (const p of candidate.bench) {
    const chip = document.createElement('span');
    chip.className = 'bench-chip';
    chip.style.background = COLOR_MAP[p.color];
    chip.style.color = '#000';
    chip.textContent = `${p.color} x${p.ammo}`;
    chips.appendChild(chip);
  }
  panel.appendChild(chips);
}

function updateExportCount() {
  const count = candidates.filter(c => getDecision(c.id) === 'accepted').length;
  document.getElementById('btn-export').textContent = `Export Accepted (${count})`;
}

document.getElementById('btn-accept').onclick = () => {
  if (selectedIndex < 0) return;
  setDecision(candidates[selectedIndex].id, 'accepted');
  renderCards();
  updateExportCount();
};

document.getElementById('btn-reject').onclick = () => {
  if (selectedIndex < 0) return;
  setDecision(candidates[selectedIndex].id, 'rejected');
  renderCards();
  updateExportCount();
};

document.getElementById('btn-export').onclick = () => {
  const accepted = candidates.filter(c => getDecision(c.id) === 'accepted');
  if (accepted.length === 0) { alert('No accepted levels to export.'); return; }
  const js = formatExport(accepted);
  const blob = new Blob([js], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'generated-levels.js';
  a.click();
  URL.revokeObjectURL(url);
};

loadCandidates();
```

- [ ] **Step 3: Verify preview loads (manual)**

Run: `npm run preview`
Expected: Opens a local server. Navigate to the preview tool page. It should show the empty state or load candidates if they exist.

- [ ] **Step 4: Commit**

```bash
git add tools/preview/index.html tools/preview/preview.js
git commit -m "feat: add preview tool HTML shell and canvas renderer"
```

---

### Task 8: Preview Tool — Export Module

**Files:**
- Create: `tools/preview/export.js`

- [ ] **Step 1: Write the export module**

```js
// tools/preview/export.js

/**
 * Format accepted candidates as a JS code string
 * matching the existing levels.js schema.
 */
export function formatExport(accepted) {
  const entries = accepted.map(c => {
    const layoutStr = c.layout
      .map(row => '      [' + row.map(cell => cell === null ? 'null' : "'" + cell + "'").join(', ') + ']')
      .join(',\n');
    const benchStr = c.bench
      .map(p => "      { color: '" + p.color + "', ammo: " + p.ammo + ' }')
      .join(',\n');
    return '  {\n' +
      "    id: '" + c.id.replace(/'/g, "\\'") + "',\n" +
      "    name: '" + c.name.replace(/'/g, "\\'") + "',\n" +
      "    description: '" + c.description.replace(/'/g, "\\'") + "',\n" +
      '    layout: [\n' + layoutStr + ',\n    ],\n' +
      '    bench: [\n' + benchStr + ',\n    ],\n' +
      '  }';
  });

  return '// Generated levels — paste into src/data/levels.js LEVELS array\n' +
    '// Generated on ' + new Date().toISOString().slice(0, 10) + '\n\n' +
    entries.join(',\n') + '\n';
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/preview/export.js
git commit -m "feat: add export module for preview tool"
```

---

### Task 9: Blue Color Support in Game

**Files:**
- Modify: `src/scenes/BootScene.js:9-36`
- Modify: `src/scenes/GameScene.js:11-42`

- [ ] **Step 1: Add blue pig preload entries in BootScene**

In `src/scenes/BootScene.js`, add after line 24 (after the green pig preloads):

```js
    this.load.image('pig-blue', '/assets/premium/pig-blue.png');
    this.load.image('pig-blue-back', '/assets/premium/pig-blue-back-premium.png');
    this.load.image('pig-blue-left', '/assets/premium/pig-blue-left-premium.png');
    this.load.image('pig-blue-right', '/assets/premium/pig-blue-right-premium.png');
```

- [ ] **Step 2: Add blue pig procedural fallback in BootScene**

In `src/scenes/BootScene.js`, add after the green pig fallback (after line 69):

```js
    if (!this.textures.exists('pig-blue')) {
      this.createPigTexture(graphics, 'pig-blue', 0x77c2ff, 0xcff0ff);
    }
```

- [ ] **Step 3: Add blue entry to COLOR_THEMES in GameScene**

In `src/scenes/GameScene.js`, add after the `green` entry in `COLOR_THEMES` (after line 41, before the closing `};`):

```js
  blue: {
    label: 'Sky',
    cubeTexture: 'cube-blue-top',
    pigTexture: 'pig-blue',
    pigTextureBack: 'pig-blue-back',
    pigTextureLeft: 'pig-blue-left',
    pigTextureRight: 'pig-blue-right',
    accent: 0x77c2ff,
    shadow: 0x163d73,
  },
```

- [ ] **Step 4: Verify the game builds**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.js src/scenes/GameScene.js
git commit -m "feat: add blue color support for expert-tier levels"
```

---

### Task 10: Generate, Curate, and Integrate 50 Levels

**Files:**
- Modify: `src/data/levels.js`

This task involves running the generator, curating in the preview tool, and integrating results. It is a manual workflow task.

- [ ] **Step 1: Generate milestone candidates**

```bash
npm run generate -- --milestone 11
npm run generate -- --milestone 21
npm run generate -- --milestone 31
npm run generate -- --milestone 41
npm run generate -- --milestone 50
```

Save each milestone output separately for later integration.

- [ ] **Step 2: Generate abstract candidates for each tier**

```bash
npm run generate -- --tier easy --count 15
```

Open preview tool (`npm run preview`), accept 9 best candidates for levels 12-20.

```bash
npm run generate -- --tier medium --count 15
```

Accept 9 for levels 22-30.

```bash
npm run generate -- --tier hard --count 20
```

Accept 9 for levels 32-40.

```bash
npm run generate -- --tier expert --count 15
```

Accept 8 for levels 42-49.

- [ ] **Step 3: Export accepted levels from preview tool**

Click "Export Accepted" in the preview tool. Save the downloaded `generated-levels.js`.

- [ ] **Step 4: Integrate into levels.js**

Append the 5 milestone levels and 35 curated abstract levels to `src/data/levels.js` after the existing 10 entries, in campaign order:
- Levels 1-10: existing (no change)
- Level 11: Heart milestone
- Levels 12-20: 9 Easy curated
- Level 21: Chick milestone
- Levels 22-30: 9 Medium curated
- Level 31: Tree milestone
- Levels 32-40: 9 Hard curated
- Level 41: Robot milestone
- Levels 42-49: 8 Expert curated
- Level 50: Crown milestone

- [ ] **Step 5: Verify the game builds and menu shows 50 levels**

Run: `npm run build`
Expected: Build succeeds. Running `npm run dev`, the menu should show 50 levels across ~9 pages.

- [ ] **Step 6: Commit**

```bash
git add src/data/levels.js
git commit -m "feat: expand campaign to 50 levels with generated and milestone boards"
```

---

### Task 11: Milestone Badge in Menu

**Files:**
- Modify: `src/data/levels.js` (add `milestone: true` flag)
- Modify: `src/scenes/MenuScene.js`

- [ ] **Step 1: Add milestone flag to milestone level entries**

For each of the 5 milestone levels in `src/data/levels.js`, add `milestone: true` to the level object. Example:

```js
  {
    id: 'heart-milestone',
    name: 'Heart',
    description: 'A pixel heart to welcome you to the generated campaign.',
    milestone: true,
    layout: [ /* ... */ ],
    bench: [ /* ... */ ],
  },
```

- [ ] **Step 2: Find the card rendering method in MenuScene**

Search `src/scenes/MenuScene.js` for the method that creates level cards (likely `createLevelBrowser` or similar). Identify where each card's name text is created.

- [ ] **Step 3: Add milestone star indicator**

After the card name text is rendered, add a conditional star. Example (adjust coordinates based on actual card layout found in step 2):

```js
    if (level.milestone) {
      this.add.text(cardX + CARD_WIDTH - 30, cardY + 10, '\u2605', {
        fontSize: '20px',
        color: '#ffd74f',
      }).setOrigin(0.5).setDepth(15);
    }
```

- [ ] **Step 4: Verify the build and check milestone cards**

Run: `npm run build`
Expected: Build succeeds. Milestone level cards show a gold star indicator.

- [ ] **Step 5: Commit**

```bash
git add src/data/levels.js src/scenes/MenuScene.js
git commit -m "feat: add gold star badge to milestone level cards"
```

---

### Task 12: Gitignore and Final Verification

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Append to `.gitignore`:

```
.superpowers/
```

- [ ] **Step 2: Run all generator tests**

Run: `node --test tools/generator/difficulty.test.js tools/generator/board.test.js tools/generator/solver.test.js tools/generator/bench.test.js tools/generator/pixelart.test.js`
Expected: All tests PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to .gitignore"
```

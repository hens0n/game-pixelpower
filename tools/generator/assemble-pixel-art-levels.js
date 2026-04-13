import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isSolvable } from './solver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBJECTS_PATH = join(__dirname, 'pixel-art-subjects.json');
const DEFAULT_OUTPUT = join(__dirname, '../../src/data/pixel-art-levels.js');

const MAX_AMMO_PER_PIG = 8;
const MAX_AMMO_BUMPS = 3;

function ammoMultiplier(levelNum) {
  return 1.0 - ((levelNum - 51) / 49) * 0.15;
}

function buildBench(layout, levelNum) {
  const colorCounts = {};
  for (const row of layout) {
    for (const cell of row) {
      if (cell !== null) {
        colorCounts[cell] = (colorCounts[cell] || 0) + 1;
      }
    }
  }

  const multiplier = ammoMultiplier(levelNum);
  const bench = [];

  for (const [color, count] of Object.entries(colorCounts)) {
    const totalAmmo = Math.ceil(count * multiplier);
    const pigCount = Math.ceil(totalAmmo / MAX_AMMO_PER_PIG);
    const baseAmmo = Math.floor(totalAmmo / pigCount);
    let remainder = totalAmmo - baseAmmo * pigCount;

    for (let i = 0; i < pigCount; i++) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder--;
      bench.push({ color, ammo: baseAmmo + extra });
    }
  }

  return bench;
}

function bumpAmmo(bench, layout) {
  const colorCounts = {};
  for (const row of layout) {
    for (const cell of row) {
      if (cell !== null) colorCounts[cell] = (colorCounts[cell] || 0) + 1;
    }
  }

  const colorAmmo = {};
  for (const pig of bench) {
    colorAmmo[pig.color] = (colorAmmo[pig.color] || 0) + pig.ammo;
  }

  let tightest = null;
  let lowestRatio = Infinity;
  for (const [color, count] of Object.entries(colorCounts)) {
    const ratio = (colorAmmo[color] || 0) / count;
    if (ratio < lowestRatio) {
      lowestRatio = ratio;
      tightest = color;
    }
  }

  if (tightest) {
    const pig = bench.find(p => p.color === tightest);
    if (pig) pig.ammo += 1;
  }

  return bench;
}

function levelId(subject) {
  return subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

// Load all batch files
const batches = ['batch-51-60.json', 'batch-61-70.json', 'batch-71-80.json', 'batch-81-90.json', 'batch-91-100.json'];
const allLayouts = {};
for (const file of batches) {
  const data = JSON.parse(readFileSync(join(__dirname, file), 'utf-8'));
  Object.assign(allLayouts, data);
}

const subjects = JSON.parse(readFileSync(SUBJECTS_PATH, 'utf-8'));
const levels = [];
const failed = [];
const unsolvable = [];

for (let num = 51; num <= 100; num++) {
  const key = String(num);
  const subject = subjects[key];
  const layout = allLayouts[key];

  if (!subject || !layout) {
    console.error(`Missing data for level ${num}`);
    failed.push(num);
    continue;
  }

  // Validate dimensions
  const [expectedRows, expectedCols] = subject.grid;
  if (layout.length !== expectedRows) {
    console.error(`Level ${num}: expected ${expectedRows} rows, got ${layout.length}`);
    failed.push(num);
    continue;
  }
  let dimOk = true;
  for (let r = 0; r < layout.length; r++) {
    if (layout[r].length !== expectedCols) {
      console.error(`Level ${num} row ${r}: expected ${expectedCols} cols, got ${layout[r].length}`);
      dimOk = false;
    }
  }
  if (!dimOk) { failed.push(num); continue; }

  // Build bench and check solvability
  let bench = buildBench(layout, num);
  let solved = false;

  for (let bump = 0; bump <= MAX_AMMO_BUMPS; bump++) {
    if (isSolvable(layout, bench)) {
      solved = true;
      console.log(`Level ${num} (${subject.subject}): solvable (bumps: ${bump})`);
      break;
    }
    if (bump < MAX_AMMO_BUMPS) {
      bench = bumpAmmo(bench, layout);
    }
  }

  if (!solved) {
    // Last resort: give exact ammo (multiplier = 1.0)
    bench = buildBench(layout, 51); // 1.0x multiplier
    if (isSolvable(layout, bench)) {
      console.log(`Level ${num} (${subject.subject}): solvable with 1.0x ammo fallback`);
      solved = true;
    }
  }

  if (!solved) {
    console.error(`Level ${num} (${subject.subject}): UNSOLVABLE`);
    unsolvable.push(num);
  }

  levels.push({
    id: levelId(subject),
    name: subject.subject,
    description: 'Clear the board to reveal the pixel art!',
    layout,
    bench,
  });
}

// Write output
const js = `// Auto-generated pixel art levels 51-100\n// Generated on ${new Date().toISOString()}\n\nexport const pixelArtLevels = ${JSON.stringify(levels, null, 2)};\n`;
writeFileSync(DEFAULT_OUTPUT, js, 'utf-8');

console.log(`\nWrote ${levels.length} levels to ${DEFAULT_OUTPUT}`);
if (failed.length > 0) console.error(`Failed levels: ${failed.join(', ')}`);
if (unsolvable.length > 0) console.error(`Unsolvable levels (included with best-effort ammo): ${unsolvable.join(', ')}`);

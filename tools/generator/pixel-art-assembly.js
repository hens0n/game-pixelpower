import { isSolvable } from './solver.js';

const MAX_AMMO_PER_PIG = 8;
const MAX_AMMO_BUMPS = 3;

function ammoMultiplier(levelNum) {
  return 1.0 - ((levelNum - 51) / 49) * 0.15;
}

export function buildBench(layout, levelNum) {
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
  return subject.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function assertRectangular(layout, subject) {
  if (!Array.isArray(layout) || layout.length === 0) {
    throw new Error(`${subject.subject}: layout is empty`);
  }
  const [expectedRows, expectedCols] = subject.grid;
  if (layout.length !== expectedRows) {
    throw new Error(
      `${subject.subject}: dimension mismatch — expected ${expectedRows} rows, got ${layout.length}`,
    );
  }
  layout.forEach((row, r) => {
    if (!Array.isArray(row) || row.length !== expectedCols) {
      throw new Error(
        `${subject.subject}: row ${r} has ${row?.length} cols, expected ${expectedCols} (layout is not rectangular)`,
      );
    }
  });
}

export function buildPixelArtLevel(subject, layout, levelNum) {
  assertRectangular(layout, subject);

  let bench = buildBench(layout, levelNum);
  let solved = false;
  let bumps = 0;

  for (let bump = 0; bump <= MAX_AMMO_BUMPS; bump++) {
    if (isSolvable(layout, bench)) {
      solved = true;
      bumps = bump;
      break;
    }
    if (bump < MAX_AMMO_BUMPS) {
      bench = bumpAmmo(bench, layout);
    }
  }

  if (!solved) {
    const fallbackBench = buildBench(layout, 51);
    if (isSolvable(layout, fallbackBench)) {
      bench = fallbackBench;
      solved = true;
      bumps = MAX_AMMO_BUMPS + 1;
    }
  }

  const level = {
    id: levelId(subject),
    name: subject.subject,
    description: 'Clear the board to reveal the pixel art!',
    layout,
    bench,
  };

  return { level, solved, bumps };
}

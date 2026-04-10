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

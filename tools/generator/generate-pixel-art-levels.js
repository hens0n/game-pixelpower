import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildPrompt } from './pixel-art-prompt.js';
import { isSolvable } from './solver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBJECTS_PATH = join(__dirname, 'pixel-art-subjects.json');
const DEFAULT_OUTPUT = join(__dirname, '../../src/data/pixel-art-levels.js');

const MAX_AMMO_PER_PIG = 8;
const MAX_RETRIES = 5;
const MAX_AMMO_BUMPS = 3;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { level: null, preview: false, out: DEFAULT_OUTPUT };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--level' && args[i + 1]) opts.level = parseInt(args[i + 1], 10);
    if (args[i] === '--preview') opts.preview = true;
    if (args[i] === '--out' && args[i + 1]) opts.out = args[i + 1];
  }
  return opts;
}

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

async function generateLayout(client, subject) {
  const prompt = buildPrompt(subject);
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const layout = JSON.parse(text);

  const [rows, cols] = subject.grid;
  if (layout.length !== rows) {
    throw new Error(`Expected ${rows} rows, got ${layout.length}`);
  }
  for (let r = 0; r < rows; r++) {
    if (layout[r].length !== cols) {
      throw new Error(`Row ${r}: expected ${cols} cols, got ${layout[r].length}`);
    }
  }

  for (const row of layout) {
    for (const cell of row) {
      if (cell !== null && !subject.colors.includes(cell)) {
        throw new Error(`Invalid color "${cell}" — allowed: ${subject.colors.join(', ')}`);
      }
    }
  }

  return layout;
}

function previewLayout(layout, subject) {
  const colorMap = {};
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  subject.colors.forEach((c, i) => { colorMap[c] = chars[i]; });

  console.log(`\n  ${subject.subject} (${subject.grid[0]}x${subject.grid[1]}):`);
  console.log('  Legend: ' + subject.colors.map((c, i) => `${chars[i]}=${c}`).join(' ') + ' .=empty');
  console.log();
  for (const row of layout) {
    const line = row.map(cell => cell === null ? '.' : (colorMap[cell] || '?')).join(' ');
    console.log('  ' + line);
  }
  console.log();
}

function levelId(subject) {
  return subject.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

function levelName(subject) {
  return subject.subject;
}

async function generateLevel(client, levelNum, subject, preview) {
  console.log(`Level ${levelNum}: ${subject.subject} (${subject.grid.join('x')})...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let layout;
    try {
      layout = await generateLayout(client, subject);
    } catch (err) {
      console.log(`  Attempt ${attempt}: generation failed — ${err.message}`);
      continue;
    }

    if (preview) previewLayout(layout, subject);

    let bench = buildBench(layout, levelNum);

    for (let bump = 0; bump <= MAX_AMMO_BUMPS; bump++) {
      if (isSolvable(layout, bench)) {
        console.log(`  Solvable (attempt ${attempt}, bumps ${bump})`);
        return {
          id: levelId(subject),
          name: levelName(subject),
          description: `Clear the board to reveal the pixel art!`,
          layout,
          bench,
        };
      }
      if (bump < MAX_AMMO_BUMPS) {
        bench = bumpAmmo(bench, layout);
      }
    }

    console.log(`  Attempt ${attempt}: unsolvable after ${MAX_AMMO_BUMPS} bumps, retrying art...`);
  }

  console.error(`  FAILED: Level ${levelNum} (${subject.subject}) — could not generate solvable level after ${MAX_RETRIES} attempts`);
  return null;
}

async function main() {
  const opts = parseArgs();
  const subjects = JSON.parse(readFileSync(SUBJECTS_PATH, 'utf-8'));
  const client = new Anthropic();

  const levelNums = opts.level
    ? [opts.level]
    : Object.keys(subjects).map(Number).sort((a, b) => a - b);

  const levels = [];
  const failed = [];

  for (const num of levelNums) {
    const subject = subjects[String(num)];
    if (!subject) {
      console.error(`No subject config for level ${num}`);
      failed.push(num);
      continue;
    }

    const level = await generateLevel(client, num, subject, opts.preview);
    if (level) {
      levels.push(level);
    } else {
      failed.push(num);
    }
  }

  if (levels.length > 0) {
    const js = `// Auto-generated pixel art levels 51-100\n// Generated on ${new Date().toISOString()}\n\nexport const pixelArtLevels = ${JSON.stringify(levels, null, 2)};\n`;
    writeFileSync(opts.out, js, 'utf-8');
    console.log(`\nWrote ${levels.length} levels to ${opts.out}`);
  }

  if (failed.length > 0) {
    console.error(`\nFailed levels (need manual review): ${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

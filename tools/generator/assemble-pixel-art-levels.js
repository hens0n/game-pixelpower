import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { buildPixelArtLevel } from './pixel-art-assembly.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUBJECTS_PATH = join(__dirname, 'pixel-art-subjects.json');
const DEFAULT_OUTPUT = join(__dirname, '../../src/data/pixel-art-levels.js');

const batches = [
  'batch-51-60.json',
  'batch-61-70.json',
  'batch-71-80.json',
  'batch-81-90.json',
  'batch-91-100.json',
];
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
    console.error(`Level ${num}: missing data (subject=${!!subject}, layout=${!!layout})`);
    failed.push(num);
    continue;
  }

  let result;
  try {
    result = buildPixelArtLevel(subject, layout, num);
  } catch (err) {
    console.error(`Level ${num}: ${err.message}`);
    failed.push(num);
    continue;
  }

  if (!result.solved) {
    console.error(`Level ${num} (${subject.subject}): UNSOLVABLE — excluding from output`);
    unsolvable.push(num);
    continue;
  }

  console.log(`Level ${num} (${subject.subject}): solvable (bumps: ${result.bumps})`);
  levels.push(result.level);
}

const js = `// Auto-generated pixel art levels 51-100\n// Generated on ${new Date().toISOString()}\n\nexport const pixelArtLevels = ${JSON.stringify(levels)};\n`;
writeFileSync(DEFAULT_OUTPUT, js, 'utf-8');

console.log(`\nWrote ${levels.length} levels to ${DEFAULT_OUTPUT}`);

const hadFailures = failed.length > 0 || unsolvable.length > 0;
if (failed.length > 0) console.error(`Failed (data/dimension issues): ${failed.join(', ')}`);
if (unsolvable.length > 0) console.error(`Excluded (unsolvable): ${unsolvable.join(', ')}`);

if (hadFailures) {
  process.exit(1);
}

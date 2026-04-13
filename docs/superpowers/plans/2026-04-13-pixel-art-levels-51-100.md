# Pixel Art Levels 51–100 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 50 new pixel art levels (51–100) featuring animals, buildings, and holidays, generated via a Claude API pipeline with solvability validation.

**Architecture:** A Node.js CLI tool calls the Claude API to generate pixel art grids for 50 subjects, then builds bench/ammo using a difficulty curve (1.00x→0.85x), validates solvability with the existing solver, and writes the levels to a JS file that gets appended to the LEVELS array. Two new colors (orange, purple) are added to the game engine.

**Tech Stack:** Node.js, Anthropic SDK (`@anthropic-ai/sdk`), Phaser 3, existing solver.js

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `tools/generator/pixel-art-subjects.json` | 50 subject configs (subject, grid, colors, description) |
| `tools/generator/generate-pixel-art-levels.js` | Main CLI pipeline: orchestrates API calls, bench building, solving, output |
| `tools/generator/pixel-art-prompt.js` | Builds the Claude API prompt for a given subject config |
| `src/data/pixel-art-levels.js` | Generated output: exports array of 50 level objects |

### Modified Files
| File | Change |
|------|--------|
| `src/scenes/BootScene.js` | Add orange/purple pig + cube texture generation |
| `src/scenes/GameScene.js` | Add orange/purple to COLOR_THEMES |
| `src/data/levels.js` | Import and append pixel-art-levels |
| `tools/generator/difficulty.js` | Add orange/purple to COLORS array |
| `package.json` | Add `@anthropic-ai/sdk` dev dependency |

---

### Task 1: Add orange and purple colors to the game engine

**Files:**
- Modify: `src/scenes/GameScene.js:102-112` (add to COLOR_THEMES after tan)
- Modify: `src/scenes/BootScene.js:116-139` (add pig + cube texture generation)
- Modify: `tools/generator/difficulty.js:1` (add to COLORS array)

- [ ] **Step 1: Add orange and purple to COLOR_THEMES in GameScene.js**

Add after the `tan` entry (line 111), before the closing `};`:

```javascript
  orange: {
    label: 'Amber',
    cubeTexture: 'cube-orange-top',
    pigTexture: 'pig-orange',
    pigTextureBack: 'pig-orange-back',
    pigTextureLeft: 'pig-orange-left',
    pigTextureRight: 'pig-orange-right',
    accent: 0xffa54d,
    shadow: 0x7f4a14,
  },
  purple: {
    label: 'Violet',
    cubeTexture: 'cube-purple-top',
    pigTexture: 'pig-purple',
    pigTextureBack: 'pig-purple-back',
    pigTextureLeft: 'pig-purple-left',
    pigTextureRight: 'pig-purple-right',
    accent: 0xa78bfa,
    shadow: 0x4a2d8a,
  },
```

- [ ] **Step 2: Add orange and purple procedural textures in BootScene.js**

Add after the `cube-tan-top` block (after line 139):

```javascript
    if (!this.textures.exists('pig-orange')) {
      this.createPigTexture(graphics, 'pig-orange', 0xffa54d, 0xffd19a);
    }
    if (!this.textures.exists('pig-purple')) {
      this.createPigTexture(graphics, 'pig-purple', 0xa78bfa, 0xd4c5fd);
    }
    if (!this.textures.exists('cube-orange-top')) {
      this.createTopCubeTexture(graphics, 'cube-orange-top', 0xffa54d, 0xffd19a, 0xd47a28, 0x7f4a14);
    }
    if (!this.textures.exists('cube-purple-top')) {
      this.createTopCubeTexture(graphics, 'cube-purple-top', 0xa78bfa, 0xd4c5fd, 0x7b5ec7, 0x4a2d8a);
    }
```

- [ ] **Step 3: Add orange and purple to COLORS in difficulty.js**

Change line 1 from:
```javascript
export const COLORS = ['red', 'yellow', 'green', 'blue', 'brown', 'pink', 'white', 'black', 'gray', 'tan'];
```
To:
```javascript
export const COLORS = ['red', 'yellow', 'green', 'blue', 'brown', 'pink', 'white', 'black', 'gray', 'tan', 'orange', 'purple'];
```

- [ ] **Step 4: Verify the game boots with new colors**

Run: `npm run dev`

Open browser, confirm the game loads without errors. Open dev tools console — no texture errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js src/scenes/BootScene.js tools/generator/difficulty.js
git commit -m "feat: add orange and purple color support"
```

---

### Task 2: Install Anthropic SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the SDK**

```bash
npm install --save-dev @anthropic-ai/sdk
```

- [ ] **Step 2: Verify installation**

```bash
node -e "import('@anthropic-ai/sdk').then(m => console.log('SDK loaded:', typeof m.default))"
```

Expected: `SDK loaded: function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk for level generation"
```

---

### Task 3: Create the subject config file

**Files:**
- Create: `tools/generator/pixel-art-subjects.json`

- [ ] **Step 1: Create pixel-art-subjects.json**

Create `tools/generator/pixel-art-subjects.json` with all 50 subject entries. Each entry is keyed by level number:

```json
{
  "51": {
    "subject": "Fish",
    "category": "animal",
    "grid": [8, 8],
    "colors": ["blue", "orange", "white"],
    "description": "A simple tropical fish facing right with a visible tail fin and eye"
  },
  "52": {
    "subject": "House",
    "category": "building",
    "grid": [8, 8],
    "colors": ["red", "brown", "white", "blue"],
    "description": "A small house with a triangular roof, door, and window"
  },
  "53": {
    "subject": "Cat",
    "category": "animal",
    "grid": [9, 9],
    "colors": ["orange", "white", "black", "green"],
    "description": "A sitting cat facing forward with pointed ears, whiskers, and green eyes"
  },
  "54": {
    "subject": "Heart",
    "category": "holiday",
    "grid": [8, 8],
    "colors": ["red", "pink", "white"],
    "description": "A Valentine's heart shape, filled red with pink highlights and white sparkle"
  },
  "55": {
    "subject": "Frog",
    "category": "animal",
    "grid": [8, 8],
    "colors": ["green", "yellow", "red"],
    "description": "A front-facing frog with big eyes, wide mouth, and yellow belly"
  },
  "56": {
    "subject": "Barn",
    "category": "building",
    "grid": [9, 9],
    "colors": ["red", "white", "brown"],
    "description": "A red barn with white X-pattern doors and brown wooden frame"
  },
  "57": {
    "subject": "Bird",
    "category": "animal",
    "grid": [8, 8],
    "colors": ["red", "brown", "yellow"],
    "description": "A small robin perched on a branch, red breast, brown wings, yellow beak"
  },
  "58": {
    "subject": "Shamrock",
    "category": "holiday",
    "grid": [8, 8],
    "colors": ["green", "yellow"],
    "description": "A four-leaf clover / shamrock for St. Patrick's Day with a yellow outline glow"
  },
  "59": {
    "subject": "Lighthouse",
    "category": "building",
    "grid": [10, 10],
    "colors": ["white", "red", "yellow", "blue"],
    "description": "A tall lighthouse with red and white horizontal stripes, yellow light at top, blue water at base"
  },
  "60": {
    "subject": "Turtle",
    "category": "animal",
    "grid": [10, 10],
    "colors": ["green", "brown", "yellow"],
    "description": "A turtle viewed from above showing hexagonal shell pattern, head poking out"
  },
  "61": {
    "subject": "Easter Egg",
    "category": "holiday",
    "grid": [9, 9],
    "colors": ["purple", "pink", "yellow", "blue", "green"],
    "description": "A decorated Easter egg with colorful horizontal zigzag stripe bands"
  },
  "62": {
    "subject": "Butterfly",
    "category": "animal",
    "grid": [10, 10],
    "colors": ["purple", "orange", "yellow", "black"],
    "description": "A butterfly with symmetrical wings spread open, viewed from above"
  },
  "63": {
    "subject": "Windmill",
    "category": "building",
    "grid": [10, 10],
    "colors": ["brown", "white", "gray"],
    "description": "A Dutch windmill with four blades, stone tower base, and brown wooden structure"
  },
  "64": {
    "subject": "Dog",
    "category": "animal",
    "grid": [9, 9],
    "colors": ["brown", "tan", "black", "white"],
    "description": "A friendly dog sitting and facing forward with floppy ears, tongue out"
  },
  "65": {
    "subject": "Firework",
    "category": "holiday",
    "grid": [10, 10],
    "colors": ["red", "white", "blue", "yellow"],
    "description": "A 4th of July firework burst radiating from center with red, white, and blue sparks"
  },
  "66": {
    "subject": "Church",
    "category": "building",
    "grid": [10, 10],
    "colors": ["white", "gray", "brown", "yellow"],
    "description": "A small church with steeple, cross on top, arched door, and stained glass window"
  },
  "67": {
    "subject": "Fox",
    "category": "animal",
    "grid": [10, 10],
    "colors": ["orange", "white", "black"],
    "description": "A fox sitting with a big bushy tail, white chest and tail tip, black paws and ear tips"
  },
  "68": {
    "subject": "Pumpkin",
    "category": "holiday",
    "grid": [9, 9],
    "colors": ["orange", "green", "black"],
    "description": "A round Halloween pumpkin with green stem and leaf, vertical ridges visible"
  },
  "69": {
    "subject": "Rabbit",
    "category": "animal",
    "grid": [9, 9],
    "colors": ["white", "pink", "gray"],
    "description": "A cute bunny sitting upright with long ears showing pink insides"
  },
  "70": {
    "subject": "Treehouse",
    "category": "building",
    "grid": [10, 10],
    "colors": ["green", "brown", "yellow"],
    "description": "A wooden treehouse built in a large tree with a ladder, leafy canopy above"
  },
  "71": {
    "subject": "Penguin",
    "category": "animal",
    "grid": [10, 10],
    "colors": ["black", "white", "orange", "blue"],
    "description": "A standing penguin with black back, white belly, orange feet and beak, on blue ice"
  },
  "72": {
    "subject": "Ghost",
    "category": "holiday",
    "grid": [9, 9],
    "colors": ["white", "black", "purple"],
    "description": "A cute Halloween ghost floating with wavy bottom edge, round black eyes, purple background accents"
  },
  "73": {
    "subject": "Castle",
    "category": "building",
    "grid": [11, 11],
    "colors": ["gray", "brown", "red", "yellow"],
    "description": "A medieval castle with two towers, crenellations, arched gate, and red flag on top"
  },
  "74": {
    "subject": "Owl",
    "category": "animal",
    "grid": [10, 10],
    "colors": ["brown", "tan", "yellow", "black"],
    "description": "A front-facing owl perched on a branch with big round yellow eyes and spread wing pattern"
  },
  "75": {
    "subject": "Jack-o-Lantern",
    "category": "holiday",
    "grid": [10, 10],
    "colors": ["orange", "yellow", "black", "green"],
    "description": "A carved jack-o-lantern with triangle eyes, jagged mouth glowing yellow, green stem"
  },
  "76": {
    "subject": "Pyramid",
    "category": "building",
    "grid": [11, 11],
    "colors": ["tan", "yellow", "brown"],
    "description": "An Egyptian pyramid with visible stone block lines, yellow sandy desert ground"
  },
  "77": {
    "subject": "Elephant",
    "category": "animal",
    "grid": [11, 11],
    "colors": ["gray", "white", "black"],
    "description": "A side-view elephant with large ears, long trunk curled up, and tusks"
  },
  "78": {
    "subject": "Turkey",
    "category": "holiday",
    "grid": [10, 10],
    "colors": ["brown", "orange", "red", "yellow"],
    "description": "A Thanksgiving turkey with fanned colorful tail feathers, red wattle"
  },
  "79": {
    "subject": "Snake",
    "category": "animal",
    "grid": [9, 10],
    "colors": ["green", "yellow", "red"],
    "description": "A coiled snake with diamond pattern, forked red tongue out, visible head facing right"
  },
  "80": {
    "subject": "Skyscraper",
    "category": "building",
    "grid": [8, 12],
    "colors": ["gray", "blue", "white"],
    "description": "A tall modern skyscraper with blue glass windows in a grid pattern, gray steel frame"
  },
  "81": {
    "subject": "Menorah",
    "category": "holiday",
    "grid": [10, 10],
    "colors": ["yellow", "blue", "white"],
    "description": "A nine-branched Hanukkah menorah with yellow flames on blue candles, white base"
  },
  "82": {
    "subject": "Dolphin",
    "category": "animal",
    "grid": [10, 10],
    "colors": ["blue", "gray", "white"],
    "description": "A dolphin jumping out of water in an arc, gray body with white belly, blue water splash"
  },
  "83": {
    "subject": "Igloo",
    "category": "building",
    "grid": [9, 9],
    "colors": ["white", "blue", "gray"],
    "description": "A dome-shaped igloo with visible ice block pattern, arched entrance, blue sky"
  },
  "84": {
    "subject": "Bee",
    "category": "animal",
    "grid": [9, 9],
    "colors": ["yellow", "black", "white"],
    "description": "A cartoon bee with yellow and black striped body, white wings, and stinger"
  },
  "85": {
    "subject": "Christmas Tree",
    "category": "holiday",
    "grid": [11, 11],
    "colors": ["green", "red", "yellow", "brown"],
    "description": "A decorated Christmas tree with red ornaments, yellow star on top, brown trunk"
  },
  "86": {
    "subject": "Rocket",
    "category": "building",
    "grid": [8, 12],
    "colors": ["white", "red", "blue", "orange"],
    "description": "A rocket ship launching upward with red and blue fins, white body, orange flame exhaust"
  },
  "87": {
    "subject": "Bear",
    "category": "animal",
    "grid": [11, 11],
    "colors": ["brown", "tan", "black"],
    "description": "A front-facing bear with round ears, tan muzzle, and black nose and eyes"
  },
  "88": {
    "subject": "Snowman",
    "category": "holiday",
    "grid": [10, 10],
    "colors": ["white", "black", "orange", "red"],
    "description": "A three-ball snowman with top hat, orange carrot nose, coal eyes, and red scarf"
  },
  "89": {
    "subject": "Horse",
    "category": "animal",
    "grid": [11, 11],
    "colors": ["brown", "black", "white", "tan"],
    "description": "A horse in profile galloping with flowing black mane and tail, white blaze on face"
  },
  "90": {
    "subject": "Train",
    "category": "building",
    "grid": [12, 8],
    "colors": ["red", "black", "gray", "yellow"],
    "description": "A steam locomotive facing right with smokestack, red boiler, black wheels, yellow headlight"
  },
  "91": {
    "subject": "Candy Cane",
    "category": "holiday",
    "grid": [8, 12],
    "colors": ["red", "white"],
    "description": "A classic candy cane with red and white diagonal stripes, curved hook at top"
  },
  "92": {
    "subject": "Flamingo",
    "category": "animal",
    "grid": [11, 11],
    "colors": ["pink", "white", "black", "orange"],
    "description": "A flamingo standing on one leg with curved neck, pink feathers, black wing tips, orange beak"
  },
  "93": {
    "subject": "Ship",
    "category": "building",
    "grid": [12, 10],
    "colors": ["brown", "white", "blue", "red"],
    "description": "A pirate ship with brown hull, white sails with red cross, on blue water"
  },
  "94": {
    "subject": "Wreath",
    "category": "holiday",
    "grid": [11, 11],
    "colors": ["green", "red", "yellow", "brown"],
    "description": "A circular Christmas wreath made of green branches with red berries, yellow bow, brown frame"
  },
  "95": {
    "subject": "Octopus",
    "category": "animal",
    "grid": [11, 11],
    "colors": ["purple", "pink", "blue"],
    "description": "A cute octopus with round head, big eyes, and eight curling tentacles spread out"
  },
  "96": {
    "subject": "Bridge",
    "category": "building",
    "grid": [12, 8],
    "colors": ["gray", "red", "blue"],
    "description": "A suspension bridge spanning across blue water with red towers and gray cables"
  },
  "97": {
    "subject": "Stocking",
    "category": "holiday",
    "grid": [8, 12],
    "colors": ["red", "white", "green"],
    "description": "A Christmas stocking hanging with red body, white cuff and toe, green holly accent"
  },
  "98": {
    "subject": "Tower",
    "category": "building",
    "grid": [8, 12],
    "colors": ["gray", "brown", "purple", "yellow"],
    "description": "A wizard tower with stone base, purple pointed roof, and yellow glowing window"
  },
  "99": {
    "subject": "Dragon",
    "category": "animal",
    "grid": [12, 12],
    "colors": ["green", "red", "orange", "yellow", "black"],
    "description": "A dragon with spread wings, breathing orange-yellow fire, green scaled body, black claws"
  },
  "100": {
    "subject": "Star of David",
    "category": "holiday",
    "grid": [11, 11],
    "colors": ["blue", "white", "yellow"],
    "description": "A Star of David (hexagram) centered, blue outline with white fill, yellow glow accents"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/generator/pixel-art-subjects.json
git commit -m "feat: add 50 pixel art subject configurations"
```

---

### Task 4: Create the Claude API prompt builder

**Files:**
- Create: `tools/generator/pixel-art-prompt.js`

- [ ] **Step 1: Create pixel-art-prompt.js**

```javascript
/**
 * Builds a Claude API prompt for generating pixel art grids.
 * @param {object} subject - Entry from pixel-art-subjects.json
 * @returns {string} The prompt text
 */
export function buildPrompt(subject) {
  const [rows, cols] = subject.grid;
  const colors = subject.colors.map(c => `"${c}"`).join(', ');

  return `You are a pixel art designer. Generate a ${cols}x${rows} pixel art grid of: ${subject.description}

RULES:
- Output ONLY a JSON 2D array (no markdown, no explanation, no code fences)
- The array must have exactly ${rows} rows and ${cols} columns
- Each cell must be one of these color strings: ${colors}, or null for empty/background
- Use null for negative space around the subject (the background)
- The subject should be recognizable and fill most of the grid
- Use all the listed colors in the design
- Ensure the design has a clear silhouette — it should be obvious what the subject is
- Favor solid filled areas over single scattered pixels

OUTPUT FORMAT EXAMPLE (for a 3x3 grid):
[["red",null,"red"],[null,"blue",null],["red",null,"red"]]`;
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/generator/pixel-art-prompt.js
git commit -m "feat: add Claude API prompt builder for pixel art generation"
```

---

### Task 5: Create the main generator pipeline

**Files:**
- Create: `tools/generator/generate-pixel-art-levels.js`

- [ ] **Step 1: Create generate-pixel-art-levels.js**

```javascript
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
```

- [ ] **Step 2: Test with a single level**

```bash
ANTHROPIC_API_KEY=sk-... node tools/generator/generate-pixel-art-levels.js --level 51 --preview
```

Expected: ASCII preview of a fish grid, "Solvable" message, file written.

- [ ] **Step 3: Commit**

```bash
git add tools/generator/generate-pixel-art-levels.js
git commit -m "feat: add pixel art level generation pipeline"
```

---

### Task 6: Wire generated levels into the game

**Files:**
- Modify: `src/data/levels.js`

- [ ] **Step 1: Import and append pixel art levels in levels.js**

Add at the top of `src/data/levels.js`:

```javascript
import { pixelArtLevels } from './pixel-art-levels.js';
```

Add at the bottom of `src/data/levels.js` (after the closing `];` of the LEVELS array):

```javascript
LEVELS.push(...pixelArtLevels);
```

Note: Change `export const LEVELS` to `export const LEVELS` stays the same since we're using `push` to mutate. However, since `const` prevents reassignment but not mutation, this works fine.

- [ ] **Step 2: Create a placeholder pixel-art-levels.js for dev**

Create `src/data/pixel-art-levels.js` with an empty array so the game doesn't break before generation:

```javascript
// Auto-generated pixel art levels 51-100
// Run: ANTHROPIC_API_KEY=... node tools/generator/generate-pixel-art-levels.js

export const pixelArtLevels = [];
```

- [ ] **Step 3: Verify game still loads**

```bash
npm run dev
```

Open browser — game should load with the original 10 levels, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/levels.js src/data/pixel-art-levels.js
git commit -m "feat: wire pixel art levels into game level list"
```

---

### Task 7: Generate all 50 levels

**Files:**
- Modify: `src/data/pixel-art-levels.js` (overwritten by generator)

- [ ] **Step 1: Run the full generator**

```bash
ANTHROPIC_API_KEY=sk-... node tools/generator/generate-pixel-art-levels.js --preview
```

This will take several minutes (50 API calls). Watch for:
- Each level printing "Solvable"
- Any "FAILED" messages for manual review

- [ ] **Step 2: Verify output**

```bash
node -e "import('./src/data/pixel-art-levels.js').then(m => console.log(m.pixelArtLevels.length + ' levels'))"
```

Expected: `50 levels`

- [ ] **Step 3: Test in game**

```bash
npm run dev
```

Open browser. Navigate to the level select screen. Verify:
- 60 total levels appear (10 original + 50 new)
- Level 51 (Fish) loads and is playable
- Orange and purple colors render correctly on levels that use them
- Grid sizes scale properly for larger boards (11×11, 12×12)

- [ ] **Step 4: Commit**

```bash
git add src/data/pixel-art-levels.js
git commit -m "feat: generate 50 pixel art levels (51-100)"
```

---

### Task 8: End-to-end playtest and fix

**Files:**
- May modify: any file with bugs

- [ ] **Step 1: Play through at least 5 levels spanning the range**

Test these levels in the browser:
- Level 51 (Fish, 8×8, simple)
- Level 62 (Butterfly, 10×10, with purple and orange)
- Level 73 (Castle, 11×11, with gray)
- Level 91 (Candy Cane, 8×12, non-square grid)
- Level 99 (Dragon, 12×12, 5 colors, largest grid)

For each, verify:
- Art is recognizable
- All colors render with correct textures
- Board fits on screen without overflow
- Level is beatable (solvable)
- Win state triggers correctly
- Level 100 shows proper completion when beaten

- [ ] **Step 2: Fix any issues found**

Address bugs as they come up. Common issues to watch for:
- Non-square grids causing rendering issues
- Missing color fallbacks
- Bench overflow with many pigs
- Cell sizes too small on large grids

- [ ] **Step 3: Commit fixes**

```bash
git add -u
git commit -m "fix: address playtest issues in pixel art levels"
```

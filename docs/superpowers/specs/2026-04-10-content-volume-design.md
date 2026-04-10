# Content Volume Expansion: 50-Level Campaign

**Date:** 2026-04-10
**Status:** Approved
**Goal:** Scale Pixel Power from 10 handcrafted levels to a 50-level campaign using a hybrid approach: procedural level generator + browser-based curation tool + handcrafted pixel-art milestone levels.

## System Architecture

Three dev-only components produce campaign data that ships with the game:

1. **Level Generator** (`tools/generator/`) — Node.js CLI that produces candidate puzzle boards
2. **Preview Tool** (`tools/preview/`) — static HTML/Canvas page for browsing, evaluating, and accepting/rejecting candidates
3. **Pixel-Art Templates** (`tools/generator/pixelart.js`) — handcrafted picture boards for milestone levels

Pipeline: `npm run generate` → `output/candidates.json` → preview tool → accepted levels appended to `src/data/levels.js`.

### New Files

```
tools/
  generator/
    index.js          — CLI entry point (npm run generate)
    board.js          — board generation + color placement
    solver.js         — solvability checker + difficulty scorer
    difficulty.js     — tier definitions + parameter ranges
    pixelart.js       — pixel-art template library for milestones
  preview/
    index.html        — curation UI (opens in browser)
    preview.js        — canvas renderer + accept/reject logic
    export.js         — writes accepted levels to levels.js format
output/
  candidates.json     — generated candidates (gitignored)
```

### Key Constraints

- No new runtime dependencies — generator uses Node built-ins; preview is vanilla HTML/JS/Canvas.
- Generated levels use the exact same `{ id, name, description, layout, bench }` schema as existing handcrafted levels.
- Existing 10 handcrafted levels are untouched in positions 1-10.
- Everything in `tools/` is dev-only — nothing ships with the game.

## Level Generator

### Difficulty Tiers

| Tier | Levels | Grid | Colors | Ammo Multiplier | Bench Size | Patterns |
|------|--------|------|--------|-----------------|------------|----------|
| Easy | 11-20 | 5x5 – 6x5 | 2-3 | 1.3x (generous) | 5-7 pigs | columns, rows |
| Medium | 21-30 | 6x6 – 7x6 | 3 | 1.15x (fair) | 7-10 pigs | blocks, stripes |
| Hard | 31-40 | 7x7 – 8x7 | 3-4 | 1.05x (tight) | 10-14 pigs | checkers, spirals |
| Expert | 41-50 | 8x8 | 4 | 1.0x (exact) | 12-16 pigs | dense, mixed |

### Generation Algorithm

1. **Pick tier parameters** — grid size, color count, ammo multiplier, pattern type selected from the tier's ranges.
2. **Place colors on grid** using the selected pattern strategy:
   - *Columns/Rows* — clean color lanes (easy)
   - *Blocks* — 2x2 or 3x3 same-color clusters (medium)
   - *Stripes/Checkers* — alternating patterns with intentional blockers (medium-hard)
   - *Spirals/Dense* — complex interleaving requiring multi-side access (hard-expert)
   - *Pixel-art templates* — for milestone levels (10, 20, 30, 40, 50)
3. **Count cubes per color** — derive exact ammo requirements.
4. **Build bench loadout** — distribute ammo across pigs using the tier multiplier + randomized splits.
5. **Verify solvability** — simulate a greedy solver; reject if unsolvable.
6. **Score difficulty** — based on required ordering constraints, blocker density, and ammo tightness.
7. **Assign metadata** — auto-generate id, name, description from tier + pattern type.

### Solvability Checker

The solver simulates the game's line-of-sight mechanic:

- A pig on the **bottom** edge fires **up** its column — hits first matching cube.
- A pig on the **right** edge fires **left** across its row — hits first matching cube.
- A pig on the **top** edge fires **down** its column — hits first matching cube.
- A pig on the **left** edge fires **right** across its row — hits first matching cube.

The solver tries all bench orderings (pruned via BFS with memoization on board state) to confirm at least one valid solution exists. For larger boards, it falls back to a greedy heuristic + multiple random orderings.

### CLI Interface

```bash
npm run generate -- --tier easy --count 15
npm run generate -- --tier medium --count 12
npm run generate -- --tier hard --count 18
npm run generate -- --tier expert --count 5
npm run generate -- --tier all --count 50   # proportional split
npm run generate -- --milestone 20          # pixel-art board for level 20
```

Output: `output/candidates.json`

## Preview & Curation Tool

A static HTML page that loads `output/candidates.json` and presents candidates for review.

### Layout

- **Sidebar** — lists all candidates with tier filter badges (Easy/Medium/Hard/Expert), showing name, grid size, color count, and difficulty score. Accepted levels are highlighted; rejected levels are dimmed with strikethrough.
- **Main panel** — canvas-rendered board preview showing exact cube layout with game-matching colors. Metadata panel displays grid size, colors, total cubes, tier, difficulty score, pattern type, ammo budget, and bench loadout.
- **Actions** — Accept and Reject buttons per candidate. Export button writes all accepted levels as a downloadable JS file in `levels.js` format.

### Features

- Loads `output/candidates.json` directly.
- Tier filter badges for quick navigation between difficulty bands.
- Canvas board renderer matching the game's color palette.
- Accept/Reject state persists in localStorage across page reloads.
- Export produces a JS module that can be concatenated into `src/data/levels.js`.

## Pixel-Art Milestone Levels

Five handcrafted picture boards placed at every 10th level position:

| Level | Picture | Grid | Tier | Colors |
|-------|---------|------|------|--------|
| 11 | Heart | 6x6 | Easy | 2 (red, yellow) |
| 21 | Chick | 7x7 | Medium | 3 (yellow, green, red) |
| 31 | Tree | 7x7 | Hard | 2 (green, yellow) |
| 41 | Robot | 8x8 | Expert | 3 (blue, red, yellow) |
| 50 | Crown | 8x8 | Expert | 2 (yellow, red) |

### How They Work

- Templates are stored as 2D color arrays in `tools/generator/pixelart.js` — same format as level layouts.
- Empty cells (transparent) are skipped — the board only contains colored cubes, so the picture shape emerges as cubes are cleared.
- Colors are limited to the game's existing palette (red, yellow, green) plus blue introduced at Expert tier. Milestone templates use only these 4 colors — no brown, white, or other colors.
- Bench loadout is derived from the template's cube counts with the tier-appropriate ammo multiplier.
- Solvability is verified the same way as abstract levels.
- The generator CLI has a `--milestone N` flag to inject a specific template at a campaign position.
- Milestone positions shifted to tier openers (11, 21, 31, 41) plus the finale (50) so all 10 existing handcrafted levels remain untouched at positions 1-10.

## Campaign Integration

### Level Ordering

| Range | Source | Tier |
|-------|--------|------|
| 1-10 | Existing handcrafted | Original |
| 11 | Milestone: Heart | Easy |
| 12-20 | Generated (curated) | Easy |
| 21 | Milestone: Chick | Medium |
| 22-30 | Generated (curated) | Medium |
| 31 | Milestone: Tree | Hard |
| 32-40 | Generated (curated) | Hard |
| 41 | Milestone: Robot | Expert |
| 42-49 | Generated (curated) | Expert |
| 50 | Milestone: Crown | Expert |

### Game Changes Required

1. **Blue color support** — add blue pig sprites (front/back/side), blue cube sprite, and blue color entry to the palette in `BootScene` and `GameScene`.
2. **Milestone badge** — add a small visual indicator on milestone level cards in the menu (star or picture icon) to signal they're special.

### What Stays The Same

- Level data format — identical `{ id, name, description, layout, bench }` schema.
- Gameplay mechanics — no new rules, just more boards.
- Progression gating — sequential unlock, clear N to unlock N+1.
- All existing 10 levels — untouched in positions 1-10.
- Menu paging — already handles variable counts (6 per page), 50 levels = ~9 pages.
- Progression storage — `pixelpower-progress-v1` localStorage key tracks per-level state by array index; appending levels works without migration.
- Audio, assets, PWA, responsive scaling — no changes needed.

## Out of Scope

- Daily challenges (deferred — generator could support this later).
- Level editor for players / UGC.
- Star ratings or scoring system.
- Ads, analytics, leaderboards.
- Background music.
- New gameplay mechanics (ice, locks, etc.).

# Retention push — design spec

**Date:** 2026-04-23
**Author:** Jacob + Claude
**Status:** Approved, ready for implementation plan
**Scope:** Three features shipped together — 3-star efficiency scoring, daily challenge with streak, and analytics event hooks.

## 1. Goals

- Give players a reason to replay cleared levels (3-star scoring).
- Give players a reason to return daily (daily challenge + streak).
- Give us the signal to know whether either is working (analytics events).

Success criteria (for future measurement, not this ship):

- Average stars-per-completed-level trends upward in week 2+ (players replay to chase 3★).
- 7-day daily-return cohort ≥ 20%.
- Analytics fires for `level_start`, `level_win`, `level_fail`, `daily_start`, `daily_win`, `streak_extended`, `streak_broken` on every corresponding in-game event.

## 2. Non-goals

Explicitly deferred:

- URL-shareable daily (sharing link to today's challenge)
- Social share buttons / deep links
- Rewarded-video "streak freeze"
- Calendar view of streak history
- Leaderboards, friend lists
- User accounts / cloud progress sync (see prior conversation)
- Paid content, IAPs, ads integration

## 3. Feature: 3-star efficiency scoring

### 3.1 Algorithm

Stars are a function of "wasted pigs" on the winning run.

A pig is **wasted** if it ended the run without firing all of its ammo at matching cubes. Concretely, after the board is cleared:

```
wastedPigs = launchedPigs.filter(pig => pig.ammoAtLoss > 0).length
           + benchAndQueueAtWin.length    // any pig never launched
```

Where:

- `launchedPigs` = pigs that were sent to the conveyor during the run.
- `pig.ammoAtLoss` = ammo still on the pig when it left the conveyor (ran out of ammo OR exhausted the loop).
- `benchAndQueueAtWin` = pigs still sitting on the bench or in the return queue when the final cube was destroyed.

**Rubric:**

- 3★ — `wastedPigs === 0`
- 2★ — `wastedPigs === 1`
- 1★ — `wastedPigs >= 2` (still a win)

No penalty for undo. The undo stack exists for learning; penalizing it discourages experimentation.

### 3.2 Data model change

`src/state/gameState.js` migrates from schema v1 to v2.

**v1 (current):**

```js
{
  completedLevels: number[],           // level indexes
  unlockedLevelCount: number
}
```

**v2 (new):**

```js
{
  schemaVersion: 2,
  completedLevels: Array<{
    index: number,
    stars: number | null    // 1..3 earned, or null for pre-migration wins
  }>,
  unlockedLevelCount: number,
  daily: {
    lastDate: string | null,     // ISO YYYY-MM-DD in UTC
    streak: number,              // consecutive or within-grace days completed
    bestStreak: number,
    lastStars: number | null     // stars earned on lastDate, for menu badge
  }
}
```

`markLevelCompleted(index, totalLevels, stars)` becomes the write path; when a player re-clears a level, we keep `max(existingStars, newStars)` — earning better stars overwrites worse, never the reverse.

### 3.3 Migration

At module load, `loadStoredProgress()`:

1. Try to read `pixelpower-progress-v2`. If present, use as-is.
2. Otherwise read `pixelpower-progress-v1`. If present:
   - Map each `completedLevels: number` to `{ index: number, stars: null }`.
   - Initialize `daily` to the empty default.
   - Write the new object to the v2 key.
   - Delete the v1 key.
3. Otherwise return the empty default.

The `stars: null` marker is surfaced in the UI as one faded star — honest to the player ("we didn't track stars when you earned this") without fake-inflating history.

### 3.4 UI

**Menu level card** (`src/scenes/MenuScene.js` around the `createLevelBrowser` loop, replacing the single `★` at ~line 234):

- Row of three stars below the status text.
- Filled star glyph for each earned star; outlined for unearned.
- `null` stars: one faded star with "—" tooltip (conceptually; no hover on Phaser, so just rendered).
- Locked levels: three outlined stars, muted.

**Win overlay** (`src/scenes/GameScene.js:showOverlay`):

- Three stars render above the "BOARD CLEAR" title, scale-tweened in one at a time (180ms apart) up to the earned count.
- If the player improved their star count (newStars > existingStars), a small "NEW BEST" badge appears next to the stars.
- Losing overlay ("OUT OF PIGS", "JAMMED") is unchanged.

**Preview panel** (`MenuScene.drawBoardPreview`):

- Add the three-star row next to the "X pigs loaded" line. Shows the **earned** stars for cleared levels, empty row otherwise.

### 3.5 Tracking on the run

GameScene tracks enough state to compute `wastedPigs` at win time:

- `this.state.launchedHistory: Array<{ color, initialAmmo, finalAmmo }>` — append on every conveyor launch; update `finalAmmo` when the pig leaves the conveyor.
- At win, `wastedPigs = launchedHistory.filter(p => p.finalAmmo > 0).length + pigsRemainingOnBenchAndQueue`.
- This is a pure derivation from existing engine signals — no behavioral change to gameplay.

## 4. Feature: Daily challenge

### 4.1 Which level

A curated pool flagged on each level object:

- Add `dailyEligible: true` to approximately levels 5–35 (skipping the tutorial 1–4 and the hardest pixel-art boards). Auto-applied in a single helper at the bottom of `src/data/levels.js` — no per-level hand-editing.
- Daily index: `hash(utcDateString) % dailyPool.length` where `hash` is a small, deterministic string hash (e.g., FNV-1a); pool is the ordered list of eligible indexes.
- The helper is overridable: if a level has `dailyEligible: false` explicitly, it's excluded; `true` forces inclusion; missing defaults to the range rule.

### 4.2 Streak logic

At `completeDaily(stars)` call time:

- Let `today = utcDateString(Date.now())`.
- If `daily.lastDate === today` — already played. Update `lastStars` if improved, but don't bump streak.
- If `daily.lastDate === yesterday(today)` — continuation. `streak += 1`, `lastDate = today`, `lastStars = stars`.
- If `daily.lastDate === dayBefore(today)` (missed one day) — grace. `streak += 1`, `lastDate = today`, `lastStars = stars`.
- Otherwise (missed two+ days or first daily ever) — new streak. `streak = 1`, `lastDate = today`, `lastStars = stars`.
- Always: `bestStreak = max(bestStreak, streak)`.

Dates are UTC; we trust the client clock. Anti-cheat (clock manipulation) is out of scope.

### 4.3 UI

**Menu header** (`MenuScene.createHeader` or a new region in `createProgressPanel`):

- New "DAILY CHALLENGE" card beside the campaign panel:
  - Today's date.
  - Streak glyph: `🔥 N` (or fallback text "Streak: N" if emoji rendering glitches).
  - Best streak: `Best N` in smaller text beneath.
  - `PLAY DAILY` button; disabled and shows earned stars when already completed today.
- Card is always visible, even for brand-new players (streak 0).

**Daily run in-game:**

- GameScene receives `{ levelIndex, mode: 'daily' }` instead of plain `{ levelIndex }`.
- When `mode === 'daily'`, the level intro banner shows "DAILY • YYYY-MM-DD" prefix.
- On win, we call `completeDaily(stars)` in addition to (not instead of) `markLevelCompleted`. Both the campaign progress AND the daily state update, so playing the daily counts as beating that level in the campaign too.
- On loss, the daily is NOT consumed — player can retry.

## 5. Feature: Analytics event hooks

### 5.1 Module

New file `src/analytics.js`:

```js
export const ANALYTICS_EVENTS = [
  'level_start', 'level_win', 'level_fail', 'level_undo',
  'daily_start', 'daily_win',
  'streak_extended', 'streak_broken'
];

export function track(event, payload) { ... }
export function getRecordedEvents() { ... }   // for tests + debugging
```

- `track` appends `{ event, payload, ts: Date.now() }` to a ring buffer (`window.__PIXELPOWER_ANALYTICS__.events`, max 500 entries).
- In `import.meta.env.DEV`, also `console.debug('[analytics]', event, payload)`.
- In production, it's silent. A future adapter can subscribe by reading the array and/or monkey-patching `track`.
- Whitelist enforces event names — unknown events throw in dev, silently drop in prod (with a single console warning).

### 5.2 Event payloads

| Event | Payload |
|---|---|
| `level_start` | `{ levelIndex, mode: 'campaign' \| 'daily' }` |
| `level_win` | `{ levelIndex, mode, stars, wastedPigs, undosUsed, durationMs }` |
| `level_fail` | `{ levelIndex, mode, reason: 'jam' \| 'out_of_pigs', durationMs }` |
| `level_undo` | `{ levelIndex, mode, undoIndex }` (undoIndex = nth undo in this run) |
| `daily_start` | `{ levelIndex, date }` |
| `daily_win` | `{ levelIndex, date, stars, newStreak, bestStreak, extended: boolean }` |
| `streak_extended` | `{ newStreak, bestStreak, usedGrace: boolean }` |
| `streak_broken` | `{ previousStreak, newStreak: 1 }` |

**Event relationships:** A daily win fires `level_win` AND `daily_win`. If the win also increments the streak, it fires `streak_extended`; if the streak was reset by a multi-day gap, it fires `streak_broken` *before* the streak restarts. A same-day replay of the daily fires only `daily_win` with `extended: false` (no streak event).

### 5.3 Call sites

- `level_start` → `GameScene.loadLevel`
- `level_win` → at the two win sites in `GameScene` (1137, 1296)
- `level_fail` → at the two lose sites
- `level_undo` → `GameScene.undoMove`
- `daily_start` / `daily_win` / `streak_extended` / `streak_broken` → emitted from `completeDaily(stars)` in gameState.js

## 6. Testing strategy

All testable behavior lives in pure modules that don't touch Phaser, so we can TDD the core with `node --test`.

### 6.1 New test files

- `src/state/gameState.test.js` — migration v1→v2, `markLevelCompleted` star-max merge, `completeDaily` streak logic (same-day, next-day, grace, broken, first-ever).
- `src/game/scoring.test.js` — `computeStars(launchedHistory, remainingPigs)` unit tests for 3★/2★/1★ rubric.
- `src/game/daily.test.js` — `dailyLevelIndex(dateStr, pool)` deterministic selection; `dailyPool(LEVELS)` filtering.
- `src/analytics.test.js` — `track` accepts whitelisted events, rejects unknown in dev, ring-buffer bound, payload shape.

### 6.2 Existing tests still pass

- `src/data/level-validation.test.js` — unaffected.
- `src/data/levels.test.js` — add one test that every daily-pool level is solvable (leverages the solver module).
- `tools/generator/*.test.js` — untouched.

### 6.3 Browser smoke test

After implementation, launch the dev server and walk through:

1. Fresh localStorage: menu shows streak 0, daily card, three unearned stars on every level.
2. Play Level 1 as 3★ — overlay shows 3 stars, menu card updates.
3. Play daily — win → streak 1, menu daily card shows "🔥 1" and earned stars.
4. Re-enter Level 1, win with 1★ — stars on menu stay at 3 (max merge).
5. Simulate "yesterday" by editing localStorage `daily.lastDate` back one day, then play daily again — streak should go to 2.
6. Simulate "three days ago" — streak should reset to 1 and fire `streak_broken` analytics event.
7. Inspect `window.__PIXELPOWER_ANALYTICS__.events` — all expected events present.

### 6.4 Migration test

- Seed localStorage with a v1 payload (e.g., `{ completedLevels: [0, 3, 7], unlockedLevelCount: 8 }`).
- Reload.
- Confirm v2 written with `{ index: 0, stars: null }` entries, v1 key gone, menu renders correctly.

## 7. File-level plan

| File | Change |
|---|---|
| `src/state/gameState.js` | Schema v2, migration, `markLevelCompleted(i, total, stars)`, new `completeDaily(stars)`, expose daily selectors. |
| `src/state/gameState.test.js` | **new** — covers migration + streak. |
| `src/game/scoring.js` | **new** — pure `computeStars(launchedHistory, remaining)`. |
| `src/game/scoring.test.js` | **new**. |
| `src/game/daily.js` | **new** — `dailyLevelIndex(dateStr, pool)`, `dailyPool(levels)`, `utcDateString(ms)`, `dayDelta(a, b)`. |
| `src/game/daily.test.js` | **new**. |
| `src/analytics.js` | **new** — event bus. |
| `src/analytics.test.js` | **new**. |
| `src/data/levels.js` | Apply auto-`dailyEligible` tagging helper at bottom. |
| `src/data/levels.test.js` | Add "all daily-pool levels solvable" test. |
| `src/scenes/GameScene.js` | Track `launchedHistory`, call `computeStars` at win, pass stars to `markLevelCompleted`, emit analytics, show stars on overlay, handle `mode: 'daily'`. |
| `src/scenes/MenuScene.js` | 3-star row on level card, daily challenge card, launch daily flow, star row on preview panel. |

Rough line-count estimate: ~600 LoC net add (roughly 300 prod, 300 tests).

## 8. Risks and mitigations

- **Schema migration corrupts existing saves.** Mitigation: write v2 first, verify round-trip parse of the new payload, *then* delete v1. If the v2 write or re-read throws, leave v1 in place and fall back to the v1 reader. A v1→v2 unit test with realistic payload shape guards the happy path.
- **Star computation diverges from player intuition.** Mitigation: the win overlay shows the `wastedPigs` count alongside the stars (e.g. "No pigs wasted" / "1 pig wasted" / "3 pigs wasted"), so the scoring is transparent.
- **Daily pool auto-flagging catches a broken level.** Mitigation: the new `levels.test.js` check asserts every daily-eligible level is solvable via the existing solver. A flagged-but-unsolvable level fails CI.
- **Emoji rendering differs across platforms.** Mitigation: fall back to `Streak: N` text if `🔥` renders weird; this is a followup polish item, not a ship blocker.

## 9. Rollout

Single commit (or small series) to main:

1. Schema v2 + migration + gameState tests (no UI yet).
2. Scoring + daily modules + tests.
3. Analytics module + tests.
4. GameScene wiring.
5. MenuScene UI.
6. Smoke test + final verification.

No feature flag. If something goes wrong at any step, revert the single stack of commits.

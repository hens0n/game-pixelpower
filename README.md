# Pixel Power

Pixel Power is a browser puzzle game built with Phaser 3 and Vite. Players launch colored pigs onto a conveyor loop, where each pig auto-fires at matching cubes to clear a pixel-art board. The current project includes a menu-driven campaign, handcrafted levels, progression persistence, premium-style generated art assets, and a basic PWA shell.

## Current Features

- Phaser 3 game runtime with Vite-based local development and production builds
- Responsive portrait-first layout for desktop and mobile browsers
- Level browser with paged campaign menu and board preview
- 50-level campaign with handcrafted milestone pixel-art boards and generated progression content saved in `localStorage`
- Core gameplay loop with bench management, return queue, undo, restart, win, and jam-loss states
- Built-in content generation and preview tooling for candidate level curation
- Directional pig art, premium board assets, lightweight procedural audio, and service worker registration

## Controls

- Mouse / touch: select pigs, launch from bench or queue, and interact with menu controls
- Keyboard:
  - `Enter`: confirm common menu/game actions
  - `U`: undo last move
  - Level browser navigation is also wired for keyboard use

## Getting Started

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Vite serves the game on `http://localhost:5173` by default.

### Production Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Generate Candidate Levels

```bash
npm run generate
```

### Preview Candidate Levels

```bash
npm run preview-levels
```

Then open `http://localhost:3000/tools/preview/` to review `output/candidates.json` and export accepted levels.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```text
src/
  data/          Level definitions and campaign content
  scenes/        Boot, menu, and gameplay scenes
  state/         Shared runtime and persistence state
public/
  assets/        Game art and UI textures
  sw.js          Service worker
output/          Local generated artifacts and browser test captures
```

## Persistence

Campaign progress is stored in browser `localStorage` under the key `pixelpower-progress-v1`.

## Notes

- The project currently ships as a single large Phaser client bundle, so bundle splitting is still an open optimization area.
- The service worker is enabled from the client and caches core shell files for installable/PWA-style behavior.
- Generated artifacts and local test output are ignored by git through `.gitignore`.

import Phaser from 'phaser';
import './style.css';
import { gameState } from './state/gameState.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

const GAME_WIDTH = 1080;
const GAME_HEIGHT = 1920;

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#10264d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    preserveDrawingBuffer: true,
  },
  scene: [BootScene, MenuScene, GameScene],
};

const game = new Phaser.Game(config);

function captureState() {
  const activeScenes = game.scene
    .getScenes(true)
    .map((scene) => scene.scene.key);

  return {
    coordinateSystem: {
      origin: 'top-left',
      x: 'increases to the right',
      y: 'increases downward',
    },
    mode: gameState.phase,
    currentScene: gameState.currentScene,
    progress: gameState.progress,
    viewport: gameState.viewport,
    activeScenes,
    notes: gameState.notes,
    gameplay: gameState.gameplay,
  };
}

window.__PIXELPOWER__ = {
  game,
  gameState,
  captureState,
};

window.render_game_to_text = () => JSON.stringify(captureState(), null, 2);

window.advanceTime = async (ms = 16) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

window.addEventListener('resize', () => {
  gameState.viewport = { width: window.innerWidth, height: window.innerHeight };
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}

export { gameState };

import Phaser from 'phaser';
import {
  gameState,
  getHighestUnlockedLevelIndex,
  markLevelCompleted,
  setSelectedLevelIndex,
  syncStoredProgress,
} from '../state/gameState.js';
import { LEVELS } from '../data/levels.js';

const COLOR_THEMES = {
  red: {
    label: 'Ruby',
    cubeTexture: 'cube-red-top',
    pigTexture: 'pig-red',
    pigTextureBack: 'pig-red-back',
    pigTextureLeft: 'pig-red-left',
    pigTextureRight: 'pig-red-right',
    accent: 0xff6b6b,
    shadow: 0x7d2534,
  },
  yellow: {
    label: 'Gold',
    cubeTexture: 'cube-yellow-top',
    pigTexture: 'pig-yellow',
    pigTextureBack: 'pig-yellow-back',
    pigTextureLeft: 'pig-yellow-left',
    pigTextureRight: 'pig-yellow-right',
    accent: 0xffd34d,
    shadow: 0x7f6214,
  },
  green: {
    label: 'Mint',
    cubeTexture: 'cube-green-top',
    pigTexture: 'pig-green',
    pigTextureBack: 'pig-green-back',
    pigTextureLeft: 'pig-green-left',
    pigTextureRight: 'pig-green-right',
    accent: 0x63d98f,
    shadow: 0x1f6f4a,
  },
  blue: {
    label: 'Sky',
    cubeTexture: 'cube-blue-top',
    pigTexture: 'pig-blue',
    pigTextureBack: 'pig-blue-back',
    pigTextureLeft: 'pig-blue-left',
    pigTextureRight: 'pig-blue-right',
    accent: 0x77c2ff,
    shadow: 0x163d73,
  },
  brown: {
    label: 'Cocoa',
    cubeTexture: 'cube-brown-top',
    pigTexture: 'pig-brown',
    pigTextureBack: 'pig-brown-back',
    pigTextureLeft: 'pig-brown-left',
    pigTextureRight: 'pig-brown-right',
    accent: 0x8b5a3c,
    shadow: 0x3b2113,
  },
  pink: {
    label: 'Blush',
    cubeTexture: 'cube-pink-top',
    pigTexture: 'pig-pink',
    pigTextureBack: 'pig-pink-back',
    pigTextureLeft: 'pig-pink-left',
    pigTextureRight: 'pig-pink-right',
    accent: 0xffa6cf,
    shadow: 0x7d2d57,
  },
  white: {
    label: 'Pearl',
    cubeTexture: 'cube-white-top',
    pigTexture: 'pig-white',
    pigTextureBack: 'pig-white-back',
    pigTextureLeft: 'pig-white-left',
    pigTextureRight: 'pig-white-right',
    accent: 0xf2f6fb,
    shadow: 0x7d8b99,
  },
  black: {
    label: 'Onyx',
    cubeTexture: 'cube-black-top',
    pigTexture: 'pig-black',
    pigTextureBack: 'pig-black-back',
    pigTextureLeft: 'pig-black-left',
    pigTextureRight: 'pig-black-right',
    accent: 0x2b2f37,
    shadow: 0x080b10,
  },
  gray: {
    label: 'Slate',
    cubeTexture: 'cube-gray-top',
    pigTexture: 'pig-gray',
    pigTextureBack: 'pig-gray-back',
    pigTextureLeft: 'pig-gray-left',
    pigTextureRight: 'pig-gray-right',
    accent: 0x9ca3af,
    shadow: 0x47505c,
  },
  tan: {
    label: 'Sand',
    cubeTexture: 'cube-tan-top',
    pigTexture: 'pig-tan',
    pigTextureBack: 'pig-tan-back',
    pigTextureLeft: 'pig-tan-left',
    pigTextureRight: 'pig-tan-right',
    accent: 0xe6d2ab,
    shadow: 0x7b6541,
  },
};

const REVEAL_PALETTE = [
  0xffd89e,
  0xffe9aa,
  0xfff0c6,
  0xffe3b0,
  0xe6ffd8,
  0xd6ffd7,
  0xb4f4c0,
  0xc6f7d9,
  0x93e8bf,
  0xffd4d4,
  0xffbfbf,
  0xf0d7ff,
  0xf1c3ff,
  0xd8f8ff,
  0xc8f0ff,
  0xffe0ef,
];

const BOARD_AREA = {
  centerX: 540,
  centerY: 620,
  width: 600,
  height: 720,
};

const BENCH_COLUMNS = 5;
const BENCH_VISIBLE_DEPTH = 5;
const MAX_CELL_SIZE = 120;

function buildRevealArt(layout) {
  return layout.map((row, rowIndex) =>
    row.map((_, colIndex) => REVEAL_PALETTE[(rowIndex * 3 + colIndex * 5) % REVEAL_PALETTE.length]));
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.state = null;
    this.levelConfig = null;
    this.currentLevelIndex = 0;
    this.undoStack = [];
    this.selectedPig = { source: 'bench', index: 0 };
    this.activeProjectiles = [];
    this.boardSprites = [];
    this.benchColumns = [];
    this.queueSprites = [];
    this.conveyorSprites = [];
    this.conveyorMarkers = [];
    this.lastStatus = '';
    this.levelContainers = [];
    this.audioContext = null;
    this.masterGain = null;
    this.isSceneTransitioning = false;
  }

  create(data = {}) {
    gameState.currentScene = 'GameScene';
    gameState.progress = 'Milestone 3 level progression';

    this.cameras.main.setBackgroundColor('#0d1830');
    this.drawBackdrop();
    this.createFrame();
    this.createControls();
    this.createQueue();
    this.createBench();
    this.createOverlay();
    this.createLevelIntro();
    this.registerInput();
    this.registerAudioUnlock();

    const requestedLevel = Phaser.Math.Clamp(
      data.levelIndex ?? gameState.selectedLevelIndex ?? 0,
      0,
      getHighestUnlockedLevelIndex(LEVELS.length),
    );
    setSelectedLevelIndex(requestedLevel, LEVELS.length);
    this.loadLevel(requestedLevel, `Level ${requestedLevel + 1} ready. Click a pig stack to launch from the lower dock.`);
  }

  drawBackdrop() {
    const { width, height } = this.scale;

    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x0d1830);
    this.add.circle(136, 142, 188, 0x214684, 0.55);
    this.add.circle(955, 260, 244, 0x2d66b3, 0.25);
    this.add.circle(874, 1540, 264, 0x0d4e72, 0.2);
    this.add.rectangle(width * 0.5, height * 0.76, width, height * 0.52, 0x081221, 0.95);
    this.add.rectangle(width * 0.5, 1670, width, 360, 0x0a1323, 1);

    for (let i = 0; i < 18; i += 1) {
      const x = 80 + i * 55;
      const y = 88 + (i % 4) * 18;
      this.add.circle(x, y, 2 + (i % 3), 0xffffff, 0.18);
    }
  }

  createFrame() {
    this.add.text(540, 52, 'PIXEL POWER', {
      fontFamily: 'Trebuchet MS',
      fontSize: '54px',
      color: '#f6fbff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.levelText = this.add.text(540, 100, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#fff0c1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.statusText = this.add.text(540, 144, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#d5e9ff',
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5);

    this.metricsText = this.add.text(540, 190, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#fff0c1',
      align: 'center',
      wordWrap: { width: 940 },
    }).setOrigin(0.5);
  }

  createControls() {
    this.resetButton = this.createButton(906, 116, 200, 74, 0x597093, 'RESET');
    this.resetButton.zone.on('pointerdown', () => this.resetLevel('Level restarted.'));

    this.add.text(540, 1110, 'Click a bench or queue pig to select it, then click it again to launch. Enter or U undoes.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#d4e8ff',
      align: 'center',
      wordWrap: { width: 920 },
    }).setOrigin(0.5);
  }

  createQueue() {
    const queueY = 1198;
    this.add.rectangle(540, queueY, 904, 118, 0xcfe7ff, 0.2).setStrokeStyle(2, 0xffffff, 0.08);
    this.createPanel(540, queueY, 938, 148, { tint: 0xf7fbff });
    this.add.text(124, 1142, 'RETURN QUEUE', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#173258',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    for (let i = 0; i < 5; i += 1) {
      const x = 220 + i * 160;
      const chrome = this.add.image(x, queueY, 'ui-queue-tray-trimmed').setDisplaySize(134, 92).setAlpha(0.96);
      const tray = this.add.rectangle(x, queueY, 134, 92, 0x143157, 0.12).setStrokeStyle(3, 0x2b6295, 0.24);
      const pig = this.add.image(x - 22, queueY - 4, 'pig-red').setDisplaySize(76, 76).setVisible(false);
      const ammo = this.add.text(x + 26, queueY + 2, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '24px',
        color: '#31548b',
        fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);
      tray.setInteractive({ useHandCursor: true });
      pig.setInteractive({ useHandCursor: true });
      tray.on('pointerdown', () => this.handleQueueSlotSelection(i));
      pig.on('pointerdown', () => this.handleQueueSlotSelection(i));
      this.queueSprites.push({ chrome, tray, pig, ammo });
    }
  }

  createBench() {
    const benchY = 1492;
    const benchPanelHeight = 404;
    const columnHeight = 332;
    const slotSpacing = 66;
    const firstSlotOffset = -132;

    this.add.rectangle(540, benchY, 936, benchPanelHeight - 34, 0xcfe7ff, 0.18).setStrokeStyle(2, 0xffffff, 0.08);
    this.createPanel(540, benchY, 972, benchPanelHeight, { tint: 0xf1fbff });
    this.add.text(126, 1288, 'BENCH', {
      fontFamily: 'Trebuchet MS',
      fontSize: '30px',
      color: '#173258',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    for (let i = 0; i < BENCH_COLUMNS; i += 1) {
      const x = 220 + i * 160;
      const chrome = this.add.image(x, benchY, 'ui-bench-column-trimmed')
        .setDisplaySize(134, columnHeight)
        .setAlpha(0.98);
      const column = this.add.rectangle(x, benchY, 134, columnHeight, 0x173258, 0.14).setStrokeStyle(4, 0x285890, 0.32);
      const slots = [];
      const overflow = this.add.text(x, benchY + 160, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#31548b',
        fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);

      for (let depth = 0; depth < BENCH_VISIBLE_DEPTH; depth += 1) {
        const slotY = benchY + firstSlotOffset + depth * slotSpacing;
        const pad = this.add.rectangle(x, slotY, 116, 50, 0xffffff, depth === 0 ? 0.07 : 0.04);
        const pig = this.add.image(x - 18, slotY - 1, 'pig-red').setDisplaySize(depth === 0 ? 66 : 60, depth === 0 ? 66 : 60).setVisible(false);
        const ammo = this.add.text(x + 28, slotY + 2, '', {
          fontFamily: 'Trebuchet MS',
          fontSize: '18px',
          color: '#31548b',
          fontStyle: 'bold',
        }).setOrigin(0.5).setVisible(false);
        slots.push({ pad, pig, ammo });
      }

      column.setInteractive({ useHandCursor: true });
      column.on('pointerdown', () => this.handleBenchSlotSelection(i));
      slots.forEach((slot) => {
        slot.pig.setInteractive({ useHandCursor: true });
        slot.pig.on('pointerdown', () => this.handleBenchSlotSelection(i));
      });

      this.benchColumns.push({ chrome, column, slots, overflow });
    }
  }

  createButton(x, y, width, height, fill, label) {
    const shadow = this.add.rectangle(x, y + 10, width, height, 0x05111f, 0.28).setStrokeStyle(0, 0, 0);
    const rect = this.add.rectangle(x, y, width, height, fill, 1).setStrokeStyle(5, 0xffffff, 0.34);
    const shine = this.add.rectangle(x, y - 20, width - 22, 20, 0xffffff, 0.14);
    const text = this.add.text(x, y, label, {
      fontFamily: 'Trebuchet MS',
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    rect.setInteractive({ useHandCursor: true });
    text.setInteractive({ useHandCursor: true });
    return { shadow, rect, shine, text, zone };
  }

  createOverlay() {
    this.overlay = this.add.container(0, 0).setVisible(false).setDepth(2000);
    const dim = this.add.rectangle(540, 960, 1080, 1920, 0x071221, 0.74);
    const panelShadow = this.createPanel(550, 972, 760, 420, { tint: 0x061120, alpha: 0.35 });
    const panel = this.createPanel(540, 960, 760, 420, { tint: 0xf8fdff });
    const title = this.add.text(540, 862, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '64px',
      color: '#16325c',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const body = this.add.text(540, 964, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#31548b',
      align: 'center',
      wordWrap: { width: 610 },
    }).setOrigin(0.5);
    const replay = this.createButton(410, 1088, 220, 86, 0xff8747, 'PLAY AGAIN');
    const menu = this.createButton(670, 1088, 220, 86, 0x4d92ff, 'MENU');

    [replay.zone, replay.rect, replay.text].forEach((target) => {
      target.on('pointerdown', () => this.handlePrimaryOverlayAction());
    });
    [menu.zone, menu.rect, menu.text].forEach((target) => {
      target.on('pointerdown', () => this.transitionToMenu());
    });

    this.overlay.add([
      dim, panelShadow, panel, title, body,
      replay.shadow, replay.rect, replay.shine, replay.text, replay.zone,
      menu.shadow, menu.rect, menu.shine, menu.text, menu.zone,
    ]);
    this.overlayTitle = title;
    this.overlayBody = body;
    this.overlayPrimaryButton = replay;
  }

  createLevelIntro() {
    this.levelIntro = this.add.container(0, 0).setDepth(1800).setVisible(false).setAlpha(0);
    const dim = this.add.rectangle(540, 292, 700, 148, 0x071221, 0.28);
    const panel = this.createPanel(540, 286, 672, 132, { tint: 0xf8fdff, alpha: 0.98 });
    const eyebrow = this.add.text(540, 246, 'NEXT BOARD', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#4b78b0',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const title = this.add.text(540, 282, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '42px',
      color: '#16325c',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 560 },
    }).setOrigin(0.5);
    const body = this.add.text(540, 326, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#31548b',
      align: 'center',
      wordWrap: { width: 560 },
    }).setOrigin(0.5);

    this.levelIntro.add([dim, panel, eyebrow, title, body]);
    this.levelIntroTitle = title;
    this.levelIntroBody = body;
  }

  registerInput() {
    this.input.keyboard.on('keydown-SPACE', () => this.launchFrontPig());
    this.input.keyboard.on('keydown-ENTER', () => this.undoMove());
    this.input.keyboard.on('keydown-U', () => this.undoMove());
    this.input.keyboard.on('keydown-R', () => this.resetLevel('Level restarted.'));
    this.input.keyboard.on('keydown-N', () => this.advanceLevel());
    this.input.keyboard.on('keydown-M', () => this.transitionToMenu());
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  registerAudioUnlock() {
    const unlock = () => this.ensureAudio();
    this.input.once('pointerdown', unlock);
    this.input.keyboard.once('keydown', unlock);
  }

  ensureAudio() {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    this.audioContext = new AudioContextClass();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.08;
    this.masterGain.connect(this.audioContext.destination);

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  playTone({
    frequency = 440,
    type = 'sine',
    duration = 0.12,
    volume = 0.25,
    attack = 0.005,
    release = 0.08,
    frequencyEnd = null,
  }) {
    const context = this.ensureAudio();
    if (!context || !this.masterGain) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (frequencyEnd !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequencyEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + release + 0.02);
  }

  playSfx(name) {
    switch (name) {
      case 'select':
        this.playTone({ frequency: 540, type: 'triangle', duration: 0.05, volume: 0.12, frequencyEnd: 620 });
        break;
      case 'launch':
        this.playTone({ frequency: 280, type: 'square', duration: 0.08, volume: 0.18, frequencyEnd: 180 });
        this.playTone({ frequency: 520, type: 'triangle', duration: 0.1, volume: 0.1, frequencyEnd: 420 });
        break;
      case 'shot':
        this.playTone({ frequency: 880, type: 'square', duration: 0.04, volume: 0.08, frequencyEnd: 540 });
        break;
      case 'pop':
        this.playTone({ frequency: 660, type: 'triangle', duration: 0.06, volume: 0.12, frequencyEnd: 220 });
        this.playTone({ frequency: 990, type: 'sine', duration: 0.03, volume: 0.06, frequencyEnd: 760 });
        break;
      case 'blocked':
        this.playTone({ frequency: 240, type: 'square', duration: 0.04, volume: 0.05, frequencyEnd: 200 });
        this.playTone({ frequency: 180, type: 'triangle', duration: 0.06, volume: 0.05, frequencyEnd: 150 });
        break;
      case 'queue':
        this.playTone({ frequency: 360, type: 'sine', duration: 0.05, volume: 0.08, frequencyEnd: 420 });
        this.playTone({ frequency: 480, type: 'sine', duration: 0.06, volume: 0.07, frequencyEnd: 560 });
        break;
      case 'jam':
        this.playTone({ frequency: 180, type: 'sawtooth', duration: 0.18, volume: 0.16, frequencyEnd: 110 });
        break;
      case 'win':
        this.playTone({ frequency: 523, type: 'triangle', duration: 0.09, volume: 0.12, frequencyEnd: 659 });
        this.playTone({ frequency: 659, type: 'triangle', duration: 0.1, volume: 0.12, frequencyEnd: 784 });
        this.playTone({ frequency: 784, type: 'triangle', duration: 0.13, volume: 0.12, frequencyEnd: 988 });
        break;
      case 'lose':
        this.playTone({ frequency: 320, type: 'sawtooth', duration: 0.12, volume: 0.14, frequencyEnd: 220 });
        this.playTone({ frequency: 220, type: 'sawtooth', duration: 0.16, volume: 0.12, frequencyEnd: 140 });
        break;
      default:
        break;
    }
  }

  loadLevel(index, message) {
    this.currentLevelIndex = Phaser.Math.Clamp(index, 0, LEVELS.length - 1);
    setSelectedLevelIndex(this.currentLevelIndex, LEVELS.length);
    this.levelConfig = LEVELS[this.currentLevelIndex];
    this.configureLevelGeometry();
    this.rebuildLevelPresentation();
    this.activeProjectiles.forEach((projectile) => projectile.destroy());
    this.activeProjectiles = [];
    this.state = this.createInitialState();
    this.undoStack = [];
    this.selectedPig = { source: 'bench', index: this.findNextBenchColumn(0, this.state.bench) };
    this.overlay.setVisible(false);
    this.overlay.setAlpha(1);
    this.overlay.setScale(1);
    this.setStatus(message);
    this.syncPresentation();
    this.playLevelIntro();
  }

  resetLevel(message) {
    this.loadLevel(this.currentLevelIndex, message);
  }

  advanceLevel() {
    if (this.currentLevelIndex >= LEVELS.length - 1) {
      this.resetLevel('Final level restarted.');
      return;
    }

    this.loadLevel(this.currentLevelIndex + 1, `Level ${this.currentLevelIndex + 2} ready. Larger pixel grids now scale down to fit the board.`);
  }

  playLevelIntro() {
    if (!this.levelIntro) {
      return;
    }

    this.levelIntroTitle.setText(`LEVEL ${this.currentLevelIndex + 1}  ${this.levelConfig.name.toUpperCase()}`);
    this.levelIntroBody.setText(this.levelConfig.description);
    this.levelIntro.setVisible(true).setAlpha(0);
    this.levelIntro.setY(-18);
    this.tweens.killTweensOf(this.levelIntro);
    this.tweens.add({
      targets: this.levelIntro,
      alpha: 1,
      y: 0,
      duration: 180,
      ease: 'Cubic.Out',
      hold: 850,
      yoyo: true,
      onComplete: () => {
        this.levelIntro.setVisible(false).setAlpha(0).setY(0);
      },
    });
  }

  configureLevelGeometry() {
    this.gridCols = this.levelConfig.layout[0].length;
    this.gridRows = this.levelConfig.layout.length;
    this.cellSize = Math.min(
      MAX_CELL_SIZE,
      Math.floor(BOARD_AREA.width / this.gridCols),
      Math.floor(BOARD_AREA.height / this.gridRows),
    );
    this.cubeSize = this.cellSize;
    this.cubeDisplaySize = this.cubeSize * 0.96;
    this.boardOrigin = {
      x: BOARD_AREA.centerX - ((this.gridCols - 1) * this.cellSize) / 2,
      y: BOARD_AREA.centerY - ((this.gridRows - 1) * this.cellSize) / 2,
    };
    this.boardCenter = { x: BOARD_AREA.centerX, y: BOARD_AREA.centerY };
    this.boardBounds = {
      left: this.boardOrigin.x - this.cubeSize / 2,
      top: this.boardOrigin.y - this.cubeSize / 2,
      right: this.boardOrigin.x + (this.gridCols - 1) * this.cellSize + this.cubeSize / 2,
      bottom: this.boardOrigin.y + (this.gridRows - 1) * this.cellSize + this.cubeSize / 2,
    };

    const pathPadding = Phaser.Math.Clamp(Math.round(this.cellSize * 0.35), 28, 42);
    const pathInset = Phaser.Math.Clamp(Math.round(this.cellSize * 0.3), 24, 36);
    this.conveyorRadius = Phaser.Math.Clamp(Math.round(this.cellSize * 0.37), 28, 44);
    this.ammoOffsetY = Phaser.Math.Clamp(Math.round(this.cellSize * 0.4), 32, 48);
    this.pathBounds = {
      left: this.boardBounds.left - pathPadding,
      top: this.boardBounds.top - pathPadding,
      right: this.boardBounds.right + pathPadding,
      bottom: this.boardBounds.bottom + pathPadding,
    };
    this.pathStart = { x: this.pathBounds.left + pathInset, y: this.pathBounds.bottom };
    this.pathSegments = [
      { from: { x: this.pathBounds.left + pathInset, y: this.pathBounds.bottom }, to: { x: this.pathBounds.right - pathInset, y: this.pathBounds.bottom } },
      { from: { x: this.pathBounds.right, y: this.pathBounds.bottom - pathInset }, to: { x: this.pathBounds.right, y: this.pathBounds.top + pathInset } },
      { from: { x: this.pathBounds.right - pathInset, y: this.pathBounds.top }, to: { x: this.pathBounds.left + pathInset, y: this.pathBounds.top } },
      { from: { x: this.pathBounds.left, y: this.pathBounds.top + pathInset }, to: { x: this.pathBounds.left, y: this.pathBounds.bottom - pathInset } },
    ];
    this.pathTotalLength = this.pathSegments.reduce(
      (sum, segment) => sum + Phaser.Math.Distance.Between(segment.from.x, segment.from.y, segment.to.x, segment.to.y),
      0,
    );
  }

  rebuildLevelPresentation() {
    this.levelContainers.forEach((container) => container.destroy(true));
    this.levelContainers = [];
    this.boardSprites = [];
    this.conveyorSprites = [];
    this.conveyorMarkers = [];

    this.createBoard();
    this.createConveyor();
  }

  createBoard() {
    const container = this.add.container(0, 0).setDepth(20);
    const revealArt = buildRevealArt(this.levelConfig.layout);
    const boardWidth = this.boardBounds.right - this.boardBounds.left;
    const boardHeight = this.boardBounds.bottom - this.boardBounds.top;
    const panelWidth = boardWidth + Math.round(this.cellSize * 1.35);
    const panelHeight = boardHeight + Math.round(this.cellSize * 1.55);

    const frameShadow = this.createPanel(this.boardCenter.x + 22, this.boardCenter.y + 22, panelWidth, panelHeight, { tint: 0x173463, alpha: 0.42 });
    const panel = this.createPanel(this.boardCenter.x, this.boardCenter.y + 4, panelWidth, panelHeight, { tint: 0xecf8ff });
    const outer = this.add
      .rectangle(this.boardCenter.x, this.boardCenter.y + 2, boardWidth + Math.round(this.cellSize * 0.6), boardHeight + Math.round(this.cellSize * 0.74), 0x0f274d, 0.2)
      .setStrokeStyle(Math.max(4, Math.round(this.cellSize * 0.08)), 0xd5f3ff, 0.34);
    const inner = this.add
      .rectangle(this.boardCenter.x, this.boardCenter.y + 2, boardWidth + Math.round(this.cellSize * 0.24), boardHeight + Math.round(this.cellSize * 0.34), 0x16325c, 0.26)
      .setStrokeStyle(Math.max(2, Math.round(this.cellSize * 0.025)), 0xffffff, 0.08);

    container.add([frameShadow, panel, outer, inner]);

    this.levelConfig.layout.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const x = this.boardOrigin.x + colIndex * this.cellSize;
        const y = this.boardOrigin.y + rowIndex * this.cellSize;
        const plate = this.add.rectangle(x, y, this.cubeSize + 10, this.cubeSize + 10, 0x0b1d34, 0.72)
          .setStrokeStyle(Math.max(2, Math.round(this.cellSize * 0.025)), 0x97cbff, 0.12);
        const reveal = this.add.rectangle(x, y, this.cubeSize, this.cubeSize, revealArt[rowIndex][colIndex], 1)
          .setStrokeStyle(Math.max(2, Math.round(this.cellSize * 0.03)), 0xffffff, 0.28);
        const underlay = this.add.rectangle(x, y + Math.round(this.cellSize * 0.05), this.cubeSize + 8, this.cubeSize + 8, 0x05101f, 0.24);
        const glow = this.add.rectangle(x, y, this.cubeSize - 10, this.cubeSize - 10, 0xffffff, 0.08);
        const cube = this.add.image(x, y, 'cube-blue-top').setDisplaySize(this.cubeDisplaySize, this.cubeDisplaySize);
        container.add([plate, underlay, reveal, glow, cube]);
        this.boardSprites.push({ plate, reveal, underlay, glow, cube });
      });
    });

    this.levelContainers.push(container);
  }

  createConveyor() {
    const container = this.add.container(0, 0).setDepth(30);

    const label = this.add.text(this.pathBounds.left - 86, this.pathBounds.top - 24, 'PERIMETER CONVEYOR', {
      fontFamily: 'Trebuchet MS',
      fontSize: '25px',
      color: '#d8eeff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(label);

    const rail = this.add.graphics();
    rail.lineStyle(Math.max(28, Math.round(this.cellSize * 0.36)), 0x12284a, 1);
    rail.strokeRoundedRect(
      this.pathBounds.left,
      this.pathBounds.top,
      this.pathBounds.right - this.pathBounds.left,
      this.pathBounds.bottom - this.pathBounds.top,
      34,
    );
    rail.lineStyle(Math.max(18, Math.round(this.cellSize * 0.22)), 0x274c82, 1);
    rail.strokeRoundedRect(
      this.pathBounds.left,
      this.pathBounds.top,
      this.pathBounds.right - this.pathBounds.left,
      this.pathBounds.bottom - this.pathBounds.top,
      30,
    );
    rail.lineStyle(Math.max(6, Math.round(this.cellSize * 0.07)), 0x7eceff, 0.45);
    rail.strokeRoundedRect(
      this.pathBounds.left,
      this.pathBounds.top,
      this.pathBounds.right - this.pathBounds.left,
      this.pathBounds.bottom - this.pathBounds.top,
      26,
    );
    container.add(rail);

    const dash = this.add.graphics();
    for (let i = 0; i < 18; i += 1) {
      const start = this.getPointOnPath(i / 18);
      const end = this.getPointOnPath((i / 18) + 0.03);
      dash.lineStyle(Math.max(5, Math.round(this.cellSize * 0.065)), 0xe1f6ff, 0.18);
      dash.beginPath();
      dash.moveTo(start.x, start.y);
      dash.lineTo(end.x, end.y);
      dash.strokePath();
    }
    container.add(dash);

    [0, 1 / 3, 2 / 3].forEach((progress) => {
      const point = this.getPointOnPath(progress);
      const marker = this.add.circle(point.x, point.y, this.conveyorRadius, 0xffffff, 0.04).setStrokeStyle(4, 0xffffff, 0.14);
      const glow = this.add.circle(point.x, point.y + 18, Math.round(this.conveyorRadius * 0.82), 0x6ac7ff, 0.16).setVisible(false);
      const pig = this.add.image(point.x, point.y, 'pig-red').setDisplaySize(88, 88).setVisible(false);
      const ammo = this.add.text(point.x, point.y + this.ammoOffsetY, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#fefefe',
        fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);

      container.add([marker, glow, pig, ammo]);
      this.conveyorMarkers.push(marker);
      this.conveyorSprites.push({ glow, pig, ammo });
    });

    const dockX = this.pathBounds.left - 34;
    const dockY = this.pathBounds.bottom;
    const dockChrome = this.add.image(dockX, dockY, 'ui-dock-card').setDisplaySize(172, 96).setAlpha(0.98);
    const launchDock = this.createPanel(dockX, dockY, 172, 96, { tint: 0x153764, alpha: 0.44 });
    const launchDockShadow = this.createPanel(dockX + 6, dockY + 8, 172, 96, { tint: 0x061120, alpha: 0.26 });
    const dockLabel = this.add.text(dockX, dockY - 22, 'LAUNCH DOCK', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#b8dbff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const dockArrow = this.add.text(dockX, dockY + 8, '>>', {
      fontFamily: 'Trebuchet MS',
      fontSize: '34px',
      color: '#ffcf7b',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([launchDockShadow, dockChrome, launchDock, dockLabel, dockArrow]);
    this.launchDock = launchDock;
    this.dockArrow = dockArrow;
    this.levelContainers.push(container);
  }

  createPanel(x, y, width, height, options = {}) {
    const { tint = 0xffffff, alpha = 1 } = options;
    return this.add.image(x, y, 'panel').setDisplaySize(width, height).setTint(tint).setAlpha(alpha);
  }

  createInitialState() {
    let cubeId = 0;
    let pigId = 0;
    const board = [];

    this.levelConfig.layout.forEach((row, rowIndex) => {
      row.forEach((color, colIndex) => {
        board.push({
          id: `cube-${cubeId}`,
          row: rowIndex,
          col: colIndex,
          color,
          alive: true,
          reservedBy: null,
        });
        cubeId += 1;
      });
    });

    return {
      phase: 'playing',
      board,
      bench: this.createBenchColumns(
        this.levelConfig.bench.map((pig) => ({
          id: `pig-${pigId += 1}`,
          color: pig.color,
          ammo: pig.ammo,
          initialAmmo: pig.ammo,
        })),
      ),
      queue: [],
      conveyor: [],
      conveyorCapacity: 3,
      jamWarnings: 0,
      jamLimit: 2,
      destroyedCount: 0,
      totalCubes: board.length,
      lastAction: 'Level initialized',
    };
  }

  cloneState(snapshot) {
    return JSON.parse(JSON.stringify(snapshot));
  }

  createBenchColumns(pigs) {
    const columns = Array.from({ length: BENCH_COLUMNS }, () => []);
    pigs.forEach((pig, index) => {
      columns[index % BENCH_COLUMNS].push(pig);
    });
    return columns;
  }

  getBenchCount(state = this.state) {
    return state.bench.reduce((sum, column) => sum + column.length, 0);
  }

  hasPendingBoardResolution() {
    return this.activeProjectiles.length > 0 || this.state.board.some((cube) => cube.alive && cube.reservedBy);
  }

  setStatus(message) {
    this.lastStatus = message;
    this.statusText.setText(message);
    if (this.state) {
      this.state.lastAction = message;
    }
    this.syncGameState();
  }

  launchFrontPig() {
    if (!this.state || this.state.phase !== 'playing') {
      return;
    }

    if (this.state.conveyor.length >= this.state.conveyorCapacity) {
      this.state.jamWarnings += 1;
      if (this.state.jamWarnings >= this.state.jamLimit) {
        this.state.phase = 'lose';
        this.showOverlay('JAMMED', 'The conveyor maxed out twice before space opened. Undo or restart to recover.');
        this.playSfx('jam');
        this.setStatus('Conveyor jam. The run is lost.');
      } else {
        this.playSfx('jam');
        this.setStatus('Conveyor is at capacity. Another forced launch will jam it.');
      }
      this.syncPresentation();
      return;
    }

    this.undoStack.push(this.cloneState(this.state));

    const source = this.selectedPig.source;
    const launchIndex = this.selectedPig.index;
    const frontPig = source === 'queue'
      ? this.state.queue[Phaser.Math.Clamp(launchIndex, 0, Math.max(0, this.state.queue.length - 1))]
      : this.state.bench[Phaser.Math.Clamp(launchIndex, 0, BENCH_COLUMNS - 1)]?.[0];

    if (!frontPig) {
      this.undoStack.pop();
      this.setStatus(`No pigs ready in the ${source}.`);
      return;
    }

    if (source === 'queue') {
      this.state.queue.splice(launchIndex, 1);
    } else {
      this.state.bench[launchIndex].shift();
    }

    if (source === 'queue' && this.state.queue.length > 0) {
      this.selectedPig = { source: 'queue', index: Math.min(launchIndex, this.state.queue.length - 1) };
    } else if (this.getBenchCount() > 0) {
      this.selectedPig = { source: 'bench', index: this.findNextBenchColumn(launchIndex) };
    } else if (this.state.queue.length > 0) {
      this.selectedPig = { source: 'queue', index: Math.min(launchIndex, this.state.queue.length - 1) };
    } else {
      this.selectedPig = { source: 'bench', index: 0 };
    }

    this.state.conveyor.push({
      ...frontPig,
      progress: 0,
      fireCooldown: 100,
      blockedCooldown: 0,
      travelMs: 6200,
    });
    this.state.jamWarnings = 0;
    this.playSfx('launch');
    this.setStatus(`${COLOR_THEMES[frontPig.color].label} pig launched onto the lower conveyor.`);
    this.syncPresentation();
  }

  undoMove() {
    if (!this.undoStack.length) {
      this.setStatus('Undo is empty.');
      return;
    }

    this.state = this.cloneState(this.undoStack.pop());
    if (this.getBenchCount() > 0) {
      this.selectedPig = { source: 'bench', index: this.findNextBenchColumn(this.selectedPig.index) };
    } else if (this.state.queue.length > 0) {
      this.selectedPig = { source: 'queue', index: Math.min(this.selectedPig.index, this.state.queue.length - 1) };
    } else {
      this.selectedPig = { source: 'bench', index: 0 };
    }
    this.overlay.setVisible(false);
    this.setStatus('Last launch undone.');
    this.syncPresentation();
  }

  handleBenchSlotSelection(index) {
    if (!this.state || this.state.phase !== 'playing') {
      return;
    }

    if (!this.state.bench[index]?.length) {
      this.setStatus('That bench column is empty.');
      return;
    }

    this.selectedPig = { source: 'bench', index };
    this.launchFrontPig();
  }

  findNextBenchColumn(preferredIndex = 0, bench = this.state?.bench ?? []) {
    if (!bench.some((column) => column.length)) {
      return 0;
    }

    for (let offset = 0; offset < BENCH_COLUMNS; offset += 1) {
      const index = (preferredIndex + offset) % BENCH_COLUMNS;
      if (bench[index]?.length) {
        return index;
      }
    }

    return 0;
  }

  handleQueueSlotSelection(index) {
    if (!this.state || this.state.phase !== 'playing') {
      return;
    }

    if (!this.state.queue[index]) {
      this.setStatus('That queue slot is empty.');
      return;
    }

    this.selectedPig = { source: 'queue', index };
    this.launchFrontPig();
  }

  handlePrimaryOverlayAction() {
    if (this.state?.phase === 'win' && this.currentLevelIndex < LEVELS.length - 1) {
      this.transitionToNextLevel();
      return;
    }

    this.transitionToRestart();
  }

  showOverlay(title, body) {
    const hasNextLevel = this.state?.phase === 'win' && this.currentLevelIndex < LEVELS.length - 1;
    this.overlayTitle.setText(title);
    this.overlayBody.setText(body);
    this.overlayPrimaryButton.text.setText(hasNextLevel ? 'NEXT LEVEL' : 'PLAY AGAIN');
    this.overlay.setVisible(true).setAlpha(0).setScale(0.96);
    this.tweens.killTweensOf(this.overlay);
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Cubic.Out',
    });
  }

  transitionToRestart() {
    if (this.isSceneTransitioning) {
      return;
    }
    this.isSceneTransitioning = true;
    this.cameras.main.fadeOut(180, 7, 18, 33);
    this.time.delayedCall(190, () => {
      this.resetLevel('Level restarted.');
      this.cameras.main.fadeIn(220, 7, 18, 33);
      this.isSceneTransitioning = false;
    });
  }

  transitionToNextLevel() {
    if (this.isSceneTransitioning) {
      return;
    }
    this.isSceneTransitioning = true;
    this.cameras.main.fadeOut(180, 7, 18, 33);
    this.time.delayedCall(190, () => {
      this.advanceLevel();
      this.cameras.main.fadeIn(220, 7, 18, 33);
      this.isSceneTransitioning = false;
    });
  }

  transitionToMenu() {
    if (this.isSceneTransitioning) {
      return;
    }
    this.isSceneTransitioning = true;
    this.input.enabled = false;
    this.overlay?.setVisible(false);
    this.levelIntro?.setVisible(false);
    syncStoredProgress();
    window.location.assign(window.location.pathname || '/');
  }

  update(_, delta) {
    if (!this.state || this.state.phase !== 'playing') {
      return;
    }

    this.activeProjectiles = this.activeProjectiles.filter((projectile) => projectile.active);
    let stateChanged = false;

    this.state.conveyor.forEach((pig) => {
      pig.progress = Math.min(1, pig.progress + delta / pig.travelMs);
      pig.fireCooldown -= delta;
      pig.blockedCooldown = Math.max(0, (pig.blockedCooldown ?? 0) - delta);

      while (pig.fireCooldown <= 0 && pig.ammo > 0) {
        const visibleCube = this.getVisibleCubeForPig(pig);
        if (!visibleCube) {
          pig.fireCooldown += 120;
          break;
        }

        if (visibleCube.color !== pig.color) {
          pig.fireCooldown += 180;
          if ((pig.blockedCooldown ?? 0) <= 0) {
            pig.blockedCooldown = 360;
            this.playSfx('blocked');
          }
          break;
        }

        pig.fireCooldown += 260;
        pig.ammo -= 1;
        this.spawnProjectile(pig, visibleCube);
        stateChanged = true;
      }
    });

    const returned = [];
    this.state.conveyor = this.state.conveyor.filter((pig) => {
      if (pig.progress < 1 && pig.ammo > 0) {
        return true;
      }

      if (pig.ammo > 0) {
        returned.push({
          id: pig.id,
          color: pig.color,
          ammo: pig.ammo,
          initialAmmo: pig.initialAmmo,
        });
      }
      stateChanged = true;
      return false;
    });

    if (returned.length) {
      this.state.queue.push(...returned);
      this.playSfx('queue');
      this.setStatus('A returning pig moved into the queue above the bench.');
    }

    if (this.state.destroyedCount >= this.state.totalCubes) {
      this.state.phase = 'win';
      markLevelCompleted(this.currentLevelIndex, LEVELS.length);
      const winMessage = this.currentLevelIndex < LEVELS.length - 1
        ? `Board clear. Level ${this.currentLevelIndex + 2} is now unlocked.`
        : 'The full level set is clear. Restart to replay the final premium loop.';
      this.showOverlay('BOARD CLEAR', winMessage);
      this.playSfx('win');
      this.setStatus(`Level ${this.currentLevelIndex + 1} cleared.`);
      stateChanged = true;
    } else if (
      !this.getBenchCount()
      && !this.state.queue.length
      && !this.state.conveyor.length
      && !this.hasPendingBoardResolution()
    ) {
      this.state.phase = 'lose';
      this.showOverlay('OUT OF PIGS', 'No pigs remain on the bench, in the queue, or on the conveyor before the board was cleared.');
      this.playSfx('lose');
      this.setStatus('Loss. No pigs remain.');
      stateChanged = true;
    }

    if (stateChanged) {
      this.syncPresentation();
    } else {
      this.syncConveyor();
      this.syncGameState();
    }
  }

  getVisibleCubeForPig(pig) {
    const point = this.getPointOnPath(pig.progress);
    const side = this.getConveyorSide(pig.progress);

    if (side === 'bottom' || side === 'top') {
      const col = Phaser.Math.Clamp(
        Math.round((point.x - this.boardOrigin.x) / this.cellSize),
        0,
        this.gridCols - 1,
      );
      const rowOrder = side === 'bottom'
        ? [...Array(this.gridRows).keys()].reverse()
        : [...Array(this.gridRows).keys()];
      return this.getFirstVisibleCubeInColumn(col, rowOrder);
    }

    const row = Phaser.Math.Clamp(
      Math.round((point.y - this.boardOrigin.y) / this.cellSize),
      0,
      this.gridRows - 1,
    );
    const colOrder = side === 'left'
      ? [...Array(this.gridCols).keys()]
      : [...Array(this.gridCols).keys()].reverse();
    return this.getFirstVisibleCubeInRow(row, colOrder);
  }

  getCubeAt(row, col) {
    return this.state.board.find((cube) => cube.row === row && cube.col === col);
  }

  getFirstVisibleCubeInColumn(col, rowOrder) {
    for (const row of rowOrder) {
      const cube = this.getCubeAt(row, col);
      if (cube?.alive && !cube.reservedBy) {
        return cube;
      }
    }
    return null;
  }

  getFirstVisibleCubeInRow(row, colOrder) {
    for (const col of colOrder) {
      const cube = this.getCubeAt(row, col);
      if (cube?.alive && !cube.reservedBy) {
        return cube;
      }
    }
    return null;
  }

  getConveyorSide(progress) {
    const wrapped = Phaser.Math.Wrap(progress, 0, 1);
    const segmentLengths = this.pathSegments.map((segment) =>
      Phaser.Math.Distance.Between(segment.from.x, segment.from.y, segment.to.x, segment.to.y),
    );
    const total = segmentLengths.reduce((sum, value) => sum + value, 0);
    let remaining = wrapped * total;

    for (let i = 0; i < segmentLengths.length; i += 1) {
      if (remaining <= segmentLengths[i]) {
        return ['bottom', 'right', 'top', 'left'][i];
      }
      remaining -= segmentLengths[i];
    }

    return 'bottom';
  }

  getPigTextureForSide(color, side) {
    const theme = COLOR_THEMES[color];
    switch (side) {
      case 'bottom':
        return theme.pigTextureBack;
      case 'right':
        return theme.pigTextureLeft;
      case 'left':
        return theme.pigTextureRight;
      case 'top':
      default:
        return theme.pigTexture;
    }
  }

  getConveyorPigDisplaySize(side) {
    switch (side) {
      case 'bottom':
        return { width: 72, height: 72 };
      case 'left':
      case 'right':
        return { width: 76, height: 76 };
      case 'top':
      default:
        return { width: 88, height: 88 };
    }
  }

  spawnProjectile(pig, target) {
    target.reservedBy = pig.id;
    const start = this.getPointOnPath(pig.progress);
    const end = {
      x: this.boardOrigin.x + target.col * this.cellSize,
      y: this.boardOrigin.y + target.row * this.cellSize,
    };
    const theme = COLOR_THEMES[pig.color];
    this.playSfx('shot');
    const projectile = this.add.circle(start.x, start.y, Math.max(6, Math.round(this.cellSize * 0.08)), theme.accent, 1).setDepth(60);
    projectile.setStrokeStyle(3, 0xffffff, 0.85);
    const trail = this.add.rectangle(start.x, start.y, Math.max(14, Math.round(this.cellSize * 0.2)), Math.max(4, Math.round(this.cellSize * 0.05)), theme.accent, 0.42)
      .setDepth(59)
      .setAngle(Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y)));
    this.activeProjectiles.push(projectile);

    this.tweens.add({
      targets: [projectile, trail],
      x: end.x,
      y: end.y,
      scale: 0.7,
      duration: 220,
      ease: 'Cubic.In',
      onComplete: () => {
        if (target.alive) {
          target.reservedBy = null;
          target.alive = false;
          this.state.destroyedCount += 1;
          this.spawnPop(target);
          this.pulseBoardTile(target);

          if (this.state.destroyedCount >= this.state.totalCubes && this.state.phase === 'playing') {
            this.state.phase = 'win';
            markLevelCompleted(this.currentLevelIndex, LEVELS.length);
            const winMessage = this.currentLevelIndex < LEVELS.length - 1
              ? `Board clear. Level ${this.currentLevelIndex + 2} is now unlocked.`
              : 'The full level set is clear. Restart to replay the final premium loop.';
            this.showOverlay('BOARD CLEAR', winMessage);
            this.setStatus(`Level ${this.currentLevelIndex + 1} cleared.`);
            this.celebrateBoardClear();
            this.syncPresentation();
          } else {
            this.syncPresentation();
          }
        } else {
          target.reservedBy = null;
        }

        projectile.destroy();
        trail.destroy();
      },
    });
  }

  spawnPop(cube) {
    const x = this.boardOrigin.x + cube.col * this.cellSize;
    const y = this.boardOrigin.y + cube.row * this.cellSize;
    const accent = COLOR_THEMES[cube.color].accent;
    this.playSfx('pop');
    const ring = this.add.circle(x, y, Math.max(16, Math.round(this.cellSize * 0.23)), accent, 0.72).setDepth(55);
    const sparkA = this.add.rectangle(x - 16, y + 8, Math.max(10, Math.round(this.cellSize * 0.14)), Math.max(4, Math.round(this.cellSize * 0.06)), accent, 0.86).setDepth(55);
    const sparkB = this.add.rectangle(x + 16, y - 8, Math.max(10, Math.round(this.cellSize * 0.14)), Math.max(4, Math.round(this.cellSize * 0.06)), 0xffffff, 0.9).setDepth(55);
    const flash = this.add.circle(x, y, Math.max(12, Math.round(this.cellSize * 0.18)), 0xffffff, 0.9).setDepth(56);

    this.tweens.add({
      targets: [ring, sparkA, sparkB, flash],
      alpha: 0,
      scale: 2.2,
      angle: '+=45',
      duration: 240,
      onComplete: () => {
        ring.destroy();
        sparkA.destroy();
        sparkB.destroy();
        flash.destroy();
      },
    });
  }

  pulseBoardTile(cube) {
    const sprite = this.boardSprites.find((entry, index) => {
      const boardCube = this.state.board[index];
      return boardCube?.id === cube.id;
    });
    if (!sprite) {
      return;
    }

    sprite.plate.setAlpha(1);
    sprite.glow.setAlpha(0.28);
    this.tweens.add({
      targets: [sprite.plate, sprite.glow],
      alpha: { from: sprite.plate.alpha, to: 0.24 },
      duration: 180,
      yoyo: true,
    });
  }

  celebrateBoardClear() {
    const burst = this.add.particles(0, 0, 'pig-red', {
      x: { min: this.boardBounds.left, max: this.boardBounds.right },
      y: { min: this.boardBounds.top, max: this.boardBounds.bottom },
      speedY: { min: -220, max: -120 },
      speedX: { min: -70, max: 70 },
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.45, end: 0 },
      lifespan: 700,
      quantity: 1,
      frequency: 22,
      tint: [0xffd34d, 0xff6b6b, 0x63d98f],
      blendMode: 'ADD',
    }).setDepth(70);

    this.time.delayedCall(520, () => burst.destroy());
  }

  syncPresentation() {
    this.syncBoard();
    this.syncQueue();
    this.syncBench();
    this.syncConveyor();
    this.syncButtons();
    this.syncGameState();
  }

  syncBoard() {
    this.state.board.forEach((cube, index) => {
      const sprite = this.boardSprites[index];
      const theme = COLOR_THEMES[cube.color];
      sprite.cube.setTexture(theme.cubeTexture);
      sprite.cube.setVisible(cube.alive);
      sprite.plate.setAlpha(cube.alive ? 0.82 : 0.28);
      sprite.plate.setStrokeStyle(
        Math.max(2, Math.round(this.cellSize * 0.025)),
        cube.alive ? theme.accent : 0x97cbff,
        cube.alive ? 0.12 : 0.05,
      );
      sprite.reveal.setAlpha(cube.alive ? 0.18 : 0.94);
      sprite.underlay.setAlpha(cube.alive ? 0.26 : 0.05);
      sprite.glow.setAlpha(cube.alive ? 0.1 : 0.02);
      sprite.glow.setFillStyle(theme.accent, cube.alive ? 0.1 : 0.02);
      const displaySize = cube.alive ? this.cubeDisplaySize : this.cubeDisplaySize * 0.92;
      sprite.cube.setDisplaySize(displaySize, displaySize);
      sprite.cube.setTint(cube.alive ? 0xffffff : 0xf0fbff);
    });

    this.levelText.setText(
      `LEVEL ${this.currentLevelIndex + 1}  ${this.levelConfig.name.toUpperCase()}  ${this.gridRows}x${this.gridCols}`,
    );
    this.metricsText.setText(
      `Cleared ${this.state.destroyedCount}/${this.state.totalCubes}   Bench ${this.getBenchCount()}   Queue ${this.state.queue.length}   Conveyor ${this.state.conveyor.length}/${this.state.conveyorCapacity}   Pixel ${this.cellSize}px`,
    );
  }

  syncQueue() {
    this.queueSprites.forEach((slot, index) => {
      const pig = this.state.queue[index];
      const isSelected = this.selectedPig.source === 'queue' && index === this.selectedPig.index && this.state.phase === 'playing';
      slot.chrome.setAlpha(pig ? (isSelected ? 1 : 0.94) : 0.3);
      slot.tray.setFillStyle(pig ? (isSelected ? 0xffefd7 : 0xeaf7ff) : 0x143157, pig ? (isSelected ? 0.22 : 0.1) : 0.12);
      slot.tray.setStrokeStyle(0, 0x000000, 0);
      slot.pig.setVisible(Boolean(pig));
      slot.ammo.setVisible(Boolean(pig));

      if (pig) {
        const displaySize = isSelected ? 80 : 76;
        slot.pig.setTexture(COLOR_THEMES[pig.color].pigTexture).setDisplaySize(displaySize, displaySize);
        slot.ammo.setText(`x${pig.ammo}`).setColor(isSelected ? '#173258' : '#31548b');
      }
    });
  }

  syncBench() {
    const selectedPig = this.selectedPig.source === 'queue'
      ? (this.state.queue[this.selectedPig.index] ?? this.state.bench[this.findNextBenchColumn()]?.[0] ?? this.state.queue[0])
      : (this.state.bench[this.selectedPig.index]?.[0] ?? this.state.bench[this.findNextBenchColumn()]?.[0] ?? this.state.queue[0]);

    this.dockArrow.setVisible(Boolean(selectedPig));
    if (selectedPig) {
      this.launchDock.setTint(COLOR_THEMES[selectedPig.color].shadow);
      this.dockArrow.setColor('#ffcf7b');
    } else {
      this.launchDock.setTint(0x153764);
      this.dockArrow.setColor('#8ea8c7');
    }

    this.benchColumns.forEach((columnView, index) => {
      const column = this.state.bench[index] ?? [];
      const isSelected = this.selectedPig.source === 'bench' && index === this.selectedPig.index && this.state.phase === 'playing';
      columnView.chrome.setAlpha(column.length ? (isSelected ? 1 : 0.96) : 0.4);
      columnView.column.setFillStyle(isSelected ? 0xffefd7 : 0x173258, isSelected ? 0.22 : 0.14);
      columnView.column.setStrokeStyle(0, 0x000000, 0);

      columnView.slots.forEach((slotView, depth) => {
        const pig = column[depth];
        slotView.pad.setFillStyle(0xffffff, pig ? (isSelected && depth === 0 ? 0.16 : depth === 0 ? 0.1 : 0.06) : 0.03);
        slotView.pig.setVisible(Boolean(pig));
        slotView.ammo.setVisible(Boolean(pig));

        if (pig) {
          const displaySize = depth === 0 ? (isSelected ? 70 : 66) : 60;
          slotView.pig.setTexture(COLOR_THEMES[pig.color].pigTexture).setDisplaySize(displaySize, displaySize);
          slotView.ammo.setText(`x${pig.ammo}`).setColor(depth === 0 && isSelected ? '#173258' : '#31548b');
        }
      });

      const overflowCount = Math.max(0, column.length - BENCH_VISIBLE_DEPTH);
      columnView.overflow.setVisible(overflowCount > 0);
      if (overflowCount > 0) {
        columnView.overflow.setText(`+${overflowCount} more`).setColor(isSelected ? '#b4491f' : '#31548b');
      }
    });
  }

  syncConveyor() {
    this.conveyorSprites.forEach((slot, index) => {
      const pig = this.state.conveyor[index];
      if (!pig) {
        slot.glow.setVisible(false);
        slot.pig.setVisible(false);
        slot.ammo.setVisible(false);
        return;
      }

      const point = this.getPointOnPath(pig.progress);
      const side = this.getConveyorSide(pig.progress);
      const displaySize = this.getConveyorPigDisplaySize(side);
      slot.glow.setVisible(true).setPosition(point.x, point.y + 18).setFillStyle(COLOR_THEMES[pig.color].accent, 0.2);
      slot.pig
        .setVisible(true)
        .setTexture(this.getPigTextureForSide(pig.color, side))
        .setPosition(point.x, point.y)
        .setDisplaySize(displaySize.width, displaySize.height)
        .setAngle(0);
      slot.ammo.setVisible(true).setPosition(point.x, point.y + this.ammoOffsetY).setText(`x${pig.ammo}`);
    });
  }

  syncButtons() {
    this.setButtonState(this.resetButton, true);
  }

  setButtonState(button, enabled) {
    button.shadow.setAlpha(enabled ? 0.28 : 0.12);
    button.rect.setAlpha(enabled ? 1 : 0.45);
    button.shine.setAlpha(enabled ? 0.14 : 0.05);
    button.text.setAlpha(enabled ? 1 : 0.55);
    button.zone.input.enabled = enabled;
  }

  getPointOnPath(progress) {
    let remaining = Phaser.Math.Wrap(progress, 0, 1) * this.pathTotalLength;

    for (const segment of this.pathSegments) {
      const length = Phaser.Math.Distance.Between(segment.from.x, segment.from.y, segment.to.x, segment.to.y);
      if (remaining <= length) {
        const t = length === 0 ? 0 : remaining / length;
        return {
          x: Phaser.Math.Linear(segment.from.x, segment.to.x, t),
          y: Phaser.Math.Linear(segment.from.y, segment.to.y, t),
        };
      }
      remaining -= length;
    }

    return { ...this.pathStart };
  }

  syncGameState() {
    if (!this.state) {
      return;
    }

    gameState.phase = this.state.phase;
    gameState.notes = [
      this.lastStatus,
      `Level ${this.currentLevelIndex + 1}/${LEVELS.length}: ${this.levelConfig.name}.`,
      `Unlocked ${gameState.unlockedLevelCount}/${LEVELS.length} levels. Completed ${gameState.completedLevels.length}.`,
      this.levelConfig.description,
      `Pixel grid scales to fit the board area at ${this.gridRows} rows x ${this.gridCols} columns.`,
      'Conveyor path: bottom to right side, then top, then down the left side.',
      'Returning pigs leave the conveyor into the queue above the bench.',
    ];
    gameState.gameplay = {
      coordinateSystem: {
        origin: 'top-left',
        x: 'increases to the right',
        y: 'increases downward',
      },
      level: {
        index: this.currentLevelIndex,
        number: this.currentLevelIndex + 1,
        total: LEVELS.length,
        completed: gameState.completedLevels.includes(this.currentLevelIndex),
        unlockedLevelCount: gameState.unlockedLevelCount,
        id: this.levelConfig.id,
        name: this.levelConfig.name,
        rows: this.gridRows,
        cols: this.gridCols,
        pixelSize: this.cellSize,
      },
      board: this.state.board
        .filter((cube) => cube.alive)
        .map((cube) => ({
          row: cube.row,
          col: cube.col,
          color: cube.color,
        })),
      bench: this.state.bench.map((column, index) => ({
        column: index,
        selected: this.selectedPig.source === 'bench' && index === this.selectedPig.index,
        pigs: column.map((pig, depth) => ({
          depth,
          color: pig.color,
          ammo: pig.ammo,
        })),
      })),
      queue: this.state.queue.map((pig, index) => ({
        slot: index,
        color: pig.color,
        ammo: pig.ammo,
        selected: this.selectedPig.source === 'queue' && index === this.selectedPig.index,
      })),
      conveyor: this.state.conveyor.map((pig) => ({
        color: pig.color,
        ammo: pig.ammo,
        progress: Number(pig.progress.toFixed(2)),
      })),
      destroyedCount: this.state.destroyedCount,
      totalCubes: this.state.totalCubes,
      jamWarnings: this.state.jamWarnings,
      conveyorCapacity: this.state.conveyorCapacity,
      lastAction: this.state.lastAction,
      canUndo: this.undoStack.length > 0,
    };
  }
}

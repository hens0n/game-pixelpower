import Phaser from 'phaser';
import { gameState } from '../state/gameState.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    gameState.currentScene = 'BootScene';
    gameState.phase = 'booting';
    this.load.image('premium-panel', '/assets/premium/panel.png');
    this.load.image('pig-red', '/assets/premium/pig-red.png');
    this.load.image('pig-yellow', '/assets/premium/pig-yellow.png');
    this.load.image('pig-green', '/assets/premium/pig-green.png');
    this.load.image('pig-red-back', '/assets/premium/pig-red-back-premium.png');
    this.load.image('pig-red-left', '/assets/premium/pig-red-left-premium.png');
    this.load.image('pig-red-right', '/assets/premium/pig-red-right-premium.png');
    this.load.image('pig-yellow-back', '/assets/premium/pig-yellow-back-premium.png');
    this.load.image('pig-yellow-left', '/assets/premium/pig-yellow-left-premium.png');
    this.load.image('pig-yellow-right', '/assets/premium/pig-yellow-right-premium.png');
    this.load.image('pig-green-back', '/assets/premium/pig-green-back-premium.png');
    this.load.image('pig-green-left', '/assets/premium/pig-green-left-premium.png');
    this.load.image('pig-green-right', '/assets/premium/pig-green-right-premium.png');
    this.load.image('cube-blue', '/assets/premium/cube-blue.png');
    this.load.image('cube-red', '/assets/premium/cube-red.png');
    this.load.image('cube-yellow', '/assets/premium/cube-yellow.png');
    this.load.image('cube-green', '/assets/premium/cube-green.png');
    this.load.image('cube-blue-top', '/assets/premium/cube-blue-top-premium.png');
    this.load.image('cube-red-top', '/assets/premium/cube-red-top-premium.png');
    this.load.image('cube-yellow-top', '/assets/premium/cube-yellow-top-premium.png');
    this.load.image('cube-green-top', '/assets/premium/cube-green-top-premium.png');
    this.load.image('ui-dock-card', '/assets/premium-ui/dock-card.png');
    this.load.image('ui-queue-tray', '/assets/premium-ui/queue-tray.png');
    this.load.image('ui-bench-column', '/assets/premium-ui/bench-column-card.png');
  }

  create() {
    this.createTextures();
    gameState.phase = 'menu';
    this.scene.start('MenuScene');
  }

  createTextures() {
    const graphics = this.add.graphics();
    this.createTrimmedUiTexture('ui-queue-tray', 'ui-queue-tray-trimmed', {
      x: 49,
      y: 70,
      width: 166,
      height: 50,
    });
    this.createTrimmedUiTexture('ui-bench-column', 'ui-bench-column-trimmed', {
      x: 84,
      y: 166,
      width: 100,
      height: 317,
    });
    if (!this.textures.exists('panel')) {
      this.createPanelTexture(graphics);
    }
    if (!this.textures.exists('pig-red')) {
      this.createPigTexture(graphics, 'pig-red', 0xff6c6c, 0xffd796);
    }
    if (!this.textures.exists('pig-yellow')) {
      this.createPigTexture(graphics, 'pig-yellow', 0xffd34d, 0xffefad);
    }
    if (!this.textures.exists('pig-green')) {
      this.createPigTexture(graphics, 'pig-green', 0x63d98f, 0xc7f8d9);
    }
    if (!this.textures.exists('cube-blue-top')) {
      this.createTopCubeTexture(graphics, 'cube-blue-top', 0x77c2ff, 0xcff0ff, 0x3e7fd8, 0x163d73);
    }
    if (!this.textures.exists('cube-red-top')) {
      this.createTopCubeTexture(graphics, 'cube-red-top', 0xff6e7a, 0xffd2d7, 0xdb4358, 0x6a1f31);
    }
    if (!this.textures.exists('cube-yellow-top')) {
      this.createTopCubeTexture(graphics, 'cube-yellow-top', 0xffd74f, 0xfff2b6, 0xe2a91f, 0x7a5a14);
    }
    if (!this.textures.exists('cube-green-top')) {
      this.createTopCubeTexture(graphics, 'cube-green-top', 0x6be49a, 0xd6ffe5, 0x36b56a, 0x1f6a47);
    }
    graphics.destroy();
  }

  createTrimmedUiTexture(sourceKey, targetKey, crop) {
    if (this.textures.exists(targetKey)) {
      return;
    }

    const sourceImage = this.textures.get(sourceKey)?.getSourceImage();
    if (!sourceImage) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.drawImage(
      sourceImage,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
    this.textures.addCanvas(targetKey, canvas);
  }

  createPanelTexture(graphics) {
    graphics.clear();
    graphics.fillStyle(0xf8fdff, 1);
    graphics.fillRoundedRect(0, 0, 520, 180, 28);
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillRoundedRect(18, 14, 484, 36, 18);
    graphics.fillStyle(0xd8efff, 0.85);
    graphics.fillRoundedRect(0, 128, 520, 52, { tl: 0, tr: 0, bl: 28, br: 28 });
    graphics.lineStyle(8, 0x16325c, 1);
    graphics.strokeRoundedRect(0, 0, 520, 180, 28);
    graphics.lineStyle(3, 0xffffff, 0.45);
    graphics.strokeRoundedRect(12, 10, 496, 160, 24);
    graphics.generateTexture('panel', 520, 180);
    graphics.clear();
  }

  createPigTexture(graphics, key, bodyColor, snoutColor) {
    graphics.clear();
    graphics.fillStyle(0x0f223d, 0.18);
    graphics.fillEllipse(34, 50, 42, 18);
    graphics.fillStyle(bodyColor, 1);
    graphics.fillTriangle(18, 10, 28, 0, 32, 18);
    graphics.fillTriangle(46, 10, 36, 0, 32, 18);
    graphics.fillCircle(32, 32, 28);
    graphics.fillStyle(0xffffff, 0.25);
    graphics.fillEllipse(22, 20, 18, 10);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(24, 26, 6);
    graphics.fillCircle(40, 26, 6);
    graphics.fillStyle(0x24365f, 1);
    graphics.fillCircle(24, 26, 3);
    graphics.fillCircle(40, 26, 3);
    graphics.fillStyle(snoutColor, 1);
    graphics.fillRoundedRect(17, 38, 30, 14, 7);
    graphics.fillStyle(0xd85c6f, 0.6);
    graphics.fillCircle(27, 45, 2);
    graphics.fillCircle(37, 45, 2);
    graphics.lineStyle(2, 0xffffff, 0.3);
    graphics.strokeCircle(32, 32, 27);
    graphics.generateTexture(key, 64, 64);
  }

  createTopCubeTexture(graphics, key, topColor, highlightColor, bevelColor, shadowColor) {
    graphics.clear();
    graphics.fillStyle(0x071221, 0.2);
    graphics.fillRoundedRect(8, 10, 48, 48, 14);
    graphics.fillStyle(shadowColor, 0.95);
    graphics.fillRoundedRect(6, 8, 52, 52, 14);
    graphics.fillStyle(bevelColor, 1);
    graphics.fillRoundedRect(8, 10, 48, 48, 13);
    graphics.fillStyle(topColor, 1);
    graphics.fillRoundedRect(12, 14, 40, 40, 11);
    graphics.fillStyle(highlightColor, 0.92);
    graphics.fillRoundedRect(16, 18, 24, 10, 6);
    graphics.fillStyle(0xffffff, 0.2);
    graphics.fillRoundedRect(18, 20, 18, 6, 4);
    graphics.lineStyle(2, 0xffffff, 0.68);
    graphics.strokeRoundedRect(11, 13, 42, 42, 11);
    graphics.lineStyle(3, 0xffffff, 0.18);
    graphics.strokeRoundedRect(8, 10, 48, 48, 13);
    graphics.generateTexture(key, 64, 64);
  }
}

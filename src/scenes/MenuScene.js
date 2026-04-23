import Phaser from 'phaser';
import {
  gameState,
  getHighestUnlockedLevelIndex,
  isLevelUnlocked,
  setSelectedLevelIndex,
  getStarsForLevel,
  isLevelCompleted,
} from '../state/gameState.js';
import { LEVELS } from '../data/levels.js';

const CARDS_PER_PAGE = 6;
const CARD_COLUMNS = 2;
const CARD_WIDTH = 402;
const CARD_HEIGHT = 158;
const CARD_GAP_X = 438;
const CARD_GAP_Y = 194;
const PREVIEW_COLORS = {
  red: 0xff6e7a,
  yellow: 0xffd74f,
  green: 0x6be49a,
  blue: 0x77c2ff,
  brown: 0x8b5a3c,
  pink: 0xffa6cf,
  white: 0xf2f6fb,
  black: 0x2b2f37,
  gray: 0x9ca3af,
  tan: 0xe6d2ab,
  orange: 0xffa54d,
  purple: 0xa78bfa,
  teal: 0x2fd6c4,
};

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.levelCards = [];
    this.pageIndicators = [];
    this.levelDescription = null;
    this.launchButton = null;
    this.helperText = null;
    this.progressText = null;
    this.progressSubtext = null;
    this.progressFill = null;
    this.progressFillMask = null;
    this.pageLabel = null;
    this.previewTitle = null;
    this.previewMeta = null;
    this.previewBoard = null;
    this.navButtons = {};
    this.browserSwipeStart = null;
    this.browserSwipeBounds = null;
    this.currentPage = 0;
  }

  create() {
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.children.removeAll(true);
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.scale.removeAllListeners();
    this.input.enabled = true;
    this.input.topOnly = true;
    this.levelCards = [];
    this.pageIndicators = [];
    gameState.currentScene = 'MenuScene';
    gameState.phase = 'menu';
    gameState.gameplay = null;

    const { width, height } = this.scale;
    const selectedLevelIndex = Phaser.Math.Clamp(
      gameState.selectedLevelIndex ?? 0,
      0,
      getHighestUnlockedLevelIndex(LEVELS.length),
    );
    setSelectedLevelIndex(selectedLevelIndex, LEVELS.length);
    this.currentPage = this.getPageForLevel(selectedLevelIndex);

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBackgroundColor('#0d1d37');

    this.drawBackdrop(width, height);
    this.createHeader(width);
    this.createProgressPanel(width);
    this.createLevelBrowser(width);
    this.createPreviewPanel(width, height);
    this.createFooter(width, height);
    this.bindInput();
    this.refreshLevelPicker();

    this.cameras.main.fadeIn(220, 7, 18, 33);
  }

  drawBackdrop(width, height) {
    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x0d1d37);
    this.add.ellipse(width * 0.2, 190, 420, 260, 0x1f4d84, 0.34);
    this.add.ellipse(width * 0.83, 1660, 520, 320, 0x173863, 0.22);
    this.add.ellipse(width * 0.86, 180, 300, 190, 0x4b9fe8, 0.14);
    this.add.rectangle(width * 0.5, height * 0.58, width - 96, height - 310, 0x081325, 0.82).setStrokeStyle(2, 0x8bc7ff, 0.12);
  }

  createHeader(width) {
    this.createPanel(width * 0.5, 256, width - 120, 250, { tint: 0xfbfdff });
    this.add.image(184, 256, 'pig-red').setDisplaySize(148, 148);
    this.add.image(width - 184, 256, 'pig-green').setDisplaySize(148, 148).setFlipX(true);

    this.add.text(width * 0.5, 208, 'PIXEL POWER', {
      fontFamily: 'Trebuchet MS',
      fontSize: '74px',
      color: '#173258',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width * 0.5, 286, 'A 50-level conveyor puzzle campaign with strict line shots, premium pixels, and milestone picture boards.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#31548b',
      align: 'center',
      wordWrap: { width: width - 320 },
    }).setOrigin(0.5);
  }

  createProgressPanel(width) {
    this.add.text(92, 426, 'CAMPAIGN', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#dfeaff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.createPanel(width * 0.5, 508, width - 120, 118, { tint: 0xf3fbff });
    this.add.rectangle(540, 526, 756, 22, 0xc9def5, 0.75).setStrokeStyle(2, 0x93bbe3, 0.35);
    this.progressFill = this.add.rectangle(162, 526, 0, 14, 0xff8b4d, 0.95).setOrigin(0, 0.5);
    this.progressText = this.add.text(width * 0.5, 488, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '30px',
      color: '#173258',
      align: 'center',
      wordWrap: { width: width - 220 },
    }).setOrigin(0.5);
    this.progressSubtext = this.add.text(width * 0.5, 548, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#4f7098',
      align: 'center',
      wordWrap: { width: width - 220 },
    }).setOrigin(0.5);
  }

  createLevelBrowser(width) {
    this.add.text(92, 624, 'LEVEL BROWSER', {
      fontFamily: 'Trebuchet MS',
      fontSize: '30px',
      color: '#dfeaff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.createPanel(width * 0.5, 980, width - 120, 700, { tint: 0xf5fbff });
    this.browserSwipeBounds = new Phaser.Geom.Rectangle(84, 664, width - 168, 648);
    this.pageLabel = this.add.text(width * 0.5, 672, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#305280',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.navButtons.prev = this.createNavButton(126, 984, '<');
    this.navButtons.next = this.createNavButton(width - 126, 984, '>');

    [this.navButtons.prev.zone, this.navButtons.prev.circle, this.navButtons.prev.text].forEach((target) => {
      target.on('pointerdown', () => this.shiftPage(-1));
    });
    [this.navButtons.next.zone, this.navButtons.next.circle, this.navButtons.next.text].forEach((target) => {
      target.on('pointerdown', () => this.shiftPage(1));
    });

    const startX = 320;
    const startY = 794;

    LEVELS.forEach((level, index) => {
      const pageIndex = Math.floor(index / CARDS_PER_PAGE);
      const slotIndex = index % CARDS_PER_PAGE;
      const row = Math.floor(slotIndex / CARD_COLUMNS);
      const col = slotIndex % CARD_COLUMNS;
      const x = startX + col * CARD_GAP_X;
      const y = startY + row * CARD_GAP_Y;
      const container = this.add.container(x, y);
      const shadow = this.add.rectangle(0, 10, CARD_WIDTH, CARD_HEIGHT, 0x061120, 0.25);
      const card = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x183456, 0.94).setStrokeStyle(4, 0x69c4ff, 0.36);
      const number = this.add.text(-164, -48, `LEVEL ${index + 1}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#f6fbff',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const name = this.add.text(-164, -8, level.name.toUpperCase(), {
        fontFamily: 'Trebuchet MS',
        fontSize: '28px',
        color: '#d7ebff',
        fontStyle: 'bold',
        wordWrap: { width: 262 },
      }).setOrigin(0, 0.5);
      const description = this.add.text(-164, 42, level.description, {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#c6dcf7',
        wordWrap: { width: 260, useAdvancedWrap: true },
        maxLines: 2,
      }).setOrigin(0, 0.5);
      const meta = this.add.text(90, -18, `${level.layout.length}x${level.layout[0].length}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#ffd47f',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const bench = this.add.text(90, 20, `${level.bench.length} pigs`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#dfeaff',
      }).setOrigin(0.5);
      const status = this.add.text(90, 56, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#d7ebff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const badge = this.add.text(136, -54, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '16px',
        color: '#173258',
        backgroundColor: '#7fe0a0',
        padding: { x: 10, y: 4 },
        fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);
      let star = null;
      if (level.milestone) {
        star = this.add.text(CARD_WIDTH * 0.5 - 30, -CARD_HEIGHT * 0.5 + 10, '\u2605', {
          fontSize: '20px',
          color: '#ffd74f',
        }).setOrigin(0.5).setDepth(15);
      }

      const starRow = this.buildStarRow(35, -62, 9);
      starRow.forEach((s) => s.setDepth(15));

      const hit = this.add.zone(0, 0, CARD_WIDTH + 24, CARD_HEIGHT + 24).setInteractive({ useHandCursor: true });

      const select = () => {
        if (!isLevelUnlocked(index)) {
          this.setLockedStatus(index);
          return;
        }
        setSelectedLevelIndex(index, LEVELS.length);
        this.currentPage = this.getPageForLevel(index);
        this.refreshLevelPicker();
      };

      const hoverIn = () => {
        if (!container.visible) {
          return;
        }
        shadow.setAlpha(0.36);
        if (index !== gameState.selectedLevelIndex) {
          container.setScale(1.015);
        }
      };

      const hoverOut = () => {
        const active = index === gameState.selectedLevelIndex;
        shadow.setAlpha(active ? 0.38 : 0.25);
        container.setScale(active && isLevelUnlocked(index) ? 1.02 : 1);
      };

      hit.on('pointerdown', select);
      const interactiveItems = [hit, card, number, name, description, meta, bench, status, badge];
      const clickableItems = [card, number, name, description, meta, bench, status, badge];
      const containerItems = [shadow, card, number, name, description, meta, bench, status, badge];
      if (star) {
        interactiveItems.push(star);
        clickableItems.push(star);
        containerItems.push(star);
      }
      interactiveItems.forEach((item) => {
        item.on('pointerover', hoverIn);
        item.on('pointerout', hoverOut);
      });
      clickableItems.forEach((item) => item.setInteractive({ useHandCursor: true }).on('pointerdown', select));
      containerItems.push(hit);
      containerItems.push(...starRow);
      container.add(containerItems);
      this.levelCards.push({ pageIndex, container, shadow, card, number, name, description, meta, bench, status, badge, hit, starRow });
    });

    const pageCount = this.getPageCount();
    const indicatorStartX = width * 0.5 - ((pageCount - 1) * 18);
    for (let i = 0; i < pageCount; i += 1) {
      const dot = this.add.circle(indicatorStartX + i * 36, 1306, 9, 0x8bc7ff, 0.28);
      const hit = this.add.zone(indicatorStartX + i * 36, 1306, 42, 42).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.currentPage = i;
        const firstIndex = this.currentPage * CARDS_PER_PAGE;
        const highestUnlocked = getHighestUnlockedLevelIndex(LEVELS.length);
        setSelectedLevelIndex(Phaser.Math.Clamp(firstIndex, 0, highestUnlocked), LEVELS.length);
        this.refreshLevelPicker();
      });
      this.pageIndicators.push({ dot, hit });
    }
  }

  createPreviewPanel(width, height) {
    this.add.text(92, 1388, 'SELECTED BOARD', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#dfeaff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.createPanel(width * 0.5, height - 268, width - 120, 284, { tint: 0xf3fbff });
    this.previewTitle = this.add.text(130, height - 348, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '38px',
      color: '#173258',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.previewMeta = this.add.text(width - 130, height - 348, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#5a7ea9',
      fontStyle: 'bold',
      align: 'right',
    }).setOrigin(1, 0.5);
    this.levelDescription = this.add.text(130, height - 260, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '27px',
      color: '#31548b',
      wordWrap: { width: 530, useAdvancedWrap: true },
    }).setOrigin(0, 0.5);
    this.previewBoard = this.add.container(width - 220, height - 264);
  }

  createFooter(width, height) {
    this.launchButton = this.add.text(width * 0.5, height - 96, 'PLAY SELECTED LEVEL', {
      fontFamily: 'Trebuchet MS',
      fontSize: '40px',
      color: '#fefefe',
      backgroundColor: '#ff7a45',
      padding: { x: 40, y: 22 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.helperText = this.add.text(
      width * 0.5,
      height - 36,
      'Tap a board to select it. Swipe the browser to change pages. Press Enter to launch.',
      {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#dfeaff',
        align: 'center',
        wordWrap: { width: width - 180 },
      },
    ).setOrigin(0.5);

    this.tweens.add({
      targets: [this.launchButton],
      alpha: 0.88,
      yoyo: true,
      duration: 1100,
      repeat: -1,
    });

    this.launchButton.on('pointerover', () => {
      this.launchButton.setScale(1.03);
      this.launchButton.setBackgroundColor('#ff915f');
    });
    this.launchButton.on('pointerout', () => {
      this.launchButton.setScale(1);
      this.launchButton.setBackgroundColor('#ff7a45');
    });

    const fullScreenHint = this.add.text(width - 36, 34, 'Press F for fullscreen', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#cfe6ff',
    }).setOrigin(1, 0);

    this.scale.on('enterfullscreen', () => {
      fullScreenHint.setText('Press Esc to exit fullscreen');
    });

    this.scale.on('leavefullscreen', () => {
      fullScreenHint.setText('Press F for fullscreen');
    });

    this.launchButton.on('pointerdown', () => this.startSelectedLevel());
  }

  bindInput() {
    this.input.keyboard.on('keydown-LEFT', () => this.changeSelectedLevel(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.changeSelectedLevel(1));
    this.input.keyboard.on('keydown-UP', () => this.changeSelectedLevel(-CARD_COLUMNS));
    this.input.keyboard.on('keydown-DOWN', () => this.changeSelectedLevel(CARD_COLUMNS));
    this.input.keyboard.on('keydown-PAGEDOWN', () => this.shiftPage(1));
    this.input.keyboard.on('keydown-PAGEUP', () => this.shiftPage(-1));
    this.input.keyboard.on('keydown-SPACE', () => this.startSelectedLevel());
    this.input.keyboard.on('keydown-ENTER', () => this.startSelectedLevel());

    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.browserSwipeBounds && this.browserSwipeBounds.contains(pointer.x, pointer.y)) {
        this.browserSwipeStart = { x: pointer.x, y: pointer.y };
      } else {
        this.browserSwipeStart = null;
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (!this.browserSwipeStart || !this.browserSwipeBounds) {
        this.browserSwipeStart = null;
        return;
      }

      const deltaX = pointer.x - this.browserSwipeStart.x;
      const deltaY = pointer.y - this.browserSwipeStart.y;
      this.browserSwipeStart = null;

      if (!this.browserSwipeBounds.contains(pointer.x, pointer.y)) {
        return;
      }

      if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      this.shiftPage(deltaX < 0 ? 1 : -1);
    });
  }

  createPanel(x, y, width, height, options = {}) {
    const { tint = 0xffffff, alpha = 1 } = options;
    return this.add.image(x, y, 'panel').setDisplaySize(width, height).setTint(tint).setAlpha(alpha);
  }

  buildStarRow(x, y, size = 16) {
    const style = { fontFamily: 'Trebuchet MS', fontSize: `${size * 1.6}px`, fontStyle: 'bold' };
    const spacing = size * 1.4;
    const star1 = this.add.text(x - spacing, y, '☆', { ...style, color: '#8fa7c7' }).setOrigin(0.5);
    const star2 = this.add.text(x, y, '☆', { ...style, color: '#8fa7c7' }).setOrigin(0.5);
    const star3 = this.add.text(x + spacing, y, '☆', { ...style, color: '#8fa7c7' }).setOrigin(0.5);
    return [star1, star2, star3];
  }

  paintStarRow(stars, earned) {
    stars.forEach((s, i) => {
      if (earned === null || earned === undefined) {
        s.setText('☆').setColor('#8fa7c7');
      } else {
        const filled = i < earned;
        s.setText(filled ? '★' : '☆').setColor(filled ? '#e6c85a' : '#6d8ab0');
      }
    });
  }

  createNavButton(x, y, label) {
    const container = this.add.container(x, y);
    const shadow = this.add.circle(0, 8, 42, 0x05111f, 0.24);
    const circle = this.add.circle(0, 0, 42, 0xf8fdff, 0.98).setStrokeStyle(4, 0x73bbff, 0.42);
    const text = this.add.text(0, -3, label, {
      fontFamily: 'Trebuchet MS',
      fontSize: '42px',
      color: '#173258',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const zone = this.add.zone(0, 0, 128, 128).setInteractive({ useHandCursor: true });
    [circle, text].forEach((item) => item.setInteractive({ useHandCursor: true }));
    [zone, circle, text].forEach((item) => item.on('pointerover', () => circle.setFillStyle(0xffefd7, 1)));
    [zone, circle, text].forEach((item) => item.on('pointerout', () => circle.setFillStyle(0xf8fdff, 0.98)));
    container.add([shadow, circle, text, zone]);
    return { container, shadow, circle, text, zone };
  }

  getPageCount() {
    return Math.max(1, Math.ceil(LEVELS.length / CARDS_PER_PAGE));
  }

  getPageForLevel(levelIndex) {
    return Math.floor(levelIndex / CARDS_PER_PAGE);
  }

  shiftPage(direction) {
    const pageCount = this.getPageCount();
    if (pageCount <= 1) {
      return;
    }
    this.currentPage = Phaser.Math.Wrap(this.currentPage + direction, 0, pageCount);
    const firstIndex = this.currentPage * CARDS_PER_PAGE;
    const highestUnlocked = getHighestUnlockedLevelIndex(LEVELS.length);
    const targetIndex = Phaser.Math.Clamp(firstIndex, 0, highestUnlocked);
    setSelectedLevelIndex(targetIndex, LEVELS.length);
    this.refreshLevelPicker();
  }

  changeSelectedLevel(direction) {
    const highestUnlocked = getHighestUnlockedLevelIndex(LEVELS.length);
    const next = Phaser.Math.Clamp((gameState.selectedLevelIndex ?? 0) + direction, 0, highestUnlocked);
    setSelectedLevelIndex(next, LEVELS.length);
    this.currentPage = this.getPageForLevel(next);
    this.refreshLevelPicker();
  }

  refreshLevelPicker() {
    const selectedIndex = Phaser.Math.Clamp(gameState.selectedLevelIndex ?? 0, 0, LEVELS.length - 1);
    const selectedLevel = LEVELS[selectedIndex];
    const pageCount = this.getPageCount();

    this.levelCards.forEach((entry, index) => {
      const unlocked = isLevelUnlocked(index);
      const completed = gameState.completedLevels.includes(index);
      const active = index === selectedIndex;
      const visible = entry.pageIndex === this.currentPage;

      entry.container.setVisible(visible);
      entry.hit.input.enabled = visible;

      entry.card.setFillStyle(
        unlocked ? (active ? 0xffefd7 : 0x183456) : 0x10213c,
        unlocked ? (active ? 0.98 : 0.94) : 0.72,
      );
      entry.card.setStrokeStyle(
        4,
        !unlocked ? 0x456284 : completed ? 0x7fe0a0 : active ? 0xff8b4d : 0x69c4ff,
        !unlocked ? 0.34 : completed ? 0.76 : active ? 0.92 : 0.34,
      );
      entry.shadow.setAlpha(active ? 0.38 : 0.25);
      entry.number.setColor(!unlocked ? '#8fa7c7' : active ? '#173258' : '#f6fbff');
      entry.name.setColor(!unlocked ? '#748dab' : active ? '#31548b' : '#d7ebff');
      entry.description.setColor(!unlocked ? '#667f9d' : active ? '#48698f' : '#c6dcf7');
      entry.meta.setColor(!unlocked ? '#8fa7c7' : active ? '#ff8b4d' : '#ffd47f');
      entry.bench.setColor(!unlocked ? '#8fa7c7' : active ? '#305280' : '#dfeaff');
      entry.status.setColor(!unlocked ? '#8fa7c7' : completed ? '#7fe0a0' : active ? '#b4491f' : '#d7ebff');
      entry.status.setText(!unlocked ? 'LOCKED' : completed ? 'CLEARED' : 'READY');
      entry.badge.setVisible(completed);
      if (completed) {
        entry.badge.setText('CLEAR');
        entry.badge.setAlpha(active ? 1 : 0.92);
      }
      entry.container.setScale(active && unlocked ? 1.02 : 1);

      if (unlocked && isLevelCompleted(index)) {
        this.paintStarRow(entry.starRow, getStarsForLevel(index) ?? 0);
      } else {
        this.paintStarRow(entry.starRow, null);
      }
    });

    this.pageIndicators.forEach((entry, index) => {
      entry.dot.setFillStyle(index === this.currentPage ? 0xff8b4d : 0x8bc7ff, index === this.currentPage ? 1 : 0.28);
      entry.dot.setScale(index === this.currentPage ? 1.15 : 1);
    });

    this.pageLabel.setText(`PAGE ${this.currentPage + 1} / ${pageCount}`);
    this.navButtons.prev.container.setAlpha(pageCount > 1 ? 1 : 0.3);
    this.navButtons.next.container.setAlpha(pageCount > 1 ? 1 : 0.3);

    const unlockedRatio = Phaser.Math.Clamp(gameState.unlockedLevelCount / LEVELS.length, 0, 1);
    this.progressFill.width = 756 * unlockedRatio;
    this.progressText.setText(`Unlocked ${gameState.unlockedLevelCount} of ${LEVELS.length} boards  •  Cleared ${gameState.completedLevels.length}`);
    this.progressSubtext.setText(
      `Frontier board: Level ${Math.min(gameState.unlockedLevelCount, LEVELS.length)}. The paged browser is ready for a larger campaign.`,
    );

    this.previewTitle.setText(`LEVEL ${selectedIndex + 1}  •  ${selectedLevel.name.toUpperCase()}`);
    this.previewMeta.setText(`${selectedLevel.layout.length} x ${selectedLevel.layout[0].length}\n${selectedLevel.bench.length} pigs loaded`);
    this.levelDescription.setText(selectedLevel.description);
    this.drawBoardPreview(selectedLevel);
    this.launchButton.setAlpha(1);
    this.launchButton.setText('PLAY SELECTED LEVEL');
    this.launchButton.setBackgroundColor('#ff7a45');
    this.launchButton.setScale(1);
    this.helperText.setText('Tap a board to select it. Swipe the browser to change pages. Press Enter to launch.');

    gameState.notes = [
      `Selected Level ${selectedIndex + 1}: ${selectedLevel.name}.`,
      `Unlocked ${gameState.unlockedLevelCount}/${LEVELS.length} levels. Completed ${gameState.completedLevels.length}.`,
      `Viewing page ${this.currentPage + 1} of ${pageCount} in the paged level browser.`,
    ];
  }

  setLockedStatus(index) {
    const highestUnlocked = getHighestUnlockedLevelIndex(LEVELS.length);
    this.previewTitle.setText(`LEVEL ${index + 1}  •  LOCKED`);
    this.previewMeta.setText('Clear the frontier board\n to unlock more');
    this.levelDescription.setText(
      `Level ${index + 1} is still locked. Clear Level ${highestUnlocked + 1} to unlock the next board.`,
    );
    this.drawLockedPreview();
    this.launchButton.setText('LEVEL LOCKED').setAlpha(0.7);
    this.launchButton.setBackgroundColor('#788a9f');
    this.helperText.setText('Beat the highest unlocked level to open the next board.');
    gameState.notes = [
      `Level ${index + 1} is locked.`,
      `Unlocked ${gameState.unlockedLevelCount}/${LEVELS.length} levels. Completed ${gameState.completedLevels.length}.`,
      'Beat the current frontier level to unlock more handcrafted boards.',
    ];
  }

  startSelectedLevel() {
    const selectedLevel = Phaser.Math.Clamp(gameState.selectedLevelIndex ?? 0, 0, LEVELS.length - 1);
    if (!isLevelUnlocked(selectedLevel)) {
      this.setLockedStatus(selectedLevel);
      return;
    }

    gameState.notes = [
      `Starting Level ${selectedLevel + 1} from the menu browser.`,
      'Gameplay includes multi-level boards, queue launches, bench columns, and result states.',
    ];
    this.scene.start('GameScene', { levelIndex: selectedLevel });
  }

  drawBoardPreview(level) {
    this.previewBoard.removeAll(true);
    const rows = level.layout.length;
    const cols = level.layout[0].length;
    const maxPreview = 200;
    const cellSize = Math.max(12, Math.floor(Math.min(maxPreview / cols, maxPreview / rows)));
    const boardWidth = cols * cellSize;
    const boardHeight = rows * cellSize;
    const offsetX = -boardWidth * 0.5;
    const offsetY = -boardHeight * 0.5;
    const frame = this.add.rectangle(0, 0, boardWidth + 30, boardHeight + 30, 0x0b1932, 0.88).setStrokeStyle(3, 0x8bc7ff, 0.26);
    this.previewBoard.add(frame);

    level.layout.forEach((row, rowIndex) => {
      row.forEach((color, colIndex) => {
        const x = offsetX + colIndex * cellSize + cellSize * 0.5;
        const y = offsetY + rowIndex * cellSize + cellSize * 0.5;
        const plate = this.add.rectangle(x, y + 2, cellSize - 2, cellSize - 2, 0x0d233f, 0.95);
        const fill = PREVIEW_COLORS[color];
        if (fill === undefined) {
          throw new Error(`MenuScene preview: unknown color "${color}" in level "${level.id}"`);
        }
        const cube = this.add.rectangle(x, y, cellSize - 4, cellSize - 4, fill, 1).setStrokeStyle(2, 0xffffff, 0.14);
        this.previewBoard.add([plate, cube]);
      });
    });
  }

  handleShutdown() {
    this.tweens?.killAll();
    this.input?.keyboard?.removeAllListeners();
    this.scale?.removeAllListeners();
  }

  drawLockedPreview() {
    this.previewBoard.removeAll(true);
    const frame = this.add.rectangle(0, 0, 220, 220, 0x0b1932, 0.88).setStrokeStyle(3, 0x456284, 0.32);
    const text = this.add.text(0, 0, 'LOCKED', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#8fa7c7',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const hint = this.add.text(0, 0, 'Clear more boards', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#6f89aa',
    }).setOrigin(0.5);
    hint.y = 34;
    this.previewBoard.add([frame, text, hint]);
  }
}

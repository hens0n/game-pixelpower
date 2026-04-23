// Whitelist of cube/pig colors the renderer supports.
// Must stay in sync with COLOR_THEMES in src/scenes/GameScene.js
// and PREVIEW_COLORS in src/scenes/MenuScene.js.
export const SUPPORTED_COLORS = new Set([
  'red',
  'yellow',
  'green',
  'blue',
  'brown',
  'pink',
  'white',
  'black',
  'gray',
  'tan',
  'orange',
  'purple',
  'teal',
]);

export function validateLevel(level, index) {
  const label = `level ${index + 1}${level?.id ? ` (${level.id})` : ''}`;

  if (!level || typeof level !== 'object') {
    throw new Error(`${label}: level entry is not an object`);
  }
  if (!Array.isArray(level.layout)) {
    throw new Error(`${label}: missing or invalid layout`);
  }
  if (level.layout.length === 0) {
    throw new Error(`${label}: layout has no rows`);
  }
  if (!Array.isArray(level.layout[0])) {
    throw new Error(`${label}: layout row 0 is not an array`);
  }

  const width = level.layout[0].length;
  if (width === 0) {
    throw new Error(`${label}: layout rows are empty`);
  }

  level.layout.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`${label}: layout is not rectangular (row ${rowIndex} has width ${row?.length})`);
    }
    row.forEach((cell, colIndex) => {
      if (cell === null) return;
      if (typeof cell !== 'string' || !SUPPORTED_COLORS.has(cell)) {
        throw new Error(
          `${label}: unknown color "${cell}" at layout[${rowIndex}][${colIndex}]`,
        );
      }
    });
  });

  if (!Array.isArray(level.bench) || level.bench.length === 0) {
    throw new Error(`${label}: bench must be a non-empty array`);
  }

  level.bench.forEach((pig, pigIndex) => {
    if (!pig || typeof pig !== 'object') {
      throw new Error(`${label}: bench[${pigIndex}] is not an object`);
    }
    if (!SUPPORTED_COLORS.has(pig.color)) {
      throw new Error(`${label}: bench[${pigIndex}] has unknown color "${pig.color}"`);
    }
    if (!Number.isInteger(pig.ammo) || pig.ammo <= 0) {
      throw new Error(`${label}: bench[${pigIndex}] has non-positive ammo ${pig.ammo}`);
    }
  });
}

export function validateLevels(levels) {
  if (!Array.isArray(levels)) {
    throw new Error('validateLevels: expected an array');
  }
  levels.forEach((level, index) => validateLevel(level, index));
}

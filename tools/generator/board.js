function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function columnsPattern(rows, cols, colors) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => colors[c % colors.length]),
  );
}

function rowsPattern(rows, cols, colors) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, () => colors[r % colors.length]),
  );
}

function blocksPattern(rows, cols, colors) {
  const blockSize = pick([2, 3]);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const blockRow = Math.floor(r / blockSize);
      const blockCol = Math.floor(c / blockSize);
      return colors[(blockRow + blockCol) % colors.length];
    }),
  );
}

function stripesPattern(rows, cols, colors) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => colors[(r + c) % colors.length]),
  );
}

function checkersPattern(rows, cols, colors) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => colors[(r + c) % colors.length]),
  );
}

function spiralsPattern(rows, cols, colors) {
  const board = Array.from({ length: rows }, () => Array(cols).fill(null));
  let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
  let colorIdx = 0;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) board[top][c] = colors[colorIdx % colors.length];
    top++;
    colorIdx++;
    for (let r = top; r <= bottom; r++) board[r][right] = colors[colorIdx % colors.length];
    right--;
    colorIdx++;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) board[bottom][c] = colors[colorIdx % colors.length];
      bottom--;
      colorIdx++;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) board[r][left] = colors[colorIdx % colors.length];
      left++;
      colorIdx++;
    }
  }
  return board;
}

function densePattern(rows, cols, colors) {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => pick(colors)),
  );
  for (let i = 0; i < colors.length; i++) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    board[r][c] = colors[i];
  }
  return board;
}

function mixedPattern(rows, cols, colors) {
  const board = blocksPattern(rows, cols, colors);
  const half = Math.floor(rows / 2);
  for (let r = half; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      board[r][c] = pick(colors);
    }
  }
  for (let i = 0; i < colors.length; i++) {
    board[half + (i % (rows - half))][i % cols] = colors[i];
  }
  return board;
}

const PATTERN_FNS = {
  columns: columnsPattern,
  rows: rowsPattern,
  blocks: blocksPattern,
  stripes: stripesPattern,
  checkers: checkersPattern,
  spirals: spiralsPattern,
  dense: densePattern,
  mixed: mixedPattern,
};

export function generateBoard({ rows, cols, colors, pattern }) {
  const fn = PATTERN_FNS[pattern];
  if (!fn) {
    throw new Error(`Unknown pattern: ${pattern}`);
  }
  return fn(rows, cols, colors);
}

const SIDES = ['bottom', 'right', 'top', 'left'];

function cloneBoard(layout) {
  return layout.map(row => [...row]);
}

function countCubes(board) {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) count++;
    }
  }
  return count;
}

function simulatePig(board, pig) {
  const rows = board.length;
  const cols = board[0].length;
  let ammo = pig.ammo;

  for (const side of SIDES) {
    if (ammo <= 0) break;
    if (side === 'bottom') {
      for (let c = 0; c < cols && ammo > 0; c++) {
        for (let r = rows - 1; r >= 0; r--) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    } else if (side === 'right') {
      for (let r = 0; r < rows && ammo > 0; r++) {
        for (let c = cols - 1; c >= 0; c--) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    } else if (side === 'top') {
      for (let c = 0; c < cols && ammo > 0; c++) {
        for (let r = 0; r < rows; r++) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    } else if (side === 'left') {
      for (let r = 0; r < rows && ammo > 0; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c] === null) continue;
          if (board[r][c] === pig.color) { board[r][c] = null; ammo--; }
          break;
        }
      }
    }
  }
  return ammo;
}

function tryOrdering(layout, ordering) {
  const board = cloneBoard(layout);
  const returnQueue = [];
  for (const pig of ordering) {
    const remaining = simulatePig(board, { color: pig.color, ammo: pig.ammo });
    if (remaining > 0) returnQueue.push({ color: pig.color, ammo: remaining });
  }
  for (const pig of returnQueue) {
    simulatePig(board, pig);
  }
  return countCubes(board) === 0;
}

export function isSolvable(layout, bench, maxAttempts = 2000) {
  if (tryOrdering(layout, bench)) return true;
  if (tryOrdering(layout, [...bench].reverse())) return true;
  for (let i = 0; i < maxAttempts; i++) {
    const shuffled = [...bench].sort(() => Math.random() - 0.5);
    if (tryOrdering(layout, shuffled)) return true;
  }
  return false;
}

export function scoreDifficulty(layout, bench) {
  const rows = layout.length;
  const cols = layout[0].length;
  const totalCubes = layout.flat().filter(c => c !== null).length;
  const uniqueColors = new Set(layout.flat().filter(c => c !== null)).size;
  const totalAmmo = bench.reduce((sum, pig) => sum + pig.ammo, 0);
  const ammoRatio = totalAmmo / totalCubes;
  const sizeFactor = Math.min(3, (rows * cols - 25) / 20);
  const colorFactor = Math.min(2, (uniqueColors - 2) * 1.0);
  const ammoFactor = Math.min(3, Math.max(0, (1.3 - ammoRatio) * 6));
  let blockerCount = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = rows - 1; r > 0; r--) {
      if (layout[r][c] !== null && layout[r - 1][c] !== null && layout[r][c] !== layout[r - 1][c]) blockerCount++;
    }
  }
  const blockerFactor = Math.min(2, (blockerCount / Math.max(1, totalCubes)) * 4);
  return Math.min(10, Math.max(0, sizeFactor + colorFactor + ammoFactor + blockerFactor));
}

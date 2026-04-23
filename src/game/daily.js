export function utcDateString(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseUtcDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function dayDelta(fromStr, toStr) {
  const msPerDay = 86400000;
  return Math.round((parseUtcDate(toStr) - parseUtcDate(fromStr)) / msPerDay);
}

export function dailyPool(levels) {
  const indexes = [];
  levels.forEach((level, i) => {
    if (level.dailyEligible === true) indexes.push(i);
  });
  if (indexes.length === 0) {
    throw new Error('dailyPool: no daily-eligible levels found');
  }
  return indexes;
}

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function dailyLevelIndex(dateStr, pool) {
  if (pool.length === 0) {
    throw new Error('dailyLevelIndex: pool is empty');
  }
  const h = hashString(dateStr);
  return pool[h % pool.length];
}

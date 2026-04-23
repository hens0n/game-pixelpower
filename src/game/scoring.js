export function countWastedPigs({ launchedHistory, remaining }) {
  const leftoverAmmo = launchedHistory.filter((pig) => pig.finalAmmo > 0).length;
  return leftoverAmmo + remaining;
}

export function computeStars({ launchedHistory, remaining }) {
  const wasted = countWastedPigs({ launchedHistory, remaining });
  if (wasted === 0) return 3;
  if (wasted === 1) return 2;
  return 1;
}

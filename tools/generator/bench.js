function countColors(layout) {
  const counts = {};
  for (const row of layout) {
    for (const color of row) {
      if (color !== null) counts[color] = (counts[color] || 0) + 1;
    }
  }
  return counts;
}

export function buildBench(layout, { ammoMultiplier, benchRange }) {
  const colorCounts = countColors(layout);
  const colors = Object.keys(colorCounts);
  const totalCubes = Object.values(colorCounts).reduce((a, b) => a + b, 0);
  const totalAmmo = Math.round(totalCubes * ammoMultiplier);
  const [minPigs, maxPigs] = benchRange;
  const pigCount = Math.min(maxPigs, Math.max(minPigs, Math.min(totalAmmo, minPigs + Math.floor(Math.random() * (maxPigs - minPigs + 1)))));

  const colorAmmo = {};
  let allocated = 0;
  for (const color of colors) {
    const share = Math.round((colorCounts[color] / totalCubes) * totalAmmo);
    colorAmmo[color] = Math.max(1, share);
    allocated += colorAmmo[color];
  }
  const largestColor = colors.reduce((a, b) => colorAmmo[a] >= colorAmmo[b] ? a : b);
  colorAmmo[largestColor] += totalAmmo - allocated;

  const pigs = [];
  for (const color of colors) {
    let remaining = colorAmmo[color];
    const pigsForColor = Math.max(1, Math.round((colorAmmo[color] / totalAmmo) * pigCount));
    for (let i = 0; i < pigsForColor && remaining > 0; i++) {
      const isLast = i === pigsForColor - 1;
      const ammo = isLast ? remaining : Math.max(1, Math.floor(remaining / (pigsForColor - i)) + Math.floor(Math.random() * 2));
      const clamped = Math.min(ammo, remaining);
      pigs.push({ color, ammo: clamped });
      remaining -= clamped;
    }
    if (remaining > 0 && pigs.length > 0) pigs[pigs.length - 1].ammo += remaining;
  }

  for (let i = pigs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pigs[i], pigs[j]] = [pigs[j], pigs[i]];
  }
  return pigs;
}

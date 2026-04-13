/**
 * Builds a Claude API prompt for generating pixel art grids.
 * @param {object} subject - Entry from pixel-art-subjects.json
 * @returns {string} The prompt text
 */
export function buildPrompt(subject) {
  const [rows, cols] = subject.grid;
  const colors = subject.colors.map(c => `"${c}"`).join(', ');

  return `You are a pixel art designer. Generate a ${cols}x${rows} pixel art grid of: ${subject.description}

RULES:
- Output ONLY a JSON 2D array (no markdown, no explanation, no code fences)
- The array must have exactly ${rows} rows and ${cols} columns
- Each cell must be one of these color strings: ${colors}, or null for empty/background
- Use null for negative space around the subject (the background)
- The subject should be recognizable and fill most of the grid
- Use all the listed colors in the design
- Ensure the design has a clear silhouette — it should be obvious what the subject is
- Favor solid filled areas over single scattered pixels

OUTPUT FORMAT EXAMPLE (for a 3x3 grid):
[["red",null,"red"],[null,"blue",null],["red",null,"red"]]`;
}

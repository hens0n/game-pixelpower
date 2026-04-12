import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { generateBoard } from './board.js';

test('generateBoard returns a 2D array of the requested size', () => {
  const board = generateBoard({ rows: 5, cols: 5, colors: ['red', 'yellow'], pattern: 'columns' });
  assert.equal(board.length, 5);
  assert.equal(board[0].length, 5);
});

test('generateBoard only uses requested colors', () => {
  const colors = ['red', 'green'];
  const board = generateBoard({ rows: 6, cols: 6, colors, pattern: 'blocks' });
  const usedColors = new Set(board.flat());
  for (const color of usedColors) {
    assert.ok(colors.includes(color), `unexpected color: ${color}`);
  }
});

test('columns pattern creates vertical color lanes', () => {
  const board = generateBoard({ rows: 4, cols: 4, colors: ['red', 'yellow'], pattern: 'columns' });
  for (let col = 0; col < 4; col++) {
    const colColors = board.map(row => row[col]);
    assert.equal(new Set(colColors).size, 1, `column ${col} should be one color`);
  }
});

test('rows pattern creates horizontal color lanes', () => {
  const board = generateBoard({ rows: 4, cols: 4, colors: ['red', 'yellow'], pattern: 'rows' });
  for (let row = 0; row < 4; row++) {
    assert.equal(new Set(board[row]).size, 1, `row ${row} should be one color`);
  }
});

test('all patterns produce boards with every requested color', () => {
  const patterns = ['columns', 'rows', 'blocks', 'stripes', 'checkers', 'spirals', 'dense', 'mixed'];
  const colors = ['red', 'yellow', 'green'];
  for (const pattern of patterns) {
    const board = generateBoard({ rows: 6, cols: 6, colors, pattern });
    const usedColors = new Set(board.flat());
    for (const color of colors) {
      assert.ok(usedColors.has(color), `pattern '${pattern}' missing color '${color}'`);
    }
  }
});

test('checkers pattern is distinct from stripes', () => {
  const colors = ['red', 'yellow', 'green', 'blue'];
  const stripes = generateBoard({ rows: 6, cols: 6, colors, pattern: 'stripes' });
  const checkers = generateBoard({ rows: 6, cols: 6, colors, pattern: 'checkers' });
  assert.notDeepEqual(checkers, stripes);
});

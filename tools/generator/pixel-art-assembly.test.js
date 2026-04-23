import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildPixelArtLevel } from './pixel-art-assembly.js';

const SIMPLE_SUBJECT = { subject: 'Red Blob', grid: [2, 2] };

test('buildPixelArtLevel returns solved=true for a trivially solvable layout', () => {
  const layout = [
    ['red', null],
    [null, 'red'],
  ];
  const result = buildPixelArtLevel(SIMPLE_SUBJECT, layout, 51);
  assert.equal(result.solved, true);
  assert.equal(result.level.layout, layout);
  assert.equal(result.level.name, 'Red Blob');
  assert.ok(Array.isArray(result.level.bench));
});

test('buildPixelArtLevel returns the contract shape: { solved, level, bumps }', () => {
  const layout = [
    ['red', null],
    [null, 'red'],
  ];
  const result = buildPixelArtLevel(SIMPLE_SUBJECT, layout, 51);
  assert.equal(typeof result.solved, 'boolean');
  assert.equal(typeof result.bumps, 'number');
  assert.equal(typeof result.level, 'object');
  assert.equal(typeof result.level.id, 'string');
  assert.equal(typeof result.level.name, 'string');
  assert.equal(typeof result.level.description, 'string');
  assert.ok(Array.isArray(result.level.bench));
  assert.equal(result.level.layout, layout);
});

test('buildPixelArtLevel throws when layout dimensions do not match subject.grid', () => {
  const subject = { subject: 'Mismatch', grid: [3, 3] };
  const layout = [['red', null], [null, 'red']];
  assert.throws(
    () => buildPixelArtLevel(subject, layout, 51),
    /dimension/i,
  );
});

test('buildPixelArtLevel throws on non-rectangular layout', () => {
  const subject = { subject: 'Jagged', grid: [2, 2] };
  const layout = [['red'], ['red', 'red']];
  assert.throws(
    () => buildPixelArtLevel(subject, layout, 51),
    /(rectangular|columns|cols)/i,
  );
});

test('buildPixelArtLevel produces a kebab-case level id from the subject name', () => {
  const subject = { subject: "Captain's Parrot!", grid: [2, 2] };
  const layout = [['red', null], [null, 'red']];
  const result = buildPixelArtLevel(subject, layout, 51);
  assert.equal(result.level.id, 'captain-s-parrot');
});

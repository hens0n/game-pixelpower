import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { formatExport } from './export.js';

test('formatExport preserves milestone flag', () => {
  const result = formatExport([
    {
      id: 'heart-milestone',
      name: 'Heart',
      description: 'A milestone board.',
      milestone: true,
      layout: [[null, 'red']],
      bench: [{ color: 'red', ammo: 1 }],
    },
  ]);

  assert.match(result, /milestone: true/);
});

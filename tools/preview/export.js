// tools/preview/export.js

/**
 * Format accepted candidates as a JS code string
 * matching the existing levels.js schema.
 */
export function formatExport(accepted) {
  const entries = accepted.map(c => {
    const layoutStr = c.layout
      .map(row => '      [' + row.map(cell => cell === null ? 'null' : "'" + cell + "'").join(', ') + ']')
      .join(',\n');
    const benchStr = c.bench
      .map(p => "      { color: '" + p.color + "', ammo: " + p.ammo + ' }')
      .join(',\n');
    return '  {\n' +
      "    id: '" + c.id.replace(/'/g, "\\'") + "',\n" +
      "    name: '" + c.name.replace(/'/g, "\\'") + "',\n" +
      "    description: '" + c.description.replace(/'/g, "\\'") + "',\n" +
      '    layout: [\n' + layoutStr + ',\n    ],\n' +
      '    bench: [\n' + benchStr + ',\n    ],\n' +
      '  }';
  });

  return '// Generated levels — paste into src/data/levels.js LEVELS array\n' +
    '// Generated on ' + new Date().toISOString().slice(0, 10) + '\n\n' +
    entries.join(',\n') + '\n';
}

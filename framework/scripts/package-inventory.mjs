import assert from 'node:assert/strict';

// An explicit package boundary, independent of Git ignores and npm's defaults.
export function checkPackageInventory(files) {
  const roots = new Set(['dist', 'assets', 'styles', 'templates', 'examples', 'example-configs', 'agent-docs', 'skills', 'schemas']);
  const documents = new Set(['package.json', 'README.md', 'AUTHORING.md', 'CHANGELOG.md', 'LICENSE']);
  for (const file of files) {
    const parts = file.split('/');
    assert.ok(documents.has(file) || parts.length > 1 && roots.has(parts[0]), `Unexpected package entry: ${file}`);
    assert.ok(parts.every(part => part && part !== '.' && part !== '..' && !part.includes('\\')), `Unsafe package entry: ${file}`);
    assert.ok(!parts.some(part => /^(?:\.env(?:\.|$)|\.git$|\.vercel$|\.shoalrun$|node_modules$)|\.(?:local|override)\.md$/i.test(part)), `Local file in package: ${file}`);
    assert.ok(!/\.test\.(?:js|d\.ts)(?:\.map)?$|\.(?:tgz|tar|zip|log)$/i.test(file), `Development artifact in package: ${file}`);
  }
  for (const required of ['LICENSE', 'CHANGELOG.md', 'schemas/content-export.schema.json', 'dist/cli.js', 'dist/authoring-api.js', 'dist/components.js']) {
    assert.ok(files.includes(required), `Missing package contract: ${required}`);
  }
}

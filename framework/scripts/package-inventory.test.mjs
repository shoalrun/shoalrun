import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPackageInventory } from './package-inventory.mjs';

const base = ['adapters/typescript/shoalrun-reference.mjs', 'adapters/typescript/README.md', 'CODE-REFERENCES.md', 'schemas/code-reference.schema.json', 'adapters/python/shoalrun_reference.py', 'adapters/python/requirements.txt', 'LICENSE', 'CHANGELOG.md', 'DEPLOYMENT-PROFILES.md', 'schemas/content-export.schema.json', 'dist/cli.js', 'dist/authoring-api.js', 'dist/components.js'];
test('package inventory rejects local material, traversal, and nested development artifacts', () => {
  assert.doesNotThrow(() => checkPackageInventory([...base, 'examples/components/demo/LICENSE.react.txt']));
  for (const entry of ['private.txt', 'dist/../private.txt', 'examples/.env.local', 'examples/notes.local.md', 'examples/node_modules/dep/index.js', 'examples/.vercel/project.json', 'dist/cli.test.js', 'examples/archive.tgz', 'examples/code-references/site-dist/index.html', 'adapters/python/__pycache__/adapter.pyc', 'adapters/python/test_reference.py']) {
    assert.throws(() => checkPackageInventory([...base, entry]), undefined, entry);
  }
  assert.throws(() => checkPackageInventory(base.filter(file => file !== 'LICENSE')), /Missing package contract/);
});

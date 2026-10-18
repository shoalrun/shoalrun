import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAuthoringGuidance } from './authoring-guidance.js';

test('authoring guidance exposes directives and local examples without model settings', () => {
  const guidance = { directives: 'Use Steps for procedures.', guideFiles: ['content/style.mdx'], exemplarFiles: ['content/example.mdx'] };
  assert.deepEqual(validateAuthoringGuidance(guidance), guidance);
  assert.equal(validateAuthoringGuidance(undefined), undefined);
  for (const value of [{ model: 'retired-model' }, { keyEnv: 'SECRET' }, { directives: '' }, { guideFiles: ['../secret'] }, { guideFiles: '/absolute' }, { exemplarFiles: ['C:\\secret'] }]) assert.throws(() => validateAuthoringGuidance(value));
});

test('authoring sources allow outside folders while include rules stay within each folder', () => {
  const guidance = { sourceRoots: [{ name: 'Implementation', path: '../backend/src', include: ['**/*.ts'], exclude: ['**/*.test.ts'] }], pageSources: { 'guide.defaults': ['../backend/src/defaults.ts'] } };
  assert.deepEqual(validateAuthoringGuidance(guidance), guidance);
  for (const value of [{ sourceRoots: [{ path: 'https://example.com/repo' }] }, { sourceRoots: [{ path: '../backend', include: ['../secret'] }] }, { sourceRoots: [{ path: '../backend', model: 'unexpected' }] }, { pageSources: { 'guide.defaults': [] } }]) assert.throws(() => validateAuthoringGuidance(value));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { registryFindings, gitReleaseFindings } from './check-release.mjs';
import { syncReleaseGit } from './complete-release.mjs';

test('registry processing and a mismatched artifact cannot count as release completion', () => {
  const expected = { version: '0.1.0-alpha.17', integrity: 'reviewed-checksum' };
  assert.match(registryFindings(undefined, expected)[0], /pending/);
  assert.match(registryFindings({ version: expected.version, dist: { integrity: 'other' } }, expected)[0], /integrity/);
  assert.deepEqual(registryFindings({ version: expected.version, dist: { integrity: expected.integrity } }, expected), []);
});

test('a local tag is insufficient; remote tag and main must contain the exact released source', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'shoalrun-release-check-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Release test'); git('config', 'user.email', 'release@example.invalid');
    await writeFile(path.join(directory, 'source'), 'release');
    git('add', 'source'); git('commit', '-m', 'release');
    const commit = git('rev-parse', 'HEAD');
    const version = '0.1.0-alpha.17';
    const remote = path.join(directory, 'remote.git');
    git('init', '--bare', remote); git('push', remote, 'main');
    git('tag', '-a', `v${version}`, '-m', 'release');
    const check = () => gitReleaseFindings(directory, { remote, commit, version });
    assert.match(check().join('\n'), /Remote tag .* is missing/);
    syncReleaseGit(directory, { remote, commit, version });
    assert.deepEqual(check(), []);
    await writeFile(path.join(directory, 'source'), 'later docs');
    git('commit', '-am', 'later docs'); git('push', remote, 'main');
    syncReleaseGit(directory, { remote, commit, version });
    assert.deepEqual(check(), [], 'later source commits must retain the exact artifact tag');
    git('tag', '-f', `v${version}`); git('push', '--force', remote, `v${version}`);
    assert.match(check().join('\n'), /points to different source/);
    assert.throws(() => syncReleaseGit(directory, { remote, commit, version }), /local version tag points/);
    // A tag for the later commit cannot compensate for main missing that source.
    const later = git('rev-parse', 'HEAD');
    git('push', '--force', remote, `${commit}:refs/heads/main`);
    assert.match(gitReleaseFindings(directory, { remote, commit: later, version }).join('\n'), /main does not contain/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

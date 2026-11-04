// Resume a verified package release without ever uploading it again.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRelease, registryFindings, validateRelease } from './check-release.mjs';

export function syncReleaseGit(root, { remote = 'origin', version, commit }) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('fetch', '--no-tags', remote, 'refs/heads/main');
  const main = git('rev-parse', 'FETCH_HEAD');
  const ancestor = (a, b) => { try { git('merge-base', '--is-ancestor', a, b); return true; } catch { return false; } };
  let target;
  if (ancestor(main, commit)) target = commit;
  else if (ancestor(commit, main)) target = main;
  else throw new Error('Remote main has diverged from the release source. Review a merge or PR; no refs were pushed.');
  const tag = `v${version}`;
  let tagged;
  try { tagged = git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`); } catch {}
  if (tagged && tagged !== commit) throw new Error('The local version tag points to different source. Do not move a published tag.');
  if (!tagged) git('tag', '-a', tag, commit, '-m', `Shoalrun ${version}`);
  // No force push and no checkout changes. Both remote refs must succeed together.
  git('push', '--atomic', remote, `${target}:refs/heads/main`, `refs/tags/${tag}`);
}

export async function completeRelease(root, planFile) {
  const directory = path.dirname(planFile);
  const plan = JSON.parse(await readFile(planFile, 'utf8'));
  const verified = JSON.parse(await readFile(path.join(directory, 'verified.json'), 'utf8'));
  for (const key of ['version', 'sha256', 'integrity', 'frameworkCommit']) {
    if (!plan[key] || verified[key] !== plan[key]) throw new Error('Full verification receipt does not match the reviewed artifact.');
  }
  if (!verified.verifiedAt || path.basename(plan.filename) !== plan.filename) throw new Error('Invalid verification receipt or artifact path.');
  const bytes = await readFile(path.join(directory, plan.filename));
  if (createHash('sha256').update(bytes).digest('hex') !== plan.sha256 ||
      `sha512-${createHash('sha512').update(bytes).digest('base64')}` !== plan.integrity) throw new Error('Reviewed artifact changed.');
  const expected = { version: plan.version, commit: plan.frameworkCommit, integrity: plan.integrity };
  validateRelease(expected);
  const response = await fetch(`https://registry.npmjs.org/@shoalrun%2fcli/${plan.version}`, { signal: AbortSignal.timeout(20000), headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok && response.status !== 404) throw new Error(`Registry check failed: HTTP ${response.status}`);
  const findings = registryFindings(response.status === 404 ? undefined : await response.json(), expected);
  if (findings.length) throw new Error(findings.join('\n'));
  syncReleaseGit(root, expected);
  const report = await checkRelease(root, expected);
  if (report.status !== 'complete') throw new Error(report.findings.join('\n'));
  await writeFile(path.join(directory, 'completed.json'), JSON.stringify({ ...report, integrity: plan.integrity, checkedAt: new Date().toISOString() }, null, 2) + '\n');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4 || process.argv[2] !== '--plan') throw new Error('Use --plan PATH_TO_REVIEWED_PLAN_JSON. This resumes source synchronization; it never publishes npm.');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  console.log(JSON.stringify(await completeRelease(root, path.resolve(process.argv[3])), null, 2));
}

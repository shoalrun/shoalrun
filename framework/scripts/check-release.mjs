// Release completion is checked against the registry and remote Git refs,
// never inferred from a local tag or a successful npm upload.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function registryFindings(metadata, { version, integrity }) {
  if (!metadata) return ['Registry metadata is pending. Do not upload the package again.'];
  const findings = [];
  if (metadata.version !== version) findings.push('Registry version differs from the reviewed release.');
  if (metadata.dist?.integrity !== integrity) findings.push('Registry integrity differs from the reviewed artifact.');
  return findings;
}

export function gitReleaseFindings(root, { remote = 'origin', commit, version }) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const tag = `refs/tags/v${version}`;
  const refs = new Map(git('ls-remote', remote, 'refs/heads/main', tag, `${tag}^{}`).split('\n').filter(Boolean).map(line => {
    const [sha, ref] = line.split(/\s+/); return [ref, sha];
  }));
  const findings = [];
  if (!refs.has(tag)) findings.push(`Remote tag v${version} is missing.`);
  else if ((refs.get(`${tag}^{}`) ?? refs.get(tag)) !== commit) findings.push(`Remote tag v${version} points to different source.`);
  const main = refs.get('refs/heads/main');
  if (!main) findings.push('Remote main is missing.');
  else {
    // Fetch only main, so a local tag cannot stand in for a missing remote tag.
    git('fetch', '--no-tags', remote, 'refs/heads/main');
    if (git('rev-parse', 'FETCH_HEAD') !== main) findings.push('Remote main changed during verification. Rerun the check.');
    else {
      try { git('merge-base', '--is-ancestor', commit, main); }
      catch { findings.push('Remote main does not contain the release source.'); }
    }
  }
  return findings;
}

export function validateRelease(expected) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expected.version ?? '') ||
      !/^[a-f0-9]{40}$/.test(expected.commit ?? '') ||
      !/^sha512-[A-Za-z0-9+/]{86}==$/.test(expected.integrity ?? '')) {
    throw new Error('Provide the exact release --version, --commit and reviewed --integrity.');
  }
}

export async function checkRelease(root, expected) {
  validateRelease(expected);
  const response = await fetch(`https://registry.npmjs.org/@shoalrun%2fcli/${expected.version}`, {
    headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000)
  });
  if (!response.ok && response.status !== 404) throw new Error(`Registry check failed: HTTP ${response.status}`);
  const findings = registryFindings(response.status === 404 ? undefined : await response.json(), expected);
  findings.push(...gitReleaseFindings(root, expected));
  return { status: findings.length ? 'incomplete' : 'complete', version: expected.version, commit: expected.commit, findings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    if (!['version', 'commit', 'integrity'].includes(key) || args[i] !== `--${key}` || !args[i + 1] || options[key]) throw new Error('Use --version VERSION --commit SHA --integrity SHA512.');
    options[key] = args[i + 1];
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const report = await checkRelease(root, options);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'complete') process.exitCode = 1;
}

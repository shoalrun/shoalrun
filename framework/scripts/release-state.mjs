import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = file => JSON.parse(readFileSync(file, 'utf8'));
export function save(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  renameSync(file + '.tmp', file);
}
export function directorySeal(root, omit = () => false) {
  const hash = createHash('sha256');
  let files = 0, bytes = 0;
  function visit(relative) {
    for (const name of readdirSync(path.join(root, relative)).sort()) {
      const item = path.join(relative, name), absolute = path.join(root, item);
      if (omit(item)) continue;
      const stat = lstatSync(absolute);
      if (stat.isDirectory()) visit(item);
      else if (stat.isFile()) {
        const data = readFileSync(absolute);
        hash.update(JSON.stringify([item, stat.mode & 0o777, data.length])).update(data);
        files++; bytes += data.length;
      } else throw new Error(`Unexpected non-file in release output: ${item}`);
    }
  }
  visit('');
  return { digest: hash.digest('hex'), files, bytes };
}
export function verifyArchive(file, expected) {
  const bytes = readFileSync(file);
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  if (digest(bytes) !== expected.sha256 || integrity !== expected.integrity) throw new Error('Reviewed release archive changed. No publication attempted.');
}
export function withCompilerLock(root, version, archive, operation) {
  const pkgFile = path.join(root, 'package.json'), lockFile = path.join(root, 'package-lock.json');
  const originalPackage = readFileSync(pkgFile), originalLock = readFileSync(lockFile);
  const pkg = JSON.parse(originalPackage), lock = JSON.parse(originalLock);
  const integrity = `sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`;
  try {
    pkg.dependencies['@shoalrun/cli'] = version;
    lock.packages[''].dependencies['@shoalrun/cli'] = version;
    Object.assign(lock.packages['node_modules/@shoalrun/cli'], { version, integrity, resolved: `file:${path.resolve(archive)}` });
    save(pkgFile, pkg); save(lockFile, lock);
    return operation();
  } finally {
    writeFileSync(pkgFile, originalPackage); writeFileSync(lockFile, originalLock);
  }
}
export const approvalId = plan => digest(JSON.stringify(plan));
function releaseVersionParts(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(version ?? '');
  if (!match) throw new Error(`Invalid release version: ${version}`);
  return { core: match.slice(1, 4).map(BigInt), pre: match[4]?.split('.') };
}
export function compareReleaseVersions(left, right) {
  const a = releaseVersionParts(left), b = releaseVersionParts(right);
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  if (!a.pre || !b.pre) return a.pre ? -1 : b.pre ? 1 : 0;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i], y = b.pre[i];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const numericX = /^\d+$/.test(x), numericY = /^\d+$/.test(y);
    if (numericX && numericY) { if (BigInt(x) !== BigInt(y)) return BigInt(x) < BigInt(y) ? -1 : 1; continue; }
    if (numericX !== numericY) return numericX ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
export function releaseTag(version, latest) {
  const { pre } = releaseVersionParts(version);
  if (!pre) return 'latest';
  // Move forward from alpha to beta too, but never replace a stable latest.
  return !latest || releaseVersionParts(latest).pre && compareReleaseVersions(version, latest) >= 0 ? 'latest' : pre[0];
}
export function releaseTags(version, current = {}) {
  const { pre } = releaseVersionParts(version);
  const tags = pre ? [pre[0]] : [];
  if (releaseTag(version, current.latest) === 'latest') tags.push('latest');
  return tags.filter(tag => !current[tag] || compareReleaseVersions(version, current[tag]) >= 0);
}
export function requireApproval(plan, approval) {
  if (approval !== approvalId(plan)) throw new Error('Approval must match the exact reviewed package, source commits, and site bundle.');
}

// An interrupted upload is ambiguous. Registry confirmation is safe; a second
// upload is not. A failed lookup must never be interpreted as "not published".
export async function publishOnce({ marker, expected, lookup, publish }) {
  const found = await lookup();
  if (found) {
    if (found.version !== expected.version || found.dist?.integrity !== expected.integrity) throw new Error('Registry version differs from the reviewed archive.');
    return 'verified';
  }
  if (existsSync(marker)) return 'pending';
  save(marker, { version: expected.version, integrity: expected.integrity, attemptedAt: new Date().toISOString() });
  await publish();
  return 'uploaded';
}

export async function deployOnce({ marker, buildId, live, authenticate, deploy }) {
  if (await live()) return 'verified';
  if (existsSync(marker)) return 'pending';
  await authenticate();
  save(marker, { buildId, attemptedAt: new Date().toISOString() });
  await deploy();
  return 'uploaded';
}

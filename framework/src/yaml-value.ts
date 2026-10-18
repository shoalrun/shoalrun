import YAML from 'yaml';

/** YAML inputs must represent finite data; recursive OpenAPI schemas use $ref. */
export function parseYaml(source: string, file: string): any {
  const document = YAML.parseDocument(source, { uniqueKeys: true, strict: true });
  if (document.errors.length) throw new Error(`${file}: ${document.errors.map(error => error.message).join('; ')}`);
  let value: unknown;
  try { value = document.toJS(); }
  catch (error) { throw new Error(`${file}: ${(error as Error).message}`); }
  const active = new WeakSet<object>();
  const finished = new WeakSet<object>();
  const pending: Array<{ value: unknown; at: string; exit?: boolean }> = [{ value, at: '#' }];
  while (pending.length) {
    const item = pending.pop()!;
    if (!item.value || typeof item.value !== 'object') continue;
    if (item.exit) { active.delete(item.value); finished.add(item.value); continue; }
    if (active.has(item.value)) throw new Error(`${file}: Cyclic YAML alias at ${item.at}. Replace the cycle with finite values; recursive OpenAPI schemas should use $ref.`);
    if (finished.has(item.value)) continue;
    active.add(item.value);
    pending.push({ ...item, exit: true });
    for (const [key, child] of Object.entries(item.value)) pending.push({ value: child, at: `${item.at}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}` });
  }
  return value;
}

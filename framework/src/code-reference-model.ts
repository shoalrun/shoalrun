import { z } from 'zod';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const text = z.string().max(100_000);
const id = z.string().min(1).max(512).regex(/^[^\s\x00-\x1f]+$/, 'Symbol IDs cannot contain whitespace or control characters');
const detail = z.object({ name: z.string().min(1).max(512), type: text.optional(), description: text.optional(), default: text.optional() }).strict();
export const codeReferenceSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal('shoalrun-code-reference'),
  programmingLanguage: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  producer: z.object({ name: z.string().min(1).max(100), version: z.string().min(1).max(100), extractorVersion: z.string().max(100).optional() }).strict(),
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  symbols: z.array(z.object({
    id, name: z.string().min(1).max(512),
    kind: z.enum(['module', 'namespace', 'class', 'interface', 'enum', 'type', 'function', 'method', 'constructor', 'property', 'attribute', 'constant']),
    parent: id.optional(), visibility: z.enum(['public', 'private']).default('public'),
    summary: z.string().max(1000).optional(), description: text.optional(),
    annotation: text.optional(), default: text.optional(), required: z.boolean().optional(),
    bases: z.array(text).max(100).optional(), constructorSignature: text.optional(),
    typeReferences: z.record(z.string().min(1).max(512), id).optional(),
    signatures: z.array(text).max(100).optional(),
    parameters: z.array(detail).max(1000).optional(),
    returns: z.object({ type: text.optional(), description: text.optional() }).strict().optional(),
    yields: z.object({ type: text.optional(), description: text.optional() }).strict().optional(),
    raises: z.array(detail).max(1000).optional(),
    examples: z.array(z.object({ title: z.string().max(512).optional(), code: text }).strict()).max(100).optional(),
    seeAlso: z.array(id).max(1000).optional(),
    source: z.object({ path: z.string().min(1).max(1000).regex(/^(?!\/)(?!.*(?:^|\/)\.{1,2}(?:\/|$))[^/\\\x00:]+(?:\/[^/\\\x00:]+)*$/), line: z.number().int().positive().optional() }).strict().optional()
  }).strict()).min(1).max(10_000)
}).strict();
export type CodeReferenceSnapshot = z.infer<typeof codeReferenceSchema>;
export type CodeSymbol = CodeReferenceSnapshot['symbols'][number];
export type CodeReference = { catalog: string; programmingLanguage: string; symbol: CodeSymbol; sourceUrl?: string; layout?: 'symbols' | 'classes' | 'modules'; complete?: boolean };

export function validateCodeReference(value: unknown): CodeReferenceSnapshot {
  const result = codeReferenceSchema.parse(value);
  const symbols = new Map<string, CodeSymbol>();
  for (const symbol of result.symbols) {
    if (symbols.has(symbol.id)) throw new Error(`Duplicate code symbol ${symbol.id}`);
    symbols.set(symbol.id, symbol);
  }
  const complete = new Set<string>();
  for (const symbol of result.symbols) {
    for (const target of [symbol.parent, ...symbol.seeAlso ?? [], ...Object.values(symbol.typeReferences ?? {})]) if (target && !symbols.has(target)) throw new Error(`${symbol.id}: unknown code symbol ${target}`);
    const seen = new Set([symbol.id]);
    let parent = symbol.parent;
    while (parent && !complete.has(parent)) {
      if (seen.has(parent)) throw new Error(`${symbol.id}: cyclic symbol ownership`);
      seen.add(parent); parent = symbols.get(parent)?.parent;
    }
    for (const id of seen) complete.add(id);
  }
  return result;
}

export async function readCodeReference(file: string, root?: string): Promise<CodeReferenceSnapshot> {
  const canonical = await realpath(file);
  if (root) {
    const base = await realpath(root);
    if (canonical !== base && !canonical.startsWith(base + path.sep)) throw new Error('Code reference source escapes the project root');
  }
  if (canonical.split(path.sep).some(part => /^\.env(?:\.|$)|^\.git$|\.(?:local|override)\.md$/i.test(part))) throw new Error('Private local files cannot be code reference sources');
  const info = await stat(canonical);
  if (!info.isFile() || info.size > 32 * 1024 * 1024) throw new Error('Code reference source must be a regular JSON file at most 32 MiB');
  const bytes = await readFile(canonical);
  if (bytes.length > 32 * 1024 * 1024) throw new Error('Code reference source exceeds 32 MiB');
  return validateCodeReference(JSON.parse(bytes.toString('utf8')));
}

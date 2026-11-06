import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { LanguageRegistration } from 'shiki';

export type LanguageFiles = { grammarOrigin?: (index: number) => string; onDependency?: (file: string) => void };
const identifier = /^[a-z][a-z0-9_-]{0,63}$/;
const mapping = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export async function customHighlightLanguages(value: unknown, declaringFile: string | undefined, reserved: ReadonlySet<string>, options: LanguageFiles, reservedScopes: ReadonlySet<string> = new Set()) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('outputs.html.highlighting.languages must be a list');
  const names = new Set(reserved);
  const scopes = new Set(reservedScopes);
  const result: Array<{ file: string; grammar: LanguageRegistration }> = [];
  for (const [index, entry] of value.entries()) {
    const setting = `outputs.html.highlighting.languages[${index}]`;
    if (!mapping(entry) || Object.keys(entry).some(key => !['id', 'grammar', 'aliases'].includes(key))) throw new Error(`${setting} accepts id, grammar, and aliases`);
    if (typeof entry.id !== 'string' || !identifier.test(entry.id)) throw new Error(`${setting}.id must be a lowercase language ID, using letters, digits, underscores, or hyphens`);
    const aliases = entry.aliases ?? [];
    if (!Array.isArray(aliases) || aliases.some(alias => typeof alias !== 'string' || !identifier.test(alias))) throw new Error(`${setting}.aliases must be a list of lowercase language IDs`);
    for (const name of [entry.id, ...aliases] as string[]) {
      if (names.has(name)) throw new Error(`${setting}: language ID or alias ${name} is already registered`);
      names.add(name);
    }
    if (typeof entry.grammar !== 'string' || !entry.grammar || path.isAbsolute(entry.grammar) || /^[a-z][a-z0-9+.-]*:/i.test(entry.grammar) || path.extname(entry.grammar).toLowerCase() !== '.json') throw new Error(`${setting}.grammar must be a relative path to a local TextMate JSON grammar`);
    const origin = options.grammarOrigin?.(index) ?? declaringFile;
    if (!origin) throw new Error(`${setting}.grammar needs the declaring configuration file`);
    const file = path.resolve(path.dirname(origin), entry.grammar);
    options.onDependency?.(file);
    const info = await stat(file).catch(() => { throw new Error(`${setting}: cannot read grammar ${file}`); });
    if (!info.isFile() || info.size > 4 * 1024 * 1024) throw new Error(`${setting}: grammar must be a regular JSON file no larger than 4 MiB: ${file}`);
    let grammar: unknown;
    try { grammar = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { throw new Error(`${setting}: invalid TextMate JSON grammar ${file}: ${(error as Error).message}`); }
    if (!mapping(grammar) || typeof grammar.scopeName !== 'string' || !/^\S+$/.test(grammar.scopeName) || !Array.isArray(grammar.patterns)) throw new Error(`${setting}: grammar needs a scopeName and a patterns array: ${file}`);
    if (scopes.has(grammar.scopeName)) throw new Error(`${setting}: grammar scopeName ${grammar.scopeName} is already registered`);
    scopes.add(grammar.scopeName);
    result.push({ file, grammar: { ...grammar, name: entry.id, aliases } as LanguageRegistration });
  }
  return result;
}

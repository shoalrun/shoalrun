import { searchIdentifiers } from './search-identifier.js';

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const boundary = (value: string) => new RegExp(`(?<![\\w$.-])${escape(value)}(?![\\w$-]|\\.[\\w$])`, 'i');

// Only explicit technical syntax gets this exception. Ordinary topic words must
// not make code comments or link directories outrank explanatory content.
export function literalSearch(query: string): ((lines: string[]) => string | undefined) | undefined {
  const trimmed = query.trim();
  const quoted = /^(["'`])[\s\S]+\1$/.test(trimmed);
  const phrase = (quoted ? trimmed.slice(1, -1) : trimmed).replace(/\s+/g, ' ');
  const identifiers = searchIdentifiers(phrase);
  const technical = quoted || identifiers.length || /[a-z][A-Z]|[<>{}=]|->|\b\w+:\w+|(?:^|\s)-[A-Za-z]|^[\w./@-]+\.[A-Za-z]{1,6}$/.test(phrase)
    || /^(?:npm|npx|pnpm|yarn|bun|node|curl|git|shoalrun)\s+\S/i.test(phrase);
  if (!technical || !phrase) return undefined;
  // A complete command is matched as a phrase, even when it contains a flag.
  const command = /^(?:npm|npx|pnpm|yarn|bun|node|curl|git|shoalrun)\s+\S/i.test(phrase);
  const matches = (identifiers.length && !command ? identifiers : [phrase]).map(boundary);
  return lines => {
    const line = lines.find(line => matches.every(expression => expression.test(line)));
    if (!line) return undefined;
    if (line.length <= 180) return line;
    const at = line.search(matches[0]);
    const start = Math.max(0, at - 40);
    return `${start ? '…' : ''}${line.slice(start, start + (start ? 178 : 179)).trim()}…`;
  };
}

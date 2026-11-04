import type { Hit } from './retrieval.js';
import { searchParagraphs } from './search-snippet.js';
import { identifierMatch as preparedMatch, identifierRescue as preparedRescue } from './search-identifier-core.js';
export { searchIdentifiers } from './search-identifier-core.js';

// Keep the older unprepared-passage API usable by local callers. Hosted search
// imports the prepared core and never needs a Markdown parser at request time.
const paragraphs = (hit: Hit) => hit.chunk.search?.paragraphs ?? searchParagraphs(hit.chunk.text);
export const identifierMatch = (query: string) => preparedMatch(query, paragraphs);
export const identifierRescue = <T extends Hit>(query: string, semantic: T[], lexical: T[]): T[] => preparedRescue(query, semantic, lexical, paragraphs);

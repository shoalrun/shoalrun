import { validateReaderSelection, type ReaderFiltersConfig, type ReaderSelection } from './reader-filters.js';

/** Build-time page selection; every selected facet must match at least one choice. */
export function validateContentFilter(value: unknown, facets?: ReaderFiltersConfig): ReaderSelection | undefined {
  if (value === undefined) return undefined;
  if (!facets) throw new Error('site.contentFilter requires configured readerFilters.facets');
  const selection = validateReaderSelection(value, facets, 'site.contentFilter');
  if (!Object.keys(selection).length || Object.values(selection).some(choices => !choices.length)) {
    throw new Error('site.contentFilter needs at least one facet, each with a nonempty list of choices');
  }
  return selection;
}

export function matchesContentFilter(marks: ReaderSelection | undefined, selection: ReaderSelection | undefined): boolean {
  return !selection || Object.entries(selection).every(([facet, choices]) =>
    choices.some(choice => marks?.[facet]?.includes(choice)));
}

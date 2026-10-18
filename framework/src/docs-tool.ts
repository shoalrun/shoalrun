import { bundledDocumentation, getDocumentationPage, searchDocumentation } from './documentation-core.js';

export async function searchShoalrunDocs(query: string) {
  return searchDocumentation(bundledDocumentation, query);
}

export async function readShoalrunDoc(id: string): Promise<string> {
  return (await getDocumentationPage(bundledDocumentation, id, { maxTokens: 100_000 })).content;
}

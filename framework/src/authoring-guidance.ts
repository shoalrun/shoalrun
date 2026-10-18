/** Project instructions and read-only source locations; no provider or model runtime. */
export type AuthoringSourceRoot = { name?: string; path: string; include?: string[]; exclude?: string[] };
export type AuthoringGuidance = { directives?: string; guideFiles?: string[]; exemplarFiles?: string[]; sourceRoots?: AuthoringSourceRoot[]; pageSources?: Record<string, string[]> };

export function validateAuthoringGuidance(value: unknown): AuthoringGuidance | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('authoring must be an object');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['directives', 'guideFiles', 'exemplarFiles', 'sourceRoots', 'pageSources'].includes(key))) throw new Error('authoring accepts directives, guideFiles, exemplarFiles, sourceRoots and pageSources');
  if (input.directives !== undefined && (typeof input.directives !== 'string' || !input.directives.trim())) throw new Error('authoring.directives must be nonempty text');
  for (const key of ['guideFiles', 'exemplarFiles']) {
    if (input[key] !== undefined && (!Array.isArray(input[key]) || (input[key] as unknown[]).some(file => typeof file !== 'string' || !file.trim() || file.startsWith('/') || /^[A-Za-z]:/.test(file) || file.split(/[\\/]/).includes('..')))) throw new Error(`authoring.${key} must contain project-relative file paths`);
  }
  const localPath = (path: unknown, where: string): string => {
    if (typeof path !== 'string' || !path.trim() || /[\0\r\n]/.test(path) || /^[a-z][a-z0-9+.-]*:\/\//i.test(path)) throw new Error(`${where} must be a local path, not a URL`);
    return path;
  };
  const patterns = (value: unknown, where: string): string[] => {
    if (!Array.isArray(value) || !value.length) throw new Error(`${where} must be a nonempty list of patterns`);
    return value.map(item => localPath(item, where));
  };
  let sourceRoots: AuthoringSourceRoot[] | undefined;
  if (input.sourceRoots !== undefined) {
    if (!Array.isArray(input.sourceRoots) || !input.sourceRoots.length || input.sourceRoots.length > 16) throw new Error('authoring.sourceRoots must contain 1 to 16 source folders');
    sourceRoots = input.sourceRoots.map((root, index) => {
      const where = `authoring.sourceRoots[${index}]`;
      if (!root || typeof root !== 'object' || Array.isArray(root) || Object.keys(root).some(key => !['name', 'path', 'include', 'exclude'].includes(key))) throw new Error(`${where} accepts name, path, include and exclude`);
      const record = root as Record<string, unknown>;
      if (record.name !== undefined && (typeof record.name !== 'string' || !record.name.trim())) throw new Error(`${where}.name must be nonempty text`);
      const result: AuthoringSourceRoot = { path: localPath(record.path, `${where}.path`), ...(record.name === undefined ? {} : { name: record.name as string }) };
      for (const key of ['include', 'exclude'] as const) if (record[key] !== undefined) {
        result[key] = patterns(record[key], `${where}.${key}`);
        if (result[key]!.some(pattern => pattern.startsWith('/') || /^[A-Za-z]:/.test(pattern) || pattern.split(/[\\/]/).includes('..'))) throw new Error(`${where}.${key} patterns must stay inside their source folder`);
      }
      return result;
    });
  }
  let pageSources: Record<string, string[]> | undefined;
  if (input.pageSources !== undefined) {
    if (!input.pageSources || typeof input.pageSources !== 'object' || Array.isArray(input.pageSources)) throw new Error('authoring.pageSources must map page IDs to source path lists');
    pageSources = Object.fromEntries(Object.entries(input.pageSources).map(([id, files]) => {
      if (!id.trim()) throw new Error('authoring.pageSources needs nonempty page IDs');
      return [id, patterns(files, `authoring.pageSources.${id}`)];
    }));
  }
  return { ...(input.directives === undefined ? {} : { directives: input.directives as string }), ...(input.guideFiles === undefined ? {} : { guideFiles: [...input.guideFiles as string[]] }), ...(input.exemplarFiles === undefined ? {} : { exemplarFiles: [...input.exemplarFiles as string[]] }), ...(sourceRoots === undefined ? {} : { sourceRoots }), ...(pageSources === undefined ? {} : { pageSources }) };
}

// The mount point for every public URL in a built site. Internal build manifests
// remain at the output root so local tools can find them without a config file.
export function normalizeBasePath(value: unknown): string {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !/^\/(?:[A-Za-z0-9._~-]+)(?:\/[A-Za-z0-9._~-]+)*\/?$/.test(value) || value.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('site.basePath must be a path such as /docs without queries, escapes, or dot segments');
  }
  return value.replace(/\/$/, '');
}

export function sitePath(basePath: string, route: string): string {
  if (!route.startsWith('/') || route.startsWith('//')) throw new Error(`Invalid public route ${route}`);
  return `${basePath}${route}`;
}

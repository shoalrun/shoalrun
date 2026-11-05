// Canonical, exact hostnames only: no wildcard, URL, credentials, or port.
export function turnstileHostname(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.length > 253 || /[\s*]/.test(value)) return;
  const hostname = value.toLowerCase().replace(/\.$/, '');
  try {
    const url = new URL(`https://${hostname}`);
    if (url.host !== hostname || url.pathname !== '/' || url.search || url.hash || url.username || url.password) return;
    return hostname;
  } catch { return; }
}

export function turnstileHostnames(value: unknown, setting: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new Error(`${setting} must be a nonempty list of at most 100 exact hostnames`);
  const names = value.map(turnstileHostname);
  if (names.some(name => name === undefined)) throw new Error(`${setting} must contain exact hostnames without wildcards, URLs, or ports`);
  return [...new Set(names as string[])];
}

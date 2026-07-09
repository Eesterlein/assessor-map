export type SourceUrlValidation = { ok: true; url: string } | { ok: false; error: string };

/**
 * Validate and normalize a user-supplied source URL before it is persisted.
 * Shared by the admin client (pre-save) and the admin server (`/api/sources`),
 * so a malformed URL can never reach the `ogc_sources` catalog — a corrupted
 * value there silently breaks every config that references the source.
 *
 * Normalizes what is safe (whitespace, one pair of wrapping quotes from a
 * JSON-paste artifact, missing scheme on bare hosts) and rejects what is
 * ambiguous (embedded quotes, backslashes, whitespace, non-http schemes).
 * Callers must persist the returned normalized URL.
 */
export function validateSourceUrl(
  raw: string,
  opts?: { allowRelative?: boolean },
): SourceUrlValidation {
  let url = raw.trim();
  const wrapped =
    (url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"));
  if (wrapped && url.length >= 2) {
    url = url.slice(1, -1).trim();
  }
  if (url.length === 0) {
    return { ok: false, error: 'url is required' };
  }
  if (/[\s"'\\]/.test(url)) {
    return { ok: false, error: 'url must be a valid absolute http(s) URL' };
  }
  if (opts?.allowRelative && url.startsWith('/')) {
    return { ok: true, url };
  }
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('/') || url.includes('://')) {
      return { ok: false, error: 'url must be a valid absolute http(s) URL' };
    }
    url = `http://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'url must be a valid absolute http(s) URL' };
    }
  } catch {
    return { ok: false, error: 'url must be a valid absolute http(s) URL' };
  }
  return { ok: true, url };
}

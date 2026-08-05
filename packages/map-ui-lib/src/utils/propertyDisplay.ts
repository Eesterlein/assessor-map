import type { PropertyDisplayConfigInput, PropertyDisplayType } from '../types';

// Single owner of propertyDisplay ordering: sort by explicit `order`, entries
// without it last in key order (stable sort). Key order alone can't express
// display order — see the `order` field comment in schemas/config.ts.
export function sortedPropertyDisplayEntries<T extends { order?: number }>(
  config: Record<string, T>,
): [string, T][] {
  return Object.entries(config).sort(
    (a, b) =>
      (a[1].order ?? Number.MAX_SAFE_INTEGER) - (b[1].order ?? Number.MAX_SAFE_INTEGER),
  );
}

// Security boundary for propertyDisplay `type: 'link'` rendering: only
// absolute http(s) URLs may become anchor hrefs. Everything else —
// javascript:/data: URIs, relative paths, non-strings, malformed values —
// must fall back to plain text. Do not loosen this whitelist.
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolvePropertyDisplay(propertyDisplay: PropertyDisplayConfigInput | undefined):
  | {
      fields: string[];
      labels: Record<string, string>;
      types: Record<string, PropertyDisplayType>;
      linkText: Record<string, string>;
    }
  | undefined {
  if (!propertyDisplay) return undefined;
  const fields: string[] = [];
  const labels: Record<string, string> = {};
  const types: Record<string, PropertyDisplayType> = {};
  const linkText: Record<string, string> = {};
  for (const [key, config] of sortedPropertyDisplayEntries(propertyDisplay)) {
    if (config.visible === false) continue;
    fields.push(key);
    if (config.label) labels[key] = config.label;
    // 'text' is the semantic default — only non-default types are recorded,
    // mirroring how `labels` only includes entries with an explicit label.
    if (config.type && config.type !== 'text') types[key] = config.type;
    if (config.linkText) linkText[key] = config.linkText;
  }
  return { fields, labels, types, linkText };
}

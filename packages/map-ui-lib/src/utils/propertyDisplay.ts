import type { PropertyDisplayConfigInput } from '../types';

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

export function resolvePropertyDisplay(
  propertyDisplay: PropertyDisplayConfigInput | undefined,
): { fields: string[]; labels: Record<string, string> } | undefined {
  if (!propertyDisplay) return undefined;
  const fields: string[] = [];
  const labels: Record<string, string> = {};
  for (const [key, config] of sortedPropertyDisplayEntries(propertyDisplay)) {
    if (config.visible === false) continue;
    fields.push(key);
    if (config.label) labels[key] = config.label;
  }
  return { fields, labels };
}

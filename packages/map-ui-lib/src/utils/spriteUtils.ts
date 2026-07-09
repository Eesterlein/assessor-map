/**
 * Pure fetch helpers for MapLibre sprite sheets.
 * No MapLibre dependency — works in any environment.
 */

/**
 * Reserved sprite id for the bundled default highway-shield sprite sheet.
 * A custom SpriteSource with this id overrides/replaces the bundled one.
 */
export const DEFAULT_SHIELD_SPRITE_ID = 'shields';

/**
 * App-relative path (no extension) where both apps serve the bundled shield
 * sprite from their public/ dir. MapLibre appends .json/.png (and @2x).
 */
export const DEFAULT_SHIELD_SPRITE_PATH = 'sprites/shields/sprite';

/**
 * Builds the {id, url} sprite source for the bundled default shield sprite,
 * resolved against the app's base URL (e.g. `${location.origin}${BASE_URL}`).
 */
export function getDefaultShieldSprite(appBaseUrl: string): { id: string; url: string } {
  const base = appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`;
  return { id: DEFAULT_SHIELD_SPRITE_ID, url: new URL(DEFAULT_SHIELD_SPRITE_PATH, base).href };
}

/**
 * Prepends the bundled default shield sprite to a sprite-source list, unless
 * the caller already supplies a sprite with the reserved id "shields" (which
 * then overrides the bundled sheet entirely).
 */
export function withDefaultShieldSprite(
  sprites: Array<{ id: string; url: string }>,
  appBaseUrl: string,
): Array<{ id: string; url: string }> {
  if (sprites.some((s) => s.id === DEFAULT_SHIELD_SPRITE_ID)) return sprites;
  return [getDefaultShieldSprite(appBaseUrl), ...sprites];
}

/**
 * Fetches a basemap style JSON and returns its `sprite` URL (string form).
 * Returns null if the style has no sprite or the fetch fails.
 */
export async function fetchSpriteUrlFromStyle(styleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(styleUrl);
    if (!res.ok) return null;
    const json = await res.json() as { sprite?: string | Array<{ id: string; url: string }> };
    if (!json.sprite) return null;
    // MapLibre supports both a string URL and an array of {id, url} objects
    if (typeof json.sprite === 'string') return json.sprite;
    if (Array.isArray(json.sprite) && json.sprite.length > 0) return json.sprite[0].url;
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches `{spriteUrl}.json` (the sprite index) and returns a sorted array of icon names.
 * Returns an empty array if the fetch fails.
 */
export async function fetchSpriteNames(spriteUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${spriteUrl}.json`);
    if (!res.ok) return [];
    const json = await res.json() as Record<string, unknown>;
    return Object.keys(json).sort();
  } catch {
    return [];
  }
}

/**
 * Fetches a basemap style JSON and injects custom sprite URLs into its `sprite` property.
 * Returns the resolved style object ready to pass to MapLibre.
 */
export async function resolveStyleWithSprites(
  styleUrl: string,
  sprites: Array<{ id: string; url: string }>,
): Promise<Record<string, unknown>> {
  const res = await fetch(styleUrl);
  if (!res.ok) throw new Error(`Failed to fetch style: ${res.status}`);
  const style = await res.json() as Record<string, unknown>;
  if (!sprites.length) return style;

  const existing = Array.isArray(style.sprite)
    ? style.sprite as Array<{ id: string; url: string }>
    : style.sprite
      ? [{ id: 'default', url: style.sprite as string }]
      : [];
  const customIds = new Set(sprites.map(s => s.id));
  const merged = [
    ...existing.filter((s: { id: string }) => !customIds.has(s.id)),
    ...sprites.map(s => ({ id: s.id, url: s.url })),
  ];
  return { ...style, sprite: merged };
}

/**
 * Fetches a basemap style JSON and returns all its sprite sources as {id, url} pairs.
 * Returns an empty array if the style has no sprite or the fetch fails.
 */
async function fetchSpriteSources(styleUrl: string): Promise<Array<{ id: string; url: string }>> {
  try {
    const res = await fetch(styleUrl);
    if (!res.ok) return [];
    const json = await res.json() as { sprite?: string | Array<{ id: string; url: string }> };
    if (!json.sprite) return [];
    if (typeof json.sprite === 'string') return [{ id: 'default', url: json.sprite }];
    if (Array.isArray(json.sprite)) return json.sprite;
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetches icon names from a sprite and prefixes them with the sprite id
 * (unless the id is "default", in which case names are returned bare).
 */
async function fetchPrefixedSpriteNames(sprite: { id: string; url: string }): Promise<string[]> {
  const names = await fetchSpriteNames(sprite.url);
  if (sprite.id === 'default') return names;
  return names.map(n => `${sprite.id}:${n}`);
}

/**
 * Resolves all available icon names from a basemap style URL and optional custom sprites.
 * Names from non-"default" sprites are prefixed with their id (e.g. "maki:bank_11").
 * Deduplicates and returns a sorted list.
 */
export async function resolveAvailableIcons(
  basemapStyleUrl?: string,
  customSprites: Array<{ id: string; url: string }> = [],
): Promise<string[]> {
  const fetches: Promise<string[]>[] = [];

  if (basemapStyleUrl) {
    fetches.push(
      fetchSpriteSources(basemapStyleUrl).then(sources =>
        Promise.all(sources.map(fetchPrefixedSpriteNames)).then(r => r.flat()),
      ),
    );
  }

  for (const sprite of customSprites) {
    fetches.push(fetchPrefixedSpriteNames(sprite));
  }

  const results = await Promise.all(fetches);
  return [...new Set(results.flat())].sort();
}

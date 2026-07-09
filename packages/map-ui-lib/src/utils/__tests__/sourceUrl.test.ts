import { describe, it, expect } from 'vitest';
import { validateSourceUrl } from '../sourceUrl';

// The exact corrupted value from the deployed DB (TODO.md P1)
const CORRUPTED =
  '"http://server.arcgisonline.com/ArcGIS/res\\/services/USA_Topo_Maps/MapServer';

describe('validateSourceUrl', () => {
  it('accepts a clean absolute URL unchanged', () => {
    expect(validateSourceUrl('https://example.com/ogc/')).toEqual({
      ok: true,
      url: 'https://example.com/ogc/',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(validateSourceUrl('  https://example.com/ogc  ')).toEqual({
      ok: true,
      url: 'https://example.com/ogc',
    });
  });

  it('strips one pair of wrapping quotes (JSON paste artifact)', () => {
    expect(validateSourceUrl('"https://example.com/ogc"')).toEqual({
      ok: true,
      url: 'https://example.com/ogc',
    });
    expect(validateSourceUrl("'https://example.com/ogc'")).toEqual({
      ok: true,
      url: 'https://example.com/ogc',
    });
  });

  it('rejects the exact corrupted DB value', () => {
    const result = validateSourceUrl(CORRUPTED);
    expect(result.ok).toBe(false);
  });

  it('rejects embedded quotes, backslashes, and whitespace', () => {
    expect(validateSourceUrl('https://example.com/a"b').ok).toBe(false);
    expect(validateSourceUrl('https://example.com/a\\/b').ok).toBe(false);
    expect(validateSourceUrl('https://example.com/a b').ok).toBe(false);
  });

  it('rejects empty input', () => {
    expect(validateSourceUrl('').ok).toBe(false);
    expect(validateSourceUrl('""').ok).toBe(false);
  });

  it('prepends http:// for bare hosts', () => {
    expect(validateSourceUrl('localhost:8000/ogc/')).toEqual({
      ok: true,
      url: 'http://localhost:8000/ogc/',
    });
  });

  it('rejects non-http schemes', () => {
    expect(validateSourceUrl('ftp://example.com/data').ok).toBe(false);
    expect(validateSourceUrl('javascript:alert(1)').ok).toBe(false);
  });

  it('rejects relative paths by default but accepts them with allowRelative', () => {
    expect(validateSourceUrl('/api/basemaps/x/style.json').ok).toBe(false);
    expect(validateSourceUrl('/api/basemaps/x/style.json', { allowRelative: true })).toEqual({
      ok: true,
      url: '/api/basemaps/x/style.json',
    });
  });
});

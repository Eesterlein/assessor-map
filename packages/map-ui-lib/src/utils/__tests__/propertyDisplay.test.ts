import { describe, it, expect } from 'vitest';
import { resolvePropertyDisplay, isSafeHttpUrl } from '../propertyDisplay';

describe('resolvePropertyDisplay', () => {
  it('returns undefined when input is undefined', () => {
    expect(resolvePropertyDisplay(undefined)).toBeUndefined();
  });

  it('returns empty fields and labels for an empty config', () => {
    expect(resolvePropertyDisplay({})).toEqual({ fields: [], labels: {}, types: {}, linkText: {} });
  });

  it('filters out properties with visible: false', () => {
    const result = resolvePropertyDisplay({
      name: { visible: true },
      internal_id: { visible: false },
      pop_est: { visible: true },
    });
    expect(result?.fields).toEqual(['name', 'pop_est']);
  });

  it('maps labels correctly', () => {
    const result = resolvePropertyDisplay({
      name: { label: 'Country Name', visible: true },
      pop_est: { label: 'Population', visible: true },
    });
    expect(result?.labels).toEqual({ name: 'Country Name', pop_est: 'Population' });
  });

  it('includes properties without labels in fields but not in labels', () => {
    const result = resolvePropertyDisplay({
      name: { label: 'Country Name', visible: true },
      continent: { visible: true },
    });
    expect(result?.fields).toEqual(['name', 'continent']);
    expect(result?.labels).toEqual({ name: 'Country Name' });
    expect('continent' in (result?.labels ?? {})).toBe(false);
  });

  it('preserves key insertion order', () => {
    const result = resolvePropertyDisplay({
      z_prop: { visible: true },
      a_prop: { visible: true },
      m_prop: { visible: true },
    });
    expect(result?.fields).toEqual(['z_prop', 'a_prop', 'm_prop']);
  });

  it('treats missing visible as visible (default true)', () => {
    const result = resolvePropertyDisplay({
      name: { label: 'Name' },
    });
    expect(result?.fields).toEqual(['name']);
  });

  it('sorts fields by explicit order regardless of key order', () => {
    const result = resolvePropertyDisplay({
      acres: { order: 2 },
      owner: { order: 0 },
      zone: { order: 1 },
    });
    expect(result?.fields).toEqual(['owner', 'zone', 'acres']);
  });

  it('puts entries without order after ordered ones, in key order', () => {
    const result = resolvePropertyDisplay({
      legacy_b: {},
      ordered_late: { order: 5 },
      legacy_a: {},
      ordered_early: { order: 1 },
    });
    expect(result?.fields).toEqual(['ordered_early', 'ordered_late', 'legacy_b', 'legacy_a']);
  });

  it('keeps labels and visibility working alongside order', () => {
    const result = resolvePropertyDisplay({
      hidden: { visible: false, order: 0 },
      second: { label: 'Second', order: 2 },
      first: { label: 'First', order: 1 },
    });
    expect(result).toEqual({
      fields: ['first', 'second'],
      labels: { first: 'First', second: 'Second' },
      types: {},
      linkText: {},
    });
  });

  it('records type: link entries in types, omitting text/default entries', () => {
    const result = resolvePropertyDisplay({
      assessorlink: { type: 'link' },
      owner: { type: 'text' },
      acres: {},
    });
    expect(result?.types).toEqual({ assessorlink: 'link' });
    expect('owner' in (result?.types ?? {})).toBe(false);
    expect('acres' in (result?.types ?? {})).toBe(false);
    expect(result?.fields).toEqual(['assessorlink', 'owner', 'acres']);
  });

  it('records linkText only when set', () => {
    const result = resolvePropertyDisplay({
      assessorlink: { type: 'link', linkText: 'View Assessor Record' },
      website: { type: 'link' },
    });
    expect(result?.linkText).toEqual({ assessorlink: 'View Assessor Record' });
  });

  it('skips types/linkText for hidden entries', () => {
    const result = resolvePropertyDisplay({
      hidden: { type: 'link', linkText: 'Open', visible: false },
    });
    expect(result).toEqual({ fields: [], labels: {}, types: {}, linkText: {} });
  });
});

describe('isSafeHttpUrl', () => {
  it('accepts absolute https URLs', () => {
    expect(isSafeHttpUrl('https://property.spatialest.com/co/gunnison#/property/R005219')).toBe(true);
  });

  it('accepts absolute http URLs', () => {
    expect(isSafeHttpUrl('http://example.com/path?q=1')).toBe(true);
  });

  it('rejects javascript: URIs', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('JavaScript:alert(1)')).toBe(false);
  });

  it('rejects data: URIs', () => {
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects other protocols', () => {
    expect(isSafeHttpUrl('ftp://example.com/file')).toBe(false);
    expect(isSafeHttpUrl('mailto:someone@example.com')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('rejects relative paths and protocol-relative URLs', () => {
    expect(isSafeHttpUrl('/relative/path')).toBe(false);
    expect(isSafeHttpUrl('relative/path')).toBe(false);
    expect(isSafeHttpUrl('//example.com/path')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isSafeHttpUrl(42)).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl({ href: 'https://example.com' })).toBe(false);
    expect(isSafeHttpUrl(['https://example.com'])).toBe(false);
    expect(isSafeHttpUrl(true)).toBe(false);
  });

  it('rejects malformed and empty strings', () => {
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl('not a url')).toBe(false);
    expect(isSafeHttpUrl('http://')).toBe(false);
  });
});

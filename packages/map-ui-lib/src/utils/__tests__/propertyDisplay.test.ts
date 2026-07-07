import { describe, it, expect } from 'vitest';
import { resolvePropertyDisplay } from '../propertyDisplay';

describe('resolvePropertyDisplay', () => {
  it('returns undefined when input is undefined', () => {
    expect(resolvePropertyDisplay(undefined)).toBeUndefined();
  });

  it('returns empty fields and labels for an empty config', () => {
    expect(resolvePropertyDisplay({})).toEqual({ fields: [], labels: {} });
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
    });
  });
});

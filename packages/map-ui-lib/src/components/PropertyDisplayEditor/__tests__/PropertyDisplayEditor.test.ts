import { describe, it, expect } from 'vitest';
import { toEntries, fromEntries } from '../PropertyDisplayEditor';
import type { PropertyDisplayConfig } from '../../../types';

describe('toEntries', () => {
  it('returns empty array for empty config', () => {
    expect(toEntries({})).toEqual([]);
  });

  it('converts record to ordered entries with defaults', () => {
    const config: PropertyDisplayConfig = {
      name: { label: 'Country Name', visible: true },
      internal_id: { visible: false },
    };
    expect(toEntries(config)).toEqual([
      { key: 'name', label: 'Country Name', visible: true },
      { key: 'internal_id', label: '', visible: false },
    ]);
  });

  it('defaults visible to true when missing', () => {
    const config = { name: { label: 'Name' } } as unknown as PropertyDisplayConfig;
    expect(toEntries(config)[0].visible).toBe(true);
  });

  it('defaults label to empty string when missing', () => {
    const config: PropertyDisplayConfig = { name: { visible: true } };
    expect(toEntries(config)[0].label).toBe('');
  });

  it('preserves insertion order for entries without order', () => {
    const config: PropertyDisplayConfig = {
      z_prop: { visible: true },
      a_prop: { visible: true },
      m_prop: { visible: true },
    };
    expect(toEntries(config).map((e) => e.key)).toEqual(['z_prop', 'a_prop', 'm_prop']);
  });

  it('sorts by explicit order regardless of key order', () => {
    const config: PropertyDisplayConfig = {
      a_prop: { visible: true, order: 2 },
      m_prop: { visible: true, order: 0 },
      z_prop: { visible: true, order: 1 },
    };
    expect(toEntries(config).map((e) => e.key)).toEqual(['m_prop', 'z_prop', 'a_prop']);
  });

  it('puts entries without order after ordered ones, in key order', () => {
    const config: PropertyDisplayConfig = {
      legacy_b: { visible: true },
      ordered: { visible: true, order: 0 },
      legacy_a: { visible: true },
    };
    expect(toEntries(config).map((e) => e.key)).toEqual(['ordered', 'legacy_b', 'legacy_a']);
  });
});

describe('fromEntries', () => {
  it('returns empty record for empty array', () => {
    expect(fromEntries([])).toEqual({});
  });

  it('converts entries back to record, stamping order from array position', () => {
    const entries = [
      { key: 'name', label: 'Country Name', visible: true },
      { key: 'internal_id', label: '', visible: false },
    ];
    expect(fromEntries(entries)).toEqual({
      name: { label: 'Country Name', visible: true, order: 0 },
      internal_id: { visible: false, order: 1 },
    });
  });

  it('omits label key when label is empty string', () => {
    const entries = [{ key: 'name', label: '', visible: true }];
    const result = fromEntries(entries);
    expect(result.name).toEqual({ visible: true, order: 0 });
    expect('label' in result.name).toBe(false);
  });

  it('preserves entry order in the record', () => {
    const entries = [
      { key: 'z_prop', label: '', visible: true },
      { key: 'a_prop', label: '', visible: true },
    ];
    expect(Object.keys(fromEntries(entries))).toEqual(['z_prop', 'a_prop']);
  });
});

describe('round-trip: toEntries → mutate → fromEntries', () => {
  it('adding a property creates entry with visible: true', () => {
    const config: PropertyDisplayConfig = { name: { label: 'Name', visible: true } };
    const entries = toEntries(config);
    const updated = [...entries, { key: 'new_prop', label: '', visible: true }];
    const result = fromEntries(updated);
    expect(result['new_prop']).toEqual({ visible: true, order: 1 });
  });

  it('changing a label updates the record', () => {
    const config: PropertyDisplayConfig = { name: { label: 'Old', visible: true } };
    const entries = toEntries(config);
    const updated = entries.map((e) => (e.key === 'name' ? { ...e, label: 'New Name' } : e));
    expect(fromEntries(updated)['name'].label).toBe('New Name');
  });

  it('toggling visible updates the record', () => {
    const config: PropertyDisplayConfig = { name: { visible: true } };
    const entries = toEntries(config);
    const updated = entries.map((e) => (e.key === 'name' ? { ...e, visible: false } : e));
    expect(fromEntries(updated)['name'].visible).toBe(false);
  });

  it('removing a property removes it and renumbers order', () => {
    const config: PropertyDisplayConfig = {
      name: { visible: true, order: 0 },
      internal_id: { visible: false, order: 1 },
      acres: { visible: true, order: 2 },
    };
    const entries = toEntries(config);
    const updated = entries.filter((e) => e.key !== 'internal_id');
    const result = fromEntries(updated);
    expect('internal_id' in result).toBe(false);
    expect(result['name'].order).toBe(0);
    expect(result['acres'].order).toBe(1);
  });

  it('reorder buttons swap adjacent entries and stamp order', () => {
    const config: PropertyDisplayConfig = {
      a: { visible: true },
      b: { visible: true },
      c: { visible: true },
    };
    const entries = toEntries(config);
    // move 'b' (index 1) up
    const updated = [...entries];
    [updated[0], updated[1]] = [updated[1], updated[0]];
    const result = fromEntries(updated);
    expect(Object.keys(result)).toEqual(['b', 'a', 'c']);
    expect(result['b'].order).toBe(0);
    expect(result['a'].order).toBe(1);
    expect(result['c'].order).toBe(2);
  });

  it('renaming a property key updates the record key', () => {
    const config: PropertyDisplayConfig = { old_key: { label: 'Old', visible: true } };
    const entries = toEntries(config);
    const updated = entries.map((e) => (e.key === 'old_key' ? { ...e, key: 'new_key' } : e));
    const result = fromEntries(updated);
    expect('old_key' in result).toBe(false);
    expect(result['new_key']).toEqual({ label: 'Old', visible: true, order: 0 });
  });

  it('reordered config survives jsonb key-order normalization', () => {
    // Postgres jsonb does not preserve object key order; simulate it by
    // rebuilding the saved object with sorted keys (as the DB would return).
    const config: PropertyDisplayConfig = {
      owner: { visible: true },
      acres: { visible: true },
      zone: { visible: true },
    };
    // User reorders: zone, owner, acres — then saves.
    const entries = toEntries(config);
    const reordered = [entries[2], entries[0], entries[1]];
    const saved = fromEntries(reordered);

    const roundTripped: PropertyDisplayConfig = {};
    for (const key of Object.keys(saved).sort()) {
      roundTripped[key] = saved[key];
    }
    expect(Object.keys(roundTripped)).toEqual(['acres', 'owner', 'zone']);

    // Editor still shows the user's order.
    expect(toEntries(roundTripped).map((e) => e.key)).toEqual(['zone', 'owner', 'acres']);
  });
});

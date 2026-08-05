import { describe, it, expect } from 'vitest';
import { resolveDisplayLabel } from '../labelUtils';

describe('resolveDisplayLabel', () => {
  it('returns the label when both label and id are set', () => {
    expect(resolveDisplayLabel({ label: 'Aerial 2024', id: 'aerial-2024' })).toBe('Aerial 2024');
  });

  it('trims surrounding whitespace from the label', () => {
    expect(resolveDisplayLabel({ label: '  Aerial 2024  ', id: 'aerial-2024' })).toBe('Aerial 2024');
  });

  it('falls back to id when label is undefined', () => {
    expect(resolveDisplayLabel({ id: 'aerial-2024' })).toBe('aerial-2024');
  });

  it('falls back to id when label is null', () => {
    expect(resolveDisplayLabel({ label: null, id: 'aerial-2024' })).toBe('aerial-2024');
  });

  it('falls back to id when label is an empty string', () => {
    expect(resolveDisplayLabel({ label: '', id: 'aerial-2024' })).toBe('aerial-2024');
  });

  it('falls back to id when label is whitespace-only', () => {
    expect(resolveDisplayLabel({ label: '   ', id: 'aerial-2024' })).toBe('aerial-2024');
  });

  it('returns id verbatim (no trim) when falling back', () => {
    expect(resolveDisplayLabel({ label: '', id: ' raw-id ' })).toBe(' raw-id ');
  });

  it('returns empty string when both label and id are blank (caller adds catch-all)', () => {
    expect(resolveDisplayLabel({ label: '', id: '' })).toBe('');
    expect(resolveDisplayLabel({ label: '', id: '' }) || 'Untitled').toBe('Untitled');
  });
});

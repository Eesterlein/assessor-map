import { describe, it, expect } from 'vitest';
import { applyDefaultLabelFont } from '../labelFont';
import type { StyleConfig } from '../../types';

const symbolStyle: StyleConfig = {
  type: 'symbol',
  paint: {},
  layout: { 'text-field': ['get', 'name'] },
};

const fillStyle: StyleConfig = {
  type: 'fill',
  paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.5 },
};

const lineStyle: StyleConfig = {
  type: 'line',
  paint: { 'line-color': '#00ff00', 'line-width': 2, 'line-opacity': 1 },
};

const circleStyle: StyleConfig = {
  type: 'circle',
  paint: { 'circle-color': '#0000ff', 'circle-radius': 4, 'circle-opacity': 1 },
};

describe('applyDefaultLabelFont', () => {
  it('injects the default text-font into a symbol style without its own', () => {
    const layout = { visibility: 'visible' };
    const result = applyDefaultLabelFont(layout, symbolStyle, ['Open Sans Bold']);
    expect(result['text-font']).toEqual(['Open Sans Bold']);
    expect(result.visibility).toBe('visible');
  });

  it('leaves an explicit text-font untouched (per-style override wins)', () => {
    const layout = { 'text-font': ['Noto Sans Regular'], visibility: 'visible' };
    const result = applyDefaultLabelFont(layout, symbolStyle, ['Open Sans Bold']);
    expect(result['text-font']).toEqual(['Noto Sans Regular']);
  });

  it('passes non-symbol style types through unchanged', () => {
    for (const style of [fillStyle, lineStyle, circleStyle]) {
      const layout = { visibility: 'none' };
      const result = applyDefaultLabelFont(layout, style, ['Open Sans Bold']);
      expect(result).toBe(layout);
      expect(result['text-font']).toBeUndefined();
    }
  });

  it('is a no-op when defaultLabelFont is undefined', () => {
    const layout = { visibility: 'visible' };
    expect(applyDefaultLabelFont(layout, symbolStyle, undefined)).toBe(layout);
  });

  it('is a no-op when defaultLabelFont is empty', () => {
    const layout = { visibility: 'visible' };
    expect(applyDefaultLabelFont(layout, symbolStyle, [])).toBe(layout);
  });

  it('does not mutate the input layout when injecting', () => {
    const layout: Record<string, unknown> = { visibility: 'visible' };
    const result = applyDefaultLabelFont(layout, symbolStyle, ['Open Sans Bold']);
    expect(result).not.toBe(layout);
    expect(layout['text-font']).toBeUndefined();
  });
});

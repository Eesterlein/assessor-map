import { describe, it, expect } from 'vitest';
import { resolveStyleZoomBounds } from '../styleZoomBounds';

describe('resolveStyleZoomBounds', () => {
  it('returns an empty object when neither layer nor style has bounds', () => {
    expect(resolveStyleZoomBounds({}, {})).toEqual({});
  });

  it('passes layer-only bounds through unchanged', () => {
    expect(resolveStyleZoomBounds({ minZoom: 4, maxZoom: 18 }, {})).toEqual({
      minzoom: 4,
      maxzoom: 18,
    });
  });

  it('passes style-only bounds through unchanged', () => {
    expect(resolveStyleZoomBounds({}, { minZoom: 11, maxZoom: 15 })).toEqual({
      minzoom: 11,
      maxzoom: 15,
    });
  });

  it('intersects when the style is narrower on both ends', () => {
    expect(
      resolveStyleZoomBounds({ minZoom: 4, maxZoom: 18 }, { minZoom: 11, maxZoom: 15 }),
    ).toEqual({ minzoom: 11, maxzoom: 15 });
  });

  it('intersects when the layer is narrower on both ends', () => {
    expect(
      resolveStyleZoomBounds({ minZoom: 11, maxZoom: 15 }, { minZoom: 4, maxZoom: 18 }),
    ).toEqual({ minzoom: 11, maxzoom: 15 });
  });

  it('resolves each end independently when the style narrows only one', () => {
    expect(
      resolveStyleZoomBounds({ minZoom: 4, maxZoom: 18 }, { maxZoom: 11 }),
    ).toEqual({ minzoom: 4, maxzoom: 11 });
    expect(
      resolveStyleZoomBounds({ maxZoom: 18 }, { minZoom: 11 }),
    ).toEqual({ minzoom: 11, maxzoom: 18 });
  });

  it('treats minZoom/maxZoom of 0 as defined bounds, not missing', () => {
    expect(resolveStyleZoomBounds({ minZoom: 0 }, { maxZoom: 0 })).toEqual({
      minzoom: 0,
      maxzoom: 0,
    });
  });

  it('returns the raw unsatisfiable pair for contradictory bounds without throwing', () => {
    // Layer says >=10, style says <=5 — MapLibre renders nothing, silently.
    expect(
      resolveStyleZoomBounds({ minZoom: 10 }, { maxZoom: 5 }),
    ).toEqual({ minzoom: 10, maxzoom: 5 });
  });
});

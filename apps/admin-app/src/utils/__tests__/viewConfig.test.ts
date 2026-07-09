import { describe, it, expect } from 'vitest';
import { normalizeInitialView, DEFAULT_VIEW } from '../viewConfig.js';

describe('normalizeInitialView', () => {
  it('fills missing pitch/bearing with 0 (raw configs skip Zod defaults)', () => {
    // A config created via the raw API can omit pitch/bearing; passing them as
    // undefined into react-map-gl makes the projection matrix singular
    // ("failed to invert matrix") and crashes the preview.
    const view = normalizeInitialView({ latitude: 38.55, longitude: -106.92, zoom: 12 });
    expect(view).toEqual({ latitude: 38.55, longitude: -106.92, zoom: 12, pitch: 0, bearing: 0 });
  });

  it('returns DEFAULT_VIEW for undefined input', () => {
    expect(normalizeInitialView(undefined)).toEqual(DEFAULT_VIEW);
  });

  it('preserves explicit values including minZoom/maxZoom', () => {
    const view = normalizeInitialView({
      latitude: 1,
      longitude: 2,
      zoom: 3,
      pitch: 45,
      bearing: -90,
      minZoom: 2,
      maxZoom: 18,
    });
    expect(view).toEqual({
      latitude: 1,
      longitude: 2,
      zoom: 3,
      pitch: 45,
      bearing: -90,
      minZoom: 2,
      maxZoom: 18,
    });
  });
});

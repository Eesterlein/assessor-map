// Per-style zoom bounds must reach every <Layer> a style renders — including
// all dashByCategory-expanded sub-layers, which inherit them via commonProps.
// renderStyleLayers only *creates* React elements (no map is mounted), so we
// can inspect the element props directly.
import { describe, it, expect } from 'vitest';
import type { LayerConfig } from '@techtraverse/map-ui-lib/types';
import { renderStyleLayers } from '../MapContainer';

const layer: LayerConfig = {
  id: 'roads',
  sourceId: 'src-1',
  collection: 'roads',
  label: 'Roads',
  dataMode: 'vector-tiles',
  visible: true,
  minZoom: 4,
  maxZoom: 18,
} as LayerConfig;

const dashLineStyle = {
  type: 'line' as const,
  paint: { 'line-color': '#000', 'line-width': 1, 'line-opacity': 1 },
  minZoom: 11,
  maxZoom: 15,
  dashByCategory: {
    property: 'roadclass',
    cases: [
      { value: 'primary', dasharray: [4, 2] },
      { value: 'secondary', dasharray: [2, 2] },
    ],
    default: [1, 4],
  },
};

describe('renderStyleLayers per-style zoom bounds', () => {
  it('applies the layer/style intersection to a plain style layer', () => {
    const els = renderStyleLayers(
      { type: 'line', paint: { 'line-color': '#000', 'line-width': 1, 'line-opacity': 1 }, minZoom: 11, maxZoom: 15 },
      0,
      'roads',
      layer,
      'default',
    );
    expect(els).toHaveLength(1);
    expect(els[0].props.minzoom).toBe(11);
    expect(els[0].props.maxzoom).toBe(15);
  });

  it('dashByCategory-expanded sub-layers all inherit the bounds through commonProps', () => {
    const els = renderStyleLayers(dashLineStyle, 0, 'roads', layer, 'default');
    // Two cases + one default-case sub-layer.
    expect(els).toHaveLength(3);
    for (const el of els) {
      expect(el.props.minzoom).toBe(11);
      expect(el.props.maxzoom).toBe(15);
    }
    // Each sub-layer still carries its own static dasharray.
    expect(els.map((el) => el.props.paint['line-dasharray'])).toEqual([
      [4, 2],
      [2, 2],
      [1, 4],
    ]);
  });

  it('falls back to layer-level bounds when the style has none', () => {
    const els = renderStyleLayers(
      { type: 'line', paint: { 'line-color': '#000', 'line-width': 1, 'line-opacity': 1 } },
      0,
      'roads',
      layer,
      'default',
    );
    expect(els[0].props.minzoom).toBe(4);
    expect(els[0].props.maxzoom).toBe(18);
  });

  it('sets no bounds when neither layer nor style defines them', () => {
    const bare = { ...layer, minZoom: undefined, maxZoom: undefined } as LayerConfig;
    const els = renderStyleLayers(
      { type: 'line', paint: { 'line-color': '#000', 'line-width': 1, 'line-opacity': 1 } },
      0,
      'roads',
      bare,
      'default',
    );
    expect(els[0].props.minzoom).toBeUndefined();
    expect(els[0].props.maxzoom).toBeUndefined();
  });
});

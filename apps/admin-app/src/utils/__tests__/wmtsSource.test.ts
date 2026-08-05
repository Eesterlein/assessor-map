import { describe, it, expect } from 'vitest';
import { savedSourceToWmts, savedSourceIsImagery, wmtsSourceToSavedFields } from '../wmtsSource';

describe('savedSourceToWmts', () => {
  const base = {
    source_id: 'gibs-modis',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml',
    label: 'GIBS MODIS',
    tile_matrix_set_id: 'GoogleMapsCompatible_Level9',
  };

  it('maps metadata.wmtsTileUrlTemplate onto the WmtsSource tileUrlTemplate', () => {
    const src = savedSourceToWmts({
      ...base,
      metadata: {
        wmtsLayer: 'MODIS',
        wmtsStyle: 'default',
        wmtsFormat: 'image/jpeg',
        wmtsTileMatrixSet: 'GoogleMapsCompatible_Level9',
        wmtsTileSize: 256,
        wmtsTileUrlTemplate:
          'https://gibs/best/MODIS/default/2026-06-23/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg',
      },
    });
    expect(src.tileUrlTemplate).toBe(
      'https://gibs/best/MODIS/default/2026-06-23/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg',
    );
    expect(src.sourceType).toBe('wmts');
    expect(src.layer).toBe('MODIS');
  });

  it('leaves tileUrlTemplate and maxZoom undefined when not stored (pre-fix sources)', () => {
    const src = savedSourceToWmts({ ...base, metadata: { wmtsLayer: 'MODIS' } });
    expect(src.tileUrlTemplate).toBeUndefined();
    expect(src.maxZoom).toBeUndefined();
  });

  it('maps metadata.wmtsMaxZoom onto the WmtsSource maxZoom', () => {
    const src = savedSourceToWmts({
      ...base,
      metadata: { wmtsLayer: 'bluesky-high', wmtsMaxZoom: 19 },
    });
    expect(src.maxZoom).toBe(19);
  });
});

describe('wmtsSourceToSavedFields', () => {
  it('round-trips a WmtsSource through the saved-row shape', () => {
    const source = {
      id: 'vexcel',
      sourceType: 'wmts' as const,
      capabilitiesUrl: 'https://api.gic.org/wmts/GetCapabilities',
      layer: 'bluesky-high',
      style: 'RGB',
      format: 'image/png',
      tileMatrixSet: 'bluesky-high',
      tileSize: 256,
      maxZoom: 19,
      tileUrlTemplate: 'https://api.gic.org/wmts/rest/bluesky-high/RGB/bluesky-high/{z}/{y}/{x}.png',
      label: 'Vexcel',
    };
    const saved = wmtsSourceToSavedFields(source);
    expect(saved.source_type).toBe('wmts');
    expect(saved.metadata.wmtsMaxZoom).toBe(19);
    expect(savedSourceToWmts(saved)).toEqual({ ...source, auth: undefined, proxy: false });
  });
});

describe('savedSourceIsImagery', () => {
  it('accepts imagery and wmts, rejects features/basemap', () => {
    expect(savedSourceIsImagery({ source_type: 'imagery' })).toBe(true);
    expect(savedSourceIsImagery({ source_type: 'wmts' })).toBe(true);
    expect(savedSourceIsImagery({ source_type: 'features' })).toBe(false);
    expect(savedSourceIsImagery({ source_type: 'basemap' })).toBe(false);
  });
});

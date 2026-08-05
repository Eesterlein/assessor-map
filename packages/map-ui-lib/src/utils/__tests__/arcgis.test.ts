import { describe, it, expect } from 'vitest';
import {
  isArcgisMapServerUrl,
  buildArcgisTileUrlTemplate,
  parseArcgisServiceInfo,
} from '../arcgis';

const USGS_ROOT = 'https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer';

// Trimmed from the live USA_Topo_Maps ?f=json response
const usgsFixture = {
  currentVersion: 11.5,
  mapName: 'Layers',
  copyrightText: 'Copyright:© 2013 National Geographic Society, i-cubed',
  singleFusedMapCache: true,
  tileInfo: {
    rows: 256,
    cols: 256,
    format: 'JPEG',
    spatialReference: { wkid: 102100, latestWkid: 3857 },
    lods: Array.from({ length: 16 }, (_, level) => ({ level })),
  },
};

describe('isArcgisMapServerUrl', () => {
  it('matches a MapServer root over http and https', () => {
    expect(isArcgisMapServerUrl(USGS_ROOT)).toBe(true);
    expect(isArcgisMapServerUrl(USGS_ROOT.replace('https://', 'http://'))).toBe(true);
  });

  it('matches with trailing slash and query string', () => {
    expect(isArcgisMapServerUrl(`${USGS_ROOT}/`)).toBe(true);
    expect(isArcgisMapServerUrl(`${USGS_ROOT}?f=json`)).toBe(true);
  });

  it('does not match MapServer sub-paths', () => {
    expect(isArcgisMapServerUrl(`${USGS_ROOT}/tile/0/0/0`)).toBe(false);
  });

  it('does not match ImageServer or FeatureServer', () => {
    expect(
      isArcgisMapServerUrl('https://example.com/arcgis/rest/services/Elevation/ImageServer'),
    ).toBe(false);
    expect(
      isArcgisMapServerUrl('https://example.com/arcgis/rest/services/Parcels/FeatureServer'),
    ).toBe(false);
  });

  it('does not match non-ArcGIS URLs', () => {
    expect(isArcgisMapServerUrl('http://localhost:8000/ogc/')).toBe(false);
    expect(isArcgisMapServerUrl('https://example.com/maps/style.json')).toBe(false);
  });
});

describe('buildArcgisTileUrlTemplate', () => {
  it('appends the z/y/x tile path', () => {
    expect(buildArcgisTileUrlTemplate(USGS_ROOT)).toBe(`${USGS_ROOT}/tile/{z}/{y}/{x}`);
  });

  it('handles a trailing slash', () => {
    expect(buildArcgisTileUrlTemplate(`${USGS_ROOT}/`)).toBe(`${USGS_ROOT}/tile/{z}/{y}/{x}`);
  });
});

describe('parseArcgisServiceInfo', () => {
  it('parses the USGS topo fixture', () => {
    const meta = parseArcgisServiceInfo(usgsFixture, USGS_ROOT);
    expect(meta).toEqual({
      tileUrlTemplate: `${USGS_ROOT}/tile/{z}/{y}/{x}`,
      minZoom: 0,
      maxZoom: 15,
      tileSize: 256,
      wkid: 3857,
      name: 'Layers',
      attribution: 'Copyright:© 2013 National Geographic Society, i-cubed',
    });
  });

  it('surfaces ArcGIS error bodies (returned with HTTP 200)', () => {
    expect(() =>
      parseArcgisServiceInfo({ error: { message: 'Invalid URL' } }, USGS_ROOT),
    ).toThrow(/Invalid URL/);
  });

  it('rejects non-cached services', () => {
    expect(() =>
      parseArcgisServiceInfo({ ...usgsFixture, singleFusedMapCache: false }, USGS_ROOT),
    ).toThrow(/not a cached tile service/);
    expect(() =>
      parseArcgisServiceInfo({ singleFusedMapCache: true }, USGS_ROOT),
    ).toThrow(/not a cached tile service/);
  });

  it('rejects non-Web-Mercator caches', () => {
    const fixture = {
      ...usgsFixture,
      tileInfo: { ...usgsFixture.tileInfo, spatialReference: { wkid: 4326 } },
    };
    expect(() => parseArcgisServiceInfo(fixture, USGS_ROOT)).toThrow(/wkid 4326/);
  });

  it('accepts wkid 102100 without latestWkid', () => {
    const fixture = {
      ...usgsFixture,
      tileInfo: { ...usgsFixture.tileInfo, spatialReference: { wkid: 102100 } },
    };
    expect(parseArcgisServiceInfo(fixture, USGS_ROOT).wkid).toBe(102100);
  });

  it('rejects empty LODs', () => {
    const fixture = { ...usgsFixture, tileInfo: { ...usgsFixture.tileInfo, lods: [] } };
    expect(() => parseArcgisServiceInfo(fixture, USGS_ROOT)).toThrow(/no LODs/);
  });

  it('rejects unsupported tile sizes', () => {
    const fixture = { ...usgsFixture, tileInfo: { ...usgsFixture.tileInfo, rows: 128 } };
    expect(() => parseArcgisServiceInfo(fixture, USGS_ROOT)).toThrow(/tile size 128/);
  });
});

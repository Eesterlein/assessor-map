import { describe, it, expect } from 'vitest';
import {
  LayerConfigSchema,
  FilterRuleSchema,
  FilterRuleGroupSchema,
  FilterRuleValueSchema,
  Cql2FilterConfigSchema,
  InfoConfigSchema,
  MapConfigSchema,
  ViewConfigSchema,
  WmtsSourceSchema,
  OgcApiSourceSchema,
  FillStyleSchema,
  LineStyleSchema,
  CircleStyleSchema,
  SymbolStyleSchema,
} from '../config';

const baseMapConfig = {
  sources: [{ id: 'src-1', url: 'https://example.com/ogc' }],
  layers: [
    {
      id: 'layer-1',
      sourceId: 'src-1',
      collection: 'my-collection',
      label: 'Test Layer',
      dataMode: 'vector-tiles' as const,
    },
  ],
  basemaps: [{ id: 'osm', label: 'OSM', url: 'https://example.com/style.json' }],
  initialView: { latitude: 0, longitude: 0, zoom: 2 },
};

describe('LayerConfigSchema backward-compat preprocess', () => {
  const base = {
    id: 'test-layer',
    sourceId: 'source-1',
    collection: 'my-collection',
    label: 'Test Layer',
    dataMode: 'vector-tiles' as const,
  };

  it('migrates style → styles on parse', () => {
    const input = {
      ...base,
      style: {
        type: 'fill',
        paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.5 },
      },
    };
    const result = LayerConfigSchema.parse(input);
    expect((result as any).style).toBeUndefined();
    expect(result.styles).toHaveLength(1);
    expect(result.styles![0].type).toBe('fill');
  });

  it('passes through already-migrated styles untouched', () => {
    const input = {
      ...base,
      styles: [
        { type: 'fill', paint: { 'fill-color': '#0000ff', 'fill-opacity': 1 } },
        { type: 'circle', paint: { 'circle-color': '#ff0000', 'circle-radius': 5, 'circle-opacity': 1 } },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect(result.styles).toHaveLength(2);
  });

  it('handles style: undefined → styles: undefined', () => {
    const input = { ...base, style: undefined };
    const result = LayerConfigSchema.parse(input);
    expect(result.styles).toBeUndefined();
  });

  it('accepts expression values for line-width, circle-radius, and icon-image', () => {
    const input = {
      ...base,
      styles: [
        {
          type: 'line',
          paint: {
            'line-color': '#2980b9',
            'line-width': ['interpolate', ['linear'], ['to-number', ['get', 'aadt']], 0, 1, 10000, 8],
          },
        },
        {
          type: 'circle',
          paint: {
            'circle-color': '#e74c3c',
            'circle-radius': ['match', ['get', 'class'], 'major', 10, 'minor', 4, 6],
          },
        },
        {
          type: 'symbol',
          paint: {},
          layout: {
            'icon-image': ['match', ['get', 'category'], 'park', 'tree', 'school', 'book', 'dot'],
          },
        },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect(Array.isArray((result.styles![0] as any).paint['line-width'])).toBe(true);
    expect(Array.isArray((result.styles![1] as any).paint['circle-radius'])).toBe(true);
    expect(Array.isArray((result.styles![2] as any).layout['icon-image'])).toBe(true);
  });

  it('accepts expression for text-field (data-driven labels)', () => {
    const input = {
      ...base,
      styles: [
        {
          type: 'symbol',
          paint: { 'text-color': '#000' },
          layout: { 'text-field': ['get', 'name'], 'text-size': 12 },
        },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect(Array.isArray((result.styles![0] as any).layout['text-field'])).toBe(true);
  });

  it('still accepts plain number/string values for line-width, circle-radius, icon-image (back-compat)', () => {
    const input = {
      ...base,
      styles: [
        { type: 'line', paint: { 'line-color': '#fff', 'line-width': 2 } },
        { type: 'circle', paint: { 'circle-color': '#fff', 'circle-radius': 5 } },
        { type: 'symbol', paint: {}, layout: { 'icon-image': 'dot' } },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect((result.styles![0] as any).paint['line-width']).toBe(2);
    expect((result.styles![1] as any).paint['circle-radius']).toBe(5);
    expect((result.styles![2] as any).layout['icon-image']).toBe('dot');
  });

  it('parses geometryFilter on style entries', () => {
    const input = {
      ...base,
      styles: [
        {
          type: 'fill',
          paint: { 'fill-color': '#0000ff', 'fill-opacity': 1 },
          geometryFilter: ['Polygon', 'MultiPolygon'],
        },
      ],
    };
    const result = LayerConfigSchema.parse(input);
    expect(result.styles![0].geometryFilter).toEqual(['Polygon', 'MultiPolygon']);
  });
});

describe('LayerConfigSchema propertyDisplay', () => {
  const base = {
    id: 'test-layer',
    sourceId: 'source-1',
    collection: 'my-collection',
    label: 'Test Layer',
    dataMode: 'vector-tiles' as const,
  };

  it('parses legacy entries without order (backward compat)', () => {
    const result = LayerConfigSchema.parse({
      ...base,
      propertyDisplay: {
        owner: { label: 'Owner', visible: true },
        internal_id: { visible: false },
        acres: {},
      },
    });
    expect(result.propertyDisplay).toEqual({
      owner: { label: 'Owner', visible: true },
      internal_id: { visible: false },
      acres: { visible: true },
    });
    expect(result.propertyDisplay!.owner.order).toBeUndefined();
  });

  it('parses entries with explicit order', () => {
    const result = LayerConfigSchema.parse({
      ...base,
      propertyDisplay: {
        owner: { label: 'Owner', order: 0 },
        acres: { order: 1 },
      },
    });
    expect(result.propertyDisplay!.owner.order).toBe(0);
    expect(result.propertyDisplay!.acres.order).toBe(1);
  });

  it('rejects negative and non-integer order values', () => {
    for (const order of [-1, 1.5]) {
      const result = LayerConfigSchema.safeParse({
        ...base,
        propertyDisplay: { owner: { order } },
      });
      expect(result.success).toBe(false);
    }
  });

  it('parses type: link with linkText', () => {
    const result = LayerConfigSchema.parse({
      ...base,
      propertyDisplay: {
        assessorlink: { label: 'Assessor Record', type: 'link', linkText: 'View Assessor Record' },
      },
    });
    expect(result.propertyDisplay!.assessorlink.type).toBe('link');
    expect(result.propertyDisplay!.assessorlink.linkText).toBe('View Assessor Record');
  });

  it('leaves type unset when omitted (semantic default: text)', () => {
    const result = LayerConfigSchema.parse({
      ...base,
      propertyDisplay: { owner: { label: 'Owner' } },
    });
    expect(result.propertyDisplay!.owner.type).toBeUndefined();
    expect(result.propertyDisplay!.owner.linkText).toBeUndefined();
  });

  it('rejects invalid type values', () => {
    const result = LayerConfigSchema.safeParse({
      ...base,
      propertyDisplay: { owner: { type: 'foo' } },
    });
    expect(result.success).toBe(false);
  });
});

describe('CQL2 Filter Schemas', () => {
  describe('FilterRuleValueSchema', () => {
    it('accepts static', () => {
      const input = { kind: 'static', value: 'hello' };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('static');
    });

    it('accepts parameter', () => {
      const input = { kind: 'parameter', name: 'foo', label: 'Foo', inputType: 'text' };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('parameter');
    });

    it('accepts relativeDate', () => {
      const input = {
        kind: 'relativeDate',
        direction: 'past',
        offset: { kind: 'static', value: 5 },
        unit: 'days',
      };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('relativeDate');
    });

    it('accepts dateRange', () => {
      const input = {
        kind: 'dateRange',
        start: {
          kind: 'relativeDate',
          direction: 'past',
          offset: { kind: 'static', value: 30 },
          unit: 'days',
        },
        end: { kind: 'static', value: '2026-01-01' },
      };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('dateRange');
    });

    it('accepts computedRange', () => {
      const input = {
        kind: 'computedRange',
        baseParam: 'price',
        baseLabel: 'Price',
        offsetType: 'percentage',
        offsetAmount: { kind: 'static', value: 20 },
      };
      const result = FilterRuleValueSchema.parse(input);
      expect(result.kind).toBe('computedRange');
    });

    it('rejects unknown kind', () => {
      const input = { kind: 'unknown' };
      expect(() => FilterRuleValueSchema.parse(input)).toThrow();
    });
  });

  describe('FilterRuleSchema', () => {
    it('accepts valid rule', () => {
      const input = {
        id: 'r1',
        property: 'name',
        operator: '=',
        value: { kind: 'static', value: 'test' },
      };
      const result = FilterRuleSchema.parse(input);
      expect(result.id).toBe('r1');
      expect(result.property).toBe('name');
    });

    it('rejects missing property', () => {
      const input = {
        id: 'r1',
        operator: '=',
        value: { kind: 'static', value: 'test' },
      };
      expect(() => FilterRuleSchema.parse(input)).toThrow();
    });
  });

  describe('FilterRuleGroupSchema', () => {
    it('accepts nested groups', () => {
      const input = {
        id: 'g1',
        combinator: 'and',
        rules: [
          {
            id: 'r1',
            property: 'name',
            operator: '=',
            value: { kind: 'static', value: 'test' },
          },
          {
            id: 'g2',
            combinator: 'or',
            rules: [
              {
                id: 'r2',
                property: 'age',
                operator: '>',
                value: { kind: 'static', value: 18 },
              },
            ],
          },
        ],
      };
      const result = FilterRuleGroupSchema.parse(input);
      expect(result.combinator).toBe('and');
      expect(result.rules).toHaveLength(2);
    });

    it('accepts sortby and limit', () => {
      const input = {
        id: 'g1',
        combinator: 'and',
        rules: [
          {
            id: 'r1',
            property: 'name',
            operator: '=',
            value: { kind: 'static', value: 'test' },
          },
        ],
        sortby: [
          { property: 'name', direction: 'asc' },
          { property: 'date', direction: 'desc' },
        ],
        limit: 50,
      };
      const result = FilterRuleGroupSchema.parse(input);
      expect(result.sortby).toHaveLength(2);
      expect(result.limit).toBe(50);
    });
  });

  describe('LayerConfigSchema with cql2Filter', () => {
    it('accepts cql2Filter', () => {
      const input = {
        id: 'layer-1',
        sourceId: 'source-1',
        collection: 'my-collection',
        label: 'Test Layer',
        dataMode: 'vector-tiles',
        cql2Filter: {
          id: 'g1',
          combinator: 'and',
          rules: [
            {
              id: 'r1',
              property: 'status',
              operator: '=',
              value: { kind: 'static', value: 'active' },
            },
          ],
        },
      };
      const result = LayerConfigSchema.parse(input);
      expect(result.cql2Filter).toBeDefined();
      expect(result.cql2Filter!.id).toBe('g1');
    });
  });
});

describe('ViewConfigSchema', () => {
  const base = { latitude: 0, longitude: 0, zoom: 10, pitch: 0, bearing: 0 };

  it('parses without minZoom/maxZoom (backward compat)', () => {
    const result = ViewConfigSchema.parse(base);
    expect(result.minZoom).toBeUndefined();
    expect(result.maxZoom).toBeUndefined();
  });

  it('parses with valid minZoom only', () => {
    const result = ViewConfigSchema.parse({ ...base, minZoom: 2 });
    expect(result.minZoom).toBe(2);
    expect(result.maxZoom).toBeUndefined();
  });

  it('parses with valid maxZoom only', () => {
    const result = ViewConfigSchema.parse({ ...base, maxZoom: 18 });
    expect(result.maxZoom).toBe(18);
    expect(result.minZoom).toBeUndefined();
  });

  it('parses with valid minZoom and maxZoom', () => {
    const result = ViewConfigSchema.parse({ ...base, minZoom: 2, maxZoom: 18 });
    expect(result.minZoom).toBe(2);
    expect(result.maxZoom).toBe(18);
  });

  it('rejects minZoom > maxZoom', () => {
    expect(() => ViewConfigSchema.parse({ ...base, minZoom: 18, maxZoom: 2 })).toThrow();
  });

  it('rejects zoom below minZoom', () => {
    expect(() => ViewConfigSchema.parse({ ...base, zoom: 1, minZoom: 5 })).toThrow();
  });

  it('rejects zoom above maxZoom', () => {
    expect(() => ViewConfigSchema.parse({ ...base, zoom: 20, maxZoom: 15 })).toThrow();
  });

  it('rejects minZoom out of range', () => {
    expect(() => ViewConfigSchema.parse({ ...base, minZoom: -1 })).toThrow();
    expect(() => ViewConfigSchema.parse({ ...base, minZoom: 25 })).toThrow();
  });

  it('rejects maxZoom out of range', () => {
    expect(() => ViewConfigSchema.parse({ ...base, maxZoom: -1 })).toThrow();
    expect(() => ViewConfigSchema.parse({ ...base, maxZoom: 25 })).toThrow();
  });
});

describe('UIConfigSchema phase-2 additions', () => {
  it('defaults showScaleBar to false and coordinateFormat to decimal-degrees', () => {
    const result = MapConfigSchema.parse(baseMapConfig);
    expect(result.ui.showScaleBar).toBe(false);
    expect(result.ui.coordinateFormat).toBe('decimal-degrees');
    expect(result.ui.legendOrder).toBeUndefined();
  });

  it('accepts legendOrder as an array of layer IDs', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { legendOrder: ['layer-1', 'layer-2'] },
    });
    expect(result.ui.legendOrder).toEqual(['layer-1', 'layer-2']);
  });

  it('accepts ddm and dms as coordinateFormat values', () => {
    const ddm = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { coordinateFormat: 'ddm' },
    });
    expect(ddm.ui.coordinateFormat).toBe('ddm');
    const dms = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { coordinateFormat: 'dms' },
    });
    expect(dms.ui.coordinateFormat).toBe('dms');
  });

  it('rejects an invalid coordinateFormat value', () => {
    expect(() =>
      MapConfigSchema.parse({
        ...baseMapConfig,
        ui: { coordinateFormat: 'utm' },
      }),
    ).toThrow();
  });
});

describe('UIConfigSchema defaultLabelFont', () => {
  it('defaults to ["Open Sans Bold"] when omitted', () => {
    const result = MapConfigSchema.parse(baseMapConfig);
    expect(result.ui.defaultLabelFont).toEqual(['Open Sans Bold']);
  });

  it('accepts an explicit font stack and returns it unchanged', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { defaultLabelFont: ['Noto Sans Bold'] },
    });
    expect(result.ui.defaultLabelFont).toEqual(['Noto Sans Bold']);
  });

  it('rejects an empty array', () => {
    expect(() =>
      MapConfigSchema.parse({
        ...baseMapConfig,
        ui: { defaultLabelFont: [] },
      }),
    ).toThrow();
  });

  it('rejects empty-string font names', () => {
    expect(() =>
      MapConfigSchema.parse({
        ...baseMapConfig,
        ui: { defaultLabelFont: [''] },
      }),
    ).toThrow();
  });

  it('back-compat: an old config with a ui block but no defaultLabelFont still parses', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { showLegend: false, coordinateFormat: 'dms' },
    });
    expect(result.ui.defaultLabelFont).toEqual(['Open Sans Bold']);
    expect(result.ui.coordinateFormat).toBe('dms');
  });
});

describe('UIConfigSchema controlIcons / controlPositions partial records', () => {
  it('accepts a controlIcons override for a single control', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { controlIcons: { showSearchPanel: 'filter' } },
    });
    expect(result.ui.controlIcons).toEqual({ showSearchPanel: 'filter' });
  });

  it('accepts multiple controlIcons keys', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { controlIcons: { showSearchPanel: 'filter', showLegend: 'list' } },
    });
    expect(result.ui.controlIcons).toEqual({ showSearchPanel: 'filter', showLegend: 'list' });
  });

  it('accepts an empty controlIcons object', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { controlIcons: {} },
    });
    expect(result.ui.controlIcons).toEqual({});
  });

  it('leaves controlIcons undefined when omitted', () => {
    const result = MapConfigSchema.parse(baseMapConfig);
    expect(result.ui.controlIcons).toBeUndefined();
  });

  it('rejects a non-string controlIcons value', () => {
    expect(() =>
      MapConfigSchema.parse({
        ...baseMapConfig,
        ui: { controlIcons: { showSearchPanel: 123 } },
      }),
    ).toThrow();
  });

  it('rejects a controlIcons key that is not an orderable control', () => {
    expect(() =>
      MapConfigSchema.parse({
        ...baseMapConfig,
        ui: { controlIcons: { notAControl: 'filter' } },
      }),
    ).toThrow();
  });

  it('accepts a controlPositions override for a single control', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { controlPositions: { showSearchPanel: 'bottom-left' } },
    });
    expect(result.ui.controlPositions).toEqual({ showSearchPanel: 'bottom-left' });
  });

  it('accepts an empty controlPositions object', () => {
    const result = MapConfigSchema.parse({
      ...baseMapConfig,
      ui: { controlPositions: {} },
    });
    expect(result.ui.controlPositions).toEqual({});
  });

  it('rejects an invalid controlPositions corner value', () => {
    expect(() =>
      MapConfigSchema.parse({
        ...baseMapConfig,
        ui: { controlPositions: { showSearchPanel: 'not-a-corner' } },
      }),
    ).toThrow();
  });
});

describe('InfoConfigSchema', () => {
  it('parses a MapConfig without an info field (back-compat)', () => {
    const result = MapConfigSchema.parse(baseMapConfig);
    expect(result.info).toBeUndefined();
  });

  it('populates defaults from empty input', () => {
    const result = InfoConfigSchema.parse({});
    expect(result).toEqual({
      enabled: false,
      markdown: '',
      position: 'top-right',
    });
  });

  it('rejects an invalid position', () => {
    expect(() => InfoConfigSchema.parse({ position: 'invalid' })).toThrow();
  });

  it('round-trips a fully populated info object', () => {
    const input = {
      enabled: true,
      title: 'About this map',
      markdown: '# Hello\n\nThis is a map.',
      position: 'bottom-left' as const,
    };
    const result = InfoConfigSchema.parse(input);
    expect(result).toEqual(input);
  });
});

describe('WmtsSourceSchema', () => {
  const validWmts = {
    id: 'nasa-gibs',
    sourceType: 'wmts' as const,
    capabilitiesUrl: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GetCapabilities.xml',
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    style: 'default',
    format: 'image/jpeg',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
  };

  it('parses a valid WMTS source', () => {
    const result = WmtsSourceSchema.parse(validWmts);
    expect(result.id).toBe('nasa-gibs');
    expect(result.sourceType).toBe('wmts');
    expect(result.layer).toBe('MODIS_Terra_CorrectedReflectance_TrueColor');
    expect(result.tileSize).toBe(256);
  });

  it('applies default values for style, format, tileMatrixSet, tileSize', () => {
    const minimal = {
      id: 'test',
      sourceType: 'wmts' as const,
      capabilitiesUrl: 'https://example.com/wmts/GetCapabilities.xml',
      layer: 'my-layer',
    };
    const result = WmtsSourceSchema.parse(minimal);
    expect(result.style).toBe('default');
    expect(result.format).toBe('image/png');
    expect(result.tileMatrixSet).toBe('WebMercatorQuad');
    expect(result.tileSize).toBe(256);
  });

  it('rejects WMTS source missing required layer', () => {
    const invalid = {
      id: 'test',
      sourceType: 'wmts',
      capabilitiesUrl: 'https://example.com/wmts/GetCapabilities.xml',
    };
    expect(() => WmtsSourceSchema.parse(invalid)).toThrow();
  });

  it('rejects WMTS source with invalid capabilitiesUrl', () => {
    const invalid = { ...validWmts, capabilitiesUrl: 'not-a-url' };
    expect(() => WmtsSourceSchema.parse(invalid)).toThrow();
  });

  it('parses source-level maxZoom and leaves it undefined when absent', () => {
    expect(WmtsSourceSchema.parse({ ...validWmts, maxZoom: 19 }).maxZoom).toBe(19);
    expect(WmtsSourceSchema.parse(validWmts).maxZoom).toBeUndefined();
  });

  it('rejects out-of-range maxZoom', () => {
    expect(() => WmtsSourceSchema.parse({ ...validWmts, maxZoom: -1 })).toThrow();
    expect(() => WmtsSourceSchema.parse({ ...validWmts, maxZoom: 25 })).toThrow();
  });
});

describe('OgcApiSourceSchema maxZoom', () => {
  const validOgc = { id: 'arcgis-topo', url: 'https://example.com/rest/services/Topo/MapServer' };

  it('parses source-level maxZoom and leaves it undefined when absent (backward compat)', () => {
    expect(OgcApiSourceSchema.parse({ ...validOgc, maxZoom: 15 }).maxZoom).toBe(15);
    expect(OgcApiSourceSchema.parse(validOgc).maxZoom).toBeUndefined();
  });

  it('rejects out-of-range maxZoom', () => {
    expect(() => OgcApiSourceSchema.parse({ ...validOgc, maxZoom: -1 })).toThrow();
    expect(() => OgcApiSourceSchema.parse({ ...validOgc, maxZoom: 25 })).toThrow();
  });
});

describe('MapConfigSchema with WMTS sources', () => {
  const baseConfig = {
    layers: [],
    basemaps: [{ id: 'osm', label: 'OSM', url: 'https://example.com/style.json' }],
    initialView: { latitude: 0, longitude: 0, zoom: 2 },
  };

  it('accepts a MapConfig with an OGC API source (backward compat)', () => {
    const config = {
      ...baseConfig,
      sources: [{ id: 'src-1', url: 'https://example.com/ogc' }],
    };
    const result = MapConfigSchema.parse(config);
    expect(result.sources).toHaveLength(1);
  });

  it('accepts a MapConfig with a WMTS source', () => {
    const config = {
      ...baseConfig,
      sources: [
        {
          id: 'gibs',
          sourceType: 'wmts',
          capabilitiesUrl:
            'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GetCapabilities.xml',
          layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        },
      ],
    };
    const result = MapConfigSchema.parse(config);
    expect(result.sources).toHaveLength(1);
    const src = result.sources[0] as { sourceType: string; layer: string };
    expect(src.sourceType).toBe('wmts');
    expect(src.layer).toBe('MODIS_Terra_CorrectedReflectance_TrueColor');
  });

  it('accepts a MapConfig with mixed OGC API and WMTS sources', () => {
    const config = {
      ...baseConfig,
      sources: [
        { id: 'ogc-src', url: 'https://example.com/ogc' },
        {
          id: 'gibs',
          sourceType: 'wmts',
          capabilitiesUrl:
            'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GetCapabilities.xml',
          layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        },
      ],
    };
    const result = MapConfigSchema.parse(config);
    expect(result.sources).toHaveLength(2);
  });

  it('accepts a WMTS-backed imagery layer without a collection', () => {
    const config = {
      ...baseConfig,
      sources: [
        {
          id: 'gibs',
          sourceType: 'wmts',
          capabilitiesUrl:
            'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml',
          layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        },
      ],
      imageryLayers: [
        {
          id: 'modis',
          sourceId: 'gibs',
          label: 'MODIS',
        },
      ],
    };
    expect(() => MapConfigSchema.parse(config)).not.toThrow();
  });

  it('still requires a collection for OGC-API-backed imagery layers', () => {
    const config = {
      ...baseConfig,
      sources: [{ id: 'ogc', url: 'https://example.com/ogc', type: 'imagery' }],
      imageryLayers: [{ id: 'no-collection', sourceId: 'ogc', label: 'Bad' }],
    };
    expect(() => MapConfigSchema.parse(config)).toThrow(/collection/i);
  });
});

describe('Per-style minZoom/maxZoom', () => {
  const stylesByType = {
    fill: { type: 'fill', paint: { 'fill-color': '#f00', 'fill-opacity': 0.5 } },
    line: { type: 'line', paint: { 'line-color': '#00f', 'line-width': 2 } },
    circle: { type: 'circle', paint: { 'circle-color': '#0f0', 'circle-radius': 4 } },
    symbol: { type: 'symbol', paint: { 'text-color': '#333' }, layout: { 'text-field': '{name}' } },
  } as const;
  const schemas = {
    fill: FillStyleSchema,
    line: LineStyleSchema,
    circle: CircleStyleSchema,
    symbol: SymbolStyleSchema,
  } as const;

  for (const type of ['fill', 'line', 'circle', 'symbol'] as const) {
    const schema = schemas[type];
    const base = stylesByType[type];

    it(`${type}: defaults to undefined when absent (backward compat)`, () => {
      const result = schema.parse(base);
      expect(result.minZoom).toBeUndefined();
      expect(result.maxZoom).toBeUndefined();
    });

    it(`${type}: parses minZoom/maxZoom`, () => {
      const result = schema.parse({ ...base, minZoom: 3, maxZoom: 15 });
      expect(result.minZoom).toBe(3);
      expect(result.maxZoom).toBe(15);
    });

    it(`${type}: rejects out-of-range values`, () => {
      expect(() => schema.parse({ ...base, minZoom: -1 })).toThrow();
      expect(() => schema.parse({ ...base, maxZoom: 25 })).toThrow();
    });
  }

  it('MapConfigSchema rejects a style with minZoom > maxZoom, with a precise path', () => {
    const config = {
      ...baseMapConfig,
      layers: [
        {
          ...baseMapConfig.layers[0],
          styles: [
            stylesByType.line,
            { ...stylesByType.line, minZoom: 15, maxZoom: 5 },
          ],
        },
      ],
    };
    const result = MapConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.message.includes('minZoom'));
      expect(issue).toBeDefined();
      expect(issue!.path).toEqual(['layers', 0, 'styles', 1, 'minZoom']);
    }
  });

  it('allows style minZoom to equal maxZoom', () => {
    const config = {
      ...baseMapConfig,
      layers: [
        { ...baseMapConfig.layers[0], styles: [{ ...stylesByType.fill, minZoom: 10, maxZoom: 10 }] },
      ],
    };
    expect(MapConfigSchema.safeParse(config).success).toBe(true);
  });

  it('round-trips a layer stacking styles with no, partial, and full bounds', () => {
    // The "mike3" case: 4WD roads / local roads / highways as one layer.
    const config = {
      ...baseMapConfig,
      layers: [
        {
          ...baseMapConfig.layers[0],
          minZoom: 4,
          styles: [
            { ...stylesByType.line, maxZoom: 11 }, // 4WD roads
            { ...stylesByType.line, minZoom: 11, maxZoom: 15 }, // local roads
            stylesByType.line, // highways — no override
          ],
        },
      ],
    };
    const parsed = MapConfigSchema.parse(config);
    const styles = parsed.layers[0].styles!;
    expect(styles[0].minZoom).toBeUndefined();
    expect(styles[0].maxZoom).toBe(11);
    expect(styles[1].minZoom).toBe(11);
    expect(styles[1].maxZoom).toBe(15);
    expect(styles[2].minZoom).toBeUndefined();
    expect(styles[2].maxZoom).toBeUndefined();
  });
});

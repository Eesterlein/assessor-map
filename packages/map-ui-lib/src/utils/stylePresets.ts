import type { StyleConfig, FillStyle, LineStyle, CircleStyle, SymbolStyle } from '../types';

export type StylePresetGeometry = 'polygon' | 'line' | 'point';

export interface StylePreset {
  id: string;
  label: string;
  description: string;
  geometry: StylePresetGeometry;
  /** Optional grouping label shown as a section header in the preset picker. */
  category?: string;
  build: (color: string) => StyleConfig[];
}

const DEFAULT_POLYGON_COLOR = '#4a90d9';
const DEFAULT_LINE_COLOR = '#2980b9';
const DEFAULT_POINT_COLOR = '#e74c3c';

function darken(hex: string, amount = 0.25): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((n >> 8) & 0xff) * (1 - amount));
  const b = Math.round((n & 0xff) * (1 - amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function presetPolygonFill(color: string): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.6, 'fill-antialias': true } } satisfies FillStyle,
  ];
}

function presetPolygonFillOutline(color: string): StyleConfig[] {
  return [
    {
      type: 'fill',
      paint: { 'fill-color': color, 'fill-opacity': 0.45, 'fill-outline-color': 'transparent', 'fill-antialias': true },
    } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': darken(color, 0.35), 'line-width': 1.5, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

// Transparent fill keeps polygon interiors responsive to queryRenderedFeatures.
// Removing it re-introduces the unclickable-polygon bug — see the LayerEditor
// warning banner that catches manual deletions.
function presetPolygonOutline(color: string): StyleConfig[] {
  return [
    {
      type: 'fill',
      paint: { 'fill-color': color, 'fill-opacity': 0, 'fill-antialias': false },
    } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

function presetLineSolid(color: string): StyleConfig[] {
  return [{ type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1 } } satisfies LineStyle];
}

function presetLineDashed(color: string): StyleConfig[] {
  return [
    {
      type: 'line',
      paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1, 'line-dasharray': [2, 2] },
    } satisfies LineStyle,
  ];
}

function presetLineCased(color: string): StyleConfig[] {
  // [outer casing, inner road]. The chosen colour is the road itself; the
  // casing is a darker derived outline. Default edge = (4 - 2) / 2 = 1px/side.
  return [
    { type: 'line', paint: { 'line-color': darken(color, 0.4), 'line-width': 4, 'line-opacity': 1 } } satisfies LineStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

function presetPointCircle(color: string): StyleConfig[] {
  return [
    {
      type: 'circle',
      paint: {
        'circle-color': color,
        'circle-radius': 5,
        'circle-opacity': 0.9,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
    } satisfies CircleStyle,
  ];
}

function presetPointIcon(_color: string): StyleConfig[] {
  return [
    {
      type: 'symbol',
      paint: { 'icon-color': '#000000' },
      layout: { 'icon-image': 'circle-11', 'icon-size': 1 },
    } satisfies SymbolStyle,
  ];
}

function presetPointCircleLabel(color: string): StyleConfig[] {
  return [
    {
      type: 'circle',
      paint: {
        'circle-color': color,
        'circle-radius': 5,
        'circle-opacity': 0.9,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
    } satisfies CircleStyle,
    {
      type: 'symbol',
      paint: { 'text-color': '#333333', 'text-halo-color': '#ffffff', 'text-halo-width': 1 },
      layout: { 'text-field': '{name}', 'text-size': 11, 'text-offset': [0, 1] },
    } satisfies SymbolStyle,
  ];
}

// --- Assessor-specific preset builders ---

// Thin gray outline on transparent fill — the classic parcel overlay.
// 0.75 px line (vs. generic polygon-outline's 1.5 px) so inferActivePresetId
// can tell them apart.
function presetParcelBoundaries(_color: string): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': '#000000', 'fill-opacity': 0, 'fill-antialias': false } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': '#666666', 'line-width': 0.75, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

// 30 % opacity fill + thin 1 px outline — ideal for thematic (choropleth) parcel maps.
// Lower opacity than the generic polygon-fill-outline (45 %) keeps the base map readable.
function presetParcelThematic(color: string): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.30, 'fill-outline-color': 'transparent', 'fill-antialias': true } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': darken(color, 0.25), 'line-width': 1, 'line-opacity': 1 } } satisfies LineStyle,
  ];
}

// 18 % fill with a 2 px border — district/zone polygons that need visibility
// without completely obscuring the layers below.
function presetZoningDistrict(color: string): StyleConfig[] {
  return [
    { type: 'fill', paint: { 'fill-color': color, 'fill-opacity': 0.18, 'fill-outline-color': 'transparent', 'fill-antialias': true } } satisfies FillStyle,
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.9 } } satisfies LineStyle,
  ];
}

// Long 8-4 dash at 2 px — typical for subdivision or district boundary lines.
function presetBoundaryDashed(color: string): StyleConfig[] {
  return [
    { type: 'line', paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 1, 'line-dasharray': [8, 4] } } satisfies LineStyle,
  ];
}

// Small 3 px circle for dense address / parcel centroid point layers.
function presetAddressPoint(color: string): StyleConfig[] {
  return [
    {
      type: 'circle',
      paint: {
        'circle-color': color,
        'circle-radius': 3,
        'circle-opacity': 1,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
    } satisfies CircleStyle,
  ];
}

export const STYLE_PRESETS: readonly StylePreset[] = Object.freeze([
  {
    id: 'polygon-fill',
    label: 'Solid fill',
    description: 'Translucent fill, no outline.',
    geometry: 'polygon',
    build: (color = DEFAULT_POLYGON_COLOR) => presetPolygonFill(color),
  },
  {
    id: 'polygon-fill-outline',
    label: 'Fill + outline',
    description: 'Translucent fill with a darker boundary line.',
    geometry: 'polygon',
    build: (color = DEFAULT_POLYGON_COLOR) => presetPolygonFillOutline(color),
  },
  {
    id: 'polygon-outline',
    label: 'Outline only',
    description: 'Visible border with an invisible fill so polygon interiors stay clickable.',
    geometry: 'polygon',
    build: (color = DEFAULT_POLYGON_COLOR) => presetPolygonOutline(color),
  },
  {
    id: 'line-solid',
    label: 'Solid line',
    description: 'Single coloured line.',
    geometry: 'line',
    build: (color = DEFAULT_LINE_COLOR) => presetLineSolid(color),
  },
  {
    id: 'line-dashed',
    label: 'Dashed line',
    description: '2-2 dash pattern.',
    geometry: 'line',
    build: (color = DEFAULT_LINE_COLOR) => presetLineDashed(color),
  },
  {
    id: 'line-cased',
    label: 'Cased line',
    description: 'Highway-style — thick dark stroke under a thinner lighter stroke.',
    geometry: 'line',
    build: (color = DEFAULT_LINE_COLOR) => presetLineCased(color),
  },
  {
    id: 'point-circle',
    label: 'Circle',
    description: 'Coloured circle with a thin white stroke.',
    geometry: 'point',
    build: (color = DEFAULT_POINT_COLOR) => presetPointCircle(color),
  },
  {
    id: 'point-icon',
    label: 'Icon',
    description: 'Symbol icon from the sprite sheet.',
    geometry: 'point',
    build: (color = DEFAULT_POINT_COLOR) => presetPointIcon(color),
  },
  {
    id: 'point-circle-label',
    label: 'Circle + label',
    description: 'Circle with a text label drawn from {name}.',
    geometry: 'point',
    build: (color = DEFAULT_POINT_COLOR) => presetPointCircleLabel(color),
  },
  // Assessor / GIS-specific presets
  {
    id: 'parcel-boundaries',
    label: 'Parcel Boundaries',
    description: 'Thin gray outline on a transparent fill — the standard parcel overlay look.',
    geometry: 'polygon',
    category: 'Assessor',
    build: () => presetParcelBoundaries('#666666'),
  },
  {
    id: 'parcel-thematic',
    label: 'Thematic Fill',
    description: 'Light translucent fill for choropleth / data-driven parcel maps.',
    geometry: 'polygon',
    category: 'Assessor',
    build: (color = '#4a7fb5') => presetParcelThematic(color),
  },
  {
    id: 'zoning-district',
    label: 'Zoning / District',
    description: 'Very light fill with a bold border — for zoning or district polygons.',
    geometry: 'polygon',
    category: 'Assessor',
    build: (color = '#c87941') => presetZoningDistrict(color),
  },
  {
    id: 'boundary-dashed',
    label: 'District Boundary',
    description: 'Long-dash line for subdivision or administrative boundary lines.',
    geometry: 'line',
    category: 'Assessor',
    build: (color = '#7b4f2e') => presetBoundaryDashed(color),
  },
  {
    id: 'address-point',
    label: 'Address Point',
    description: 'Small 3 px circle for dense address or parcel centroid data.',
    geometry: 'point',
    category: 'Assessor',
    build: (color = '#1a73e8') => presetAddressPoint(color),
  },
]);

export function getPresetsForGeometries(geoms: StylePresetGeometry[]): StylePreset[] {
  if (geoms.length === 0) return [];
  const set = new Set(geoms);
  return STYLE_PRESETS.filter((p) => set.has(p.geometry));
}

export function inferActivePresetId(styles: StyleConfig[] | undefined | null): string | null {
  if (!styles || styles.length === 0) return null;
  const types = styles.map((s) => s.type).join(',');

  if (types === 'fill') {
    return 'polygon-fill';
  }
  if (types === 'fill,line') {
    const fill = styles[0] as FillStyle;
    const line = styles[1] as LineStyle;
    const fillOpacity = fill.paint['fill-opacity'];
    if (typeof fillOpacity === 'number' && fillOpacity === 0) {
      // parcel-boundaries uses 0.75 px; polygon-outline uses 1.5 px
      return (line.paint['line-width'] as number) <= 1 ? 'parcel-boundaries' : 'polygon-outline';
    }
    if (typeof fillOpacity === 'number' && fillOpacity <= 0.2) return 'zoning-district';
    if (typeof fillOpacity === 'number' && fillOpacity <= 0.35) return 'parcel-thematic';
    return 'polygon-fill-outline';
  }
  if (types === 'line') {
    const line = styles[0] as LineStyle;
    if (Array.isArray(line.paint['line-dasharray'])) {
      const dash = line.paint['line-dasharray'] as number[];
      // boundary-dashed uses [8,4]; line-dashed uses [2,2]
      return dash[0] >= 6 ? 'boundary-dashed' : 'line-dashed';
    }
    return 'line-solid';
  }
  if (types === 'line,line') return 'line-cased';
  if (types === 'circle') {
    const circle = styles[0] as CircleStyle;
    // address-point uses 3 px radius; point-circle uses 5 px
    return (circle.paint['circle-radius'] as number) <= 3 ? 'address-point' : 'point-circle';
  }
  if (types === 'symbol') {
    const sym = styles[0] as SymbolStyle;
    if (sym.layout && 'icon-image' in sym.layout) return 'point-icon';
  }
  if (types === 'circle,symbol') {
    const sym = styles[1] as SymbolStyle;
    if (sym.layout && 'text-field' in sym.layout) return 'point-circle-label';
  }
  return null;
}

/**
 * Builds the symbol style produced by the LayerEditor "+ Add road shields"
 * quick action: a tintable SDF shield icon from the bundled default sprite
 * sheet (`shields:shield-generic`) stretched to hug the route-number text
 * via icon-text-fit.
 */
export function buildRoadShieldsStyle(
  labelProp: string,
  geometryFilter?: ('LineString' | 'MultiLineString')[],
): SymbolStyle {
  return {
    type: 'symbol',
    paint: {
      'icon-color': '#1a5fb4',
      'text-color': '#ffffff',
    },
    layout: {
      'text-field': `{${labelProp}}`,
      'text-size': 10,
      'symbol-placement': 'line',
      'symbol-spacing': 300,
      'icon-image': 'shields:shield-generic',
      'icon-text-fit': 'both',
      'icon-text-fit-padding': [2, 6, 2, 6],
      'icon-allow-overlap': false,
      'text-allow-overlap': false,
    },
    ...(geometryFilter ? { geometryFilter } : {}),
  };
}

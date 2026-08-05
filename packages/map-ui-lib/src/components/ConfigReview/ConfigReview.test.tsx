import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfigReview } from './ConfigReview';
import type { MapConfig } from '../../types';

function makeConfig(overrides: Partial<MapConfig> = {}): MapConfig {
  return {
    sources: [{ id: 'src', url: 'https://example.com/ogc', tileMatrixSetId: 'WebMercatorQuad' }],
    layers: [
      {
        id: 'parcels',
        sourceId: 'src',
        collection: 'parcels',
        label: 'Parcels',
        visible: true,
        dataMode: 'vector-tiles',
        styles: [{ type: 'fill', paint: { 'fill-color': '#3b82f6', 'fill-opacity': 1 } }],
        legend: { entries: [{ label: 'A', color: '#3b82f6' }] },
      },
    ],
    basemaps: [{ id: 'bm', label: 'Streets', url: 'https://example.com/style.json' }],
    ui: {
      showLayerPanel: true,
      showLegend: true,
      showBasemapSwitcher: false,
      showSearchPanel: false,
      showCoordinateDisplay: false,
      showFeatureDetail: false,
      showFeatureTooltip: false,
      showExportButton: false,
      showExportPdf: false,
      showLegendOpacity: false,
      showMeasureTool: false,
      showSelectionTool: false,
      showImageryPanel: false,
      showCompass: false,
      showGlobalSearch: false,
      showScaleBar: false,
      controlLayout: 'individual',
      sideMenuToggleCorner: 'top-right',
      coordinateFormat: 'decimal-degrees',
      defaultLabelFont: ['Open Sans Bold'],
    },
    initialView: { latitude: 40, longitude: -100, zoom: 5, pitch: 0, bearing: 0 },
    ...overrides,
  } as MapConfig;
}

describe('ConfigReview', () => {
  it('renders the name and at-a-glance stat counts', () => {
    const html = renderToStaticMarkup(<ConfigReview config={makeConfig()} name="Parcel Viewer" />);
    expect(html).toContain('Parcel Viewer');
    expect(html).toContain('1</span> layers');
    expect(html).toContain('1</span> basemaps');
    expect(html).toContain('1</span> sources');
  });

  it('renders a chip for each enabled UI control and omits disabled ones', () => {
    const html = renderToStaticMarkup(<ConfigReview config={makeConfig()} name="X" />);
    expect(html).toContain('Layer panel');
    expect(html).toContain('Legend');
    expect(html).not.toContain('Measure tool');
  });

  it('renders the default label font row', () => {
    const html = renderToStaticMarkup(<ConfigReview config={makeConfig()} name="X" />);
    expect(html).toContain('Label font');
    expect(html).toContain('Open Sans Bold');
  });

  it('renders a plain-color style swatch for a layer', () => {
    const html = renderToStaticMarkup(<ConfigReview config={makeConfig()} name="X" />);
    expect(html).toContain('#3b82f6');
    expect(html).not.toContain('data-driven');
  });

  it('shows a data-driven chip when a style color is an expression', () => {
    const config = makeConfig();
    (config.layers[0].styles![0].paint as Record<string, unknown>)['fill-color'] = [
      'match',
      ['get', 'kind'],
      'a',
      '#f00',
      '#0f0',
    ];
    const html = renderToStaticMarkup(<ConfigReview config={config} name="X" />);
    expect(html).toContain('data-driven');
  });

  it('omits the imagery section when no imagery layers are configured', () => {
    const html = renderToStaticMarkup(<ConfigReview config={makeConfig()} name="X" />);
    expect(html).not.toContain('Imagery');
  });

  it('flips the validation pill to Invalid for a broken config', () => {
    const broken = makeConfig({ basemaps: [] });
    const html = renderToStaticMarkup(<ConfigReview config={broken} name="X" />);
    expect(html).toContain('Invalid');
  });
});

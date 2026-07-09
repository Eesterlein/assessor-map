import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Structural parity check (same pattern as the showExportPdf check in
// MapPreview.controlLayout.test.ts): the per-style layout merge is
// hand-duplicated between the admin preview renderer and map-client's
// renderer. Both must resolve the map-level default label font through the
// shared applyDefaultLabelFont util — if a future edit drops it from one
// side, the wizard preview and the deployed map silently diverge.
describe('default label font renderer parity', () => {
  const previewSource = readFileSync(join(__dirname, '../MapPreview.tsx'), 'utf-8');
  const clientSource = readFileSync(
    join(__dirname, '../../../../map-client/src/components/MapContainer.tsx'),
    'utf-8',
  );

  it('MapPreview imports and calls applyDefaultLabelFont in its style renderer', () => {
    expect(previewSource).toContain('applyDefaultLabelFont');
    const rendererStart = previewSource.indexOf('function renderPreviewStyleLayers(');
    expect(rendererStart).toBeGreaterThan(-1);
    const rendererSection = previewSource.slice(rendererStart);
    expect(rendererSection).toContain('applyDefaultLabelFont(');
    expect(rendererSection).toContain('defaultLabelFont');
  });

  it('MapContainer imports and calls applyDefaultLabelFont in its style renderer', () => {
    expect(clientSource).toContain('applyDefaultLabelFont');
    const rendererStart = clientSource.indexOf('function renderStyleLayers(');
    expect(rendererStart).toBeGreaterThan(-1);
    const rendererSection = clientSource.slice(rendererStart);
    expect(rendererSection).toContain('applyDefaultLabelFont(');
    expect(rendererSection).toContain('defaultLabelFont');
  });

  it('both vector-tile and geojson layer components thread defaultLabelFont in both renderers', () => {
    for (const [source, components] of [
      [previewSource, ['PreviewVectorTileLayer', 'PreviewGeoJsonLayer']],
      [clientSource, ['VectorTileLayer', 'GeoJsonLayer']],
    ] as const) {
      for (const component of components) {
        const start = source.indexOf(`function ${component}(`);
        expect(start).toBeGreaterThan(-1);
        const section = source.slice(start, source.indexOf('\nfunction ', start + 1));
        expect(section).toContain('defaultLabelFont');
      }
    }
  });
});

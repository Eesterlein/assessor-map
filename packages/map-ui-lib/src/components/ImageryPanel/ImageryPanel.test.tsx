import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageryPanel } from './ImageryPanel';
import type { ImageryLayerConfig } from '../../types';

function makeLayer(overrides: Partial<ImageryLayerConfig> = {}): ImageryLayerConfig {
  return {
    id: 'aerial-2024',
    sourceId: 'src',
    collection: 'ortho',
    label: 'Aerial 2024',
    visible: true,
    opacity: 1,
    exclusive: false,
    tileSize: 256,
    ...overrides,
  };
}

describe('ImageryPanel', () => {
  it('renders the layer label when it is set', () => {
    const html = renderToStaticMarkup(
      <ImageryPanel imageryLayers={[makeLayer()]} onToggleVisibility={() => {}} />,
    );
    expect(html).toContain('Aerial 2024');
  });

  it('falls back to the layer id when the label is blank', () => {
    const html = renderToStaticMarkup(
      <ImageryPanel imageryLayers={[makeLayer({ label: '' })]} onToggleVisibility={() => {}} />,
    );
    expect(html).toContain('aerial-2024');
  });

  it('falls back to the layer id when the label is whitespace-only', () => {
    const html = renderToStaticMarkup(
      <ImageryPanel imageryLayers={[makeLayer({ label: '   ' })]} onToggleVisibility={() => {}} />,
    );
    expect(html).toContain('aerial-2024');
  });

  it('uses the resolved label in the thumbnail alt text', () => {
    const html = renderToStaticMarkup(
      <ImageryPanel
        imageryLayers={[makeLayer({ label: '', thumbnailUrl: 'https://example.com/t.png' })]}
        onToggleVisibility={() => {}}
      />,
    );
    expect(html).toContain('alt="aerial-2024 thumbnail"');
  });
});

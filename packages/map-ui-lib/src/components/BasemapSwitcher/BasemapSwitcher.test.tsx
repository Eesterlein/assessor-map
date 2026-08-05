import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BasemapSwitcher } from './BasemapSwitcher';
import type { BasemapConfig } from '../../types';

function makeBasemap(overrides: Partial<BasemapConfig> = {}): BasemapConfig {
  return {
    id: 'osm',
    label: 'OpenStreetMap',
    url: 'https://example.com/style.json',
    ...overrides,
  };
}

describe('BasemapSwitcher', () => {
  it('renders the basemap label when it is set', () => {
    const html = renderToStaticMarkup(
      <BasemapSwitcher basemaps={[makeBasemap()]} activeBasemapId="osm" onSelect={() => {}} />,
    );
    expect(html).toContain('OpenStreetMap');
  });

  it('falls back to the basemap id when the label is blank', () => {
    const html = renderToStaticMarkup(
      <BasemapSwitcher
        basemaps={[makeBasemap({ label: '' })]}
        activeBasemapId="osm"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('<span>osm</span>');
  });

  it('falls back to the basemap id when the label is whitespace-only', () => {
    const html = renderToStaticMarkup(
      <BasemapSwitcher
        basemaps={[makeBasemap({ label: '  ' })]}
        activeBasemapId="other"
        onSelect={() => {}}
      />,
    );
    expect(html).toContain('<span>osm</span>');
  });
});

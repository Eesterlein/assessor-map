import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PropertyList } from '../PropertyList';

const URL_VALUE = 'https://property.spatialest.com/co/gunnison#/property/R005219';

describe('PropertyList link rendering', () => {
  it('renders type: link fields with a safe URL as an anchor', () => {
    const html = renderToStaticMarkup(
      <PropertyList
        properties={{ assessorlink: URL_VALUE }}
        fields={['assessorlink']}
        types={{ assessorlink: 'link' }}
      />,
    );
    expect(html).toContain(`href="${URL_VALUE}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Open ↗');
  });

  it('uses linkText override as anchor text', () => {
    const html = renderToStaticMarkup(
      <PropertyList
        properties={{ assessorlink: URL_VALUE }}
        types={{ assessorlink: 'link' }}
        linkText={{ assessorlink: 'View Assessor Record' }}
      />,
    );
    expect(html).toContain('View Assessor Record');
    expect(html).not.toContain('Open ↗');
  });

  it('falls back to plain text for link fields with unsafe values', () => {
    for (const value of ['javascript:alert(1)', 'not a url', 42, null]) {
      const html = renderToStaticMarkup(
        <PropertyList properties={{ assessorlink: value }} types={{ assessorlink: 'link' }} />,
      );
      expect(html).not.toContain('<a ');
    }
  });

  it('renders URL-shaped values of non-link fields as plain text (byte-for-byte fallback)', () => {
    const withoutTypes = renderToStaticMarkup(
      <PropertyList properties={{ website: URL_VALUE, name: 'Parcel 1' }} />,
    );
    const withTextType = renderToStaticMarkup(
      <PropertyList properties={{ website: URL_VALUE, name: 'Parcel 1' }} types={{}} />,
    );
    expect(withoutTypes).not.toContain('<a ');
    expect(withTextType).toBe(withoutTypes);
  });

  it('renders links in compact density too', () => {
    const html = renderToStaticMarkup(
      <PropertyList
        properties={{ assessorlink: URL_VALUE }}
        types={{ assessorlink: 'link' }}
        density="compact"
      />,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PropertyField } from '../PropertyField';
import { getPropertyRegistry } from '../propertyRegistry';
import type { PropertyDefinition } from '../propertyMetadata';

const paddingDef = getPropertyRegistry('symbol').find(
  (d) => d.key === 'icon-text-fit-padding',
) as PropertyDefinition;

describe('icon-text-fit-padding registry entry', () => {
  it('is registered as an optional layout padding widget for symbol styles', () => {
    expect(paddingDef).toBeDefined();
    expect(paddingDef.widget).toBe('padding');
    expect(paddingDef.category).toBe('layout');
    expect(paddingDef.group).toBe('Icon Layout');
    expect(paddingDef.enableDefault).toEqual([0, 0, 0, 0]);
  });

  it('sits alongside icon-text-fit in the Icon Layout group', () => {
    const keys = getPropertyRegistry('symbol').map((d) => d.key);
    expect(keys.indexOf('icon-text-fit-padding')).toBe(keys.indexOf('icon-text-fit') + 1);
  });
});

describe('PropertyField padding widget', () => {
  it('renders only the enable checkbox when the value is undefined (optional off)', () => {
    const html = renderToStaticMarkup(
      <PropertyField def={paddingDef} value={undefined} onChange={() => {}} />,
    );
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('type="number"');
  });

  it('renders four T/R/B/L number inputs with the tuple values when enabled', () => {
    const html = renderToStaticMarkup(
      <PropertyField def={paddingDef} value={[2, 6, 3, 7]} onChange={() => {}} />,
    );
    expect(html).toContain('aria-label="Top"');
    expect(html).toContain('aria-label="Right"');
    expect(html).toContain('aria-label="Bottom"');
    expect(html).toContain('aria-label="Left"');
    expect(html).toContain('value="2"');
    expect(html).toContain('value="6"');
    expect(html).toContain('value="3"');
    expect(html).toContain('value="7"');
    expect((html.match(/type="number"/g) ?? []).length).toBe(4);
  });

  it('defaults missing tuple entries to 0', () => {
    const html = renderToStaticMarkup(
      <PropertyField def={paddingDef} value={[5]} onChange={() => {}} />,
    );
    expect(html).toContain('value="5"');
    expect((html.match(/value="0"/g) ?? []).length).toBe(3);
  });
});

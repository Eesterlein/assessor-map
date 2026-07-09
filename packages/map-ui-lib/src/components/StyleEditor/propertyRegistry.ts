import type { PropertyDefinition } from './propertyMetadata';

// --- Fill ---

const fillProperties: PropertyDefinition[] = [
  // Appearance (paint)
  { key: 'fill-color', label: 'Fill Color', widget: 'color', group: 'Appearance', category: 'paint' },
  { key: 'fill-opacity', label: 'Fill Opacity', widget: 'opacity', group: 'Appearance', category: 'paint' },
  { key: 'fill-outline-color', label: 'Outline Color', widget: 'color', group: 'Appearance', category: 'paint', enableDefault: '#000000' },
  { key: 'fill-antialias', label: 'Antialias', widget: 'boolean', group: 'Appearance', category: 'paint', description: 'Smooths polygon edges using anti-aliasing. Disable for crisp pixel-aligned fills or when stacking transparent layers.' },
  { key: 'fill-pattern', label: 'Pattern', widget: 'icon-image', group: 'Appearance', category: 'paint', enableDefault: '', description: 'Name of an image in the style sprite to use as a repeating fill pattern.' },
  // Transform (paint)
  { key: 'fill-translate', label: 'Translate (X, Y)', widget: 'translate', group: 'Transform', category: 'paint', enableDefault: [0, 0], description: 'Offset the fill in pixels along X (right) and Y (down) axes.' },
  { key: 'fill-translate-anchor', label: 'Translate Anchor', widget: 'enum', group: 'Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map', description: '"map" moves the fill with the map when panning; "viewport" keeps the offset fixed on screen.' },
  // Sorting (layout)
  { key: 'fill-sort-key', label: 'Sort Key', widget: 'number', group: 'Sorting', category: 'layout', step: 1, enableDefault: 0, dataDriven: true, description: 'Controls drawing order within this layer — features with a higher sort key are drawn on top. Toggle "Data-driven" to read the value from a feature property (e.g. ["get", "priority"]) so each feature uses its own value.' },
];

// --- Line ---

const lineProperties: PropertyDefinition[] = [
  // Appearance (paint)
  { key: 'line-color', label: 'Line Color', widget: 'color', group: 'Appearance', category: 'paint' },
  { key: 'line-width', label: 'Line Width', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 0.5, dataDriven: true },
  { key: 'line-opacity', label: 'Line Opacity', widget: 'opacity', group: 'Appearance', category: 'paint' },
  { key: 'line-blur', label: 'Blur', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'line-dasharray', label: 'Dash Array', widget: 'dasharray', group: 'Appearance', category: 'paint', enableDefault: [2, 4], description: 'Lengths of alternating dashes and gaps in pixels (e.g. "2, 4" gives 2px dash, 4px gap).' },
  { key: 'line-pattern', label: 'Pattern', widget: 'icon-image', group: 'Appearance', category: 'paint', enableDefault: '', description: 'Name of an image in the style sprite to use as a repeating line pattern.' },
  // Stroke (paint)
  { key: 'line-gap-width', label: 'Gap Width', widget: 'number', group: 'Stroke', category: 'paint', min: 0, step: 0.5, enableDefault: 0, description: 'Renders two parallel lines with a gap between them. Set to the desired inner gap width; the outer stroke uses line-width.' },
  { key: 'line-offset', label: 'Offset', widget: 'number', group: 'Stroke', category: 'paint', step: 0.5, enableDefault: 0, description: 'Offset the line from its original position in pixels. Positive values shift left (relative to direction of travel), negative shift right.' },
  // Transform (paint)
  { key: 'line-translate', label: 'Translate (X, Y)', widget: 'translate', group: 'Transform', category: 'paint', enableDefault: [0, 0], description: 'Offset the line in pixels along X (right) and Y (down) axes.' },
  { key: 'line-translate-anchor', label: 'Translate Anchor', widget: 'enum', group: 'Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map', description: '"map" moves the line with the map when panning; "viewport" keeps the offset fixed on screen.' },
  // Cap & Join (layout)
  { key: 'line-cap', label: 'Line Cap', widget: 'enum', group: 'Cap & Join', category: 'layout', options: ['butt', 'round', 'square'], enableDefault: 'butt' },
  { key: 'line-join', label: 'Line Join', widget: 'enum', group: 'Cap & Join', category: 'layout', options: ['bevel', 'round', 'miter'], enableDefault: 'miter' },
  { key: 'line-miter-limit', label: 'Miter Limit', widget: 'number', group: 'Cap & Join', category: 'layout', step: 0.5, enableDefault: 2, description: 'When line-join is "miter", sharp corners are clipped to a bevel once the miter length exceeds this multiple of line-width.' },
  { key: 'line-round-limit', label: 'Round Limit', widget: 'number', group: 'Cap & Join', category: 'layout', step: 0.1, enableDefault: 1.05, description: 'When line-join is "round", angles sharper than this threshold (in radians) are bevelled instead of rounded.' },
  // Sorting (layout)
  { key: 'line-sort-key', label: 'Sort Key', widget: 'number', group: 'Sorting', category: 'layout', step: 1, enableDefault: 0, dataDriven: true, description: 'Controls drawing order within this layer — features with a higher sort key are drawn on top. Toggle "Data-driven" to read the value from a feature property (e.g. ["get", "priority"]) so each feature uses its own value.' },
];

// --- Circle ---

const circleProperties: PropertyDefinition[] = [
  // Appearance (paint)
  { key: 'circle-color', label: 'Circle Color', widget: 'color', group: 'Appearance', category: 'paint' },
  { key: 'circle-radius', label: 'Radius', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 1, dataDriven: true },
  { key: 'circle-opacity', label: 'Circle Opacity', widget: 'opacity', group: 'Appearance', category: 'paint' },
  { key: 'circle-blur', label: 'Blur', widget: 'number', group: 'Appearance', category: 'paint', min: 0, step: 0.1, enableDefault: 0 },
  // Stroke (paint)
  { key: 'circle-stroke-color', label: 'Stroke Color', widget: 'color', group: 'Stroke', category: 'paint', enableDefault: '#000000' },
  { key: 'circle-stroke-width', label: 'Stroke Width', widget: 'number', group: 'Stroke', category: 'paint', min: 0, step: 1, enableDefault: 1 },
  { key: 'circle-stroke-opacity', label: 'Stroke Opacity', widget: 'opacity', group: 'Stroke', category: 'paint', enableDefault: 1 },
  // Transform (paint)
  { key: 'circle-translate', label: 'Translate (X, Y)', widget: 'translate', group: 'Transform', category: 'paint', enableDefault: [0, 0], description: 'Offset the circle in pixels along X (right) and Y (down) axes.' },
  { key: 'circle-translate-anchor', label: 'Translate Anchor', widget: 'enum', group: 'Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map', description: '"map" moves the circle with the map when panning; "viewport" keeps the offset fixed on screen.' },
  // Alignment (paint)
  { key: 'circle-pitch-scale', label: 'Pitch Scale', widget: 'enum', group: 'Alignment', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map', description: '"map" scales circles with map perspective (smaller when far away); "viewport" keeps circles the same size regardless of pitch.' },
  { key: 'circle-pitch-alignment', label: 'Pitch Alignment', widget: 'enum', group: 'Alignment', category: 'paint', options: ['map', 'viewport'], enableDefault: 'viewport', description: '"map" orients circles flat on the map surface; "viewport" keeps circles facing the screen (default).' },
  // Sorting (layout)
  { key: 'circle-sort-key', label: 'Sort Key', widget: 'number', group: 'Sorting', category: 'layout', step: 1, enableDefault: 0, dataDriven: true, description: 'Controls drawing order within this layer — features with a higher sort key are drawn on top. Toggle "Data-driven" to read the value from a feature property (e.g. ["get", "priority"]) so each feature uses its own value.' },
];

// --- Symbol ---

const symbolProperties: PropertyDefinition[] = [
  // Icon Appearance (paint)
  { key: 'icon-color', label: 'Icon Color', widget: 'color', group: 'Icon Appearance', category: 'paint', enableDefault: '#000000' },
  { key: 'icon-opacity', label: 'Icon Opacity', widget: 'opacity', group: 'Icon Appearance', category: 'paint', enableDefault: 1 },
  { key: 'icon-halo-color', label: 'Icon Halo Color', widget: 'color', group: 'Icon Appearance', category: 'paint', enableDefault: 'transparent' },
  { key: 'icon-halo-width', label: 'Icon Halo Width', widget: 'number', group: 'Icon Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'icon-halo-blur', label: 'Icon Halo Blur', widget: 'number', group: 'Icon Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  // Icon Transform (paint)
  { key: 'icon-translate', label: 'Icon Translate (X, Y)', widget: 'translate', group: 'Icon Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'icon-translate-anchor', label: 'Icon Translate Anchor', widget: 'enum', group: 'Icon Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Text Appearance (paint)
  { key: 'text-color', label: 'Text Color', widget: 'color', group: 'Text Appearance', category: 'paint', enableDefault: '#333333' },
  { key: 'text-opacity', label: 'Text Opacity', widget: 'opacity', group: 'Text Appearance', category: 'paint', enableDefault: 1 },
  { key: 'text-halo-color', label: 'Text Halo Color', widget: 'color', group: 'Text Appearance', category: 'paint', enableDefault: 'transparent' },
  { key: 'text-halo-width', label: 'Text Halo Width', widget: 'number', group: 'Text Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  { key: 'text-halo-blur', label: 'Text Halo Blur', widget: 'number', group: 'Text Appearance', category: 'paint', min: 0, step: 0.5, enableDefault: 0 },
  // Text Transform (paint)
  { key: 'text-translate', label: 'Text Translate (X, Y)', widget: 'translate', group: 'Text Transform', category: 'paint', enableDefault: [0, 0] },
  { key: 'text-translate-anchor', label: 'Text Translate Anchor', widget: 'enum', group: 'Text Transform', category: 'paint', options: ['map', 'viewport'], enableDefault: 'map' },
  // Icon Layout (layout)
  { key: 'icon-image', label: 'Icon Image', widget: 'icon-image', group: 'Icon Layout', category: 'layout', enableDefault: '', dataDriven: true, description: 'Name of an image in the style sprite to use as an icon. Use {property} tokens to reference feature data (e.g. "{icon}").' },
  { key: 'icon-size', label: 'Icon Size', widget: 'number', group: 'Icon Layout', category: 'layout', min: 0, step: 0.1, enableDefault: 1 },
  { key: 'icon-rotate', label: 'Icon Rotate', widget: 'number', group: 'Icon Layout', category: 'layout', step: 1, enableDefault: 0 },
  { key: 'icon-padding', label: 'Icon Padding', widget: 'number', group: 'Icon Layout', category: 'layout', min: 0, step: 1, enableDefault: 2 },
  { key: 'icon-anchor', label: 'Icon Anchor', widget: 'enum', group: 'Icon Layout', category: 'layout', options: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], enableDefault: 'center', description: 'The part of the icon that is placed at the feature geometry. E.g. "bottom" is used for map pins so the point touches the location.' },
  { key: 'icon-allow-overlap', label: 'Icon Allow Overlap', widget: 'boolean', group: 'Icon Layout', category: 'layout', enableDefault: false, description: 'When enabled, the icon is visible even if it overlaps other symbols. Useful for always-visible markers.' },
  { key: 'icon-optional', label: 'Icon Optional', widget: 'boolean', group: 'Icon Layout', category: 'layout', enableDefault: false, description: 'When enabled, the icon is hidden (but text still shows) if the icon would cause a collision.' },
  { key: 'icon-rotation-alignment', label: 'Icon Rotation Alignment', widget: 'enum', group: 'Icon Layout', category: 'layout', options: ['map', 'viewport', 'auto'], enableDefault: 'auto', description: '"map" rotates with the map bearing; "viewport" stays upright on screen; "auto" follows symbol-placement.' },
  { key: 'icon-text-fit', label: 'Icon Text Fit', widget: 'enum', group: 'Icon Layout', category: 'layout', options: ['none', 'width', 'height', 'both'], enableDefault: 'none', description: 'Scales the icon to fit the text bounding box. Useful for background label boxes.' },
  { key: 'icon-text-fit-padding', label: 'Icon Text Fit Padding (T,R,B,L)', widget: 'padding', group: 'Icon Layout', category: 'layout', enableDefault: [0, 0, 0, 0], description: 'Extra padding in pixels around the text when icon-text-fit scales the icon to match it (top, right, bottom, left). Increase to give shield artwork breathing room around the route number.' },
  { key: 'icon-offset', label: 'Icon Offset (X, Y)', widget: 'translate', group: 'Icon Layout', category: 'layout', enableDefault: [0, 0], description: 'Offset the icon from the symbol anchor in pixels.' },
  // Text Layout (layout)
  { key: 'text-field', label: 'Text Field', widget: 'text', group: 'Text Layout', category: 'layout', enableDefault: '{name}', description: 'The text to display. Use {property} tokens to reference feature properties (e.g. "{name}" shows the name attribute).' },
  { key: 'text-size', label: 'Text Size', widget: 'number', group: 'Text Layout', category: 'layout', min: 0, step: 1, enableDefault: 16 },
  { key: 'text-font', label: 'Text Font (comma-separated)', widget: 'stringArray', group: 'Text Layout', category: 'layout', enableDefault: ['Open Sans Regular'], description: 'Ordered list of font stack names. The first font found in the style glyphs is used.' },
  { key: 'text-max-width', label: 'Text Max Width', widget: 'number', group: 'Text Layout', category: 'layout', min: 0, step: 1, enableDefault: 10, description: 'Maximum width of a text label in ems before it wraps to a new line.' },
  { key: 'text-letter-spacing', label: 'Letter Spacing', widget: 'number', group: 'Text Layout', category: 'layout', step: 0.05, enableDefault: 0, description: 'Additional spacing between characters in ems. Positive values spread text out; negative values tighten it.' },
  { key: 'text-justify', label: 'Text Justify', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['auto', 'left', 'center', 'right'], enableDefault: 'center' },
  { key: 'text-anchor', label: 'Text Anchor', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], enableDefault: 'center', description: 'The part of the text bounding box that is placed at the symbol anchor point.' },
  { key: 'text-transform', label: 'Text Transform', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['none', 'uppercase', 'lowercase'], enableDefault: 'none' },
  { key: 'text-offset', label: 'Text Offset (X, Y)', widget: 'translate', group: 'Text Layout', category: 'layout', enableDefault: [0, 0], description: 'Offset the text from the symbol anchor in ems.' },
  { key: 'text-allow-overlap', label: 'Text Allow Overlap', widget: 'boolean', group: 'Text Layout', category: 'layout', enableDefault: false, description: 'When enabled, text is visible even if it overlaps other symbols.' },
  { key: 'text-optional', label: 'Text Optional', widget: 'boolean', group: 'Text Layout', category: 'layout', enableDefault: false, description: 'When enabled, text is hidden (but icon still shows) if the text would cause a collision.' },
  { key: 'text-rotation-alignment', label: 'Text Rotation Alignment', widget: 'enum', group: 'Text Layout', category: 'layout', options: ['map', 'viewport', 'viewport-glyph', 'auto'], enableDefault: 'auto', description: '"map" rotates text with the map; "viewport" keeps text upright; "viewport-glyph" keeps each glyph upright individually.' },
  // Placement (layout)
  { key: 'symbol-placement', label: 'Symbol Placement', widget: 'enum', group: 'Placement', category: 'layout', options: ['point', 'line', 'line-center'], enableDefault: 'point', description: '"point" places one symbol per feature; "line" places symbols along the full line; "line-center" places one at the midpoint.' },
  { key: 'symbol-spacing', label: 'Symbol Spacing', widget: 'number', group: 'Placement', category: 'layout', min: 1, step: 1, enableDefault: 250, description: 'Minimum distance in pixels between symbols along a line (used when symbol-placement is "line").' },
  { key: 'symbol-avoid-edges', label: 'Avoid Edges', widget: 'boolean', group: 'Placement', category: 'layout', enableDefault: false, description: 'When enabled, symbols near tile edges are hidden to avoid being clipped or doubled at tile boundaries.' },
  { key: 'symbol-sort-key', label: 'Sort Key', widget: 'number', group: 'Placement', category: 'layout', step: 1, enableDefault: 0, dataDriven: true, description: 'Controls placement priority and drawing order within this layer — features with a higher sort key are prioritised in collision detection and drawn on top. Toggle "Data-driven" to read the value from a feature property (e.g. ["get", "priority"]) so each feature uses its own value.' },
  { key: 'symbol-z-order', label: 'Z-Order', widget: 'enum', group: 'Placement', category: 'layout', options: ['auto', 'viewport-y', 'source'], enableDefault: 'auto', description: '"viewport-y" renders symbols in top-to-bottom screen order (closer = higher); "source" preserves data source order; "auto" uses "viewport-y" when sort-key is unset.' },
];

const registry: Record<string, PropertyDefinition[]> = {
  fill: fillProperties,
  line: lineProperties,
  circle: circleProperties,
  symbol: symbolProperties,
};

export function getPropertyRegistry(type: string): PropertyDefinition[] {
  return registry[type] ?? [];
}

export function groupProperties(
  defs: PropertyDefinition[],
): Record<string, PropertyDefinition[]> {
  const groups: Record<string, PropertyDefinition[]> = {};
  for (const def of defs) {
    if (!groups[def.group]) groups[def.group] = [];
    groups[def.group].push(def);
  }
  return groups;
}

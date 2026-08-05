import type { StyleConfig, AvailableProperty } from '../../types';
import type { StylePresetGeometry } from '../../utils/stylePresets';
import { StylePresetPicker } from '../StylePresetPicker/StylePresetPicker';

export interface StylePresetSectionProps {
  suitableStyleTypes: ('fill' | 'line' | 'circle' | 'symbol')[];
  styles: StyleConfig[] | undefined;
  onChange: (styles: StyleConfig[]) => void;
  /** Passed to recipe presets so they can auto-wire label fields. */
  availableProperties?: AvailableProperty[];
}

function deriveGeometries(suitable: ('fill' | 'line' | 'circle' | 'symbol')[]): StylePresetGeometry[] {
  const out: StylePresetGeometry[] = [];
  if (suitable.includes('fill')) out.push('polygon');
  if (suitable.includes('line')) out.push('line');
  if (suitable.includes('circle')) out.push('point');
  // Symbol-only layers (rare) — points labelled but not drawn as circles.
  if (out.length === 0 && suitable.includes('symbol')) out.push('point');
  return out;
}

function hasPolygonApplicableFill(styles: StyleConfig[]): boolean {
  return styles.some(
    (s) =>
      s.type === 'fill' &&
      (!s.geometryFilter || s.geometryFilter.some((g) => g === 'Polygon' || g === 'MultiPolygon')),
  );
}

export function StylePresetSection({ suitableStyleTypes, styles, onChange, availableProperties }: StylePresetSectionProps) {
  const geometries = deriveGeometries(suitableStyleTypes);
  if (geometries.length === 0) return null;

  const current = styles ?? [];
  const isMixed = suitableStyleTypes.filter((t) => t !== 'symbol').length > 1;
  const showFillWarning = geometries.includes('polygon') && !hasPolygonApplicableFill(current);

  const addClickTarget = () => {
    const clickTarget: StyleConfig = {
      type: 'fill',
      paint: { 'fill-color': '#000000', 'fill-opacity': 0, 'fill-antialias': false },
      ...(isMixed ? { geometryFilter: ['Polygon', 'MultiPolygon'] as const } : {}),
    } as StyleConfig;
    onChange([clickTarget, ...current]);
  };

  return (
    <>
      <StylePresetPicker geometries={geometries} value={styles} onChange={onChange} availableProperties={availableProperties} />
      {showFillWarning && (
        <div className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-2 mapui:rounded mapui:border mapui:border-red-300 mapui:bg-red-50 mapui:px-3 mapui:py-2 mapui:text-xs mapui:text-red-900">
          <span>
            <strong>No polygon fill.</strong> Clicks inside the shape won't trigger detail panels or
            tooltips. Add a transparent fill to keep the interior clickable.
          </span>
          <button
            type="button"
            onClick={addClickTarget}
            className="mapui:shrink-0 mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-600 mapui:bg-red-600 mapui:px-2 mapui:py-0.5 mapui:font-medium mapui:text-white hover:mapui:bg-red-700"
          >
            Add transparent click target
          </button>
        </div>
      )}
    </>
  );
}

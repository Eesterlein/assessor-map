import { useState } from 'react';
import type { StyleConfig, AvailableProperty } from '../../types';
import {
  getPresetsForGeometries,
  inferActivePresetId,
  type StylePreset,
  type StylePresetGeometry,
} from '../../utils/stylePresets';
import { StylePreview } from '../StyleEditor/StylePreview';

export interface StylePresetPickerProps {
  geometries: StylePresetGeometry[];
  value: StyleConfig[] | undefined;
  onChange: (styles: StyleConfig[]) => void;
  /** Available layer properties — passed to recipe presets so they can wire labels automatically. */
  availableProperties?: AvailableProperty[];
}

// ─── Shared card styles ────────────────────────────────────────────────────────

const cardBase =
  'mapui:flex mapui:flex-col mapui:gap-1 mapui:rounded mapui:border mapui:bg-white mapui:px-2 mapui:py-2 mapui:text-left mapui:transition-colors mapui:cursor-pointer';
const cardInactive = 'mapui:border-slate-200 hover:mapui:border-blue-300 hover:mapui:bg-blue-50';
const cardActive   = 'mapui:border-blue-500 mapui:ring-2 mapui:ring-blue-200 mapui:bg-blue-50';

const DEFAULT_COLOR: Record<StylePresetGeometry, string> = {
  polygon: '#4a90d9',
  line:    '#e63946',
  point:   '#e74c3c',
};

// ─── Individual card ──────────────────────────────────────────────────────────

function PresetCard({
  preset,
  active,
  onSelect,
  wide = false,
}: {
  preset: StylePreset;
  active: boolean;
  onSelect: () => void;
  wide?: boolean;
}) {
  const previewStyles = preset.build(DEFAULT_COLOR[preset.geometry], []);
  const extra = previewStyles.length - 1;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={preset.description}
      className={`${cardBase} ${active ? cardActive : cardInactive} ${wide ? '' : 'mapui:w-32 mapui:shrink-0'}`}
    >
      <div className="mapui:relative">
        <StylePreview style={previewStyles[0]} />
        {extra > 0 && (
          <span
            className="mapui:absolute mapui:right-1 mapui:top-1 mapui:rounded mapui:bg-slate-700 mapui:px-1 mapui:text-[10px] mapui:font-semibold mapui:text-white"
            aria-label={`${extra + 1} stacked styles`}
          >
            +{extra}
          </span>
        )}
      </div>
      <span className="mapui:text-xs mapui:font-semibold mapui:text-slate-800">{preset.label}</span>
      <span className="mapui:text-[10px] mapui:leading-tight mapui:text-slate-500">{preset.description}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StylePresetPicker({ geometries, value, onChange, availableProperties }: StylePresetPickerProps) {
  const presets    = getPresetsForGeometries(geometries);
  const activeId   = inferActivePresetId(value);
  const hasCustom  = (value?.length ?? 0) > 0 && activeId === null;
  const [pending, setPending] = useState<StylePreset | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  if (presets.length === 0) return null;

  const applyPreset = (preset: StylePreset) => {
    onChange(preset.build(DEFAULT_COLOR[preset.geometry], availableProperties ?? []));
    setPending(null);
  };

  const handleSelect = (preset: StylePreset) => {
    if (preset.id === activeId) return;
    if (hasCustom) { setPending(preset); return; }
    applyPreset(preset);
  };

  const recipePresets  = presets.filter((p) => !p.category);
  const customPresets  = presets.filter((p) => p.category === 'Custom');

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">

      {/* Header */}
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <p className="mapui:m-0 mapui:text-xs mapui:font-medium mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
          Quick styles
        </p>
        {hasCustom && (
          <span className="mapui:text-[10px] mapui:italic mapui:text-slate-400">Custom styles active</span>
        )}
      </div>

      {/* 2×2 recipe grid */}
      {recipePresets.length > 0 && (
        <div className="mapui:grid mapui:grid-cols-2 mapui:gap-2">
          {recipePresets.map((p) => (
            <PresetCard key={p.id} preset={p} active={p.id === activeId} onSelect={() => handleSelect(p)} wide />
          ))}
        </div>
      )}

      {/* Custom presets toggle */}
      {customPresets.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="mapui:text-[11px] mapui:text-slate-400 hover:mapui:text-slate-600 mapui:flex mapui:items-center mapui:gap-1"
          >
            <span>{showCustom ? '▾' : '▸'}</span>
            <span>Custom presets</span>
          </button>
          {showCustom && (
            <div className="mapui:mt-2 mapui:flex mapui:gap-2 mapui:overflow-x-auto mapui:pb-1">
              {customPresets.map((p) => (
                <PresetCard key={p.id} preset={p} active={p.id === activeId} onSelect={() => handleSelect(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation when switching away from custom-edited styles */}
      {pending && (
        <div className="mapui:flex mapui:items-center mapui:justify-between mapui:rounded mapui:border mapui:border-amber-200 mapui:bg-amber-50 mapui:px-3 mapui:py-2 mapui:text-xs mapui:text-amber-900">
          <span>Replace your custom styles with <strong>{pending.label}</strong>?</span>
          <div className="mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-slate-700 hover:mapui:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => applyPreset(pending)}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-amber-600 mapui:bg-amber-600 mapui:px-2 mapui:py-0.5 mapui:text-white hover:mapui:bg-amber-700"
            >
              Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

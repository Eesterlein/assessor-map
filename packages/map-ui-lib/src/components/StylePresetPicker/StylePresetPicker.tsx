import { useState } from 'react';
import type { StyleConfig } from '../../types';
import {
  getPresetsForGeometries,
  inferActivePresetId,
  type StylePreset,
  type StylePresetGeometry,
} from '../../utils/stylePresets';
import { StylePreview } from '../StyleEditor/StylePreview';

export interface StylePresetPickerProps {
  /** Geometry families relevant to the layer. Filters which presets to show. */
  geometries: StylePresetGeometry[];
  /** Current layer styles. Used to highlight the active preset card. */
  value: StyleConfig[] | undefined;
  onChange: (styles: StyleConfig[]) => void;
}

const cardBase =
  'mapui:flex mapui:flex-col mapui:gap-1 mapui:rounded mapui:border mapui:bg-white mapui:px-2 mapui:py-2 mapui:text-left mapui:transition-colors mapui:cursor-pointer mapui:w-32 mapui:shrink-0';
const cardInactive = 'mapui:border-slate-200 hover:mapui:border-blue-300 hover:mapui:bg-blue-50';
const cardActive = 'mapui:border-blue-500 mapui:ring-2 mapui:ring-blue-200 mapui:bg-blue-50';

const DEFAULT_COLOR: Record<StylePresetGeometry, string> = {
  polygon: '#4a90d9',
  line: '#2980b9',
  point: '#e74c3c',
};

function PresetCard({
  preset,
  active,
  onSelect,
}: {
  preset: StylePreset;
  active: boolean;
  onSelect: () => void;
}) {
  const previewStyles = preset.build(DEFAULT_COLOR[preset.geometry]);
  const extra = previewStyles.length - 1;
  return (
    <button
      type="button"
      onClick={onSelect}
      title={preset.description}
      className={`${cardBase} ${active ? cardActive : cardInactive}`}
    >
      <div className="mapui:relative">
        <StylePreview style={previewStyles[0]} />
        {extra > 0 && (
          <span
            className="mapui:absolute mapui:right-1 mapui:top-1 mapui:rounded mapui:bg-slate-800 mapui:px-1 mapui:text-[10px] mapui:font-semibold mapui:text-white"
            aria-label={`${extra + 1} stacked styles`}
          >
            +{extra}
          </span>
        )}
      </div>
      <span className="mapui:text-xs mapui:font-medium mapui:text-slate-700">{preset.label}</span>
      <span className="mapui:text-[10px] mapui:leading-tight mapui:text-slate-500">{preset.description}</span>
    </button>
  );
}

function PresetGroup({
  label,
  presets,
  activeId,
  onSelect,
}: {
  label: string | null;
  presets: StylePreset[];
  activeId: string | null;
  onSelect: (p: StylePreset) => void;
}) {
  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
      {label && (
        <span className="mapui:text-[10px] mapui:font-semibold mapui:uppercase mapui:tracking-widest mapui:text-slate-400">
          {label}
        </span>
      )}
      <div className="mapui:flex mapui:gap-2 mapui:overflow-x-auto mapui:pb-1">
        {presets.map((p) => (
          <PresetCard key={p.id} preset={p} active={p.id === activeId} onSelect={() => onSelect(p)} />
        ))}
      </div>
    </div>
  );
}

export function StylePresetPicker({ geometries, value, onChange }: StylePresetPickerProps) {
  const presets = getPresetsForGeometries(geometries);
  const activeId = inferActivePresetId(value);
  const hasCustomStyles = (value?.length ?? 0) > 0 && activeId === null;
  const [pendingPreset, setPendingPreset] = useState<StylePreset | null>(null);

  if (presets.length === 0) return null;

  const applyPreset = (preset: StylePreset) => {
    onChange(preset.build(DEFAULT_COLOR[preset.geometry]));
    setPendingPreset(null);
  };

  const handleSelect = (preset: StylePreset) => {
    if (preset.id === activeId) return;
    if (hasCustomStyles) {
      setPendingPreset(preset);
      return;
    }
    applyPreset(preset);
  };

  // Partition into named categories and an unnamed generic group
  const genericPresets = presets.filter((p) => !p.category);
  const categoryMap = new Map<string, StylePreset[]>();
  for (const p of presets) {
    if (!p.category) continue;
    if (!categoryMap.has(p.category)) categoryMap.set(p.category, []);
    categoryMap.get(p.category)!.push(p);
  }

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <p className="mapui:m-0 mapui:text-xs mapui:font-medium mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
          Style preset
        </p>
        {hasCustomStyles && (
          <span className="mapui:text-[10px] mapui:italic mapui:text-slate-400">Custom styles applied</span>
        )}
      </div>

      {genericPresets.length > 0 && (
        <PresetGroup
          label={categoryMap.size > 0 ? 'Generic' : null}
          presets={genericPresets}
          activeId={activeId}
          onSelect={handleSelect}
        />
      )}

      {Array.from(categoryMap.entries()).map(([cat, catPresets]) => (
        <PresetGroup
          key={cat}
          label={cat}
          presets={catPresets}
          activeId={activeId}
          onSelect={handleSelect}
        />
      ))}

      {pendingPreset && (
        <div className="mapui:flex mapui:items-center mapui:justify-between mapui:rounded mapui:border mapui:border-amber-200 mapui:bg-amber-50 mapui:px-3 mapui:py-2 mapui:text-xs mapui:text-amber-900">
          <span>
            Replace your custom styles with <strong>{pendingPreset.label}</strong>?
          </span>
          <div className="mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={() => setPendingPreset(null)}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-slate-700 hover:mapui:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => applyPreset(pendingPreset)}
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

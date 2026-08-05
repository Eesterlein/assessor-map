import { useMemo, useState } from 'react';
import type { UIConfig, OrderableControlKey, LayerConfig, ControlCorner, ControlLayout } from '../../types';
import { ORDERABLE_CONTROLS, resolveControlOrder, resolveControlCorner, CONTROL_CORNERS, CONTROL_LAYOUTS, COORDINATE_FORMATS } from '../../schemas/config';
import { CONTROL_ICON_MAP, CONTROL_ICON_NAMES } from '../shared/controlIcons';
import { CollapsibleSection } from '../admin/CollapsibleSection';
import { ColorPicker } from '../admin/ColorPicker';
import { FormField } from '../admin/FormField';

export interface UIConfigEditorProps {
  value: UIConfig;
  onChange: (config: UIConfig) => void;
  /** Keys that were auto-enabled by the wizard based on config state. */
  autoEnabled?: Set<keyof UIConfig>;
  /**
   * Optional list of layers that have legend configs. When provided, the editor
   * renders a "Legend Order" reorder UI that writes to `value.legendOrder`.
   */
  layers?: LayerConfig[];
  /** External toggle state for the info control (driven by `info.enabled`). */
  infoEnabled?: boolean;
  /** Callback when the info control toggle changes in the control stack. */
  onInfoEnabledChange?: (enabled: boolean) => void;
}

const CORNER_LABELS: Record<ControlCorner, string> = {
  'top-right': 'Top right',
  'top-left': 'Top left',
  'bottom-right': 'Bottom right',
  'bottom-left': 'Bottom left',
};

const LAYOUT_LABELS: Record<ControlLayout, { label: string; description: string }> = {
  individual: { label: 'Individual', description: 'Each control in its configured corner.' },
  'side-menu': { label: 'Side menu', description: 'Controls grouped in a slide-in menu.' },
  auto: { label: 'Auto', description: 'Side menu on narrow screens, individual otherwise.' },
};

const COORDINATE_FORMAT_LABELS: Record<(typeof COORDINATE_FORMATS)[number], string> = {
  'decimal-degrees': 'Decimal degrees (38.887500, -104.824167)',
  ddm: "Degree decimal minutes (38° 53.250' N, 104° 49.450' W)",
  dms: "Degree minutes seconds (38° 53' 15\" N, 104° 49' 27\" W)",
};

/**
 * Curated font-stack names verified against the CARTO/OpenMapTiles glyph
 * servers used by this project's default basemaps. A basemap pointing at a
 * different glyph endpoint may not serve every preset — hence the Custom option.
 */
const LABEL_FONT_PRESETS = [
  'Open Sans Bold',
  'Open Sans Regular',
  'Open Sans Semibold',
  'Open Sans Italic',
  'Noto Sans Regular',
  'Montserrat Regular',
  'Montserrat Medium',
] as const;

const CUSTOM_FONT_SENTINEL = '__custom__';

const TOGGLE_LABELS: { key: string; label: string; description: string }[] = [
  { key: 'showLayerPanel', label: 'Layer Panel', description: 'Toggle layer visibility' },
  { key: 'showLegend', label: 'Legend', description: 'Map legend' },
  { key: 'showBasemapSwitcher', label: 'Basemap Switcher', description: 'Switch basemap styles' },
  { key: 'showSearchPanel', label: 'Search Panel', description: 'Search and filter features' },
  { key: 'showCoordinateDisplay', label: 'Coordinate Display', description: 'Show cursor coordinates' },
  { key: 'showFeatureDetail', label: 'Feature Detail Panel', description: 'Inspect feature properties' },
  { key: 'showFeatureTooltip', label: 'Feature Tooltip', description: 'Hover tooltip on features' },
  { key: 'showExportButton', label: 'Export Button', description: 'Export data as CSV' },
  { key: 'showExportPdf', label: 'Export as PDF', description: 'Enable PDF map export with title, legend, scale bar' },
  { key: 'showLegendOpacity', label: 'Legend Opacity', description: 'Expand legend with opacity sliders' },
  { key: 'showMeasureTool', label: 'Measure Tool', description: 'Measure distances and areas on the map' },
  { key: 'showSelectionTool', label: 'Selection Tool', description: 'Select features by click or box draw' },
  { key: 'showImageryPanel', label: 'Imagery Panel', description: 'Toggle satellite imagery layers' },
  { key: 'showCompass', label: 'Compass', description: 'Show map compass; click to reset to north' },
  { key: 'showInfoControl', label: 'Info Control', description: 'Informational modal with map details' },
  { key: 'showGlobalSearch', label: 'Global Search', description: 'Cross-layer search bar above the map' },
  { key: 'showScaleBar', label: 'Scale Bar', description: 'Display map scale bar' },
];

const ORDERABLE_SET = new Set<string>(ORDERABLE_CONTROLS);

const NON_ORDERABLE_TOGGLES = TOGGLE_LABELS.filter((t) => !ORDERABLE_SET.has(t.key));

const TOGGLE_INFO = new Map(TOGGLE_LABELS.map((t) => [t.key, t]));

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mapui:relative mapui:flex mapui:shrink-0 mapui:cursor-pointer mapui:items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mapui:sr-only"
        aria-label={label}
      />
      <span
        className={[
          'mapui:relative mapui:block mapui:h-5 mapui:w-9 mapui:rounded-full mapui:transition-colors',
          checked ? 'mapui:bg-blue-600' : 'mapui:bg-slate-300',
        ].join(' ')}
      >
        <span
          className={[
            'mapui:absolute mapui:top-0.5 mapui:block mapui:h-4 mapui:w-4 mapui:rounded-full mapui:bg-white mapui:shadow mapui:transition-transform',
            checked ? 'mapui:translate-x-4' : 'mapui:translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </label>
  );
}

export function UIConfigEditor({ value, onChange, autoEnabled, layers, infoEnabled, onInfoEnabledChange }: UIConfigEditorProps) {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // Default label font: preset select + free-text custom fallback.
  const isPresetLabelFont =
    value.defaultLabelFont?.length === 1 &&
    (LABEL_FONT_PRESETS as readonly string[]).includes(value.defaultLabelFont[0]);
  const [customFontMode, setCustomFontMode] = useState(false);
  const showCustomFontInput = customFontMode || (value.defaultLabelFont != null && !isPresetLabelFont);
  const [customFontDraft, setCustomFontDraft] = useState(() => (value.defaultLabelFont ?? []).join(', '));

  const controlOrder = useMemo(() => resolveControlOrder(value), [value]);

  // Effective legend order: merge stored order with any new legend-bearing layers
  // so the editor row list always reflects the current set.
  const legendLayerOptions = useMemo(
    () => (layers ?? []).filter((l) => l.legend !== undefined),
    [layers],
  );
  const effectiveLegendOrder = useMemo(() => {
    const ids = legendLayerOptions.map((l) => l.id);
    const stored = value.legendOrder ?? [];
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const id of stored) {
      if (ids.includes(id) && !seen.has(id)) {
        merged.push(id);
        seen.add(id);
      }
    }
    for (const id of ids) {
      if (!seen.has(id)) merged.push(id);
    }
    return merged;
  }, [legendLayerOptions, value.legendOrder]);

  const updateLegendOrder = (newOrder: string[]) => {
    onChange({ ...value, legendOrder: newOrder });
  };

  const handleLegendMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...effectiveLegendOrder];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updateLegendOrder(updated);
  };

  const handleLegendMoveDown = (index: number) => {
    if (index === effectiveLegendOrder.length - 1) return;
    const updated = [...effectiveLegendOrder];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updateLegendOrder(updated);
  };

  const handleToggle = (key: keyof UIConfig, checked: boolean) => {
    onChange({ ...value, [key]: checked });
  };

  const updateOrder = (newOrder: OrderableControlKey[]) => {
    onChange({ ...value, controlOrder: newOrder });
  };

  const handleCornerChange = (key: OrderableControlKey, corner: ControlCorner) => {
    const next = { ...(value.controlPositions ?? {}) } as Partial<Record<OrderableControlKey, ControlCorner>>;
    if (corner === 'top-right') {
      delete next[key];
    } else {
      next[key] = corner;
    }
    const hasAny = Object.keys(next).length > 0;
    onChange({ ...value, controlPositions: hasAny ? next : undefined });
  };

  const handleIconChange = (key: OrderableControlKey, iconName: string) => {
    const next = { ...(value.controlIcons ?? {}) } as Partial<Record<OrderableControlKey, string>>;
    if (!iconName) {
      delete next[key];
    } else {
      next[key] = iconName;
    }
    const hasAny = Object.keys(next).length > 0;
    onChange({ ...value, controlIcons: hasAny ? next : undefined });
  };

  const [iconPickerFor, setIconPickerFor] = useState<OrderableControlKey | null>(null);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...controlOrder];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updateOrder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === controlOrder.length - 1) return;
    const updated = [...controlOrder];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updateOrder(updated);
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, key: string) => {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  };

  const handleDragLeave = () => {
    setDragOverKey(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetKey: string) => {
    e.preventDefault();
    setDragOverKey(null);

    const fromKey = draggedKey;
    setDraggedKey(null);

    if (!fromKey || fromKey === targetKey) return;

    const fromIndex = controlOrder.indexOf(fromKey as OrderableControlKey);
    const toIndex = controlOrder.indexOf(targetKey as OrderableControlKey);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...controlOrder];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, controlOrder[fromIndex]);
    updateOrder(reordered);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-4">
      {/* Control layout */}
      <CollapsibleSection title="Control Layout" defaultOpen>
        <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
          How controls are displayed on the map.
        </p>
        <div className="mapui:flex mapui:flex-col mapui:gap-1.5">
          {CONTROL_LAYOUTS.map((layout) => (
            <label
              key={layout}
              className="mapui:flex mapui:cursor-pointer mapui:items-start mapui:gap-2 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-3 mapui:py-2 hover:mapui:bg-slate-50"
            >
              <input
                type="radio"
                name="controlLayout"
                value={layout}
                checked={value.controlLayout === layout}
                onChange={() => onChange({ ...value, controlLayout: layout })}
                className="mapui:mt-0.5"
              />
              <span className="mapui:flex mapui:flex-col mapui:gap-0.5">
                <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">
                  {LAYOUT_LABELS[layout].label}
                </span>
                <span className="mapui:text-xs mapui:text-slate-500">
                  {LAYOUT_LABELS[layout].description}
                </span>
              </span>
            </label>
          ))}
        </div>
        {(value.controlLayout === 'side-menu' || value.controlLayout === 'auto') && (
          <div className="mapui:mt-2 mapui:flex mapui:items-center mapui:gap-2">
            <span className="mapui:text-xs mapui:text-slate-600">Menu button position:</span>
            <select
              value={value.sideMenuToggleCorner ?? 'top-right'}
              onChange={(e) => onChange({ ...value, sideMenuToggleCorner: e.target.value as ControlCorner })}
              aria-label="Menu button position"
              className="mapui:shrink-0 mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-1.5 mapui:py-1 mapui:text-xs mapui:text-slate-700 focus:mapui:border-blue-500 focus:mapui:outline-none"
            >
              {CONTROL_CORNERS.map((c) => (
                <option key={c} value={c}>
                  {CORNER_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        )}
      </CollapsibleSection>

      {/* Orderable controls */}
      <CollapsibleSection title="Control Stack Order">
        <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
          Drag or use arrows to set the display order of map controls.
        </p>
        <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-1.5 mapui:p-0">
          {controlOrder.map((key, index) => {
            const info = TOGGLE_INFO.get(key as keyof UIConfig);
            if (!info) return null;
            const isInfoControl = key === 'showInfoControl';
            const checked = isInfoControl ? (infoEnabled ?? false) : !!(value[key as keyof UIConfig]);

            if (key === 'showLegend' && value.controlLayout === 'side-menu') {
              return (
                <li
                  key={key}
                  className="mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2 mapui:py-1.5"
                >
                  <div className="mapui:flex mapui:min-w-0 mapui:flex-1 mapui:flex-col mapui:gap-0.5">
                    <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">{info.label}</span>
                    <span className="mapui:text-xs mapui:text-slate-500">Pinned to top of side menu in this layout.</span>
                  </div>
                  <Toggle
                    checked={checked}
                    onChange={(v) => handleToggle(key as keyof UIConfig, v)}
                    label={info.label}
                  />
                </li>
              );
            }

            const isDragged = draggedKey === key;
            const isDragOver = dragOverKey === key;

            return (
              <li
                key={key}
                draggable
                onDragStart={(e) => handleDragStart(e, key)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
                onDragEnd={handleDragEnd}
                className={[
                  'mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:transition-colors',
                  isDragOver ? 'mapui:border-blue-400 mapui:bg-blue-50' : 'mapui:border-slate-200',
                  isDragged ? 'mapui:opacity-50' : 'mapui:opacity-100',
                ].join(' ')}
              >
                <div className="mapui:flex mapui:shrink-0 mapui:flex-col mapui:gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move control up"
                    className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === controlOrder.length - 1}
                    aria-label="Move control down"
                    className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <span
                  className="mapui:shrink-0 mapui:cursor-grab mapui:text-slate-400 active:mapui:cursor-grabbing"
                  aria-hidden="true"
                >
                  ⠿
                </span>
                <div className="mapui:flex mapui:min-w-0 mapui:flex-1 mapui:flex-col mapui:gap-0.5">
                  <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">{info.label}</span>
                  <span className="mapui:text-xs mapui:text-slate-500">{info.description}</span>
                  {autoEnabled?.has(key as keyof UIConfig) && (
                    <span className="mapui:text-[10px] mapui:font-medium mapui:text-blue-500">Auto-enabled</span>
                  )}
                </div>
                <select
                  value={resolveControlCorner(value, key)}
                  onChange={(e) => handleCornerChange(key, e.target.value as ControlCorner)}
                  aria-label={`${info.label} position`}
                  className="mapui:shrink-0 mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-1.5 mapui:py-1 mapui:text-xs mapui:text-slate-700 focus:mapui:border-blue-500 focus:mapui:outline-none"
                >
                  {CONTROL_CORNERS.map((c) => (
                    <option key={c} value={c}>
                      {CORNER_LABELS[c]}
                    </option>
                  ))}
                </select>
                <div className="mapui:relative">
                  <button
                    type="button"
                    onClick={() =>
                      setIconPickerFor(iconPickerFor === key ? null : (key as OrderableControlKey))
                    }
                    aria-label={`${info.label} icon`}
                    title="Change icon"
                    className="mapui:flex mapui:h-7 mapui:w-7 mapui:shrink-0 mapui:cursor-pointer mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white hover:mapui:bg-slate-50"
                  >
                    {(() => {
                      const iconName = value.controlIcons?.[key as OrderableControlKey];
                      const Icon = iconName ? CONTROL_ICON_MAP[iconName] : null;
                      return Icon ? (
                        <Icon size={14} className="mapui:text-slate-700" />
                      ) : (
                        <span className="mapui:text-[10px] mapui:text-slate-500">icon</span>
                      );
                    })()}
                  </button>
                  {iconPickerFor === key && (
                    <div className="mapui:absolute mapui:right-0 mapui:top-8 mapui:z-10 mapui:w-48 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:p-2 mapui:shadow-lg">
                      <div className="mapui:mb-1 mapui:flex mapui:items-center mapui:justify-between">
                        <span className="mapui:text-[10px] mapui:font-semibold mapui:text-slate-600">
                          Pick an icon
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleIconChange(key as OrderableControlKey, '');
                            setIconPickerFor(null);
                          }}
                          className="mapui:cursor-pointer mapui:border-none mapui:bg-transparent mapui:text-[10px] mapui:text-blue-600 hover:mapui:underline"
                        >
                          reset
                        </button>
                      </div>
                      <div className="mapui:grid mapui:grid-cols-6 mapui:gap-1">
                        {CONTROL_ICON_NAMES.map((name) => {
                          const Icon = CONTROL_ICON_MAP[name];
                          const selected =
                            value.controlIcons?.[key as OrderableControlKey] === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                handleIconChange(key as OrderableControlKey, name);
                                setIconPickerFor(null);
                              }}
                              title={name}
                              className={`mapui:flex mapui:h-6 mapui:w-6 mapui:cursor-pointer mapui:items-center mapui:justify-center mapui:rounded mapui:border ${
                                selected
                                  ? 'mapui:border-blue-500 mapui:bg-blue-50'
                                  : 'mapui:border-slate-200 mapui:bg-white hover:mapui:bg-slate-50'
                              }`}
                            >
                              <Icon size={14} className="mapui:text-slate-700" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <Toggle
                  checked={checked}
                  onChange={(v) => isInfoControl ? onInfoEnabledChange?.(v) : handleToggle(key as keyof UIConfig, v)}
                  label={info.label}
                />
              </li>
            );
          })}
        </ul>
      </CollapsibleSection>

      {/* Non-orderable controls */}
      <CollapsibleSection title="Other Controls">
        <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
          These controls have fixed positions on the map.
        </p>
        <div className="mapui:grid mapui:grid-cols-1 mapui:gap-2 sm:mapui:grid-cols-2">
          {NON_ORDERABLE_TOGGLES.map(({ key, label, description }) => {
            const uiKey = key as keyof UIConfig;
            const checked = !!value[uiKey];
            return (
              <label
                key={key}
                className="mapui:flex mapui:cursor-pointer mapui:items-center mapui:justify-between mapui:gap-3 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-3 mapui:py-2 hover:mapui:bg-slate-50"
              >
                <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
                  <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">{label}</span>
                  <span className="mapui:text-xs mapui:text-slate-500">{description}</span>
                  {autoEnabled?.has(uiKey) && (
                    <span className="mapui:text-[10px] mapui:font-medium mapui:text-blue-500">Auto-enabled</span>
                  )}
                </div>
                <Toggle checked={checked} onChange={(v) => handleToggle(uiKey, v)} label={label} />
              </label>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Coordinate format */}
      {value.showCoordinateDisplay && (
        <CollapsibleSection title="Coordinate Format">
          <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
            Default display format for the cursor coordinate readout.
          </p>
          <select
            value={value.coordinateFormat}
            onChange={(e) =>
              onChange({
                ...value,
                coordinateFormat: e.target.value as UIConfig['coordinateFormat'],
              })
            }
            className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:text-sm mapui:text-slate-800 focus:mapui:border-blue-500 focus:mapui:outline-none"
          >
            {COORDINATE_FORMATS.map((format) => (
              <option key={format} value={format}>
                {COORDINATE_FORMAT_LABELS[format]}
              </option>
            ))}
          </select>
        </CollapsibleSection>
      )}

      {/* Default label font */}
      <CollapsibleSection title="Default Label Font">
        <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
          Default font for layer labels (symbol styles) that don't set their own Text Font.
          Per-style Text Font overrides in the Style Editor always take precedence. Custom
          names must exist on the active basemap's glyph server or labels will not render.
        </p>
        <div className="mapui:flex mapui:flex-col mapui:gap-2">
          <select
            value={showCustomFontInput ? CUSTOM_FONT_SENTINEL : (value.defaultLabelFont?.[0] ?? 'Open Sans Bold')}
            onChange={(e) => {
              const selected = e.target.value;
              if (selected === CUSTOM_FONT_SENTINEL) {
                setCustomFontMode(true);
                setCustomFontDraft((value.defaultLabelFont ?? []).join(', '));
                return;
              }
              setCustomFontMode(false);
              onChange({ ...value, defaultLabelFont: [selected] });
            }}
            className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:text-sm mapui:text-slate-800 focus:mapui:border-blue-500 focus:mapui:outline-none"
            aria-label="Default label font"
          >
            {LABEL_FONT_PRESETS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
            <option value={CUSTOM_FONT_SENTINEL}>Custom…</option>
          </select>
          {showCustomFontInput && (
            <FormField label="Custom font stack (comma-separated, first match wins)">
              <input
                type="text"
                value={customFontDraft}
                onChange={(e) => {
                  const text = e.target.value;
                  setCustomFontDraft(text);
                  const fonts = text
                    .split(',')
                    .map((f) => f.trim())
                    .filter(Boolean);
                  if (fonts.length > 0) {
                    onChange({ ...value, defaultLabelFont: fonts });
                  }
                }}
                placeholder="e.g. Noto Sans Bold, Open Sans Bold"
                className="mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-2 mapui:py-1.5 mapui:text-sm mapui:text-slate-800 focus:mapui:border-blue-500 focus:mapui:outline-none"
              />
            </FormField>
          )}
        </div>
      </CollapsibleSection>

      {/* Legend display (background, text, border colors) */}
      {value.showLegend && (
        <CollapsibleSection title="Legend Display">
          <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
            Override the legend panel's background, text, and border colors. Leave blank to keep defaults (white background, slate text, no border).
          </p>
          <div className="mapui:flex mapui:flex-col mapui:gap-3">
            <FormField label="Background color">
              <div className="mapui:flex mapui:items-center mapui:gap-2">
                <ColorPicker
                  value={value.legendDisplay?.background ?? '#ffffff'}
                  onChange={(background) =>
                    onChange({ ...value, legendDisplay: { ...value.legendDisplay, background } })
                  }
                  label="Legend background"
                />
                {value.legendDisplay?.background && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...value.legendDisplay };
                      delete next.background;
                      const cleared = Object.keys(next).length > 0 ? next : undefined;
                      onChange({ ...value, legendDisplay: cleared });
                    }}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:text-slate-500 hover:mapui:bg-slate-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </FormField>
            <FormField label="Text color">
              <div className="mapui:flex mapui:items-center mapui:gap-2">
                <ColorPicker
                  value={value.legendDisplay?.textColor ?? '#334155'}
                  onChange={(textColor) =>
                    onChange({ ...value, legendDisplay: { ...value.legendDisplay, textColor } })
                  }
                  label="Legend text color"
                />
                {value.legendDisplay?.textColor && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...value.legendDisplay };
                      delete next.textColor;
                      const cleared = Object.keys(next).length > 0 ? next : undefined;
                      onChange({ ...value, legendDisplay: cleared });
                    }}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:text-slate-500 hover:mapui:bg-slate-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </FormField>
            <FormField label="Border color">
              <div className="mapui:flex mapui:items-center mapui:gap-2">
                <ColorPicker
                  value={value.legendDisplay?.borderColor ?? '#e2e8f0'}
                  onChange={(borderColor) =>
                    onChange({ ...value, legendDisplay: { ...value.legendDisplay, borderColor } })
                  }
                  label="Legend border color"
                />
                {value.legendDisplay?.borderColor && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...value.legendDisplay };
                      delete next.borderColor;
                      const cleared = Object.keys(next).length > 0 ? next : undefined;
                      onChange({ ...value, legendDisplay: cleared });
                    }}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:text-slate-500 hover:mapui:bg-slate-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </FormField>
          </div>
        </CollapsibleSection>
      )}

      {/* Legend order */}
      {value.showLegend && legendLayerOptions.length > 0 && (
        <CollapsibleSection title="Legend Order">
          <p className="mapui:m-0 mapui:mb-2 mapui:text-xs mapui:text-slate-500">
            Set the display order of layers in the legend. Only layers with a legend configured are shown.
          </p>
          <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-1.5 mapui:p-0">
            {effectiveLegendOrder.map((layerId, index) => {
              const layer = legendLayerOptions.find((l) => l.id === layerId);
              if (!layer) return null;
              return (
                <li
                  key={layerId}
                  className="mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2 mapui:py-1.5"
                >
                  <div className="mapui:flex mapui:shrink-0 mapui:flex-col mapui:gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleLegendMoveUp(index)}
                      disabled={index === 0}
                      aria-label="Move legend entry up"
                      className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLegendMoveDown(index)}
                      disabled={index === effectiveLegendOrder.length - 1}
                      aria-label="Move legend entry down"
                      className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="mapui:text-sm mapui:text-slate-800">{layer.label}</span>
                </li>
              );
            })}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}

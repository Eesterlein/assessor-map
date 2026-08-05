import type { PropertyDisplayConfig, PropertyDisplayType, AvailableProperty } from '../../types';
import { PROPERTY_DISPLAY_TYPES } from '../../types';
import { sortedPropertyDisplayEntries } from '../../utils/propertyDisplay';
import { FormField } from '../admin/FormField';

export interface PropertyDisplayEditorProps {
  value: PropertyDisplayConfig;
  onChange: (config: PropertyDisplayConfig) => void;
  availableProperties?: AvailableProperty[];
}

export type PropertyEntry = {
  key: string;
  label: string;
  visible: boolean;
  type: PropertyDisplayType;
  linkText: string;
};

export function toEntries(config: PropertyDisplayConfig): PropertyEntry[] {
  return sortedPropertyDisplayEntries(config).map(([key, val]) => ({
    key,
    label: val.label ?? '',
    visible: val.visible ?? true,
    type: val.type ?? 'text',
    linkText: val.linkText ?? '',
  }));
}

export function fromEntries(entries: PropertyEntry[]): PropertyDisplayConfig {
  const result: PropertyDisplayConfig = {};
  entries.forEach((entry, index) => {
    result[entry.key] = {
      visible: entry.visible,
      order: index,
      ...(entry.label ? { label: entry.label } : {}),
      // 'text' is the semantic default — omit it (and linkText) from output so
      // legacy configs round-trip unchanged.
      ...(entry.type && entry.type !== 'text' ? { type: entry.type } : {}),
      ...(entry.type === 'link' && entry.linkText ? { linkText: entry.linkText } : {}),
    };
  });
  return result;
}

const TYPE_LABELS: Record<PropertyDisplayType, string> = {
  text: 'Text',
  link: 'Link (opens in new tab)',
};

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function PropertyDisplayEditor({ value, onChange, availableProperties }: PropertyDisplayEditorProps) {
  const entries = toEntries(value);
  const hasProperties = availableProperties && availableProperties.length > 0;

  const update = (updated: PropertyEntry[]) => onChange(fromEntries(updated));

  const handleAdd = () => {
    update([...entries, { key: '', label: '', visible: true, type: 'text', linkText: '' }]);
  };

  const handleRemove = (index: number) => {
    update(entries.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, patch: Partial<PropertyEntry>) => {
    update(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const handleKeyChange = (index: number, key: string) => {
    // Auto-fill label from property title when selecting from dropdown
    const matchingProp = availableProperties?.find((p) => p.name === key);
    const label = matchingProp?.title ?? entries[index].label;
    update(entries.map((e, i) => (i === index ? { ...e, key, label } : e)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...entries];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    update(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === entries.length - 1) return;
    const updated = [...entries];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    update(updated);
  };

  const handlePopulateAll = () => {
    if (!availableProperties) return;
    const newEntries: PropertyEntry[] = availableProperties.map((p) => ({
      key: p.name,
      label: p.title ?? '',
      visible: true,
      type: 'text',
      linkText: '',
    }));
    update(newEntries);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      {entries.length === 0 ? (
        <>
          <p className="mapui:m-0 mapui:text-sm mapui:text-slate-500">
            No property display rules configured. All properties will be shown.
          </p>
          {hasProperties && (
            <button
              type="button"
              onClick={handlePopulateAll}
              className="mapui:cursor-pointer mapui:self-start mapui:rounded mapui:border mapui:border-blue-300 mapui:bg-blue-50 mapui:px-3 mapui:py-1.5 mapui:text-sm mapui:text-blue-700 hover:mapui:bg-blue-100"
            >
              Populate from API metadata
            </button>
          )}
        </>
      ) : (
        <>
          <div className="mapui:grid mapui:items-center mapui:gap-2 mapui:px-8" style={{ gridTemplateColumns: '1fr 1fr auto auto' }}>
            <FormField label="Property Key"><span /></FormField>
            <FormField label="Display Label"><span /></FormField>
            <span className="mapui:text-xs mapui:font-medium mapui:text-slate-600">Type</span>
            <span className="mapui:text-xs mapui:font-medium mapui:text-slate-600">Visible</span>
          </div>

          <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-1.5 mapui:p-0">
            {entries.map((entry, index) => (
              <li key={index} className="mapui:flex mapui:items-center mapui:gap-1 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2 mapui:py-1.5">
                <div className="mapui:flex mapui:flex-col mapui:gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === entries.length - 1}
                    aria-label="Move down"
                    className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <div className="mapui:flex mapui:flex-1 mapui:flex-col mapui:gap-1.5">
                  <div className="mapui:grid mapui:items-center mapui:gap-2" style={{ gridTemplateColumns: '1fr 1fr auto auto auto' }}>
                    {hasProperties ? (
                      <select
                        value={entry.key}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                        aria-label="Property key"
                        className={inputClass}
                      >
                        <option value="">Select a property…</option>
                        {availableProperties.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.title ?? p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={entry.key}
                        onChange={(e) => handleChange(index, { key: e.target.value })}
                        placeholder="property_name"
                        aria-label="Property key"
                        className={inputClass}
                      />
                    )}
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(e) => handleChange(index, { label: e.target.value })}
                      placeholder="Friendly name"
                      aria-label="Display label"
                      className={inputClass}
                    />
                    <select
                      value={entry.type}
                      onChange={(e) => handleChange(index, { type: e.target.value as PropertyDisplayType })}
                      aria-label="Display type"
                      className={inputClass}
                    >
                      {PROPERTY_DISPLAY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="checkbox"
                      checked={entry.visible}
                      onChange={(e) => handleChange(index, { visible: e.target.checked })}
                      aria-label="Visible"
                      className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      aria-label="Remove property"
                      className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                  {entry.type === 'link' && (
                    <div className="mapui:flex mapui:items-center mapui:gap-2">
                      <input
                        type="text"
                        value={entry.linkText}
                        onChange={(e) => handleChange(index, { linkText: e.target.value })}
                        placeholder="Open ↗"
                        aria-label="Button text"
                        className={inputClass}
                      />
                      <span className="mapui:text-xs mapui:text-slate-500">
                        Rendered as a link only when the value is a valid http(s) URL; other values
                        show as plain text.
                      </span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-dashed mapui:border-slate-300 mapui:px-3 mapui:py-2 mapui:text-sm mapui:text-slate-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
      >
        + Add Property
      </button>
    </div>
  );
}

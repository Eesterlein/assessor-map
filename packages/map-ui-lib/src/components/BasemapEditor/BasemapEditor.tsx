import type { BasemapConfig } from '../../types';
import { FormField } from '../admin/FormField';

export interface BasemapEditorProps {
  value: BasemapConfig;
  onChange: (basemap: BasemapConfig) => void;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

export function BasemapEditor({ value, onChange }: BasemapEditorProps) {
  const update = (patch: Partial<BasemapConfig>) => onChange({ ...value, ...patch });

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="ID" required>
        <input
          type="text"
          value={value.id}
          onChange={(e) => update({ id: e.target.value })}
          placeholder="osm"
          className={inputClass}
        />
      </FormField>

      <FormField label="Label" required>
        <input
          type="text"
          value={value.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="OpenStreetMap"
          className={inputClass}
        />
      </FormField>

      <FormField label="Style URL" required>
        <input
          type="url"
          value={value.url}
          onChange={(e) => update({ url: e.target.value })}
          placeholder="https://example.com/style.json"
          className={inputClass}
        />
      </FormField>

      <FormField label="Thumbnail URL (optional)">
        <input
          type="url"
          value={value.thumbnail ?? ''}
          onChange={(e) => update({ thumbnail: e.target.value || undefined })}
          placeholder="https://example.com/thumbnail.png"
          className={inputClass}
        />
        {value.thumbnail && (
          <img
            src={value.thumbnail}
            alt="Thumbnail preview"
            className="mapui:mt-1 mapui:h-16 mapui:w-24 mapui:rounded mapui:border mapui:border-slate-200 mapui:object-cover"
          />
        )}
      </FormField>
    </div>
  );
}

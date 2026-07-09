import type { PropertyDisplayType } from '../../types';
import { isSafeHttpUrl } from '../../utils/propertyDisplay';

export type PropertyListDensity = 'compact' | 'default';

interface PropertyListProps {
  properties: Record<string, unknown>;
  fields?: string[];
  labels?: Record<string, string>;
  /** Per-field display type from resolvePropertyDisplay(); absent key === 'text'. */
  types?: Record<string, PropertyDisplayType>;
  /** Per-field anchor text for type: 'link' fields; falls back to "Open ↗". */
  linkText?: Record<string, string>;
  maxItems?: number;
  density?: PropertyListDensity;
  className?: string;
}

export function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatPropertyValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function PropertyList({
  properties,
  fields,
  labels,
  types,
  linkText,
  maxItems,
  density = 'default',
  className = '',
}: PropertyListProps) {
  const keys = fields ?? Object.keys(properties);
  const displayKeys = maxItems != null ? keys.slice(0, maxItems) : keys;

  // 'link' fields render as an anchor only when the raw value is a safe
  // http(s) URL; everything else falls back to the plain-text path so
  // unsafe/non-string values never become hrefs.
  const renderValue = (key: string, value: unknown) => {
    if (types?.[key] === 'link' && isSafeHttpUrl(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="mapui:text-blue-600 mapui:underline hover:mapui:text-blue-700"
        >
          {linkText?.[key] ?? 'Open ↗'}
        </a>
      );
    }
    return formatPropertyValue(value);
  };

  if (density === 'compact') {
    return (
      <dl className={`mapui:m-0 mapui:text-xs ${className}`.trim()}>
        {displayKeys.map((key) => (
          <div key={key} className="mapui:flex mapui:gap-1 mapui:py-0.5">
            <dt className="mapui:shrink-0 mapui:font-medium mapui:text-slate-500">{labels?.[key] ?? key}:</dt>
            <dd className="mapui:m-0 mapui:truncate mapui:text-slate-800">
              {renderValue(key, properties[key])}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      className={`mapui:m-0 mapui:grid mapui:grid-cols-2 mapui:gap-x-4 mapui:gap-y-2 mapui:text-sm ${className}`.trim()}
    >
      {displayKeys.map((key) => (
        <div key={key} className="mapui:contents">
          <dt className="mapui:break-words mapui:font-medium mapui:text-slate-500">{labels?.[key] ?? key}</dt>
          <dd className="mapui:m-0 mapui:break-words mapui:text-slate-800">
            {renderValue(key, properties[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

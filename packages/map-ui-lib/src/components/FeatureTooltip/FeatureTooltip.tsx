import type { PropertyDisplayType } from '../../types';
import { PropertyList } from '../_shared/PropertyList';

interface FeatureEntry {
  title?: string;
  properties: Record<string, unknown>;
  fields?: string[];
  labels?: Record<string, string>;
  types?: Record<string, PropertyDisplayType>;
  linkText?: Record<string, string>;
}

export interface FeatureTooltipProps {
  /** Single feature (legacy) */
  title?: string;
  properties?: Record<string, unknown> | null;
  fields?: string[];
  labels?: Record<string, string>;
  types?: Record<string, PropertyDisplayType>;
  linkText?: Record<string, string>;
  /** Multiple features — takes precedence over single-feature props */
  features?: FeatureEntry[];
  maxItems?: number;
  className?: string;
}

export function FeatureTooltip({
  title,
  properties,
  fields,
  labels,
  types,
  linkText,
  features,
  maxItems = 4,
  className = '',
}: FeatureTooltipProps) {
  // Normalise to array
  const entries: FeatureEntry[] =
    features && features.length > 0
      ? features
      : properties
        ? [{ title, properties, fields, labels, types, linkText }]
        : [];

  if (entries.length === 0) {
    return (
      <div
        className={`mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white/90 mapui:backdrop-blur-sm mapui:px-3 mapui:py-2 mapui:shadow-md ${className}`.trim()}
      >
        <p className="mapui:m-0 mapui:text-xs mapui:text-slate-400">No data</p>
      </div>
    );
  }

  return (
    <div
      className={`mapui:min-w-[140px] mapui:max-w-[240px] mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white/90 mapui:backdrop-blur-sm mapui:shadow-md ${className}`.trim()}
    >
      {entries.map((entry, i) => {
        const keys = entry.fields ?? Object.keys(entry.properties);
        const truncated = keys.length > maxItems;
        const extra = keys.length - maxItems;

        return (
          <div key={i} className={i > 0 ? 'mapui:border-t mapui:border-slate-200' : ''}>
            <div className="mapui:px-3 mapui:py-2">
              {entry.title && (
                <p className="mapui:mb-1.5 mapui:mt-0 mapui:text-xs mapui:font-semibold mapui:text-slate-700">
                  {entry.title}
                </p>
              )}
              <PropertyList
                properties={entry.properties}
                fields={entry.fields}
                labels={entry.labels}
                types={entry.types}
                linkText={entry.linkText}
                maxItems={maxItems}
                density="compact"
              />
              {truncated && (
                <p className="mapui:mb-0 mapui:mt-1 mapui:text-xs mapui:text-slate-400">
                  +{extra} more
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

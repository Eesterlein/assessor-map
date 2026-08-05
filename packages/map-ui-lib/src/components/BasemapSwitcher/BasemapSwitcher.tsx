import type { BasemapConfig } from '../../types';
import { resolveDisplayLabel } from '../../utils/labelUtils';

export interface BasemapSwitcherProps {
  basemaps: BasemapConfig[];
  activeBasemapId: string;
  onSelect: (basemapId: string) => void;
  className?: string;
}

export function BasemapSwitcher({
  basemaps,
  activeBasemapId,
  onSelect,
  className,
}: BasemapSwitcherProps) {
  return (
    <div
      className={`mapui:flex mapui:gap-2 mapui:flex-wrap ${className ?? ''}`}
      role="group"
      aria-label="Basemap selection"
    >
      {basemaps.map((basemap) => {
        const isActive = basemap.id === activeBasemapId;
        return (
          <button
            key={basemap.id}
            type="button"
            onClick={() => onSelect(basemap.id)}
            aria-pressed={isActive}
            className={`mapui:flex mapui:flex-col mapui:items-center mapui:gap-1 mapui:rounded-md mapui:border-2 mapui:px-3 mapui:py-2 mapui:text-sm mapui:font-medium mapui:cursor-pointer mapui:transition-colors ${
              isActive
                ? 'mapui:border-blue-500 mapui:bg-blue-50 mapui:text-blue-700'
                : 'mapui:border-slate-200 mapui:bg-white mapui:text-slate-700 hover:mapui:border-slate-300 hover:mapui:bg-slate-50'
            }`}
          >
            {basemap.thumbnail && (
              <img
                src={basemap.thumbnail}
                alt=""
                className="mapui:h-12 mapui:w-16 mapui:rounded mapui:object-cover"
              />
            )}
            <span>{resolveDisplayLabel(basemap)}</span>
          </button>
        );
      })}
    </div>
  );
}

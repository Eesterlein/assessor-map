import { useState } from 'react';
import type { ImageryLayerConfig } from '../../types';
import { resolveDisplayLabel } from '../../utils/labelUtils';

function ImageryThumbnail({ url, label }: { url?: string; label: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <span
        aria-hidden="true"
        className="mapui:flex mapui:h-8 mapui:w-8 mapui:flex-shrink-0 mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-slate-50 mapui:text-[10px] mapui:text-slate-400"
      >
        IMG
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={`${label} thumbnail`}
      className="mapui:h-8 mapui:w-8 mapui:flex-shrink-0 mapui:rounded mapui:border mapui:border-slate-200 mapui:object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export interface ImageryPanelProps {
  imageryLayers: ImageryLayerConfig[];
  onToggleVisibility: (layerId: string) => void;
  onOpacityChange?: (layerId: string, opacity: number) => void;
  className?: string;
  hideTitle?: boolean;
}

export function ImageryPanel({
  imageryLayers,
  onToggleVisibility,
  onOpacityChange,
  className = '',
  hideTitle,
}: ImageryPanelProps) {
  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-1 mapui:min-w-48 ${className}`.trim()}>
      {!hideTitle && (
        <h3 className="mapui:m-0 mapui:mb-2 mapui:text-sm mapui:font-semibold mapui:text-slate-700">
          Imagery
        </h3>
      )}
      <ul className="mapui:m-0 mapui:list-none mapui:p-0">
        {imageryLayers.map((layer) => (
          <li
            key={layer.id}
            className="mapui:flex mapui:flex-col mapui:gap-1 mapui:rounded mapui:px-2 mapui:py-1.5 mapui:transition-colors hover:mapui:bg-slate-100"
          >
            <label className="mapui:flex mapui:flex-1 mapui:cursor-pointer mapui:items-center mapui:gap-2 mapui:min-w-0">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => onToggleVisibility(layer.id)}
                className="mapui:h-4 mapui:w-4 mapui:cursor-pointer mapui:accent-slate-700"
              />
              <ImageryThumbnail url={layer.thumbnailUrl} label={resolveDisplayLabel(layer)} />
              <span className="mapui:flex-1 mapui:text-sm mapui:text-slate-800 mapui:truncate">
                {resolveDisplayLabel(layer)}
              </span>
              {layer.exclusive && (
                <span
                  className="mapui:text-xs mapui:text-slate-400"
                  title="Exclusive — enabling this disables other imagery layers"
                >
                  ●
                </span>
              )}
            </label>
            {onOpacityChange && layer.visible && (
              <div className="mapui:flex mapui:items-center mapui:gap-2 mapui:pl-6">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layer.opacity ?? 1}
                  onChange={(e) => onOpacityChange(layer.id, Number(e.target.value))}
                  className="mapui:h-1 mapui:w-full mapui:cursor-pointer mapui:accent-slate-700"
                />
                <span className="mapui:text-xs mapui:text-slate-500 mapui:w-8 mapui:text-right">
                  {Math.round((layer.opacity ?? 1) * 100)}%
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { MapConfig, LayerConfig, ImageryLayerConfig } from '@techtraverse/map-ui-lib';
import { MapPreview } from '../components/MapPreview';
import { normalizeInitialView } from '../utils/viewConfig';

export function ConfigPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<MapConfig | null>(null);
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [imageryLayers, setImageryLayers] = useState<ImageryLayerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/configs/${id}`)
      .then(res => res.json())
      .then((data: { config?: MapConfig }) => {
        if (data.config) {
          setConfig(data.config);
          setLayers(data.config.layers ?? []);
          setImageryLayers(data.config.imageryLayers ?? []);
        }
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mapui:flex mapui:items-center mapui:justify-center mapui:h-[calc(100vh-4rem)] mapui:text-slate-500">
        Loading...
      </div>
    );
  }

  if (error) return <div className="mapui:p-8 mapui:text-red-600">{error}</div>;
  if (!config) return <div className="mapui:p-8 mapui:text-slate-500">Map not found.</div>;

  return (
    <div className="mapui:flex mapui:flex-col mapui:h-[calc(100vh-4rem)]">
      <div className="mapui:px-4 mapui:py-2 mapui:border-b mapui:border-slate-200 mapui:flex mapui:items-center mapui:gap-3 mapui:bg-white mapui:shrink-0">
        <Link to="/configs" className="mapui:text-blue-600 mapui:hover:underline mapui:text-sm">
          ← Back to Maps
        </Link>
      </div>
      <div className="mapui:flex-1 mapui:min-h-0">
        <MapPreview
          sources={config.sources ?? []}
          layers={layers}
          imageryLayers={imageryLayers}
          basemaps={config.basemaps ?? []}
          viewState={normalizeInitialView(config.initialView)}
          onLayersChange={setLayers}
          onImageryLayersChange={setImageryLayers}
          currentStep="preview"
          uiConfig={config.ui}
          info={config.info}
          globalSearch={config.globalSearch}
        />
      </div>
    </div>
  );
}

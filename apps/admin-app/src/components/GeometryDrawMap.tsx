/**
 * Draw / edit a single geometry on a MapLibre map using terra-draw. This is the
 * app-side, framework-bound counterpart to the lib's framework-agnostic
 * `GeometryEditor`: it is injected into that editor's `mapSlot` and stays
 * controlled — `geometry` in, `onChange(geometry)` out.
 *
 * terra-draw lives ONLY in the app (never the lib) per the framework-agnostic
 * rule. It draws simple Point/LineString/Polygon/Rectangle features; the server
 * coerces a drawn single geometry up to the collection's Multi type on write.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import {
  TerraDraw,
  TerraDrawPointMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import bbox from '@turf/bbox';
import type { IconType } from 'react-icons';
import {
  LuMapPin,
  LuSpline,
  LuHexagon,
  LuSquare,
  LuMousePointer2,
  LuTrash2,
  LuCheck,
} from 'react-icons/lu';
import {
  featuresToGeometry,
  geometryToDrawFeatures,
  defaultDrawMode,
  type DrawMode,
} from '../utils/geometryDraw';

const POSITRON = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

type ToolMode = DrawMode | 'rectangle' | 'select';

export interface GeometryDrawMapProps {
  geometry: GeoJSON.Geometry | null;
  onChange: (geometry: GeoJSON.Geometry | null) => void;
  geometryType?: string;
  height?: number;
}

const TOOLS: Array<{ id: ToolMode; label: string; Icon: IconType }> = [
  { id: 'point', label: 'Point', Icon: LuMapPin },
  { id: 'linestring', label: 'Line', Icon: LuSpline },
  { id: 'polygon', label: 'Polygon', Icon: LuHexagon },
  { id: 'rectangle', label: 'Box', Icon: LuSquare },
  { id: 'select', label: 'Edit', Icon: LuMousePointer2 },
];

/** Stable structural key so we can ignore prop echoes of our own emissions. */
function geomKey(g: GeoJSON.Geometry | null): string {
  return g ? JSON.stringify(g) : '';
}

export function GeometryDrawMap({
  geometry,
  onChange,
  geometryType,
  height = 320,
}: GeometryDrawMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Tracks the last geometry we emitted so the external-sync effect can skip
  // re-seeding the map with a geometry that originated from the map itself.
  const lastEmittedRef = useRef<string>('');
  const seededRef = useRef(false);

  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [ready, setReady] = useState(false);

  const seedGeometry = useCallback((g: GeoJSON.Geometry | null) => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    const features = geometryToDrawFeatures(g, 'editing-feature');
    if (features.length > 0) {
      try {
        // geometryToDrawFeatures only yields Point/LineString/Polygon features
        // (Multi*/GeometryCollection → []) — exactly terra-draw's accepted store
        // geometries; the generic GeoJSON.Feature type is just wider than its
        // GeoJSONStoreFeatures parameter.
        draw.addFeatures(features as unknown as Parameters<typeof draw.addFeatures>[0]);
      } catch {
        // terra-draw rejects geometries it can't represent — leave the map
        // empty and let the user redraw; WKT/coords tabs still hold the value.
      }
    }
  }, []);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || drawRef.current) return;

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: map as unknown as maplibregl.Map }),
      modes: [
        new TerraDrawPointMode(),
        new TerraDrawLineStringMode(),
        new TerraDrawPolygonMode(),
        new TerraDrawRectangleMode(),
        new TerraDrawSelectMode({
          flags: {
            point: { feature: { draggable: true } },
            linestring: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
            polygon: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
            rectangle: {
              feature: {
                draggable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
          },
        }),
      ],
    });
    draw.start();
    draw.setMode('select');

    const emit = () => {
      const g = featuresToGeometry(draw.getSnapshot() as GeoJSON.Feature[]);
      lastEmittedRef.current = geomKey(g);
      onChangeRef.current(g);
    };
    // A single-geometry editor: when a new feature finishes, drop any earlier
    // one so the store only ever holds the geometry we emit.
    draw.on('finish', () => {
      const snapshot = draw.getSnapshot() as GeoJSON.Feature[];
      if (snapshot.length > 1) {
        const keepId = snapshot[snapshot.length - 1].id;
        draw.removeFeatures(
          snapshot.filter((f) => f.id !== keepId).map((f) => f.id as string),
        );
      }
      emit();
    });
    draw.on('change', (_ids, type) => {
      // 'provisional' fires mid-draw on every vertex; only emit on committed edits.
      if (type === 'finish' || type === 'commit') emit();
    });

    drawRef.current = draw;
    setReady(true);
  }, []);

  // Seed initial geometry once the draw instance is ready.
  useEffect(() => {
    if (!ready || seededRef.current) return;
    seededRef.current = true;
    if (geometry) {
      lastEmittedRef.current = geomKey(geometry);
      seedGeometry(geometry);
      // Fit the map to the seeded geometry.
      try {
        const [minX, minY, maxX, maxY] = bbox(geometry as GeoJSON.Geometry);
        mapRef.current?.fitBounds(
          [
            [minX, minY],
            [maxX, maxY],
          ],
          { padding: 40, duration: 0, maxZoom: 16 },
        );
      } catch {
        /* ignore un-fittable geometry */
      }
    }
  }, [ready, geometry, seedGeometry]);

  // Reflect external geometry changes (WKT / Coordinates tabs) into the map,
  // skipping echoes of geometry the map itself just emitted.
  useEffect(() => {
    if (!ready) return;
    if (geomKey(geometry) === lastEmittedRef.current) return;
    lastEmittedRef.current = geomKey(geometry);
    seedGeometry(geometry);
  }, [ready, geometry, seedGeometry]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      try {
        drawRef.current?.stop();
      } catch {
        /* noop */
      }
      drawRef.current = null;
    };
  }, []);

  const selectTool = (tool: ToolMode) => {
    setActiveTool(tool);
    drawRef.current?.setMode(tool);
  };

  const clearAll = () => {
    drawRef.current?.clear();
    lastEmittedRef.current = '';
    onChange(null);
  };

  const hasGeometry = geometry != null;

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      <div className="mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-2">
        {/* Segmented tool control */}
        <div className="mapui:inline-flex mapui:items-center mapui:gap-0.5 mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-slate-50 mapui:p-0.5">
          {TOOLS.map((t) => {
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTool(t.id)}
                aria-pressed={active}
                title={t.label}
                className={`mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-md mapui:px-2.5 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:transition-colors ${
                  active
                    ? 'mapui:bg-white mapui:text-blue-700 mapui:shadow-sm mapui:ring-1 mapui:ring-slate-200'
                    : 'mapui:text-slate-600 mapui:hover:text-slate-900'
                }`}
              >
                <t.Icon className="mapui:h-3.5 mapui:w-3.5" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>

        <span
          className={`mapui:inline-flex mapui:items-center mapui:gap-1 mapui:rounded-full mapui:px-2 mapui:py-0.5 mapui:text-[11px] mapui:font-medium ${
            hasGeometry
              ? 'mapui:bg-green-50 mapui:text-green-700'
              : 'mapui:bg-slate-100 mapui:text-slate-500'
          }`}
        >
          {hasGeometry && <LuCheck className="mapui:h-3 mapui:w-3" aria-hidden />}
          {hasGeometry ? 'Geometry set' : 'No geometry'}
        </span>

        <button
          type="button"
          onClick={clearAll}
          disabled={!hasGeometry}
          className="mapui:ml-auto mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:rounded-md mapui:px-2.5 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:text-slate-500 mapui:transition-colors mapui:hover:bg-red-50 mapui:hover:text-red-600 mapui:disabled:cursor-not-allowed mapui:disabled:opacity-40 mapui:disabled:hover:bg-transparent mapui:disabled:hover:text-slate-500"
        >
          <LuTrash2 className="mapui:h-3.5 mapui:w-3.5" aria-hidden />
          Clear
        </button>
      </div>

      <div
        className="mapui:overflow-hidden mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:shadow-sm"
        style={{ height }}
      >
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={POSITRON}
          initialViewState={{ longitude: -98, latitude: 39, zoom: 3 }}
          onLoad={handleLoad}
          attributionControl={false}
          // The draw default tool reflects the collection's declared type so the
          // toolbar starts sensibly even though we boot in 'select' mode.
          data-default-mode={defaultDrawMode(geometryType)}
        />
      </div>
    </div>
  );
}

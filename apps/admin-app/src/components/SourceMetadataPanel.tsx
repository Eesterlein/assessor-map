import { Fragment, useState } from 'react';
import { CollapsibleSection } from '@techtraverse/map-ui-lib';
import { detectTileSourceType } from '@techtraverse/map-ui-lib/utils';
import type { InspectionResult, QueryableMeta } from '../../server/inspect.js';

export type { InspectionResult };

interface SourceMetadataPanelProps {
  metadata: InspectionResult | null;
  metadataUpdatedAt: string | null;
  sourceUrl?: string;
  onRefresh: () => void;
  refreshing: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBbox(bbox: number[]): string {
  if (bbox.length < 4) return bbox.join(', ');
  return `${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)} to ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}`;
}

function groupConformance(uris: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const uri of uris) {
    // Extract category from OGC conformance URIs like
    // http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core
    const match = uri.match(/ogcapi-([^/]+)/i);
    const category = match ? `OGC API - ${match[1].replace(/-/g, ' ')}` : 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push(uri);
  }
  return groups;
}

function QueryablesTable({ queryables }: { queryables: QueryableMeta[] }) {
  const hasTitle = queryables.some(q => q.title);
  const hasValues = queryables.some(q => q.enum || q.minimum !== undefined || q.maximum !== undefined);

  return (
    <table className="mapui:w-full mapui:text-xs">
      <thead>
        <tr className="mapui:text-left mapui:text-slate-500">
          <th className="mapui:py-1 mapui:pr-3 mapui:font-medium">Property</th>
          <th className="mapui:py-1 mapui:pr-3 mapui:font-medium">Type</th>
          {hasTitle && <th className="mapui:py-1 mapui:pr-3 mapui:font-medium">Title</th>}
          {hasValues && <th className="mapui:py-1 mapui:font-medium">Values</th>}
        </tr>
      </thead>
      <tbody className="mapui:divide-y mapui:divide-slate-100">
        {queryables.map(q => (
          <tr key={q.name}>
            <td className="mapui:py-1 mapui:pr-3 mapui:font-mono mapui:text-slate-800">{q.name}</td>
            <td className="mapui:py-1 mapui:pr-3 mapui:text-slate-600">
              {q.type}{q.format ? ` (${q.format})` : ''}
            </td>
            {hasTitle && <td className="mapui:py-1 mapui:pr-3 mapui:text-slate-600">{q.title ?? '—'}</td>}
            {hasValues && (
              <td className="mapui:py-1 mapui:text-slate-600">
                {q.enum ? q.enum.join(', ') : q.minimum !== undefined || q.maximum !== undefined
                  ? `${q.minimum ?? '—'} to ${q.maximum ?? '—'}`
                  : '—'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SourceMetadataPanel({ metadata, metadataUpdatedAt, sourceUrl, onRefresh, refreshing }: SourceMetadataPanelProps) {
  const sourceType = sourceUrl ? detectTileSourceType(sourceUrl) : null;
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!metadata) {
    return (
      <div className="mapui:px-6 mapui:py-4 mapui:bg-slate-50">
        <div className="mapui:flex mapui:items-center mapui:justify-between">
          <span className="mapui:text-sm mapui:text-slate-500">No metadata available</span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="mapui:text-sm mapui:text-blue-600 mapui:hover:text-blue-800 mapui:disabled:opacity-50"
          >
            {refreshing ? 'Inspecting...' : 'Inspect Source'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mapui:px-6 mapui:py-4 mapui:bg-slate-50 mapui:space-y-4">
      {/* Header */}
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <span className="mapui:text-xs mapui:text-slate-500">
          Last inspected: {metadataUpdatedAt ? formatTimeAgo(metadataUpdatedAt) : 'unknown'}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="mapui:inline-flex mapui:items-center mapui:gap-1.5 mapui:text-sm mapui:text-blue-600 mapui:hover:text-blue-800 mapui:disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? 'mapui:animate-spin' : ''}
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh Metadata'}
        </button>
      </div>

      {/* Top-level errors */}
      {metadata.errors.length > 0 && (
        <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:px-3 mapui:py-2">
          <p className="mapui:text-xs mapui:font-medium mapui:text-red-800 mapui:mb-1">Errors during inspection:</p>
          <ul className="mapui:list-disc mapui:list-inside mapui:text-xs mapui:text-red-700 mapui:space-y-0.5">
            {metadata.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* API Info */}
      {metadata.landing && (metadata.landing.title || metadata.landing.description) && (
        <div className="mapui:rounded mapui:bg-blue-50 mapui:border mapui:border-blue-200 mapui:px-3 mapui:py-2">
          {metadata.landing.title && (
            <p className="mapui:text-sm mapui:font-medium mapui:text-blue-900">{metadata.landing.title}</p>
          )}
          {metadata.landing.description && (
            <p className="mapui:text-xs mapui:text-blue-700 mapui:mt-0.5">{metadata.landing.description}</p>
          )}
        </div>
      )}

      {/* Conformance */}
      {metadata.conformance && metadata.conformance.length > 0 && (
        <CollapsibleSection title="Conformance Classes" badge={metadata.conformance.length}>
          {(() => {
            const groups = groupConformance(metadata.conformance);
            return (
              <div className="mapui:space-y-3">
                {Object.entries(groups).map(([category, uris]) => (
                  <div key={category}>
                    <p className="mapui:text-xs mapui:font-medium mapui:text-slate-600 mapui:mb-1">{category}</p>
                    <ul className="mapui:space-y-0.5">
                      {uris.map(uri => (
                        <li key={uri} className="mapui:text-xs mapui:text-slate-500 mapui:font-mono mapui:break-all">
                          {uri}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </CollapsibleSection>
      )}
      {metadata.conformanceError && (
        <div className="mapui:text-xs mapui:text-yellow-700 mapui:bg-yellow-50 mapui:border mapui:border-yellow-200 mapui:rounded mapui:px-3 mapui:py-2">
          Conformance check failed: {metadata.conformanceError}
        </div>
      )}

      {/* TileJSON Metadata (for non-OGC tile sources) */}
      {metadata.tileJson && (
        <CollapsibleSection title="TileJSON" defaultOpen={true}>
          <div className="mapui:space-y-2 mapui:text-xs">
            <div className="mapui:grid mapui:grid-cols-[auto_1fr] mapui:gap-x-3 mapui:gap-y-1">
              {metadata.tileJson.minzoom != null && (
                <>
                  <span className="mapui:text-slate-500 mapui:font-medium">Zoom Range</span>
                  <span className="mapui:text-slate-800">{metadata.tileJson.minzoom} – {metadata.tileJson.maxzoom ?? '?'}</span>
                </>
              )}
              {metadata.tileJson.bounds && (
                <>
                  <span className="mapui:text-slate-500 mapui:font-medium">Bounds</span>
                  <span className="mapui:text-slate-800">{formatBbox(metadata.tileJson.bounds)}</span>
                </>
              )}
              {metadata.tileJson.tilejson && (
                <>
                  <span className="mapui:text-slate-500 mapui:font-medium">TileJSON Version</span>
                  <span className="mapui:text-slate-800">{metadata.tileJson.tilejson}</span>
                </>
              )}
            </div>
            {metadata.tileJson.tiles.length > 0 && (
              <div>
                <span className="mapui:text-slate-500 mapui:font-medium">Tile URLs</span>
                <ul className="mapui:mt-1 mapui:space-y-0.5">
                  {metadata.tileJson.tiles.map((url, i) => (
                    <li key={i} className="mapui:text-slate-600 mapui:font-mono mapui:break-all">{url}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* ArcGIS cached MapServer metadata */}
      {metadata.arcgis && (
        <CollapsibleSection title="ArcGIS Tiled MapServer" defaultOpen={true}>
          <div className="mapui:space-y-2 mapui:text-xs">
            <p className="mapui:text-slate-600">
              This source is an ArcGIS cached MapServer, served as raster tiles. It does not
              expose OGC API collections.
            </p>
            <div className="mapui:grid mapui:grid-cols-[auto_1fr] mapui:gap-x-3 mapui:gap-y-1">
              <span className="mapui:text-slate-500 mapui:font-medium">Zoom Range</span>
              <span className="mapui:text-slate-800">
                {metadata.arcgis.minZoom} – {metadata.arcgis.maxZoom}
              </span>
              <span className="mapui:text-slate-500 mapui:font-medium">Tile Size</span>
              <span className="mapui:text-slate-800">{metadata.arcgis.tileSize}px</span>
              <span className="mapui:text-slate-500 mapui:font-medium">URL Template</span>
              <span className="mapui:text-slate-800 mapui:font-mono mapui:break-all">
                {metadata.arcgis.tileUrlTemplate}
              </span>
              {metadata.arcgis.attribution && (
                <>
                  <span className="mapui:text-slate-500 mapui:font-medium">Attribution</span>
                  <span className="mapui:text-slate-800">{metadata.arcgis.attribution}</span>
                </>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* XYZ Tile Server info (for direct tile URL sources) */}
      {!metadata.tileJson && sourceType === 'xyz' && (
        <CollapsibleSection title="XYZ Tile Server" defaultOpen={true}>
          <div className="mapui:space-y-2 mapui:text-xs">
            <p className="mapui:text-slate-600">
              This source provides raster tiles directly via a URL template. It does not expose OGC API collections.
            </p>
            <div className="mapui:grid mapui:grid-cols-[auto_1fr] mapui:gap-x-3 mapui:gap-y-1">
              <span className="mapui:text-slate-500 mapui:font-medium">Type</span>
              <span className="mapui:text-slate-800">XYZ Tile URL</span>
              <span className="mapui:text-slate-500 mapui:font-medium">URL Template</span>
              <span className="mapui:text-slate-800 mapui:font-mono mapui:break-all">{sourceUrl}</span>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Collections (for OGC API sources) */}
      {!metadata.tileJson && !metadata.arcgis && sourceType !== 'xyz' && sourceType !== 'arcgis' && (
      <CollapsibleSection
        title="Collections"
        defaultOpen={true}
        badge={metadata.collections.length}
      >
        {metadata.collections.length === 0 ? (
          <p className="mapui:text-xs mapui:text-slate-500">No collections found.</p>
        ) : (
          <div className="mapui:overflow-x-auto">
            <table className="mapui:w-full mapui:text-sm">
              <thead>
                <tr className="mapui:text-left mapui:text-slate-500 mapui:text-xs">
                  <th className="mapui:py-2 mapui:pr-3 mapui:font-medium"></th>
                  <th className="mapui:py-2 mapui:pr-3 mapui:font-medium">Collection</th>
                  <th className="mapui:py-2 mapui:pr-3 mapui:font-medium">Items</th>
                  <th className="mapui:py-2 mapui:pr-3 mapui:font-medium">Extent</th>
                  <th className="mapui:py-2 mapui:font-medium">Properties</th>
                </tr>
              </thead>
              <tbody className="mapui:divide-y mapui:divide-slate-100">
                {metadata.collections.map(col => (
                  <Fragment key={col.id}>
                    <tr
                      className="mapui:hover:bg-slate-100 mapui:cursor-pointer"
                      onClick={() => toggleCollection(col.id)}
                    >
                      <td className="mapui:py-2 mapui:pr-1 mapui:w-6">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`mapui:text-slate-400 mapui:transition-transform ${expandedCollections.has(col.id) ? 'mapui:rotate-90' : ''}`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </td>
                      <td className="mapui:py-2 mapui:pr-3">
                        <div>
                          <span className="mapui:font-medium mapui:text-slate-800 mapui:text-xs">{col.title ?? col.id}</span>
                          {col.title && col.title !== col.id && (
                            <span className="mapui:text-slate-400 mapui:text-xs mapui:ml-1 mapui:font-mono">({col.id})</span>
                          )}
                        </div>
                        {col.description && (
                          <p className="mapui:text-xs mapui:text-slate-500 mapui:mt-0.5 mapui:line-clamp-1">{col.description}</p>
                        )}
                      </td>
                      <td className="mapui:py-2 mapui:pr-3 mapui:text-xs mapui:text-slate-600 mapui:whitespace-nowrap">
                        {col.itemCount !== null ? col.itemCount.toLocaleString() : (
                          col.itemCountError ? (
                            <span className="mapui:text-yellow-600" title={col.itemCountError}>N/A</span>
                          ) : '—'
                        )}
                      </td>
                      <td className="mapui:py-2 mapui:pr-3 mapui:text-xs mapui:text-slate-600">
                        {col.extent?.spatial?.bbox?.[0] ? formatBbox(col.extent.spatial.bbox[0]) : '—'}
                      </td>
                      <td className="mapui:py-2 mapui:text-xs mapui:text-slate-600">
                        {col.queryables ? col.queryables.length : (
                          col.queryablesError ? (
                            <span className="mapui:text-yellow-600" title={col.queryablesError}>N/A</span>
                          ) : '—'
                        )}
                      </td>
                    </tr>
                    {expandedCollections.has(col.id) && (
                      <tr key={`${col.id}-detail`}>
                        <td></td>
                        <td colSpan={4} className="mapui:py-3 mapui:pr-3">
                          {col.queryables && col.queryables.length > 0 ? (
                            <QueryablesTable queryables={col.queryables} />
                          ) : col.queryablesError ? (
                            <p className="mapui:text-xs mapui:text-yellow-700">
                              Could not fetch queryables: {col.queryablesError}
                            </p>
                          ) : (
                            <p className="mapui:text-xs mapui:text-slate-500">No queryable properties available.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>
      )}
    </div>
  );
}

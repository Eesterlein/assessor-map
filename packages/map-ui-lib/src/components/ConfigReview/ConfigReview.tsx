import { safeValidateMapConfig } from '../../schemas/config';
import { resolveDisplayLabel } from '../../utils/labelUtils';
import type {
  MapConfig,
  LayerConfig,
  StyleConfig,
  LegendEntry,
  UIConfig,
} from '../../types';

export interface ConfigReviewProps {
  config: MapConfig;
  name?: string;
  description?: string;
  /** Jump back to a wizard step. Step keys match the wizard's WizardStep values. */
  onEditSection?: (step: string) => void;
}

// --- Human-readable label maps ---

const UI_CONTROL_LABELS: Record<string, string> = {
  showLayerPanel: 'Layer panel',
  showLegend: 'Legend',
  showBasemapSwitcher: 'Basemap switcher',
  showSearchPanel: 'Search panel',
  showCoordinateDisplay: 'Coordinates',
  showFeatureDetail: 'Feature detail',
  showFeatureTooltip: 'Feature tooltip',
  showExportButton: 'Export',
  showExportPdf: 'Export as PDF',
  showLegendOpacity: 'Legend opacity',
  showMeasureTool: 'Measure tool',
  showSelectionTool: 'Selection tool',
  showImageryPanel: 'Imagery panel',
  showCompass: 'Compass',
  showGlobalSearch: 'Global search',
  showScaleBar: 'Scale bar',
};

const COORDINATE_FORMAT_LABELS: Record<string, string> = {
  'decimal-degrees': 'Decimal degrees',
  ddm: 'Degrees decimal minutes',
  dms: 'Degrees minutes seconds',
};

const STYLE_TYPE_LABELS: Record<string, string> = {
  fill: 'Fill',
  line: 'Line',
  circle: 'Circle',
  symbol: 'Symbol',
};

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Pull a layer's primary swatch color from its first style, if it's a plain color (not an expression). */
function primaryStyleColor(style: StyleConfig | undefined): string | null {
  if (!style) return null;
  const paint = style.paint as Record<string, unknown>;
  const key =
    style.type === 'fill'
      ? 'fill-color'
      : style.type === 'line'
        ? 'line-color'
        : style.type === 'circle'
          ? 'circle-color'
          : 'text-color';
  const value = paint?.[key];
  return typeof value === 'string' ? value : null;
}

function legendSwatchShape(style: StyleConfig | undefined): SwatchShape {
  switch (style?.type) {
    case 'line':
      return 'line';
    case 'circle':
      return 'circle';
    default:
      return 'square';
  }
}

// --- Primitive presentational pieces ---

type SwatchShape = 'circle' | 'line' | 'square' | 'outline-square' | 'outline-circle';

function Swatch({
  color,
  shape = 'square',
  outlineColor,
}: {
  color: string;
  shape?: SwatchShape;
  outlineColor?: string;
}) {
  const base = 'mapui:inline-block mapui:shrink-0';
  if (shape === 'line') {
    return (
      <span
        className={`${base} mapui:h-0.5 mapui:w-4 mapui:rounded-full mapui:align-middle`}
        style={{ backgroundColor: color }}
      />
    );
  }
  const round = shape === 'circle' || shape === 'outline-circle' ? 'mapui:rounded-full' : 'mapui:rounded-sm';
  const isOutline = shape === 'outline-square' || shape === 'outline-circle';
  return (
    <span
      className={`${base} mapui:h-3.5 mapui:w-3.5 mapui:align-middle ${round}`}
      style={
        isOutline
          ? { border: `2px solid ${outlineColor || color}`, backgroundColor: 'transparent' }
          : { backgroundColor: color }
      }
    />
  );
}

function Chip({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'blue' | 'green' }) {
  const tones: Record<string, string> = {
    slate: 'mapui:bg-slate-100 mapui:text-slate-600',
    blue: 'mapui:bg-blue-100 mapui:text-blue-700',
    green: 'mapui:bg-emerald-100 mapui:text-emerald-700',
  };
  return (
    <span
      className={`mapui:inline-flex mapui:items-center mapui:gap-1 mapui:rounded-full mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mapui:flex mapui:items-start mapui:justify-between mapui:gap-4 mapui:py-1.5">
      <dt className="mapui:shrink-0 mapui:text-xs mapui:font-medium mapui:uppercase mapui:tracking-wide mapui:text-slate-400">
        {label}
      </dt>
      <dd className="mapui:m-0 mapui:text-right mapui:text-sm mapui:text-slate-700">{children}</dd>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="mapui:font-mono mapui:text-xs mapui:text-slate-600">{children}</span>;
}

interface SectionCardProps {
  title: string;
  accent: string; // full mapui: border-l color class
  eyebrow: string; // full mapui: text color class
  count?: number;
  step?: string;
  onEditSection?: (step: string) => void;
  children: React.ReactNode;
}

function SectionCard({ title, accent, eyebrow, count, step, onEditSection, children }: SectionCardProps) {
  return (
    <section
      className={`mapui:overflow-hidden mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:border-l-4 ${accent} mapui:bg-white`}
    >
      <header className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-3 mapui:px-4 mapui:pt-3">
        <h3 className="mapui:m-0 mapui:flex mapui:items-center mapui:gap-2">
          <span className={`mapui:text-xs mapui:font-bold mapui:uppercase mapui:tracking-widest ${eyebrow}`}>
            {title}
          </span>
          {count !== undefined && (
            <span className="mapui:rounded-full mapui:bg-slate-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-semibold mapui:text-slate-500">
              {count}
            </span>
          )}
        </h3>
        {step && onEditSection && (
          <button
            type="button"
            onClick={() => onEditSection(step)}
            className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:font-medium mapui:text-blue-600 hover:mapui:text-blue-800 hover:mapui:underline"
          >
            Edit →
          </button>
        )}
      </header>
      <div className="mapui:px-4 mapui:pb-4 mapui:pt-2">{children}</div>
    </section>
  );
}

// --- Section renderers ---

function LayerRow({ layer }: { layer: LayerConfig }) {
  const style = layer.styles?.[0];
  const color = primaryStyleColor(style);
  const legendCount = layer.legend?.entries.length ?? 0;
  return (
    <li className="mapui:flex mapui:flex-col mapui:gap-1 mapui:border-b mapui:border-slate-100 mapui:py-2 last:mapui:border-b-0">
      <div className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-3">
        <span className="mapui:flex mapui:items-center mapui:gap-2">
          {color ? (
            <Swatch color={color} shape={legendSwatchShape(style)} />
          ) : style ? (
            <Chip tone="blue">data-driven</Chip>
          ) : null}
          <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">{layer.label || layer.id}</span>
        </span>
        <Chip tone={layer.visible ? 'green' : 'slate'}>{layer.visible ? 'shown' : 'hidden'}</Chip>
      </div>
      <div className="mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-x-3 mapui:gap-y-1 mapui:pl-5 mapui:text-xs mapui:text-slate-500">
        <Mono>{layer.collection}</Mono>
        <span>·</span>
        <span>{layer.dataMode}</span>
        {style && (
          <>
            <span>·</span>
            <span>{STYLE_TYPE_LABELS[style.type] ?? style.type}</span>
          </>
        )}
        {(layer.minZoom != null || layer.maxZoom != null) && (
          <>
            <span>·</span>
            <span>
              zoom {layer.minZoom ?? 0}–{layer.maxZoom ?? 24}
            </span>
          </>
        )}
        {legendCount > 0 && (
          <>
            <span>·</span>
            <span className="mapui:inline-flex mapui:items-center mapui:gap-1">
              legend {legendCount}
              {layer.legend!.entries.slice(0, 4).map((e: LegendEntry, i) => (
                <Swatch key={i} color={e.color} shape={(e.shape as SwatchShape) ?? 'square'} outlineColor={e.outlineColor} />
              ))}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

function searchFieldSummary(layer: LayerConfig): string | null {
  const fields = layer.search?.fields;
  if (!fields || fields.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const f of fields) counts[f.type] = (counts[f.type] ?? 0) + 1;
  return Object.entries(counts)
    .map(([type, n]) => `${n} ${type}`)
    .join(', ');
}

export function ConfigReview({ config, name, description, onEditSection }: ConfigReviewProps) {
  const valid = safeValidateMapConfig(config).success;
  const { branding, info, basemaps, imageryLayers, layers, sources, ui, initialView, globalSearch } = config;

  const layersWithSearch = layers.filter(
    (l) => l.search?.fields?.length || l.propertyDisplay || l.cql2Filter,
  );
  const enabledControls = (Object.keys(UI_CONTROL_LABELS) as (keyof UIConfig)[]).filter((k) => ui?.[k]);

  return (
    <div className="mapui:space-y-3">
      {/* Overview header */}
      <div className="mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-gradient-to-br mapui:from-slate-50 mapui:to-white mapui:p-5">
        <div className="mapui:flex mapui:items-start mapui:justify-between mapui:gap-4">
          <div className="mapui:min-w-0">
            <h2 className="mapui:m-0 mapui:truncate mapui:text-2xl mapui:font-bold mapui:tracking-tight mapui:text-slate-900">
              {name || 'Untitled map'}
            </h2>
            {description && <p className="mapui:m-0 mapui:mt-1 mapui:text-sm mapui:text-slate-500">{description}</p>}
          </div>
          <span
            className={`mapui:inline-flex mapui:shrink-0 mapui:items-center mapui:gap-1.5 mapui:rounded-full mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-semibold ${
              valid ? 'mapui:bg-emerald-100 mapui:text-emerald-800' : 'mapui:bg-red-100 mapui:text-red-800'
            }`}
          >
            <span className={`mapui:h-1.5 mapui:w-1.5 mapui:rounded-full ${valid ? 'mapui:bg-emerald-500' : 'mapui:bg-red-500'}`} />
            {valid ? 'Valid' : 'Invalid'}
          </span>
        </div>
        <div className="mapui:mt-4 mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-x-5 mapui:gap-y-1 mapui:border-t mapui:border-slate-200 mapui:pt-3 mapui:text-sm mapui:text-slate-600">
          {[
            [layers.length, 'layers'],
            [basemaps.length, 'basemaps'],
            [sources.length, 'sources'],
            ...(imageryLayers?.length ? ([[imageryLayers.length, 'imagery']] as [number, string][]) : []),
          ].map(([n, label]) => (
            <span key={label as string}>
              <span className="mapui:font-bold mapui:text-slate-900">{n}</span> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Metadata & Branding */}
      <SectionCard
        title="Metadata & branding"
        accent="mapui:border-l-blue-400"
        eyebrow="mapui:text-blue-500"
        step="metadata"
        onEditSection={onEditSection}
      >
        <dl className="mapui:m-0 mapui:divide-y mapui:divide-slate-100">
          <Row label="Name">{name || <span className="mapui:text-slate-400">(not set)</span>}</Row>
          {description && <Row label="Description">{description}</Row>}
          {branding?.headerTitle && <Row label="Header title">{branding.headerTitle}</Row>}
          {branding?.headerColor && (
            <Row label="Header color">
              <span className="mapui:inline-flex mapui:items-center mapui:gap-2">
                <Swatch color={branding.headerColor} />
                <Mono>{branding.headerColor}</Mono>
              </span>
            </Row>
          )}
          {branding?.browserTitle && <Row label="Browser title">{branding.browserTitle}</Row>}
          {branding?.logoDataUrl && (
            <Row label="Logo">
              <img
                src={branding.logoDataUrl}
                alt="Logo"
                className="mapui:inline-block mapui:max-h-8 mapui:rounded mapui:border mapui:border-slate-200"
              />
            </Row>
          )}
          {branding?.faviconDataUrl && (
            <Row label="Favicon">
              <img src={branding.faviconDataUrl} alt="Favicon" className="mapui:inline-block mapui:h-4 mapui:w-4" />
            </Row>
          )}
        </dl>
      </SectionCard>

      {/* Info panel */}
      <SectionCard
        title="Info panel"
        accent="mapui:border-l-violet-400"
        eyebrow="mapui:text-violet-500"
        step="info"
        onEditSection={onEditSection}
      >
        {info?.enabled ? (
          <dl className="mapui:m-0 mapui:divide-y mapui:divide-slate-100">
            <Row label="Status">
              <Chip tone="green">Enabled</Chip>
            </Row>
            <Row label="Position">{titleCase(info.position ?? 'top-right')}</Row>
            {info.title && <Row label="Title">{info.title}</Row>}
            {info.markdown && (
              <Row label="Content">
                <span className="mapui:block mapui:max-w-xs mapui:whitespace-pre-wrap mapui:text-left mapui:text-slate-500">
                  {info.markdown.slice(0, 200)}
                  {info.markdown.length > 200 ? '…' : ''}
                </span>
              </Row>
            )}
          </dl>
        ) : (
          <p className="mapui:m-0 mapui:text-sm mapui:text-slate-400">Disabled</p>
        )}
      </SectionCard>

      {/* Basemaps */}
      <SectionCard
        title="Basemaps"
        accent="mapui:border-l-emerald-400"
        eyebrow="mapui:text-emerald-500"
        count={basemaps.length}
        step="basemaps"
        onEditSection={onEditSection}
      >
        <ul className="mapui:m-0 mapui:flex mapui:flex-wrap mapui:gap-2 mapui:p-0">
          {basemaps.map((b) => (
            <li
              key={b.id}
              className="mapui:flex mapui:items-center mapui:gap-2 mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-slate-50 mapui:px-2 mapui:py-1"
            >
              {b.thumbnail && (
                <img src={b.thumbnail} alt="" className="mapui:h-6 mapui:w-6 mapui:rounded mapui:object-cover" />
              )}
              <span className="mapui:text-sm mapui:text-slate-700">{resolveDisplayLabel(b)}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Imagery */}
      {imageryLayers && imageryLayers.length > 0 && (
        <SectionCard
          title="Imagery"
          accent="mapui:border-l-cyan-400"
          eyebrow="mapui:text-cyan-500"
          count={imageryLayers.length}
          step="imagery"
          onEditSection={onEditSection}
        >
          <ul className="mapui:m-0 mapui:list-none mapui:space-y-2 mapui:p-0">
            {imageryLayers.map((img) => (
              <li key={img.id} className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-3">
                <span className="mapui:flex mapui:items-center mapui:gap-2">
                  {img.thumbnailUrl && (
                    <img src={img.thumbnailUrl} alt="" className="mapui:h-6 mapui:w-6 mapui:rounded mapui:object-cover" />
                  )}
                  <span className="mapui:text-sm mapui:text-slate-700">{resolveDisplayLabel(img)}</span>
                  {img.exclusive && <Chip>exclusive</Chip>}
                </span>
                <span className="mapui:text-xs mapui:text-slate-500">{Math.round((img.opacity ?? 1) * 100)}%</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Layers */}
      <SectionCard
        title="Layers"
        accent="mapui:border-l-indigo-400"
        eyebrow="mapui:text-indigo-500"
        count={layers.length}
        step="layers"
        onEditSection={onEditSection}
      >
        {layers.length > 0 ? (
          <ul className="mapui:m-0 mapui:list-none mapui:p-0">
            {layers.map((l) => (
              <LayerRow key={l.id} layer={l} />
            ))}
          </ul>
        ) : (
          <p className="mapui:m-0 mapui:text-sm mapui:text-slate-400">No feature layers configured.</p>
        )}
      </SectionCard>

      {/* Search & Display */}
      {(layersWithSearch.length > 0 || globalSearch) && (
        <SectionCard
          title="Search & display"
          accent="mapui:border-l-amber-400"
          eyebrow="mapui:text-amber-500"
          step="search-display"
          onEditSection={onEditSection}
        >
          <div className="mapui:space-y-3">
            {layersWithSearch.length > 0 && (
              <ul className="mapui:m-0 mapui:list-none mapui:space-y-2 mapui:p-0">
                {layersWithSearch.map((l) => {
                  const search = searchFieldSummary(l);
                  const propCount = l.propertyDisplay ? Object.keys(l.propertyDisplay).length : 0;
                  return (
                    <li key={l.id} className="mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-2 mapui:text-sm">
                      <span className="mapui:font-medium mapui:text-slate-700">{l.label || l.id}</span>
                      {search && <Chip>search: {search}</Chip>}
                      {propCount > 0 && <Chip>{propCount} display fields</Chip>}
                      {l.cql2Filter && <Chip tone="blue">CQL2 base filter</Chip>}
                    </li>
                  );
                })}
              </ul>
            )}
            {globalSearch && (
              <div className="mapui:rounded mapui:border mapui:border-slate-100 mapui:bg-slate-50 mapui:p-3">
                <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:font-semibold mapui:uppercase mapui:tracking-wide mapui:text-slate-400">
                  Global search
                </p>
                <div className="mapui:flex mapui:flex-wrap mapui:items-center mapui:gap-2 mapui:text-sm mapui:text-slate-600">
                  <Chip tone={globalSearch.enabled === false ? 'slate' : 'green'}>
                    {globalSearch.enabled === false ? 'disabled' : 'enabled'}
                  </Chip>
                  {globalSearch.position && <span>{titleCase(globalSearch.position)}</span>}
                  {globalSearch.width && <span>· width {globalSearch.width}</span>}
                  {globalSearch.layers && <span>· {globalSearch.layers.length} layers</span>}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* UI controls */}
      <SectionCard
        title="UI controls"
        accent="mapui:border-l-rose-400"
        eyebrow="mapui:text-rose-500"
        step="ui"
        onEditSection={onEditSection}
      >
        {enabledControls.length > 0 ? (
          <div className="mapui:mb-3 mapui:flex mapui:flex-wrap mapui:gap-1.5">
            {enabledControls.map((k) => (
              <Chip key={k} tone="blue">
                {UI_CONTROL_LABELS[k]}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="mapui:m-0 mapui:mb-2 mapui:text-sm mapui:text-slate-400">No controls enabled.</p>
        )}
        <dl className="mapui:m-0 mapui:divide-y mapui:divide-slate-100">
          {ui?.controlLayout && <Row label="Layout">{titleCase(ui.controlLayout)}</Row>}
          {ui?.coordinateFormat && (
            <Row label="Coordinates">{COORDINATE_FORMAT_LABELS[ui.coordinateFormat] ?? ui.coordinateFormat}</Row>
          )}
          {ui?.defaultLabelFont?.length ? (
            <Row label="Label font">{ui.defaultLabelFont.join(', ')}</Row>
          ) : null}
        </dl>
      </SectionCard>

      {/* Initial view */}
      <SectionCard
        title="Initial view"
        accent="mapui:border-l-teal-400"
        eyebrow="mapui:text-teal-500"
        step="view"
        onEditSection={onEditSection}
      >
        <dl className="mapui:m-0 mapui:divide-y mapui:divide-slate-100">
          <Row label="Center">
            <Mono>
              {initialView.latitude.toFixed(4)}, {initialView.longitude.toFixed(4)}
            </Mono>
          </Row>
          <Row label="Zoom">
            <Mono>{initialView.zoom}</Mono>
          </Row>
          {!!initialView.pitch && (
            <Row label="Pitch">
              <Mono>{initialView.pitch}°</Mono>
            </Row>
          )}
          {!!initialView.bearing && (
            <Row label="Bearing">
              <Mono>{initialView.bearing}°</Mono>
            </Row>
          )}
          {(initialView.minZoom != null || initialView.maxZoom != null) && (
            <Row label="Zoom range">
              <Mono>
                {initialView.minZoom ?? 0}–{initialView.maxZoom ?? 24}
              </Mono>
            </Row>
          )}
        </dl>
      </SectionCard>
    </div>
  );
}

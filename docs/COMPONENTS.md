# Component API Reference

All components are fully controlled — no internal state for data. The library exports two categories of components:

- **Map UI Components** (9): Consumer-facing UI overlays for interactive maps.
- **Admin/Editor Components** (13+): Configuration editors used by the `admin-app` app and any custom admin interfaces.

Import them individually by sub-path to enable tree-shaking:

```ts
import { LayerPanel }           from '@techtraverse/map-ui-lib/components/LayerPanel';
import { Legend }               from '@techtraverse/map-ui-lib/components/Legend';
import { BasemapSwitcher }      from '@techtraverse/map-ui-lib/components/BasemapSwitcher';
import { CollapsibleControl }   from '@techtraverse/map-ui-lib/components/CollapsibleControl';
import { CoordinateDisplay }    from '@techtraverse/map-ui-lib/components/CoordinateDisplay';
import { SearchPanel }          from '@techtraverse/map-ui-lib/components/SearchPanel';
import { FeatureDetailPanel }   from '@techtraverse/map-ui-lib/components/FeatureDetailPanel';
import { FeatureTooltip }       from '@techtraverse/map-ui-lib/components/FeatureTooltip';
import { ExportButton }         from '@techtraverse/map-ui-lib/components/ExportButton';
```

---

## LayerPanel

A list of layers with visibility checkboxes and optional drag-to-reorder.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers to display |
| `activeLayerIds` | `string[]` | Yes | IDs of currently visible layers |
| `onToggleVisibility` | `(layerId: string) => void` | Yes | Called when a layer checkbox is toggled |
| `onReorder` | `(layerIds: string[]) => void` | No | Called with new layer order after drag-drop. Omit to disable drag handles |
| `className` | `string` | No | Additional CSS classes for the container |

### Behavior

- Each layer renders as a checkbox item.
- When `onReorder` is provided, a drag handle (⠿) appears and items become draggable.
- Drop target highlights with a blue background during drag-over.
- The dragged item fades to 50% opacity.

### Example

```tsx
import { useState } from 'react';
import { LayerPanel } from '@techtraverse/map-ui-lib/components/LayerPanel';

function App() {
  const [layers, setLayers] = useState(mapConfig.layers);
  const [visibleIds, setVisibleIds] = useState(['countries', 'cities']);

  const handleToggle = (id: string) =>
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleReorder = (newIds: string[]) =>
    setLayers((prev) => newIds.map((id) => prev.find((l) => l.id === id)!));

  return (
    <LayerPanel
      layers={layers}
      activeLayerIds={visibleIds}
      onToggleVisibility={handleToggle}
      onReorder={handleReorder}
    />
  );
}
```

---

## Legend

Displays a legend for visible layers, auto-derived from layer styles when no explicit `legend` config is set.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers (only visible ones are shown) |
| `visibleLayerIds` | `string[]` | Yes | IDs of layers to include in the legend |
| `onOpacityChange` | `(layerId: string, opacity: number) => void` | No | When provided, adds an expand/collapse button and per-layer opacity sliders |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Renders `null` when no visible layers have an explicit `legend` config set.
- Supports three display modes controlled by `LegendConfig.displayMode`:
  - **`simple`** (default): Shows a color swatch per entry, or a sub-list when multiple entries.
  - **`categorical`**: Shows a segmented color bar with a collapsible full entry list.
  - **`gradient`**: Shows a smooth color ramp with min/max labels when expanded.
- When `onOpacityChange` is provided, an expand/collapse icon appears in the legend header. Expanding reveals per-layer opacity range sliders (0–100%).

### Example

```tsx
import { Legend } from '@techtraverse/map-ui-lib/components/Legend';

<Legend
  layers={mapConfig.layers}
  visibleLayerIds={['countries', 'rivers']}
  onOpacityChange={(layerId, opacity) => updateLayerOpacity(layerId, opacity)}
/>
```

---

## BasemapSwitcher

A button group for selecting the active basemap. Supports optional thumbnail images.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `basemaps` | `BasemapConfig[]` | Yes | Available basemap options |
| `activeBasemapId` | `string` | Yes | ID of the currently selected basemap |
| `onSelect` | `(basemapId: string) => void` | Yes | Called when a basemap button is clicked |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Active basemap button is highlighted in blue; inactive buttons have a gray border.
- When `BasemapConfig.thumbnail` is set, a 64×48px image is shown above the label.
- Uses `aria-pressed` for accessibility.

### Example

```tsx
import { useState } from 'react';
import { BasemapSwitcher } from '@techtraverse/map-ui-lib/components/BasemapSwitcher';

function App() {
  const [activeBasemap, setActiveBasemap] = useState('carto-positron');

  return (
    <BasemapSwitcher
      basemaps={mapConfig.basemaps}
      activeBasemapId={activeBasemap}
      onSelect={setActiveBasemap}
    />
  );
}
```

---

## CollapsibleControl

A wrapper that collapses any content into a compact icon button. Designed as an overlay control for maps.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `icon` | `React.ComponentType<{ size?: number; className?: string }>` | Yes | Icon shown when collapsed (and in the panel header) |
| `label` | `string` | Yes | Accessible label (tooltip and aria-label) |
| `children` | `React.ReactNode` | Yes | Content rendered when expanded |
| `defaultCollapsed` | `boolean` | No (default `true`) | Initial state in uncontrolled mode |
| `collapsed` | `boolean` | No | Controlled collapsed state |
| `onToggle` | `(collapsed: boolean) => void` | No | Callback for controlled mode |
| `className` | `string` | No | Additional CSS classes for the 40×40px container |

### Controlled vs. Uncontrolled

- **Uncontrolled** (default): Pass only `defaultCollapsed`. State is managed internally.
- **Controlled**: Pass both `collapsed` and `onToggle`. Component syncs to your state.

### Layout

- The container is always 40×40px to prevent layout shift.
- The expanded panel floats to the left (`right: 100%`) with a 2px gap.
- A close (×) button is shown in the panel header.

### Example

```tsx
import { LuLayers3 } from 'react-icons/lu';
import { CollapsibleControl } from '@techtraverse/map-ui-lib/components/CollapsibleControl';
import { LayerPanel } from '@techtraverse/map-ui-lib/components/LayerPanel';

<CollapsibleControl icon={LuLayers3} label="Layers">
  <LayerPanel
    layers={mapConfig.layers}
    activeLayerIds={visibleIds}
    onToggleVisibility={handleToggle}
  />
</CollapsibleControl>
```

---

## CoordinateDisplay

Shows mouse cursor coordinates with a cycling format selector.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `latitude` | `number \| null` | Yes | Current latitude (null shows `—`) |
| `longitude` | `number \| null` | Yes | Current longitude |
| `formats` | `CoordinateFormatOption[]` | Yes | List of available format options |
| `activeFormat` | `string` | Yes | ID of the currently active format |
| `onFormatChange` | `(formatId: string) => void` | Yes | Called with the next format ID on click |
| `className` | `string` | No | Additional CSS classes |

### CoordinateFormatOption

```ts
interface CoordinateFormatOption {
  id: string;
  label: string;
  format: (lat: number, lng: number) => string;
}
```

### Built-in Formatters

Both formatters are exported from the component module:

```ts
import {
  formatDecimal,
  formatDMS,
} from '@techtraverse/map-ui-lib/components/CoordinateDisplay';
```

| Function | Output example |
|---|---|
| `formatDecimal(lat, lng)` | `51.505152, -0.091254` |
| `formatDMS(lat, lng)` | `51°30'18.5"N 0°5'28.5"W` |

### Behavior

- Clicking the format label cycles to the next format in the `formats` array.
- When `latitude` or `longitude` is `null`, coordinates are shown as `—`.

### Example

```tsx
import { useState } from 'react';
import {
  CoordinateDisplay,
  formatDecimal,
  formatDMS,
} from '@techtraverse/map-ui-lib/components/CoordinateDisplay';

const formats = [
  { id: 'decimal', label: 'DD',  format: formatDecimal },
  { id: 'dms',     label: 'DMS', format: formatDMS },
];

function App() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeFormat, setActiveFormat] = useState('decimal');

  // Wire setCoords to your map's mousemove event

  return (
    <CoordinateDisplay
      latitude={coords?.lat ?? null}
      longitude={coords?.lng ?? null}
      formats={formats}
      activeFormat={activeFormat}
      onFormatChange={setActiveFormat}
    />
  );
}
```

---

## SearchPanel

Renders search/filter fields for all layers that have a `search` config. Supports text, number, datetime, and select field types with autocomplete, sliders, and range pickers.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers (only those with `search.fields` are shown) |
| `activeFilters` | `Record<string, SearchFilterValues>` | Yes | Current filter state, keyed by layer ID |
| `onFilterChange` | `(layerId: string, property: string, value: SearchFilterValue) => void` | Yes | Called on each field change |
| `onClearFilters` | `(layerId: string) => void` | Yes | Called when the "Clear" button is clicked for a layer |
| `autocompleteSuggestions` | `Record<string, string[]>` | No | Suggestions keyed by `"layerId:property"`, passed through to autocomplete fields |
| `onFetchSuggestions` | `(layerId: string, property: string, query: string) => void` | No | Called when an autocomplete field queries for suggestions |
| `hideTitle` | `boolean` | No | Hide the "Search & Filter" heading |
| `className` | `string` | No | Additional CSS classes |

**`SearchFilterValue` and `SearchFilterValues`:**

```ts
type SearchFilterValue =
  | string                              // text, select, plain datetime
  | { start: string; end: string }      // datetime with range: true
  | { value: number; operator: string } // number with single comparison
  | { min: number; max: number }        // number with between operator
  | undefined;                          // field cleared

type SearchFilterValues = Record<string, SearchFilterValue>;
```

### Behavior

- Only layers with at least one `search.fields` entry are rendered.
- Text fields with `autocomplete: true` render an `AutocompleteInput` that calls `onFetchSuggestions` as the user types.
- Number fields render a `NumberInput` supporting slider and between modes.
- Datetime fields with `range: true` render start/end pickers via `DateRangeInput`.
- A "Clear" button appears per layer when any filter is active.
- Renders a placeholder message when no searchable layers are configured.

### Example

```tsx
import { useState, useCallback, useMemo } from 'react';
import { SearchPanel } from '@techtraverse/map-ui-lib/components/SearchPanel';
import { fromStructuredFilters } from '@techtraverse/map-ui-lib/hooks';
import type { SearchFilterValues, SearchFilterValue } from '@techtraverse/map-ui-lib/types';

function App() {
  const [filters, setFilters] = useState<Record<string, SearchFilterValues>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});

  const handleChange = (layerId: string, property: string, value: SearchFilterValue) =>
    setFilters((prev) => ({
      ...prev,
      [layerId]: { ...prev[layerId], [property]: value },
    }));

  const handleClear = (layerId: string) =>
    setFilters((prev) => ({ ...prev, [layerId]: {} }));

  // Convert to CQL2 for a specific layer
  const layer = mapConfig.layers[0];
  const cql2 = useMemo(
    () => fromStructuredFilters(filters[layer.id] ?? {}, layer.search?.fields ?? []),
    [filters, layer]
  );

  return (
    <SearchPanel
      layers={mapConfig.layers}
      activeFilters={filters}
      onFilterChange={handleChange}
      onClearFilters={handleClear}
      autocompleteSuggestions={suggestions}
      onFetchSuggestions={(layerId, property, query) => {
        // See SEARCH-INTEGRATION.md for debounced fetchDistinctValues pattern
      }}
    />
  );
}
```

---

## FeatureDetailPanel

Displays properties for a selected map feature. Supports an inline panel variant and a full-screen modal variant.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | Whether the panel/modal is visible |
| `onClose` | `() => void` | Yes | Called when the close button (or modal backdrop) is clicked |
| `properties` | `Record<string, unknown> \| null` | Yes | Feature properties to display |
| `title` | `string` | No (default `'Feature Properties'`) | Panel header text |
| `fields` | `string[]` | No | Subset of property keys to display; shows all keys if omitted |
| `types` | `Record<string, PropertyDisplayType>` | No | Per-field display type from `resolvePropertyDisplay()`; a key's absence means `'text'` |
| `linkText` | `Record<string, string>` | No | Per-field anchor text for `type: 'link'` fields (defaults to "Open ↗") |
| `variant` | `'panel' \| 'modal'` | No (default `'panel'`) | Inline panel or full-screen modal |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Returns `null` when `isOpen` is `false`.
- **Panel variant**: inline container, `w-72`, scrollable up to `calc(100vh - 4rem)`.
- **Modal variant**: full-screen backdrop (`bg-black/40`); clicking the backdrop calls `onClose`; clicking inside the panel stops propagation.
- Uses `PropertyList` internally to render key–value pairs.
- Fields with `types[key] === 'link'` render as `<a target="_blank" rel="noopener noreferrer">` when the value is a safe http(s) URL; any other value falls back to plain text.
- Shows "No properties available." when `properties` is `null` or empty.

### Example

```tsx
import { useState } from 'react';
import { FeatureDetailPanel } from '@techtraverse/map-ui-lib/components/FeatureDetailPanel';

function App() {
  const [selectedFeature, setSelectedFeature] = useState<Record<string, unknown> | null>(null);

  return (
    <FeatureDetailPanel
      isOpen={selectedFeature !== null}
      onClose={() => setSelectedFeature(null)}
      properties={selectedFeature}
      title="Feature Properties"
      variant="panel"
    />
  );
}
```

---

## FeatureTooltip

A compact tooltip that shows a preview of feature properties. The caller is responsible for positioning.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | No | Optional title shown above the property list |
| `properties` | `Record<string, unknown> \| null` | Yes | Feature properties to display |
| `fields` | `string[]` | No | Subset of property keys to display; shows all keys if omitted |
| `types` | `Record<string, PropertyDisplayType>` | No | Per-field display type from `resolvePropertyDisplay()`; a key's absence means `'text'` |
| `linkText` | `Record<string, string>` | No | Per-field anchor text for `type: 'link'` fields (defaults to "Open ↗") |
| `maxItems` | `number` | No (default `4`) | Max number of properties shown before truncation |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- Shows "No data" when `properties` is `null`.
- Truncates to `maxItems` fields with a "+N more" indicator when there are additional properties.
- Uses compact density for the property list.
- Fields with `types[key] === 'link'` render as `<a target="_blank" rel="noopener noreferrer">` when the value is a safe http(s) URL; any other value falls back to plain text.
- No internal positioning — place it absolutely relative to cursor or map feature using CSS.

### Example

```tsx
import { FeatureTooltip } from '@techtraverse/map-ui-lib/components/FeatureTooltip';

function MapTooltip({ x, y, feature }) {
  return (
    <div style={{ position: 'absolute', left: x + 12, top: y - 8, pointerEvents: 'none' }}>
      <FeatureTooltip
        title={feature.properties?.name}
        properties={feature.properties}
        maxItems={4}
      />
    </div>
  );
}
```

---

## ExportButton

A button (or dropdown for multiple layers) that triggers CSV export of layer data.

### ExportableLayer

```ts
interface ExportableLayer {
  id: string;
  label: string;
  collection: string;
}
```

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `ExportableLayer[]` | Yes | Layers available for export |
| `onExport` | `(layer: ExportableLayer) => void` | Yes | Called when a layer is selected for export |
| `loading` | `boolean` | No (default `false`) | Shows "Exporting..." and disables the button |
| `disabled` | `boolean` | No (default `false`) | Disables the button |
| `className` | `string` | No | Additional CSS classes |

### Behavior

- **Single layer**: renders a simple button labeled "Export {label}".
- **Multiple layers**: renders a dropdown with a layer list. Click outside closes the dropdown.
- Disabled when `disabled || loading || layers.length === 0`.
- While `loading`, the button text changes to "Exporting..." and the button becomes non-interactive.

### Example

```tsx
import { ExportButton } from '@techtraverse/map-ui-lib/components/ExportButton';
import { useCsvExport } from '@techtraverse/map-ui-lib/hooks';

function App() {
  const { exportCsv, loading } = useCsvExport({ baseUrl: 'http://localhost:8001' });

  const exportableLayers = [
    { id: 'countries', label: 'Countries', collection: 'public.ne_110m_admin_0_countries' },
    { id: 'cities',    label: 'Cities',    collection: 'public.ne_110m_populated_places' },
  ];

  return (
    <ExportButton
      layers={exportableLayers}
      onExport={(layer) => exportCsv(layer.collection, `${layer.label}.csv`)}
      loading={loading}
    />
  );
}
```

---

# Admin / Editor Components

These components are used by the `admin-app` app to build a visual config wizard for `MapConfig`. They are exported from the main components entry point and can be used to build custom admin interfaces.

Import via the main components sub-path:

```ts
import { SourceEditor, LayerEditor, StyleEditor, ... } from '@techtraverse/map-ui-lib/components/...';
// or from the main entry:
import { SourceEditor } from '@techtraverse/map-ui-lib';
```

All admin components are fully controlled (value + onChange pattern).

---

## SourceEditor / SourceList

Edits a single `OgcApiSource` entry. `SourceList` renders a list of sources with add/remove controls.

### SourceEditor Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `OgcApiSource` | Yes | The source being edited |
| `onChange` | `(source: OgcApiSource) => void` | Yes | Called on any field change |
| `onTestConnection` | `(url: string) => void` | No | Called when the user tests connectivity |
| `testStatus` | `'idle' \| 'loading' \| 'success' \| 'error'` | No | Displays connection test result |
| `testError` | `string` | No | Error message shown when `testStatus` is `'error'` |

### SourceList Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `sources` | `OgcApiSource[]` | Yes | All sources |
| `onAdd` | `() => void` | Yes | Called when the user clicks "Add Source" |
| `onRemove` | `(id: string) => void` | Yes | Called when the user removes a source |
| `onChange` | `(source: OgcApiSource) => void` | Yes | Called when a source field changes |

---

## StyleEditor

Configures the visual style for a layer (`fill`, `line`, `circle`, or `symbol`). Includes a live preview swatch, data-driven color editors, and 70+ MapLibre paint/layout properties organized in collapsible property groups.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `StyleConfig` | Yes | Current style config |
| `onChange` | `(style: StyleConfig) => void` | Yes | Called on any style change |
| `suggestedType` | `'fill' \| 'line' \| 'circle' \| 'symbol' \| null` | No | Geometry-based hint (legacy scalar; prefer `suggestedTypes`) |
| `suggestedTypes` | `StyleConfig['type'][]` | No | Geometry-based hints shown as a banner with quick-switch buttons |
| `availableIcons` | `string[]` | No | Icon names from loaded sprites, shown in the icon picker |
| `availableProperties` | `AvailableProperty[]` | No | Collection properties used to populate data-driven color editors |
| `onFetchDistinctValues` | `(property: string) => Promise<string[]>` | No | Called to load distinct values for a property when building categorical expressions |

### Behavior

- **Type selector**: Dropdown to switch between fill, line, circle, and symbol.
- **Symbol mode** (symbol only): Toggle between Text, Icon, and Both sub-modes. Switching cleans up irrelevant paint/layout keys.
- **Live preview**: A small swatch above the property groups reflects the current style.
- **Property groups**: Paint and layout properties are organized in collapsible accordion groups (e.g., Appearance, Stroke, Placement).
- **"fx" toggle**: On color properties, clicking the `fx` button opens a `DataDrivenColorEditor` to build `match` (categorical) or `interpolate` (gradient) expressions using `availableProperties` and `onFetchDistinctValues`.

---

## LayerEditor / LayerList

Full-featured layer editor managing all `LayerConfig` fields.

### LayerEditor Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `LayerConfig` | Yes | The layer being edited |
| `onChange` | `(layer: LayerConfig) => void` | Yes | Called on any field change |
| `availableSources` | `OgcApiSource[]` | Yes | Sources the user can select from |

### LayerList Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `layers` | `LayerConfig[]` | Yes | All layers |
| `availableSources` | `OgcApiSource[]` | Yes | Sources available for selection |
| `onAdd` | `() => void` | Yes | Called when the user adds a layer |
| `onRemove` | `(id: string) => void` | Yes | Called when the user removes a layer |
| `onChange` | `(layer: LayerConfig) => void` | Yes | Called when a layer field changes |

---

## LegendEditor / LegendEntryEditor

Manages `LegendConfig` entries for a layer.

### LegendEditor Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `LegendConfig \| undefined` | Yes | Current legend config (`undefined` = auto-derive from style) |
| `onChange` | `(legend: LegendConfig \| undefined) => void` | Yes | Called on change; passes `undefined` to reset to auto-derive |
| `style` | `StyleConfig` | No | When provided, enables a "Generate from Style" button that auto-populates entries from the style's color expression (`match` → categorical entries, `interpolate` → gradient entries) |

### LegendEntryEditor Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `LegendEntry` | Yes | Single legend entry |
| `onChange` | `(entry: LegendEntry) => void` | Yes | Called on any field change |
| `onRemove` | `() => void` | Yes | Called when the user removes this entry |

---

## SearchFieldEditor / SearchFieldList

Edits search field configuration for a layer's `SearchConfig`.

### SearchFieldEditor Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `SearchField` | Yes | The field being edited |
| `onChange` | `(field: SearchField) => void` | Yes | Called on any field change |
| `availableProperties` | `AvailableProperty[]` | No | Properties from API metadata for autocomplete |

### SearchFieldList Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `fields` | `SearchField[]` | Yes | All search fields |
| `availableProperties` | `AvailableProperty[]` | No | Properties for autocomplete hints |
| `onAdd` | `() => void` | Yes | Called when adding a new field |
| `onRemove` | `(property: string) => void` | Yes | Called when removing a field |
| `onChange` | `(field: SearchField) => void` | Yes | Called when a field changes |

---

## BasemapEditor / BasemapList

Edits a single `BasemapConfig` entry.

### BasemapEditor Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `BasemapConfig` | Yes | The basemap being edited |
| `onChange` | `(basemap: BasemapConfig) => void` | Yes | Called on any field change |

### BasemapList Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `basemaps` | `BasemapConfig[]` | Yes | All basemaps |
| `onAdd` | `() => void` | Yes | Called when adding a basemap |
| `onRemove` | `(id: string) => void` | Yes | Called when removing a basemap |
| `onChange` | `(basemap: BasemapConfig) => void` | Yes | Called when a basemap changes |

---

## UIConfigEditor

Toggles visibility flags for all UI panels.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `UIConfig` | Yes | Current UI config |
| `onChange` | `(config: UIConfig) => void` | Yes | Called when any toggle changes |

---

## ViewEditor

Edits the `ViewConfig` (initial camera position).

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `ViewConfig` | Yes | Current view config |
| `onChange` | `(view: ViewConfig) => void` | Yes | Called on any field change |

---

## CollectionBrowser

Displays all collections from an OGC API source with selection checkboxes.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `sourceUrl` | `string` | Yes | Base URL of the OGC API server to browse |
| `selectedCollectionIds` | `string[]` | Yes | Currently selected collection IDs |
| `onSelect` | `(collectionId: string) => void` | Yes | Called when a collection is checked |
| `onDeselect` | `(collectionId: string) => void` | Yes | Called when a collection is unchecked |

---

## PropertyDisplayEditor

Manages `PropertyDisplayConfig` — the list of properties to show (and their labels) in `FeatureDetailPanel` and `FeatureTooltip`.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `PropertyDisplayConfig` | Yes | Current property display config |
| `onChange` | `(config: PropertyDisplayConfig) => void` | Yes | Called on any change |
| `availableProperties` | `AvailableProperty[]` | No | Properties from API metadata for suggestions |

### Behavior

- Each property row has a **Type** selector (`Text` / `Link (opens in new tab)`). Selecting `Link` reveals a **Button text** input for the per-field `linkText` (anchor text, defaults to "Open ↗").
- `type: 'text'` and empty `linkText` are omitted from the emitted config, so legacy configs round-trip unchanged.

---

## ConfigPreview

Validates and displays a `MapConfig` as formatted JSON, showing validation errors when present.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `config` | `unknown` | Yes | The config object to validate and display |

---

## Cql2FilterEditor

Visual CQL2 filter builder for constructing query templates. Supports comparison, pattern, temporal, and spatial operators with parameterized values. Stored in `LayerConfig.cql2Filter`.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `Cql2FilterConfig \| undefined` | Yes | The current filter config, or `undefined` for empty state |
| `onChange` | `(config: Cql2FilterConfig \| undefined) => void` | Yes | Called on any change; receives `undefined` when the filter is removed |
| `availableProperties` | `AvailableProperty[]` | No | Properties available for filtering. When provided, renders select dropdowns instead of free-text inputs |

### Behavior

- **Empty state**: Shows "No CQL2 filter configured" with an "Add Filter" button.
- **Visual builder**: Recursive AND/OR groups with nested rules. Each rule has property, operator, and value selectors.
- **Value modes**: Static values, parameterized values (resolved at runtime from user input), relative dates, date ranges, and computed ranges (e.g., "within 20% of X").
- **Spatial operators**: `s_intersects`, `s_within`, `s_dwithin` — use the selected feature's geometry at runtime. `s_dwithin` supports parameterized distance with configurable units (meters, km, miles, feet).
- **Query options**: Sort-by fields and result limit, rendered below the rule builder.
- **CQL2 preview**: Collapsible read-only JSON preview of the generated CQL2 query.
- **Remove filter**: Button at the bottom calls `onChange(undefined)`.

### Example

```tsx
import { useState } from 'react';
import type { Cql2FilterConfig } from '@techtraverse/map-ui-lib/hooks';
import { Cql2FilterEditor } from '@techtraverse/map-ui-lib/components/Cql2FilterEditor';

function MyAdmin() {
  const [filter, setFilter] = useState<Cql2FilterConfig | undefined>(undefined);
  const properties = [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'population', title: 'Population', type: 'integer' },
    { name: 'geom', title: 'Geometry', type: 'geometry' },
  ];
  return (
    <Cql2FilterEditor
      value={filter}
      onChange={setFilter}
      availableProperties={properties}
    />
  );
}
```

---

## Shared Admin Primitives

### FormField

Wrapper for a labeled form field with optional error message and description tooltip.

| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Yes | Field label |
| `children` | `ReactNode` | Yes | The input element |
| `error` | `string` | No | Validation error message |
| `required` | `boolean` | No | Shows a required indicator |
| `description` | `string` | No | Help text shown as an `InfoTip` tooltip next to the label |
| `htmlFor` | `string` | No | Links label to an input `id` |

### InfoTip

Accessible CSS-only tooltip icon. Auto-used by `FormField` via the `description` prop; can also be used standalone.

| Prop | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | Yes | Tooltip content |
| `id` | `string` | No | Custom `id` for the tooltip element (auto-generated if omitted) |

### ColorPicker

Native HTML color input with hex value display.

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string` | Yes | Hex color value |
| `onChange` | `(color: string) => void` | Yes | Called on color change |
| `label` | `string` | No | Accessibility label |

### ConfirmDialog

Modal confirmation dialog.

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | Yes | Whether the dialog is visible |
| `title` | `string` | Yes | Dialog heading |
| `description` | `string` | Yes | Dialog body text |
| `onConfirm` | `() => void` | Yes | Called when confirmed |
| `onCancel` | `() => void` | Yes | Called when cancelled or dismissed |

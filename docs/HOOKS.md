# Hooks & Utilities Reference

All hooks and utility functions are exported from the `hooks` sub-path:

```ts
import { useOgcCollections, useOgcFeatures, fetchCollections, ... } from '@techtraverse/map-ui-lib/hooks';
```

---

## Hooks

### `useOgcCollections`

Fetches the list of collections from an OGC API server.

**Signature:**

```ts
function useOgcCollections(baseUrl: string | null): UseOgcCollectionsResult
```

**Parameters:**

| Param | Type | Description |
|---|---|---|
| `baseUrl` | `string \| null` | Base URL of the OGC API server. Pass `null` to skip fetching. |

**Return type:**

```ts
interface UseOgcCollectionsResult {
  collections: OgcCollection[];
  loading: boolean;
  error: Error | null;
}
```

**Behavior:**

- Fetches `GET {baseUrl}/collections?f=json` on mount and whenever `baseUrl` changes.
- Cancels the in-flight request if `baseUrl` changes or the component unmounts.
- Returns `loading: true` during the fetch; resets to `false` on success or failure.

**Example:**

```tsx
import { useOgcCollections } from '@techtraverse/map-ui-lib/hooks';

function CollectionList() {
  const { collections, loading, error } = useOgcCollections('http://localhost:8001');

  if (loading) return <p>Loading…</p>;
  if (error)   return <p>Error: {error.message}</p>;

  return (
    <ul>
      {collections.map((col) => (
        <li key={col.id}>{col.title ?? col.id}</li>
      ))}
    </ul>
  );
}
```

---

### `useOgcFeatures`

Fetches GeoJSON features from an OGC API collection with optional filtering and pagination.

**Signature:**

```ts
function useOgcFeatures(
  baseUrl: string | null,
  collection: string | null,
  options?: FetchFeaturesOptions
): UseOgcFeaturesResult
```

**Parameters:**

| Param | Type | Description |
|---|---|---|
| `baseUrl` | `string \| null` | Base URL of the OGC API server. |
| `collection` | `string \| null` | Collection ID (e.g., `public.countries`). |
| `options` | `FetchFeaturesOptions` | Optional query parameters (see below). |

**`FetchFeaturesOptions`:**

| Option | Type | Description |
|---|---|---|
| `bbox` | `[number, number, number, number]` | Bounding box filter `[minLng, minLat, maxLng, maxLat]` |
| `limit` | `number` | Max features to return (default: server default) |
| `offset` | `number` | Pagination offset |
| `properties` | `string[]` | Property names to include in the response |
| `datetime` | `string` | Datetime filter (ISO 8601) |
| `filter` | `Record<string, string \| number>` | Arbitrary property equality filters |
| `cql2Filter` | `CQL2Expression` | CQL2 JSON filter expression. When provided, takes precedence over `filter` |

**Return type:**

```ts
interface UseOgcFeaturesResult {
  features: GeoJsonFeature[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean; // true when more pages are available
}
```

**Pagination:**

`hasMore` is `true` when:
- The server returns `numberMatched` and `offset + features.length < numberMatched`, or
- No `numberMatched` is returned and the response contains exactly `limit` features (heuristic).

**Example:**

```tsx
import { useState } from 'react';
import { useOgcFeatures } from '@techtraverse/map-ui-lib/hooks';

function FeatureList() {
  const [offset, setOffset] = useState(0);

  const { features, loading, error, hasMore } = useOgcFeatures(
    'http://localhost:8001',
    'public.countries',
    { limit: 10, offset, filter: { continent: 'Europe' } }
  );

  return (
    <div>
      {loading && <p>Loading…</p>}
      {error   && <p>Error: {error.message}</p>}
      <ul>
        {features.map((f, i) => (
          <li key={f.id ?? i}>{String(f.properties?.name ?? f.id)}</li>
        ))}
      </ul>
      {hasMore && (
        <button onClick={() => setOffset((o) => o + 10)}>Load more</button>
      )}
    </div>
  );
}
```

---

### `useOgcQueryables`

Fetches queryable properties for an OGC API collection.

**Signature:**

```ts
function useOgcQueryables(
  baseUrl: string | null,
  collectionId: string | null
): UseOgcQueryablesResult
```

**Return type:**

```ts
interface UseOgcQueryablesResult {
  queryables: OgcQueryables | null;
  loading: boolean;
  error: Error | null;
}
```

**Behavior:**

- Fetches `GET {baseUrl}/collections/{collectionId}/queryables?f=json` on mount and whenever inputs change.
- Pass `null` for either parameter to skip fetching.
- Cancels the in-flight request if inputs change or the component unmounts.

**Example:**

```tsx
import { useOgcQueryables } from '@techtraverse/map-ui-lib/hooks';

function QueryablesList({ baseUrl, collectionId }) {
  const { queryables, loading, error } = useOgcQueryables(baseUrl, collectionId);

  if (loading) return <p>Loading…</p>;
  if (error)   return <p>Error: {error.message}</p>;

  return (
    <ul>
      {Object.entries(queryables?.properties ?? {}).map(([key, prop]) => (
        <li key={key}>{key}: {prop.type}</li>
      ))}
    </ul>
  );
}
```

---

### `useOgcCollectionDetail`

Fetches metadata for a single OGC API collection.

**Signature:**

```ts
function useOgcCollectionDetail(
  baseUrl: string | null,
  collectionId: string | null
): UseOgcCollectionDetailResult
```

**Return type:**

```ts
interface UseOgcCollectionDetailResult {
  collection: OgcCollection | null;
  loading: boolean;
  error: Error | null;
}
```

**Behavior:**

- Fetches `GET {baseUrl}/collections/{collectionId}?f=json` on mount and whenever inputs change.
- Pass `null` for either parameter to skip fetching.
- Cancels the in-flight request on unmount or input change.

**Example:**

```tsx
import { useOgcCollectionDetail } from '@techtraverse/map-ui-lib/hooks';

function CollectionInfo({ baseUrl, collectionId }) {
  const { collection, loading, error } = useOgcCollectionDetail(baseUrl, collectionId);

  if (loading) return <p>Loading…</p>;
  if (error)   return <p>Error: {error.message}</p>;

  return <h2>{collection?.title ?? collectionId}</h2>;
}
```

---

### `useCsvExport`

Exports features from an OGC API collection to a CSV file, paginating automatically.

**Signature:**

```ts
function useCsvExport(options: UseCsvExportOptions): UseCsvExportResult
```

**`UseCsvExportOptions`:**

| Option | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Base URL of the OGC API server (required) |
| `limit` | `number` | Max features to fetch in total (default: `1000`) |
| `csvOptions` | `CsvExportOptions` | Optional CSV formatting options (see below) |

**`UseCsvExportResult`:**

| Field | Type | Description |
|---|---|---|
| `exportCsv` | `(collectionId: string, filename?: string, cql2Filter?: CQL2Expression) => Promise<void>` | Async function that fetches and downloads the CSV; pass a CQL2 filter to export only filtered features |
| `loading` | `boolean` | `true` while the export is in progress |
| `error` | `Error \| null` | Set if the fetch or conversion fails |

**Behavior:**

- Paginates through OGC API features in batches up to 1000 until `limit` features are collected or the collection is exhausted.
- Converts features to CSV using `featuresToCsv` and triggers a browser download via `downloadCsv`.
- `filename` defaults to `{collectionId}.csv` if not provided.

**Example:**

```tsx
import { ExportButton } from '@techtraverse/map-ui-lib/components/ExportButton';
import { useCsvExport } from '@techtraverse/map-ui-lib/hooks';

function App() {
  const { exportCsv, loading, error } = useCsvExport({
    baseUrl: 'http://localhost:8001',
    limit: 500,
  });

  const layers = [
    { id: 'countries', label: 'Countries', collection: 'public.ne_110m_admin_0_countries' },
  ];

  return (
    <>
      {error && <p>Export failed: {error.message}</p>}
      <ExportButton
        layers={layers}
        onExport={(layer) => exportCsv(layer.collection, `${layer.label}.csv`)}
        loading={loading}
      />
    </>
  );
}
```

---

## Utility Functions

These are pure async functions with no React dependencies. They can be used server-side, in Zustand actions, or anywhere outside a component.

### `fetchCollections`

```ts
async function fetchCollections(baseUrl: string): Promise<OgcCollection[]>
```

Fetches `GET {baseUrl}/collections?f=json` and returns the `collections` array.

```ts
import { fetchCollections } from '@techtraverse/map-ui-lib/hooks';

const collections = await fetchCollections('http://localhost:8001');
```

---

### `fetchFeatures`

```ts
async function fetchFeatures(
  baseUrl: string,
  collection: string,
  options?: FetchFeaturesOptions
): Promise<OgcFeatureCollection>
```

Fetches features from `GET {baseUrl}/collections/{collection}/items` with query parameters derived from `options`.

```ts
import { fetchFeatures } from '@techtraverse/map-ui-lib/hooks';

const data = await fetchFeatures('http://localhost:8001', 'public.countries', {
  limit: 5,
  filter: { continent: 'Asia' },
});
console.log(data.features);
```

---

### `fetchQueryables`

```ts
async function fetchQueryables(
  baseUrl: string,
  collection: string
): Promise<OgcQueryables>
```

Fetches the queryable schema for a collection from `GET {baseUrl}/collections/{collection}/queryables?f=json`. Used internally by `SearchPanel` to populate dynamic select options.

```ts
import { fetchQueryables } from '@techtraverse/map-ui-lib/hooks';

const queryables = await fetchQueryables('http://localhost:8001', 'public.countries');
// queryables.properties['continent'].enum → ['Africa', 'Asia', ...]
```

---

### `fetchDistinctValues`

```ts
async function fetchDistinctValues(
  baseUrl: string,
  collection: string,
  property: string,
  options?: { query?: string; limit?: number }
): Promise<string[]>
```

Fetches distinct non-null string values for a property in an OGC API collection. When `query` is provided, filters values using a CQL2 `like` expression (`%query%`). Useful for populating autocomplete dropdowns.

| Option | Type | Description |
|---|---|---|
| `query` | `string` | Substring to filter values by (case-insensitive via `like`) |
| `limit` | `number` | Max values to return (default: 50) |

```ts
import { fetchDistinctValues } from '@techtraverse/map-ui-lib/hooks';

const continents = await fetchDistinctValues('http://localhost:8001', 'public.countries', 'continent');
// → ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']

const matching = await fetchDistinctValues(
  'http://localhost:8001', 'public.countries', 'name', { query: 'Ger' }
);
// → ['Germany']
```

---

### `fetchCollectionDetail`

```ts
async function fetchCollectionDetail(
  baseUrl: string,
  collectionId: string
): Promise<OgcCollection>
```

Fetches metadata for a single OGC API collection by ID from `GET {baseUrl}/collections/{collectionId}?f=json`.

```ts
import { fetchCollectionDetail } from '@techtraverse/map-ui-lib/hooks';

const collection = await fetchCollectionDetail('http://localhost:8001', 'public.countries');
console.log(collection.title, collection.description);
```

---

### `fetchConformance`

```ts
async function fetchConformance(baseUrl: string): Promise<OgcConformance>
```

Fetches the OGC API conformance declaration to discover server capabilities. Returns an object with a `conformsTo` array of conformance class URIs.

```ts
import { fetchConformance } from '@techtraverse/map-ui-lib/hooks';

const conformance = await fetchConformance('http://localhost:8001');
const supportsCql2 = conformance.conformsTo.some((c) => c.includes('cql2'));
```

---

### `fetchTileJson`

```ts
async function fetchTileJson(
  baseUrl: string,
  collection: string,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): Promise<TileJson>
```

Fetches the TileJSON document for a collection's vector tiles. Returns tile metadata including bounds, min/max zoom, and `vector_layers` schema.

```ts
import { fetchTileJson } from '@techtraverse/map-ui-lib/hooks';

const tileJson = await fetchTileJson('http://localhost:8001', 'public.countries');
console.log(tileJson.vector_layers); // layer definitions
```

---

### `fetchFeatureCount`

```ts
async function fetchFeatureCount(
  baseUrl: string,
  collection: string,
  options?: Omit<FetchFeaturesOptions, 'limit' | 'offset' | 'properties'>
): Promise<number | null>
```

Fetches the total feature count for a collection using `limit=0` and reading `numberMatched` from the response. Returns `null` if the server does not report `numberMatched`. Accepts optional CQL2 or datetime filters to count filtered results.

```ts
import { fetchFeatureCount } from '@techtraverse/map-ui-lib/hooks';

const total = await fetchFeatureCount('http://localhost:8001', 'public.countries');
// total may be null if server doesn't support numberMatched

const europeanCount = await fetchFeatureCount(
  'http://localhost:8001',
  'public.countries',
  { cql2Filter: { op: '=', args: [{ property: 'continent' }, 'Europe'] } }
);
```

---

### `getTileJsonUrl`

```ts
function getTileJsonUrl(
  baseUrl: string,
  collection: string,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Returns the TileJSON URL for a collection's vector tiles. Use this with MapLibre's `addSource` to register a tile source via metadata URL.

```ts
import { getTileJsonUrl } from '@techtraverse/map-ui-lib/hooks';

const url = getTileJsonUrl('http://localhost:8001', 'public.countries');
// → 'http://localhost:8001/collections/public.countries/tiles/WebMercatorQuad/tilejson.json'
```

---

### `getVectorTileUrl`

```ts
function getVectorTileUrl(
  baseUrl: string,
  collection: string,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Returns a MapLibre-compatible tile URL template with `{z}/{x}/{y}` placeholders.

```ts
import { getVectorTileUrl } from '@techtraverse/map-ui-lib/hooks';

const tileUrl = getVectorTileUrl('http://localhost:8001', 'public.countries');
// → 'http://localhost:8001/collections/public.countries/tiles/WebMercatorQuad/{z}/{x}/{y}'
```

---

### `getFilteredVectorTileUrl`

```ts
function getFilteredVectorTileUrl(
  baseUrl: string,
  collection: string,
  filter?: Record<string, string | number>,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Same as `getVectorTileUrl` but appends property filter query parameters. When `filter` is empty or undefined, returns a plain tile URL.

```ts
import { getFilteredVectorTileUrl } from '@techtraverse/map-ui-lib/hooks';

const url = getFilteredVectorTileUrl(
  'http://localhost:8001',
  'public.countries',
  { continent: 'Europe' }
);
// → '.../tiles/WebMercatorQuad/{z}/{x}/{y}?continent=Europe'
```

---

### `getCql2FilteredVectorTileUrl`

```ts
function getCql2FilteredVectorTileUrl(
  baseUrl: string,
  collection: string,
  cql2Filter?: CQL2Expression | null,
  tileMatrixSetId?: string  // default: 'WebMercatorQuad'
): string
```

Builds a MapLibre-compatible tile URL template with a CQL2 JSON filter applied via `filter-lang=cql2-json` query parameters. When `cql2Filter` is null/undefined, returns a plain tile URL without filter parameters.

**Important:** When using this with react-map-gl, also change the React `key` and MapLibre Source `id` whenever the filter changes — MapLibre does not re-fetch tiles when the `tiles` prop updates on an existing Source.

```ts
import { getCql2FilteredVectorTileUrl } from '@techtraverse/map-ui-lib/hooks';

const url = getCql2FilteredVectorTileUrl(
  'http://localhost:8001',
  'public.countries',
  { op: '=', args: [{ property: 'continent' }, 'Europe'] }
);
// → '.../tiles/WebMercatorQuad/{z}/{x}/{y}?filter-lang=cql2-json&filter=...'
```

---

### `featuresToCsv`

```ts
function featuresToCsv(features: GeoJsonFeature[], options?: CsvExportOptions): string
```

Converts an array of GeoJSON features to a CSV string.

**`CsvExportOptions`:**

| Option | Type | Description |
|---|---|---|
| `fields` | `string[]` | Property keys to include as columns; auto-discovers all keys if omitted |
| `includeGeometry` | `boolean` | Append a `geometry` column with geometry in WKT (Well-Known Text) format (default: `true`). Supports Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection. |
| `delimiter` | `string` | Column delimiter (default: `','`) |

**Behavior:**

- Returns an empty string when `features` is empty.
- Auto-discovers property keys from all features when `fields` is not specified.
- Properly escapes values containing quotes, the delimiter, or newlines using RFC 4180 quoting.

```ts
import { featuresToCsv } from '@techtraverse/map-ui-lib/hooks';

const csv = featuresToCsv(features, { fields: ['name', 'continent'], delimiter: ';' });
```

---

### `downloadCsv`

```ts
function downloadCsv(csv: string, filename: string): void
```

Creates a `Blob` from a CSV string and triggers a browser file download.

```ts
import { downloadCsv } from '@techtraverse/map-ui-lib/hooks';

downloadCsv(csv, 'countries.csv');
```

---

### `resolvePropertyDisplay`

```ts
function resolvePropertyDisplay(
  propertyDisplay: PropertyDisplayConfig | undefined
): {
  fields: string[];
  labels: Record<string, string>;
  types: Record<string, PropertyDisplayType>;
  linkText: Record<string, string>;
} | undefined
```

Transforms a `PropertyDisplayConfig` into a resolved form with a flat list of visible field names, a label map, a display-type map, and a link-text map. Filters out entries with `visible: false` and sorts by each entry's `order` (entries without `order` follow ordered ones, in key order). Returns `undefined` if input is `undefined` (meaning "show all properties with default labels"). `types` only contains non-default entries (currently `'link'` — a key's absence means `'text'`); a `'link'` field renders as an anchor in `PropertyList` when its value is a safe http(s) URL, with `linkText[key]` as the anchor text.

Use this utility when rendering feature properties to respect the layer's `propertyDisplay` configuration.

```ts
import { resolvePropertyDisplay } from '@techtraverse/map-ui-lib/hooks';

const resolved = resolvePropertyDisplay(layer.propertyDisplay);
// resolved?.fields → ['name', 'continent', 'pop_est']
// resolved?.labels → { name: 'Country Name', pop_est: 'Population' }
```

---

## CQL2 Builder Functions

The library provides a full set of CQL2 JSON builder functions for constructing OGC Common Query Language 2 filter expressions. All functions return `CQL2Expression` objects suitable for JSON serialization.

```ts
import { eq, and, between, like, fromStructuredFilters } from '@techtraverse/map-ui-lib/hooks';
```

### Comparison Operators

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `eq` | `(property, value) → CQL2Expression` | `=` | Equal to |
| `neq` | `(property, value) → CQL2Expression` | `<>` | Not equal to |
| `gt` | `(property, value) → CQL2Expression` | `>` | Greater than |
| `gte` | `(property, value) → CQL2Expression` | `>=` | Greater than or equal |
| `lt` | `(property, value) → CQL2Expression` | `<` | Less than |
| `lte` | `(property, value) → CQL2Expression` | `<=` | Less than or equal |

`value` accepts `string | number | boolean | CQL2Date | CQL2Timestamp` (comparison operators that involve ordering accept `number | CQL2Date | CQL2Timestamp`).

### Range / Membership

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `between` | `(property, lower, upper) → CQL2Expression` | `between` | Value in numeric range |
| `inList` | `(property, values[]) → CQL2Expression` | `in` | Value in a list |
| `like` | `(property, pattern) → CQL2Expression` | `like` | Pattern match (`%` wildcard) |
| `isNull` | `(property) → CQL2Expression` | `isNull` | Property is null |

### Logical Operators

| Function | Signature | Returns | Description |
|---|---|---|---|
| `and` | `(...expressions) → CQL2Expression \| null` | Combined or single expression, `null` if empty | Combines with AND; filters out null/undefined |
| `or` | `(...expressions) → CQL2Expression \| null` | Combined or single expression, `null` if empty | Combines with OR; filters out null/undefined |
| `not` | `(expression) → CQL2Expression` | Negated expression | Logical NOT |

### Temporal Operators

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `tAfter` | `(property, dateOrTimestamp) → CQL2Expression` | `t_after` | Property is after the given date/timestamp |
| `tBefore` | `(property, dateOrTimestamp) → CQL2Expression` | `t_before` | Property is before the given date/timestamp |
| `tDuring` | `(property, start, end) → CQL2Expression` | `t_during` | Property falls within a temporal interval |

Date/timestamp values use `CQL2Date` (`{ date: "2024-01-01" }`) or `CQL2Timestamp` (`{ timestamp: "2024-01-01T00:00:00Z" }`).

### Conversion Helpers

#### `fromStructuredFilters`

```ts
function fromStructuredFilters(
  filters: Record<string, SearchFilterValue>,
  fields: SearchField[]
): CQL2Expression | null
```

High-level converter that transforms a `SearchFilterValues` record (as produced by `SearchPanel`) into a CQL2 expression. Uses the `fields` config array to determine the correct operator per field type. Returns `null` if no active filters remain.

```ts
import { fromStructuredFilters } from '@techtraverse/map-ui-lib/hooks';

const cql2 = fromStructuredFilters(
  { continent: 'Europe', pop: { min: 1000000, max: 50000000 } },
  layer.search.fields
);
// → { op: 'and', args: [{ op: '=', args: [{ property: 'continent' }, 'Europe'] }, { op: 'between', args: [{ property: 'pop' }, 1000000, 50000000] }] }
```

#### `fromSimpleFilters`

```ts
function fromSimpleFilters(filters: Record<string, string | number>): CQL2Expression | null
```

Converts a simple key-value record to CQL2 equality expressions combined with AND. Returns `null` if the record is empty.

#### `serializeCql2`

```ts
function serializeCql2(expr: CQL2Expression): string
```

Serializes a CQL2 expression to a JSON string for use as a query parameter.

### Spatial Operators

| Function | Signature | CQL2 `op` | Description |
|---|---|---|---|
| `sIntersects` | `(property, geometry) → CQL2Expression` | `s_intersects` | Geometry intersects the given geometry |
| `sWithin` | `(property, geometry) → CQL2Expression` | `s_within` | Geometry is within the given geometry |
| `sDwithin` | `(property, geometry, distance, units?) → CQL2Expression` | `s_dwithin` | Geometry is within a distance of the given geometry |

`geometry` is any GeoJSON geometry object. `units` defaults to `'meters'`; also accepts `'kilometers'`, `'miles'`, `'feet'`.

### Filter Rule Group Conversion

These functions convert the visual query builder's `FilterRuleGroup` model into CQL2 expressions. They support parameterized templates, relative dates, computed ranges, and spatial operators.

```ts
import {
  fromFilterRuleGroup,
  buildCql2Query,
  resolveRelativeDate,
  isFilterRuleGroup,
} from '@techtraverse/map-ui-lib/hooks';
```

#### `fromFilterRuleGroup`

```ts
function fromFilterRuleGroup(
  group: FilterRuleGroup,
  params?: Record<string, unknown>,
  selectionGeometry?: CQL2Geometry | null,
): CQL2Expression | null
```

Recursively converts a `FilterRuleGroup` (from the visual query builder) into a CQL2 expression. Resolves parameterized values from `params`, uses `selectionGeometry` for spatial operators. Returns `null` if the group produces no valid expressions (e.g., all spatial rules with no geometry).

```ts
const group: FilterRuleGroup = {
  id: 'g1', combinator: 'and',
  rules: [
    { id: 'r1', property: 'continent', operator: '=',
      value: { kind: 'parameter', name: 'selectedContinent', label: 'Continent', inputType: 'select' } },
    { id: 'r2', property: 'population', operator: '>',
      value: { kind: 'static', value: 1000000 } },
  ],
};
const cql2 = fromFilterRuleGroup(group, { selectedContinent: 'Europe' });
// → { op: 'and', args: [{ op: '=', args: [{ property: 'continent' }, 'Europe'] }, { op: '>', args: [{ property: 'population' }, 1000000] }] }
```

#### `buildCql2Query`

```ts
function buildCql2Query(
  group: FilterRuleGroup,
  params?: Record<string, unknown>,
  selectionGeometry?: CQL2Geometry | null,
): Cql2QueryShape
```

Returns the full query shape `{ filter, sortby, limit }` from a `FilterRuleGroup`. Use this when you need sort and limit metadata in addition to the CQL2 filter.

#### `resolveRelativeDate`

```ts
function resolveRelativeDate(
  value: RelativeDateValue,
  params?: Record<string, unknown>,
  now?: Date,
): string
```

Resolves a relative date value (e.g., "3 years ago") to an ISO timestamp string. The optional `now` parameter is useful for testing.

#### `isFilterRuleGroup`

```ts
function isFilterRuleGroup(item: FilterRule | FilterRuleGroup): item is FilterRuleGroup
```

Type guard that distinguishes `FilterRuleGroup` (has `combinator`) from `FilterRule`.

### Usage Examples

```ts
import { eq, gt, like, and, or, between, tDuring, sIntersects, sDwithin } from '@techtraverse/map-ui-lib/hooks';

// Simple equality
const filter1 = eq('continent', 'Europe');

// Numeric range
const filter2 = between('population', 1_000_000, 50_000_000);

// Pattern matching
const filter3 = like('name', '%land%');

// Temporal range
const filter4 = tDuring('created_at', { timestamp: '2024-01-01T00:00:00Z' }, { timestamp: '2024-12-31T23:59:59Z' });

// Spatial: features intersecting a selection geometry
const filter5 = sIntersects('geom', selectedFeature.geometry);

// Spatial: features within 500 feet of a point
const filter6 = sDwithin('geom', selectedFeature.geometry, 500, 'feet');

// Combine with logical operators
const combined = and(filter1, filter2, or(filter3, filter4));
// → { op: 'and', args: [filter1, filter2, { op: 'or', args: [filter3, filter4] }] }
```

---

## CQL2 Types

```ts
import type {
  CQL2Expression,
  CQL2PropertyRef,
  CQL2Date,
  CQL2Timestamp,
  CQL2Interval,
} from '@techtraverse/map-ui-lib/hooks';
```

| Type | Shape | Description |
|---|---|---|
| `CQL2Expression` | `{ op: string; args: unknown[] }` | A CQL2 expression node |
| `CQL2PropertyRef` | `{ property: string }` | A reference to a feature property |
| `CQL2Date` | `{ date: string }` | ISO 8601 date literal (`"YYYY-MM-DD"`) |
| `CQL2Timestamp` | `{ timestamp: string }` | ISO 8601 timestamp literal (`"YYYY-MM-DDTHH:MM:SSZ"`) |
| `CQL2Interval` | `{ interval: [string, string] }` | Temporal interval with start/end strings |
| `CQL2Geometry` | GeoJSON geometry object | Geometry literal for spatial operators |

### Filter Builder Types

These types support the visual CQL2 query builder (`Cql2FilterEditor` component) and the `fromFilterRuleGroup` / `buildCql2Query` conversion functions.

```ts
import type {
  FilterRuleGroup,
  FilterRule,
  FilterRuleValue,
  FilterOperator,
  Cql2FilterConfig,
  Cql2QueryShape,
  SortField,
  SpatialConfig,
  RelativeDateValue,
  DateRangeValue,
  ComputedRangeValue,
} from '@techtraverse/map-ui-lib/hooks';
```

| Type | Description |
|---|---|
| `FilterRuleGroup` | Recursive group of rules combined with `'and'` or `'or'`. May include `sortby` and `limit`. |
| `FilterRule` | A single filter rule: property + operator + value, with optional `spatial` config. |
| `FilterRuleValue` | Discriminated union (`kind`) of 5 value types — see below. |
| `FilterOperator` | All supported operators: `=`, `<>`, `>`, `>=`, `<`, `<=`, `like`, `in`, `isNull`, `between`, `t_after`, `t_before`, `t_during`, `s_intersects`, `s_within`, `s_dwithin` |
| `Cql2FilterConfig` | Alias for `FilterRuleGroup` — stored in `LayerConfig.cql2Filter`. |
| `Cql2QueryShape` | `{ filter: CQL2Expression \| null, sortby?: SortField[], limit?: number }` |
| `SortField` | `{ property: string, direction: 'asc' \| 'desc' }` |
| `SpatialConfig` | `{ distance?: number \| ParameterRef, units?: 'meters' \| 'kilometers' \| 'miles' \| 'feet' }` |
| `RelativeDateValue` | Relative date: direction + offset + unit (e.g., "3 years ago") |
| `DateRangeValue` | Temporal range with independently resolved start/end endpoints |
| `ComputedRangeValue` | "Within N% (or absolute) of parameter X" — resolved to `between()` at runtime |

#### FilterRuleValue kinds

| Kind | Purpose | Example |
|---|---|---|
| `static` | Literal value | `{ kind: 'static', value: 'Europe' }` |
| `parameter` | Runtime parameter (resolved from user input) | `{ kind: 'parameter', name: 'minPop', label: 'Min Population', inputType: 'number', default: 1000 }` |
| `relativeDate` | Relative to "now" | `{ kind: 'relativeDate', direction: 'past', offset: { kind: 'static', value: 3 }, unit: 'years' }` |
| `dateRange` | Temporal interval with relative/static/param endpoints | Used with `t_during` operator |
| `computedRange` | Percentage or absolute offset from a parameter | Used with `between` operator |

---

## Types

These types are re-exported from the `hooks` sub-path for convenience:

```ts
import type {
  // OGC API response types
  OgcCollection,
  OgcCollectionsResponse,
  OgcConformance,
  TileJson,
  GeoJsonFeature,
  OgcFeatureCollection,
  OgcQueryables,
  QueryableProperty,
  FetchFeaturesOptions,
  // Config types
  OgcApiSource,
  LayerConfig,
  MapConfig,
  UIConfig,
  ViewConfig,
  StyleConfig,
  FilterConfig,
  LegendConfig,
  SearchConfig,
  SearchField,
  SearchFieldType,
  // Search field sub-types
  TextSearchField,
  NumberSearchField,
  DatetimeSearchField,
  SelectSearchField,
  SearchFilterValue,
  SearchFilterValues,
  // Property display
  PropertyDisplay,
  PropertyDisplayConfig,
  // CQL2 filter
  CQL2Expression,
  CQL2PropertyRef,
  CQL2Date,
  CQL2Timestamp,
  CQL2Interval,
  CQL2Geometry,
  // CQL2 filter builder
  FilterRuleGroup,
  FilterRule,
  FilterRuleValue,
  FilterOperator,
  Cql2FilterConfig,
  Cql2QueryShape,
  SortField,
  SpatialConfig,
  RelativeDateValue,
  DateRangeValue,
  ComputedRangeValue,
  // CSV export
  CsvExportOptions,
} from '@techtraverse/map-ui-lib/hooks';
```

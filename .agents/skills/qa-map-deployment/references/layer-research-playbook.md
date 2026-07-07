# Layer Research Playbook

Before you build a "test" config, you need to know what data the OGC API actually serves and what each collection looks like internally. Walking in blind and picking the first 5 collection names produces a boring test that won't surface real bugs. This playbook is the recon procedure.

## Step 1 — Inventory all collections

```bash
curl -sS -m 10 "$BASE_URL/ogc/collections?f=json" \
  | python3 -c "import sys, json; d = json.load(sys.stdin); [print(' -', c['id']) for c in d.get('collections', [])]"
```

You'll typically see three flavors:

- **Schema-prefixed feature collections** (`your_county.parcels`, `example.ne_110m_admin_0_countries`) — real map layers. These are your candidates.
- **PostGIS bookkeeping** (`public.postgis_srs*`) — reference data. Skip.
- **tipg function-collections** (`public.st_subdivide`, `public.st_hexagongrid`, `public.st_squaregrid`, `public.parcelt`, `public.exemptdrawingt`) — auto-exposed functions and view-table wrappers. Skip these too unless you specifically intend to test them; they will not behave like normal layers (issue `#94`).

Filter the candidate set down to the schema(s) the project actually uses. Look at the collection IDs returned by `/collections` to identify which schemas contain real data layers — the interesting layers will typically all share the same deployment-specific schema prefix.

## Step 2 — Probe each candidate for metadata + sample feature

For each candidate collection, capture three things:

1. **Geometry type** — from a sample feature
2. **Queryables** — typed property list (the schema you can filter against)
3. **Sample property values + row count** — to inform realistic search filters

The right format query strings to use against tipg:

| Endpoint | Query | Why |
|---|---|---|
| `/collections/{id}` | `?f=json` | Metadata: bbox, crs, item type |
| `/collections/{id}/queryables` | `?f=schemajson` | tipg rejects `?f=json` here (issue: tipg quirk, not a project bug) |
| `/collections/{id}/items` | `?limit=1&f=geojson` | Real GeoJSON FeatureCollection (NOT `?f=json` — that returns a flat tipg JSON shape with WKT geometry, useless for inspection) |
| `/collections/{id}/items` | `?limit=0&f=geojson` | `numberMatched` only, fast count |

A one-liner that does all three for a list of collections. First run Step 1 to get the collection IDs, filter to the ones you want to probe, then plug them into the loop (adjust `BASE_URL` and the collection list to match the deployment):

```bash
BASE_URL="http://<deployment-host>"
# Replace with the collection IDs returned by /collections for this deployment:
for c in your_county.parcels your_county.roads your_county.trails your_county.address_points; do
  meta=$(curl -sS -m 10 "$BASE_URL/ogc/collections/$c?f=json")
  q=$(curl -sS -m 10 "$BASE_URL/ogc/collections/$c/queryables?f=schemajson")
  one=$(curl -sS -m 10 "$BASE_URL/ogc/collections/$c/items?limit=1&f=geojson")
  count=$(curl -sS -m 10 "$BASE_URL/ogc/collections/$c/items?limit=0&f=geojson" \
          | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('numberMatched','?'))" 2>/dev/null)
  echo "===== $c (n=$count) ====="
  echo "$q" | python3 -c "import sys,json;d=json.load(sys.stdin);[print(f'  {k}: {v.get(\"type\",\"?\")}') for k,v in d.get('properties',{}).items()]"
  echo "geom_type / props:"
  echo "$one" | python3 -c "import sys,json;d=json.load(sys.stdin);f=(d.get('features') or []);g=(f[0].get('geometry') or {}) if f else {};p=(f[0].get('properties') or {}) if f else {};print(' ', g.get('type'));[print(f'    {k} = {repr(v)[:70]}') for k,v in list(p.items())[:8]]"
done
```

Save the output to `.playwright-mcp/qa-session/collections_recon.txt` for later reference.

## Step 3 — Pick a balanced layer set

Aim for **6–10 layers** that satisfy all of:

- **Every geometry type represented:** at least 1 polygon, 1 line, 1 point. Don't skip points just because they're harder — clustering, circle radii, and symbol layers all break in different ways.
- **Mixed cardinality:** at least one layer with 1–50 features (so individual features are clickable / counted) and one with 1k+ features (so vector tile rendering pressure is realistic).
- **At least one layer per data complexity tier:**
  - Simple — 5–10 properties, all strings (e.g. a towns or municipalities layer)
  - Medium — 15+ properties with mixed types (e.g. a trails or roads layer)
  - Heavy — 30+ properties with realistic dirty data (e.g. a tax parcels or assessor layer)
- **At least one categorical column** to drive a `["match", ["get", "..."]]` paint expression
- **At least one numeric column** to drive a between-range search filter
- **At least one date column** to drive a datetime-range search filter
- **At least one column with autocomplete-worthy values** (high-cardinality strings like owner names) to drive a text-LIKE search field

Build your own layer set from whatever `/collections` returns. The table below is a template showing the shape of a good inventory — replace each row with a real collection from the deployment:

| Layer | Geom | Count | Why it's in the set |
|---|---|---|---|
| `your_county.parcels` | MultiPolygon | ~N rows | Heavy load, categorical paint by ownership/type, full SearchPanel, propertyDisplay test |
| `your_county.roads` | MultiLineString | ~N rows | Categorical line-color by road class, zoom-interpolated width |
| `your_county.trails` | MultiLineString | ~N rows | Dashed line, `prefetch: true` select fields |
| `your_county.address_points` | MultiPoint | ~N rows | Point/circle styling, zoom-interpolated radius, autocomplete |
| `your_county.<single_feature_layer>` | MultiPolygon | ~1 row | Single-feature edge case, simple legend |
| `your_county.<simple_fill_layer>` | MultiPolygon | ~N rows | Simple fill, hidden by default |
| `your_county.<categorical_layer>` | MultiPolygon | ~N rows | N-way categorical fill (stresses match-expression length) |
| `your_county.<district_layer>` | MultiPolygon | ~N rows | Boundary overlay, hidden by default |
| `your_county.<label_layer>` | MultiPolygon | ~N rows | Symbol labels, search by name, prefetch select |

Fill in real collection IDs, geometry types, and row counts from the Step 1 recon. The goal is the same regardless of deployment: span all geometry types, span cardinalities, and give yourself at least one column of each kind to filter on.

## Step 4 — Inspect property values for realistic search input

Before configuring a `select` search field, eyeball a column's distinct values. PostGIS:

```sql
SELECT DISTINCT <column> FROM your_county.<table> ORDER BY 1;
```

Or via the OGC API if you don't have DB access:

```bash
curl -sS -m 10 "$BASE_URL/ogc/collections/your_county.<table>/items?limit=2000&f=geojson" \
  | python3 -c "import sys,json,collections; d=json.load(sys.stdin); c=collections.Counter(f['properties'].get('<column>') for f in d['features']); [print(f'  {repr(k):30s} {v}') for k,v in sorted(c.items(), key=lambda x: -x[1])]"
```

Two things you're looking for:

1. **Casing inconsistency** (e.g. `'No'` and `'no'` both present). Tells you the column is dirty — either the explicit `options` list should normalize, or you're going to file an issue when the dropdown shows both.
2. **Out-of-domain values** (e.g. seasonal date strings in a column you expected to be `yes`/`no`). Tells you you'll need to either provide explicit `options` to hide them, or that the data needs cleaning. Issue `#92` was discovered exactly this way.

## Step 5 — Pick text values that will actually appear in autocomplete

For text search fields with `autocomplete: true`, you want the user (you, in the test) to be able to type a few letters and see matches. Pick a high-cardinality column where common prefixes have many hits:

```bash
curl -sS -m 10 "$BASE_URL/ogc/collections/your_county.<table>/items?limit=50&f=geojson" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f['properties']['<owner_or_name_column>']) for f in d['features']]"
```

Memorize one or two real values from the output — you'll type these during Phase 3 testing to verify CQL2 LIKE filtering really works end-to-end.

## Step 6 — Document the chosen set

Before moving to the build phase, write a one-line note per chosen layer in `.playwright-mcp/qa-session/REPORT.md`'s "Test artifact" section: layer ID, geometry, count, the specific feature it's exercising. This makes future sessions repeatable, and makes it obvious in the report why each layer is there.

## Anti-patterns

- **Picking layers because they look interesting on the map.** They might not have any queryable properties, or they might be 1-row layers that won't exercise the search panel.
- **Picking only polygon layers.** Point clustering and line dash patterns are different code paths that will break in different ways.
- **Skipping recon and reusing a previous session's layer list verbatim** when the deployment has different data. Adapt the *strategy*, not the *list* — always build from what `/collections` actually returns.

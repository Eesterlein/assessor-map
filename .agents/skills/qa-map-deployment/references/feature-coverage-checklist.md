# Feature Coverage Checklist

Two-way checklist:

1. **Test config requirements** — what the saved `test` config must include so that all features are exercise-able.
2. **Live interaction checklist** — what to actually click / type / observe once the map-client is open.

Use as a literal checklist during a session. Copy into the session report and tick items off.

---

## 1. Test config requirements

The saved `test` config must include all of the following. If any item is intentionally omitted, write a one-line note in the report explaining why.

### UI flags (`config.ui`)

All of these must be `true` so the corresponding panel/control renders:

- [ ] `showLayerPanel`
- [ ] `showBasemapSwitcher`
- [ ] `showImageryPanel`
- [ ] `showLegend` + `showLegendOpacity`
- [ ] `showSearchPanel`
- [ ] `showGlobalSearch`
- [ ] `showFeatureDetail`
- [ ] `showFeatureTooltip`
- [ ] `showMeasureTool`
- [ ] `showSelectionTool`
- [ ] `showExportButton` + `showExportPdf`
- [ ] `showCompass`
- [ ] `showScaleBar`
- [ ] `showCoordinateDisplay`

Plus one each of `controlLayout` and `sideMenuToggleCorner` so the layout chooser is exercised.

### Branding (`config.branding`)

- [ ] `headerTitle` (custom)
- [ ] `browserTitle` (custom — verify by checking `document.title` after load)
- [ ] `headerColor` (non-default — verify the header bar actually adopts the color)
- [ ] Optionally: `faviconDataUrl`, `logoDataUrl`, `logoHeight`

### Info modal (`config.info`)

- [ ] `enabled: true`, custom `title`, custom `position` (not the default top-right)
- [ ] `markdown` body that exercises **headings, lists, links, tables, code blocks** — these are the supported markdown features per the wizard tooltip; one bug class is "the markdown renderer doesn't support tables"

### Initial view (`config.initialView`)

- [ ] Lat/lng/zoom centered on the data area (so layers actually render — a world view is a useless test)
- [ ] `minZoom` / `maxZoom` set to bound the experience and exercise the zoom-clamp logic

### Sources (`config.sources`)

- [ ] At least one `type: "features"` source (tipg)
- [ ] At least one `type: "imagery"` source (tile JSON or tile URL)

### Basemaps (`config.basemaps`)

- [ ] At least 3 distinct basemaps so basemap-switching is observable
- [ ] At least one with a custom sprite sheet (`config.sprites`) so symbol layers can use icons

### Imagery layers (`config.imageryLayers`)

- [ ] At least one configured. Default `visible: false` so toggling it on is part of the test.

### Layers (`config.layers`)

The chosen 6–10-layer set (per `references/layer-research-playbook.md`) must collectively cover:

- [ ] At least 1 polygon (`type: "fill"` style)
- [ ] At least 1 line (`type: "line"` style) — including one with `line-dasharray`
- [ ] At least 1 point (`type: "circle"` style)
- [ ] At least 1 layer with a categorical paint expression (`["match", ["get", "..."], ...]`)
- [ ] At least 1 layer with a zoom-interpolated paint (`["interpolate", ["linear"], ["zoom"], ...]`)
- [ ] At least 1 layer with `cql2Filter` (a permanent base filter)
- [ ] At least 1 layer with a complete SearchPanel (`text` + `number` + `datetime` + `select` field types — all four)
- [ ] At least 1 layer with `propertyDisplay` (custom labels + at least 5 hidden keys to exercise visibility)
- [ ] At least 1 layer with `legend.entries` covering both `displayMode: "categorical"` and the default
- [ ] At least 1 layer with `visible: false` (to exercise enable-from-Layers-panel flow)
- [ ] At least 1 layer with `minZoom > initialView.zoom` (to exercise the "zoom in to see this layer" feedback)

### Global search (`config.globalSearch`)

- [ ] `enabled: true`
- [ ] At least 2 layers configured with at least one property each
- [ ] At least one property with `autocomplete: true`
- [ ] At least one property with `prefetch: true`

### Things you cannot put in (yet)

These are known schema gaps; if you encounter them in the wizard's "+ Add labels" flow, you'll get a 400 from PUT. Reference the relevant issue in the report:

- Data-driven `text-field` (`["get", "name"]`) — see issue `#91`
- Anything else where the schema is `z.string()` but MapLibre accepts an expression

---

## 2. Live interaction checklist

For each item: open the panel, perform the action, observe expected outcome. Failures get filed.

### Admin app — wizard

| # | Action | Expected | Severity if fails |
|---|---|---|---|
| A1 | Login with admin credentials | Redirect to `/admin/configs` | critical |
| A2 | List existing configs | Table renders all configs with name/published/default flags | major |
| A3 | Click "Create New Map" | 9-step wizard renders, Step 1 active | major |
| A4 | Fill metadata, navigate Next/Previous between steps | No state lost on navigation | major |
| A5 | Open the live preview pane | Map renders even with empty config | major |
| A6 | Save partial config | Returns 200 with UUID, redirects to `/admin/configs/:id/edit` | major |
| A7 | Add 3 basemap presets, 1 sprite preset, 1 imagery layer | Each appears in its list with Edit/Remove | major |
| A8 | Add a layer via wizard, choose source + collection | Collection dropdown populates after source selection (see `#94` for clutter) | major |
| A9 | Open Style editor for a polygon layer | Polygon Fill section appears (see `#90` for spurious LineString block) | minor |
| A10 | Customize Fill Color via the picker | Live preview re-renders with new color | minor |
| A11 | Save the layer | Returns to the list, layer appears with badges | major |
| A12 | Re-open the same layer for edit | Every field round-trips (label, source, collection, zoom range, style) | major |
| A13 | Navigate to Step 6 Search & Display | List of layers, badges show search-fields/legend-entries counts | minor |
| A14 | Click Edit on a layer with a SearchPanel configured via PUT | Search fields render in the editor | major |
| A15 | Live preview SearchPanel — open a `select` with `prefetch: true` | Dropdown populates with distinct values from the column | major |
| A16 | Save the full config | 200 OK | major |
| A17 | View version history | Each save appears as a version | minor |
| A18 | Publish the config | `is_published` flips to true | major |
| A19 | Logout from User menu | Redirect to login | minor |

### Map client — viewer

(Numbered to match the Phase 3 golden-path checklist in SKILL.md)

| # | Action | Expected | Severity if fails |
|---|---|---|---|
| M1 | Visit `/<configName>` | Map renders, no console errors | critical |
| M2 | Verify URL params populate after first paint | `lat=`, `lng=`, `zoom=` appear in URL | minor |
| M3 | Open Layers panel | All configured layers list, default-visible checked | major |
| M4 | Toggle a hidden layer on | Vector tile fetches start, layer appears | major |
| M5 | Cycle all 3 basemaps | Each fully replaces previous basemap tiles | major |
| M6 | Toggle imagery layer | Satellite tiles overlay below data layers | minor |
| M7 | SearchPanel text + autocomplete | LIKE filter goes out, suggestions appear, ResultsDrawer populates | major |
| M8 | SearchPanel number range | `numberMatched` drops, ResultsDrawer reflects new count | major |
| M9 | SearchPanel datetime range | Same | major |
| M10 | SearchPanel select | Same | major |
| M11 | SearchPanel reset | Filters clear, vector tiles re-fetch unfiltered | minor |
| M12 | GlobalSearch type 3+ chars | Cross-layer suggestions appear, click flies to feature | major |
| M13 | Click a feature on the map | FeatureDetail opens with `propertyDisplay` keys + custom labels | major |
| M14 | Hover a feature | Tooltip shows configured properties | minor |
| M15 | Measure tool — distance | 2-segment line, distance shown | minor |
| M16 | Measure tool — area | Triangle, area shown | minor |
| M17 | Selection tool | Pick a layer, draw box, SelectionPanel populates | minor |
| M18 | CSV export from ResultsDrawer | File downloads with right columns | minor |
| M19 | PDF export | File downloads, sane render with basemap + visible layers + legend | minor |
| M20 | URL state restore on refresh | Pan/zoom/filter all preserved | minor |
| M21 | Offline reload (DevTools) | Cached config banner appears, map renders from `localStorage` | minor |
| M22 | Compass — click to reset bearing | Map re-orients to north | trivial |
| M23 | Click coordinate display to switch format | Decimal ↔ DMS toggle works | trivial |
| M24 | Click info button | Modal opens with rendered markdown | minor |

### Cross-cutting

| # | Action | Expected | Severity if fails |
|---|---|---|---|
| X1 | Console silence | Zero errors during normal flow (the `/api/auth/me` 401 on the admin login page is expected) | major if errors observed |
| X2 | Network panel | No 4xx/5xx during normal flow (other than expected 404s on `/api/configs/default` when no default is set) | major |
| X3 | CORS | No CORS errors when map-client calls tipg | critical |
| X4 | Vector tile re-fetch on filter change | URL of MVT requests changes when CQL2 filter changes (per AGENTS.md `getVectorTileSourceKey` rule) | major |

Items M5–M24 cannot be tested if M1 fails. That's the right reason to mark them "blocked" in the report — not "skipped".

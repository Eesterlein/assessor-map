---
name: qa-map-deployment
description: Run a live, hands-on QA session against a deployed (or local) instance of the TechTraverse admin app + map client, using a freshly built throwaway "test" map config to exercise as much of the wizard, lib, and viewer surface as possible. Use this skill whenever the user asks to "test the deployment", "smoke-test the map", "run QA against the live admin", "see if the new build works", "exercise the new feature on the deployed instance", or anything similar that involves driving the running system through a browser. Also use it after a meaningful change to the wizard, the map-client App shell, or any of the lib's interactive components, when you want a real-instance check on top of unit tests. The skill walks through credential discovery, layer research, building a feature-rich test config, round-trip verification, scripted golden-path interactions in the map client, exploratory probing, and structured GitHub issue filing under the `qa-session` label. Do **not** use this skill for unit testing, schema validation, or anything that runs offline — `pnpm verify` covers those.
---

# QA the Map Apps (live, end-to-end)

## Why this skill exists

`pnpm verify` confirms the code builds and unit tests pass. It tells you nothing about whether the running deployment actually works for a user — whether the map renders, whether layer toggles re-fetch tiles, whether the wizard round-trips a complex config, whether a basemap switch leaves the screen in a coherent state.

This skill is the live counterpart. It builds a throwaway "test" map config that touches as many features as possible, drives both the admin and the map-client through real interactions in a browser, and files issues for anything that breaks. It exists so that **regressions in the deployed bundle get caught the same day they ship**, not by the user.

The session that defined this skill (2026-05-10) found a critical map-client crash (`#89`), a schema gap (`#91`), a real SearchPanel data bug (`#92`), and four UX issues (`#90`, `#93`, `#94`, `#95`) — all from one ~2-hour run against a deploy that had previously passed `pnpm verify`. That's the kind of leverage this skill is designed to give every time it runs.

## When NOT to use this skill

- **Anything offline.** Schema-only changes, lib unit-test fixes, build-config tweaks — `pnpm verify` is the right tool.
- **Investigating a single known bug.** Use `ogc-api-troubleshoot` for "the map is empty" symptoms or `systematic-debugging` for any specific failing behavior. This skill is for *broad coverage*, not targeted bisection.
- **Loading new GIS data.** That's `load-gis-data`. This skill consumes whatever data is already in PostGIS via the OGC API.

## What you need before starting

1. **Target deployment URL** — default to the local Docker Compose stack at `http://localhost:8000` (the gateway, after `docker compose up -d`). If QA'ing a remote deploy, ask the user for its URL. Never assume.
2. **Admin credentials.** The local Docker Compose stack runs with **auth open by default** — `ADMIN_PASSWORD_HASH` is unset (the `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` lines in `docker-compose.yml` are commented out), so the admin app needs no login. If auth has been enabled (those env vars are set), get the credentials from whoever configured them, or verify a candidate password against the configured bcrypt hash with:
   ```bash
   node -e "require('bcryptjs').compare('CANDIDATE', '$HASH').then(console.log)"
   ```
3. **Browser automation.** Playwright MCP (`mcp__plugin_playwright_playwright__browser_*`) is the default driver. Load schemas via `ToolSearch` if not already in context.
4. **GitHub repo for issue filing.** Default is `techtraverse/map-traverse`. Confirm with the user if they want a different repo. Verify the `qa-session` label exists (`gh label list -R techtraverse/map-traverse`); create it if not.
5. **A working directory for artifacts.** Use `.playwright-mcp/qa-session/` — it's already screenshot-writable and inside the repo so paths in tool calls work.

## The phase flow

Run these phases in order. Mark each as a TaskCreate entry so the user can see progress and so resumed sessions know where to pick up.

### Phase 0 — Recon (read-only)

Goal: understand what the deployment *is* before you change anything.

1. Hit `/admin/` and `/ogc/collections?f=json` and `/api/configs` to confirm the basics respond. If anything 5xx's, stop and triage with `ogc-api-troubleshoot` instead of pressing on.
2. Inventory the existing configs (admin → Maps list). **Memorize their names** — you will not modify them.
3. Inventory the OGC collections you'll be drawing from. Use the procedure in `references/layer-research-playbook.md` to capture per-collection geometry type, queryables, sample feature properties, and row count. The output of this step is your menu of layers to compose into the test config.
4. Pick a layer set. Aim for **6–10 layers** that span all geometry types and create variety. The playbook explains how to build the set from whatever `/collections` returns for this deployment.

### Phase 1 — Build the test config

Goal: create a single throwaway config named `test` that exercises as many features as possible.

1. Walk the wizard from Create New Map through at least Steps 1 (Metadata), 2 (Info), 3 (Basemaps), 4 (Imagery), 5 (Layers — at least 1–2 layers manually). This **must** be done by clicking through the UI, not via API, because exercising the wizard is the whole point.
2. Save the partial config to obtain its UUID.
3. Use `PUT /api/configs/:id` to expand the config to its full layer/search/cql2/propertyDisplay shape. Pasting a 10-KB JSON via the API is dramatically faster than clicking through 9 layers' worth of style/legend/search dialogs, and the API is the same path the wizard uses, so any payload that PUTs cleanly is wizard-savable. Stick with the wizard for at least one layer of each geometry type; rely on the API for breadth.
4. **Publish it** with `POST /api/configs/:id/publish`. The map-client only loads `is_published=true` configs by name.

What "feature-rich" looks like is in `references/feature-coverage-checklist.md` under "Test config requirements". Cover all the bullets unless a specific item is intentionally skipped (note why).

### Phase 2 — Round-trip verify in the admin

Goal: confirm the wizard reads back what was PUT, with no silent loss.

1. Reload the edit page for the `test` config.
2. Walk every step of the wizard. For each step, spot-check 2–3 fields against the PUT payload — they should match exactly. Pay extra attention to: paint expressions (categorical match, zoom interpolate), `cql2Filter` rules, `propertyDisplay` keys, search field types and operators, info modal markdown.
3. Open Step 6 (Search & Display). Verify each layer's badges agree with the payload (`N search fields`, `N legend entries`, `hidden`, `z<min>–<max>`).
4. Inside the wizard preview pane, open the live SearchPanel and confirm prefetched options actually populate from the OGC API (this is how `#92` was caught — the "prefetched" dropdown leaked dirty distinct values past an explicit `options` list).

### Phase 3 — Drive the map client

Goal: be a real user. Open the map at `/test`, then run the golden-path checklist below. Then loosen up and run the exploratory prompts in `references/exploratory-testing-prompts.md`.

The golden-path checklist is a **must-pass** smoke test. Every item is one screenshot worth filing if it fails. The exploratory section is freeform — the goal is to surprise yourself.

#### Golden-path smoke checklist

1. **Page loads.** No React errors in the console, no white-screen, no untranslated MapLibre errors. Title reflects `branding.browserTitle`.
2. **Initial view.** Map centers on `initialView` lat/lng/zoom (verify by reading the URL params after first paint — `nuqs` should populate them).
3. **Layers panel.** Opens. Lists every layer in the config. Default-visible layers are checked; default-hidden are unchecked.
4. **Toggle a hidden layer on, then off.** Watch the network panel: vector tile requests should start when you check the box and stop when you uncheck. Layer should appear/disappear visually.
5. **Basemap switch.** Click each of the 3 basemaps. The whole viewport should re-style — no half-Positron-half-DarkMatter (#TBD if observed). Custom layer paint should remain readable on dark and light bases.
6. **Imagery toggle.** Open Imagery panel, toggle the satellite layer on. Tiles should overlay below the data layers.
7. **SearchPanel — text field.** Type into `ownername` (autocomplete), pick a suggestion, confirm a CQL2 LIKE filter goes out, ResultsDrawer populates.
8. **SearchPanel — number range.** Set `salesamoun` between two values, submit, confirm `numberMatched` drops, ResultsDrawer reflects.
9. **SearchPanel — datetime range.** Set `saledate` from/to, submit. Same expectations.
10. **SearchPanel — select.** Pick `accounttyp = Residential`. Filter goes out.
11. **SearchPanel — clear.** Reset filters, ResultsDrawer empties, vector tiles re-fetch without the filter.
12. **GlobalSearch.** Type 3+ chars in the global search bar. Suggestions for parcels/addresses/towns should appear. Click one — map flies to the feature, side panel may open.
13. **Click a feature on the map.** FeatureDetail panel opens with the keys configured in `propertyDisplay`, in the right order, with custom labels applied.
14. **Hover a feature.** Tooltip appears with the configured properties (if `showFeatureTooltip` is on).
15. **Measure tool.** Open, draw a 2-segment distance line, confirm distance shows. Switch to Area, draw a triangle, confirm area shows.
16. **Selection tool.** Pick a layer, draw a box, confirm the SelectionPanel populates with N selected features.
17. **CSV export.** From ResultsDrawer (or layer panel), trigger CSV export — file downloads, opens with the right columns.
18. **PDF export.** ExportModal → PDF. File downloads. Render is sane (basemap + visible layers + legend).
19. **URL state.** Pan/zoom/toggle a layer/run a filter. Refresh the page. State restores.
20. **Cached config banner.** Take the network offline (DevTools), reload — banner should appear and the map should still render from `localStorage`.

A failure on items 1–4 is **critical** (the map is unusable). Failures on 5–13 are **major** (a core feature is broken). 14–20 are **minor** unless they crash the page.

### Phase 4 — Exploratory probing

Open `references/exploratory-testing-prompts.md` and run through it. Time-box this to ~20 minutes. The goal is to deliberately try things you wouldn't normally — invalid input, rapid clicks, edge data, weird combinations — and notice what happens.

### Phase 5 — Report

For every confirmed bug, file an issue using the template in `references/issue-reporting-template.md`. Tag with `qa-session` plus one of `bug` / `enhancement` / `ux`. Include severity in the title or body, repro steps, expected vs actual, and a screenshot path.

After filing, update `.playwright-mcp/qa-session/REPORT.md` (overwrite each session) with:
- The config UUID + name + whether it was kept or deleted
- A table of issues filed with #, severity, area, title
- A "what worked well" section (positive findings — useful for the team)
- A "coverage gaps" section (which checklist items couldn't be tested and why — usually because an earlier item blocked them)

## Guardrails — never violate

- **Do not modify or delete existing configs.** Read them, learn from them; don't touch them. Only the `test` config is yours.
- **Do not run admin destructive actions** without explicit user confirmation in the same session: `DELETE /api/configs/:id` for anything but `test`, `set-default`, `unset-default`, `import` overwrites.
- **Do not commit anything to the repo** (the report and screenshots stay in `.playwright-mcp/qa-session/`, which is gitignored).
- **Do not push to `main`** under any circumstance.
- **Do not run `gh` commands that mutate state** beyond `gh issue create` / `gh label create`. No PR merges, no closing existing issues, no editing other people's issues.
- **Do not file an issue without verifying the bug is reproducible at least twice**, with localStorage/sessionStorage cleared between attempts. False-positive issues are worse than missed ones.
- **Do not use API-only paths to avoid wizard testing.** The point of this skill is to drive the UI. Use the API to *expand* a wizard-built config, not to replace it.

## Common failure modes for the agent

- **Skipping the wizard for speed.** If the entire test config is built via PUT, you've tested the lib and the API but learned nothing about the wizard. Always build at least one full layer through the wizard.
- **Treating React #185 as your fault.** When the map-client white-screens on every config (including pre-existing ones), the bug is in the deployed bundle, not your test config. File once and move on; don't keep tweaking the config.
- **Filing too many duplicate UX nits.** Pluralization, color contrast, missing labels — group these into one "wizard UX polish" issue per session unless one of them blocks a workflow.
- **Forgetting to publish the config.** The map-client only fetches published configs by name. If `/test` 404's, check `is_published`.
- **Driving by raw DOM events.** `element.dispatchEvent(new MouseEvent(...))` does not move a MapLibre map. Use Playwright's high-level click/drag/wait helpers, or call `window.maplibregl` directly via `browser_evaluate`.

## References

- `references/layer-research-playbook.md` — how to inventory OGC collections and pick a balanced layer set for the test config
- `references/feature-coverage-checklist.md` — exhaustive list of admin + map-client features the test config must cover
- `references/exploratory-testing-prompts.md` — freeform "try to break X" prompts for Phase 4
- `references/issue-reporting-template.md` — title format, body template, severity guide, label conventions

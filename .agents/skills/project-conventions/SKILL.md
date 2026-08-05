---
name: project-conventions
description: The non-negotiable architectural rules for the map-traverse / techtraverse monorepo, with the *why* behind each. Use this skill at the start of any non-trivial code change in this repo — before adding components, hooks, store fields, URL params, schema fields, app routes, or anything that crosses the lib/app boundary. Also use it whenever the user asks "how should I structure X", "where should this code live", "is this the right pattern", or seems about to violate one of the rules in AGENTS.md. The rules look like preferences but each one exists because violating it caused a real bug in the past. Reading this skill before writing code is much cheaper than discovering the rule during PR review.
---

# Project Conventions

## Why this skill exists

This is an AI-first project: any contributor — human or model — should be able to land a change that respects the architecture without needing to read the whole codebase first. The rules below are checked in `AGENTS.md` as terse bullet lists, but a list of "do this, don't do that" doesn't survive contact with a real task. This skill is the long-form version, with the *why*, so that when a rule and a goal seem to conflict, you can reason about which constraint is actually load-bearing.

If you're about to write code in this repo and you haven't read this skill yet, stop and read it. It takes two minutes and prevents most of the rework that happens at PR time.

## The non-negotiables

### 1. `packages/map-ui-lib` is framework-agnostic

> No `maplibre-gl`, no `react-map-gl`, no map rendering anywhere in the lib.

The library (`@techtraverse/map-ui-lib`) is an internal workspace package consumed only within this monorepo:
- `apps/map-client` (which renders an actual map with MapLibre)
- `apps/admin-app` (which renders the *config* for a map but doesn't render the map itself)
- vitest in jsdom (which has no canvas, no WebGL, nothing)

If you import MapLibre into the lib, the admin app starts pulling MapLibre into its bundle for no reason, and vitest blows up trying to run jsdom. The lib must remain usable without a map renderer. Map rendering belongs in `apps/map-client`. The lib can produce style specs (JSON), accept viewport state as plain props, and emit callbacks — but it never *renders* a map.

**Where to put map code instead:** `apps/map-client/src/`. The client wraps `react-map-gl/maplibre` in controlled mode and binds it to the Zustand store.

### 2. All UI components are fully controlled

> Data lives in the consumer (Zustand store, parent component, test). Components receive it via props and emit changes via callbacks. No internal data state.

"Fully controlled" doesn't mean "no `useState` allowed" — local UI state like "is this dropdown open" is fine. It means the component never owns *domain data*. The reason is that this app syncs Zustand state to URL params via `nuqs`. If a component owned, say, the list of selected layers internally, then opening the URL with `?layers=a,b` wouldn't pre-select anything — the component would initialize empty and overwrite the URL. By making everything controlled, the URL is always the source of truth and the round-trip works.

**Test:** can you reset the component to a different state by re-rendering it with different props, without remounting? If yes, it's controlled.

### 3. TailwindCSS uses the `mapui:` prefix

> Every Tailwind utility in `packages/map-ui-lib` is `mapui:foo`, never bare `foo`.

The lib ships its own scoped Tailwind v4 build so it can be embedded in pages that have their own (possibly conflicting) Tailwind setup, or no Tailwind at all. The `mapui:` prefix is configured in the lib's Tailwind config; without it, the class won't match anything in the generated CSS and the styling silently disappears in production.

Variants attach *outside* the prefix: `hover:mapui:bg-gray-50`, not `mapui:hover:bg-gray-50`. The prefix is on the utility, not the variant.

**Apps don't need the prefix.** `apps/map-client` and `apps/admin-app` use standard Tailwind for their own code. Only the lib has the prefix requirement.

### 4. Data flow: Config → Zod → Zustand → App → URL

> The order is one-way and you don't skip steps.

```
config.json
   │  parse
   ▼
Zod schema (packages/map-ui-lib/src/schemas/config.ts)
   │  hydrate
   ▼
Zustand store (apps/map-client/src/stores/)
   │  bind props
   ▼
React components (lib + app)
   │  user interaction
   ▼
nuqs URL params
   │  on next reload, re-hydrates the store
   ▼
(loop)
```

The Zod schema is the contract. If you add a field anywhere downstream without first adding it to the schema, you've created drift — the field will silently disappear when the admin app round-trips the config through Zod on save. **Always start at the schema.** See the `extend-map-config` skill for the full propagation order.

### 5. URL state via nuqs, with `history: 'replace'` for viewport

> Viewport changes (pan, zoom) use `history: 'replace'`. Everything else uses default `'push'`.

Viewport updates fire dozens of times per second when the user pans. With `'push'`, every one is a new history entry, and the back button becomes useless. With `'replace'`, the URL stays in sync but the back button still works as the user expects.

For "real" state changes (toggling a layer, opening a panel, applying a filter), `'push'` is correct — the user can hit back to undo.

### 6. The app talks to OGC API endpoints, not directly to PostGIS

> All data fetching goes through tipg (or another OGC-API-compliant server). The frontend never opens a Postgres connection.

This is what makes the lib reusable against any OGC API server, and what lets us swap tipg for pygeoapi or a hosted service later without touching React code. It's also why all the fetching lives in `utils/ogcApi.ts` and the hooks in `hooks/use*.ts` — both layers are HTTP-only.

### 7. Storybook stories are part of the contract

> Every component and every hook in `packages/map-ui-lib` has at least one `.stories.tsx` next to it.

Stories are how developers discover the lib, how visual changes get reviewed, and how you debug a component in isolation when something goes wrong in the app. A component without a story is a component nobody else will use correctly.

### 8. Always run `pnpm verify` before declaring a task done

> `pnpm verify` runs `pnpm build && pnpm test`. If it isn't green, the task isn't done.

This is the contract the agent automation pipeline relies on. Both the local
Claude Code workflow and the GitHub Action at `.github/workflows/claude.yml`
expect that "I'm finished" means "`pnpm verify` exits 0 on this branch". Don't
hand off, open a PR, or comment "ready for review" until you've run it.

If `pnpm verify` fails, fix the failure or — if the failure is real and
out of scope — say so explicitly in the PR description rather than silently
skipping.

### 9. No publish or changeset step

> `@techtraverse/map-ui-lib` is an internal workspace package — it is NOT published to npm.

Apps reference it via `workspace:*` in their `package.json`. There is no `pnpm changeset`, no `.changeset/` directory, and no publish/release script. When the lib API changes, update the consuming apps in the same PR.

## When the rules seem to conflict with the task

The rules above describe constraints, not goals. If you find yourself wanting to violate one — for example "I just need to import MapLibre into the lib for this one thing" — pause and re-read the *why* paragraph for that rule. Almost always, there's a way to achieve the goal without violating the constraint:

- **"I need map state in a lib component."** Accept it as a prop (`viewport: { latitude, longitude, zoom }`). Don't reach into a map instance.
- **"I need to fetch from a non-OGC endpoint."** Add it to `utils/` as a separate module, not under `ogcApi.ts`. The OGC convention is for OGC sources.
- **"I need a component that owns its data."** It's almost certainly two components: a controlled inner one in the lib and an outer "smart" one in the app that wires it to the store.

If the rules genuinely block a task, that's a real conversation to have — but the default assumption should be that the rules are right and the task needs to be reshaped, not the other way around.

## Other skills that go with this one

Once you know the rules, the per-task skills tell you how to apply them:
- `add-map-component` — adding a component to the lib
- `add-ogc-hook` — adding a fetch hook
- `extend-map-config` — extending the Zod schema and propagating downstream
- `load-gis-data` — adding new data so the OGC API can serve it
- `ogc-api-troubleshoot` — when the data exists but doesn't reach the browser

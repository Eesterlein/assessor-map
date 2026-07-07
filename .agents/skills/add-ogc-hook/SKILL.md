---
name: add-ogc-hook
description: Add a new React hook in packages/map-ui-lib/src/hooks/ that fetches data from an OGC API endpoint (Features, Tiles, Coverages, Maps, Records, etc.) backed by tipg, pygeoapi, or any other OGC-API-compliant server. Use this whenever the user asks to fetch, query, or expose data from an OGC endpoint — for example "add a hook for queryables", "fetch tile metadata from the OGC API", "I need a hook that hits /collections/{id}/items with a CQL2 filter", or anything that involves a new endpoint under /collections. Also use it when refactoring an existing fetch into a hook. The skill enforces the project's hook conventions: stable dependency keys, cancellation, loading/error/data shape, and a matching .stories.tsx for live testing.
---

# Add an OGC API Hook

## Why this skill exists

All data fetching in `@techtraverse/map-ui-lib` flows through hooks in `packages/map-ui-lib/src/hooks/`. Components stay dumb and controlled; hooks own the fetch lifecycle. This separation is what makes it possible to swap the backend (tipg, pygeoapi, a mocked test server) without touching components, and it's what keeps Storybook stories working — stories can render the hook in isolation.

The existing hooks (`useOgcCollections`, `useOgcFeatures`, `useOgcQueryables`, `useOgcCollectionDetail`) all share a deliberate shape. New hooks should match that shape so consumers don't have to learn a new pattern every time.

## The conventions

- **Inputs are nullable when they're optional.** A hook like `useOgcFeatures(baseUrl, collection, options)` accepts `baseUrl: string | null` and `collection: string | null`, and bails out (no fetch, returns initial state) when either is null. This lets consumers conditionally enable a hook without rendering tricks.
- **Output is `{ data, loading, error, ...flags }`.** Always include those three. Add extra flags (`hasMore`, `numberMatched`) only when they're meaningful for that endpoint.
- **Cancellation via a `cancelled` flag in the effect cleanup.** We don't use `AbortController` because tipg responses are small and the simpler cancellation pattern is consistent across all hooks. See `useOgcCollections.ts` for the canonical shape.
- **Stable dependency keys.** React's `useEffect` deps array compares by reference. Object props (options, auth) get serialized to a string key (`JSON.stringify(options)`, `auth.type:auth.name:auth.value`) and *that* goes in the deps array — otherwise the effect re-runs on every render. Add an `// eslint-disable-next-line react-hooks/exhaustive-deps` comment because the lint rule can't see through the serialization.
- **Auth is threaded as an optional `SourceAuth` prop.** It maps to either a query parameter or a request header per `SourceAuthSchema`. Always pass it down to the underlying `fetch*` util in `utils/ogcApi.ts`.
- **The fetch logic itself goes in `utils/ogcApi.ts`.** Hooks orchestrate React state; the actual `fetch()` call, URL building, and response parsing live in the util module so they can be unit tested without React.

## Steps

1. **Add the fetch util.** Open `packages/map-ui-lib/src/utils/ogcApi.ts` and add a `fetch<Thing>` function that takes `(baseUrl, ...params, auth?: SourceAuth)`, builds the URL, applies auth, calls `fetch`, throws on `!response.ok`, and returns a typed result. Export the result type alongside it.

2. **Create the hook file** at `packages/map-ui-lib/src/hooks/use<Thing>.ts`. Use `references/hook-template.md` as a starting point. Match the existing hooks' structure exactly:
   - Result interface named `Use<Thing>Result`.
   - Hook function signature mirrors the util's signature.
   - `useState` for each output field.
   - `useEffect` with the cancellation pattern and the serialized dependency key.

3. **Add a Storybook story.** Create `use<Thing>.stories.tsx` next to it (yes, hook stories — see `useOgcCollections.stories.tsx` for the pattern). The story renders a tiny harness component that calls the hook against `https://demo.pygeoapi.io/master` or a local tipg instance, displays the loading/error/data states, and lets you visually verify the hook works without needing a full UI component.

4. **Export from the barrel.** Add to `packages/map-ui-lib/src/hooks/index.ts`:
   ```ts
   export { useThing, type UseThingResult } from './useThing';
   ```
   Then re-export from `packages/map-ui-lib/src/main.ts` if external consumers should be able to import it directly.

5. **Verify.**
   - `pnpm storybook` and open the new hook story.
   - If you have a local tipg up (`docker compose up -d`), point the story at `http://localhost:8001` to test against your real data.
   - `pnpm test` if you added unit tests for the util.

## What to read first

- `packages/map-ui-lib/src/hooks/useOgcCollections.ts` — the simplest reference hook (~55 lines). Read this before writing anything.
- `packages/map-ui-lib/src/hooks/useOgcFeatures.ts` — shows the pagination/`hasMore` flag pattern and how options are serialized for the deps array.
- `packages/map-ui-lib/src/hooks/useOgcCollections.stories.tsx` — the hook-story pattern.
- `packages/map-ui-lib/src/utils/ogcApi.ts` — where the actual fetch lives.
- `references/hook-template.md` in this skill folder for a copy-pasteable starter.

## Common mistakes

- **Forgetting to serialize object deps.** If you put `options` directly in the deps array, the effect re-runs every render and you'll hit infinite fetch loops. Always serialize.
- **Throwing inside the `.then`.** Catch errors in the `.catch` and store them in state — never let them escape, or they'll bubble up to React's error boundary and crash the consumer.
- **Forgetting the `cancelled` check before `setState`.** This causes "state update on unmounted component" warnings and can cause stale data to land in a new mount.
- **Putting fetch logic in the hook file.** It belongs in `utils/ogcApi.ts` so the util is React-free and unit-testable.

---
name: add-map-component
description: Add a new UI component to the @techtraverse/map-ui-lib library (packages/map-ui-lib). Use this whenever the user asks to create, scaffold, or add a new component, panel, control, editor, drawer, modal, or widget to the map UI library, even if they don't explicitly say "component". Also use it when they ask to add a Storybook story for an existing component or to expose a new export from the library. The skill enforces the project's non-negotiable rules: framework-agnostic (no MapLibre imports), fully controlled, mapui:-prefixed Tailwind, plus a Storybook story.
---

# Add a Map UI Component

## Why this skill exists

`packages/map-ui-lib` is an internal workspace package (`@techtraverse/map-ui-lib`) consumed by `apps/map-client` and `apps/admin-app` within this monorepo. It is NOT published to npm. It has strict rules that exist for real reasons — violating them silently breaks downstream consumers in ways the type checker won't catch. This skill keeps new components consistent with the ~30 existing ones and the rules in `AGENTS.md`.

## The non-negotiables (and why)

- **No MapLibre, no `react-map-gl`, no map rendering code in the lib.** The library has to stay usable in environments that don't have a map (e.g. the admin app's config editor, jsdom tests, or a different renderer). If you import MapLibre here, you make the lib unusable for those consumers and you couple two layers that should evolve independently. Map integration lives in `apps/map-client`.
- **Fully controlled components.** State for *data* lives in the consumer (Zustand store, parent component, etc.). The component receives data via props and emits changes via callbacks. Local UI state (e.g. "is this dropdown open") is fine, but don't store domain data internally — that breaks URL sync via `nuqs` and makes the component impossible to reset deterministically.
- **`mapui:` Tailwind prefix on every class.** The lib ships its own scoped Tailwind v4 build so it can be embedded in pages with their own styles without collisions. A class without the prefix will simply not be styled in production. Always write `mapui:flex`, never bare `flex`.
- **Every component gets a Storybook story.** Stories are how developers discover and verify behavior, and how you debug in isolation.

## Steps

1. **Pick a location.** Components live at `packages/map-ui-lib/src/components/<ComponentName>/`. Use PascalCase for the directory and the file. If the component is admin-only (e.g. config editors, schema editors), put it under `components/admin/<ComponentName>/` and use the `Admin/` Storybook title prefix.

2. **Create three files** in that directory:
   - `<ComponentName>.tsx` — the component itself
   - `<ComponentName>.stories.tsx` — at least one default story plus an interesting variant
   - `index.ts` — barrel that re-exports the component and its props type

3. **Write the component.** Follow the patterns in `references/component-template.md`. Key shape:
   - Named export (not default).
   - Props interface named `<ComponentName>Props`, also exported.
   - Every prop is data-in or callback-out. Optional props get sensible defaults inline.
   - Loading / error / empty states each have a styled fallback — look at `CollectionBrowser.tsx` for the canonical pattern.
   - Wrap every Tailwind class with the `mapui:` prefix, including responsive and pseudo-class variants (`hover:mapui:bg-gray-50`).

4. **Write at least one story** in `<ComponentName>.stories.tsx`. The story file should:
   - Set `title` to `'<Group>/<ComponentName>'` (e.g. `'Admin/CollectionBrowser'`, `'Panels/LayerPanel'`).
   - Include a `Default` story with realistic mock props.
   - Use a `useState`-driven render function for any controlled component so the story is interactive.
   - Add at least one variant story showing a non-default state (preselected, empty, error, etc.).

5. **Export from the barrel.** Add to `packages/map-ui-lib/src/components/<ComponentName>/index.ts`:
   ```ts
   export { ComponentName } from './ComponentName';
   export type { ComponentNameProps } from './ComponentName';
   ```
   Then re-export from `packages/map-ui-lib/src/components/index.ts` *and* from `packages/map-ui-lib/src/main.ts`. If you skip `main.ts`, downstream apps won't see the new component.

6. **Verify before handing off.**
   - `pnpm --filter @techtraverse/map-ui-lib build` — catches missing exports and TS errors.
   - `pnpm storybook` — visually verify the new story renders.
   - `pnpm test` — run vitest if there are existing tests touching the area.

## What to read before writing

Before you start, skim:
- `packages/map-ui-lib/src/components/CollectionBrowser/` — the cleanest reference for a controlled component that uses an OGC hook, including loading/error/empty states.
- `packages/map-ui-lib/src/components/_shared/PropertyList.tsx` — the convention for shared sub-components used by multiple panels.
- `references/component-template.md` in this skill folder for a copy-pasteable starter.

## Common mistakes to avoid

- **Importing from `react-map-gl` or `maplibre-gl`.** The lint rules don't catch this in every file. If your component needs map state, accept it as a prop (e.g. `viewport: { latitude, longitude, zoom }`) rather than reaching into a map instance.
- **Storing fetched data in `useState` inside the component.** Use a hook from `packages/map-ui-lib/src/hooks/` (or add one — see the `add-ogc-hook` skill) and accept the result as a prop where possible.
- **Forgetting `mapui:` on hover/focus variants.** The correct form is `hover:mapui:bg-gray-50`, not `mapui:hover:bg-gray-50`. The `mapui:` prefix attaches to the *utility*, not the variant.
- **Skipping `main.ts` export.** Easy to miss; downstream apps will silently fail to import.

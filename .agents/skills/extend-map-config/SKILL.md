---
name: extend-map-config
description: Add or modify a field in the MapConfig Zod schema at packages/map-ui-lib/src/schemas/config.ts. Use this whenever the user asks to add a new config option, source type, layer property, basemap field, paint property, view setting, or anything else that lives in the JSON map config — for example "let users configure a default time range", "add a clustering option to vector sources", "support a new auth type", or "I need a new field in MapConfig". Also use it when validating existing config.json files against the schema or when changes to MapConfig need to flow into the Zustand store, the URL state, or the admin app's editor. The schema is the contract that everything else in the project depends on, so changes here ripple outward and need to be done carefully.
---

# Extend the MapConfig Schema

## Why this skill exists

The Zod schemas in `packages/map-ui-lib/src/schemas/config.ts` are the **single source of truth** for what a valid map configuration looks like. The whole data flow is:

```
config.json  →  Zod parse  →  Zustand store  →  React components  →  nuqs URL state
```

If you add a field anywhere downstream without first adding it to the schema, you'll either crash on parse or you'll silently lose the field on the next save round-trip through the admin app. Conversely, if you add a field to the schema but don't propagate it, you've added dead code. Both failure modes are easy to make and hard to spot.

This skill exists to make sure schema changes are done in the right order and that every downstream surface is updated.

## The order matters

Always work outward from the schema. Don't start in a component and "back-fill" the schema later — by then you've already coupled the component to assumptions that may not match the final shape.

1. **Schema first.** Add the field to the relevant Zod object in `config.ts`. Use `.optional()` and `.default()` where appropriate so existing configs keep validating.
2. **Tests second.** Add or update a fixture in `packages/map-ui-lib/src/schemas/__tests__/` that proves the new field parses correctly and that older configs without the field still validate. Run `pnpm test` and confirm green before going further.
3. **Type derivation.** The schema's inferred type (`z.infer<typeof MapConfigSchema>`) flows everywhere automatically — don't hand-write a parallel TypeScript interface. If you find yourself wanting to, that's a signal the schema isn't expressive enough.
4. **Zustand store** (`apps/map-client/src/stores/`). Add a slice/field for the new value, hydrating from the parsed config on app boot. Decide whether the field is "cold" (set once at hydration) or "hot" (mutable at runtime). Cold fields don't need a setter.
5. **URL state via nuqs** (only if the field is user-mutable and shareable). Add a parser. For viewport-style high-frequency updates use `history: 'replace'` so you don't pollute the back button. For everything else, default `history: 'push'` is fine.
6. **Components.** Update consumer components (and their stories) to read the new field. Components in `map-ui-lib` should accept the new value as a prop, not reach into the store — the store binding happens in the app layer.
7. **Admin editor.** If the field should be user-editable, update the relevant editor under `packages/map-ui-lib/src/components/` (`UIConfigEditor`, `LayerEditor`, `SourceEditor`, `BasemapEditor`, `ViewEditor`, `StyleEditor`, etc.) so it shows up in the admin app's config UI.
8. **Docs.** Update `docs/CONFIGURATION.md` with the new field, its type, default, and a short example.

## Schema authoring patterns to know

Reading `packages/map-ui-lib/src/schemas/config.ts` first will save you a lot of guesswork. Common patterns already used in the file:

- **Color or expression unions.** Many paint props accept either a literal color string or a MapLibre expression (an array). The helpers `colorOrExpr(default)` and `colorOrExprOptional()` exist for exactly this — use them rather than re-rolling the union.
- **Defaults.** Prefer `.default(value)` over `.optional()` when there's a sensible default. This way the parsed config always has the field, and downstream code doesn't need `?? defaultValue` everywhere.
- **Discriminated unions for source/layer types.** When adding a new variant, use `z.discriminatedUnion('type', [...])` so error messages tell users which variant failed instead of dumping every variant.
- **Min/max validation.** For numeric fields like `zoom`, `pitch`, `bearing`, `latitude`, `longitude`, always add `.min()` and `.max()`. The schema is the only place these constraints get enforced; nothing downstream re-checks.
- **`z.string().min(1)` for required strings.** Empty strings are not the same as missing; both are usually invalid.

## Backwards compatibility

The schema parses real `config.json` files that exist on disk and in the admin database. **Never make a previously-optional field required without a migration.** If a field needs to become required, the safer pattern is:

1. Add it as `.optional()` with a default in the parse step.
2. Land that change.
3. Run a migration script over existing configs to fill in the field.
4. Tighten the schema in a follow-up.

If you're truly making a breaking change, bump the major version. The lib is an **internal workspace package** — it is NOT published to npm and there is no changeset or publish step. Propagate breaking schema/config changes by updating the consuming apps (`apps/map-client`, `apps/admin-app`) in the same PR.

## What to read first

- `packages/map-ui-lib/src/schemas/config.ts` — the whole schema. ~600 lines, but skim section by section.
- `packages/map-ui-lib/src/schemas/__tests__/` — existing parse tests show the patterns for fixtures.
- `docs/CONFIGURATION.md` — the user-facing docs you'll be updating.
- `apps/map-client/src/stores/` — see how the existing store hydrates from a parsed config.

## Common mistakes

- **Adding the field to the store before the schema.** The next config reload will throw because Zod doesn't know about the new field if `.strict()` is used, or silently drop it otherwise.
- **Hand-writing a TS interface in parallel.** Always use `z.infer`. Two sources of truth means they'll drift.
- **Forgetting `.default()` on a new field.** Existing configs will then need to be edited by hand to validate. Defaults make schema additions zero-friction for users.
- **Skipping the `__tests__` update.** Schema regressions are devastating because they cascade — a single broken parse takes the whole app down on boot.

# Exploratory Testing Prompts

The golden-path checklist catches regressions in expected flows. The bugs that hurt users live in *unexpected* flows. Reserve ~20 minutes per session to actively try to break things.

These are prompts, not steps. Treat each as an invitation to improvise.

## Format

For each prompt: try the action, observe what happens, decide if it's a bug. If unsure, try once more — and if you can't reliably reproduce, write a one-line note in the report under "non-reproducible observations" instead of filing.

## The prompt list

### Wizard

- **Save with no layers.** Does the config save? Should it?
- **Save with a layer that points to a collection that doesn't exist.** What's the error UX? Does the wizard let you save it? Does the map-client crash on it later?
- **Set a layer's `minZoom` higher than `maxZoom`.** Does the wizard catch the contradiction? Does the schema?
- **Set the initial view's `zoom` outside `[minZoom, maxZoom]`.** Same question.
- **Type a name that already exists** ("mike1", "demo"). Does it 409 or silently overwrite?
- **Type a name with weird characters** (`my map!`, `테스트`, `' OR 1=1 --`, a 200-char name). What's enforced?
- **Add the same source twice** with the same ID. What happens?
- **Add the same layer ID twice.** Same.
- **Reorder layers via the up/down buttons rapidly.** Does the visible order match the configured order?
- **Use the wizard's drag handle (`⠿`) to reorder.** Does drag work in addition to up/down? Does it persist?
- **Add a layer, then change its source, then save.** Does the collection field reset, or does it keep a stale value that points to the wrong source?
- **Click Cancel after editing a layer with unsaved changes.** Are you warned, or does the work silently disappear?
- **Open two browser tabs to the same config.** Edit in one, save. Edit in the other, save. Last-write-wins, or is there a conflict UI?
- **Toggle "Hide Preview" rapidly.** Does the preview re-mount cleanly? Any leaked MapLibre instances?
- **Switch wizard steps with unsaved Layer Editor open.** Are the unsaved changes preserved or lost?
- **Open the Color Picker, click "Paste color" with nothing on the clipboard.** Does it gracefully no-op?
- **Upload a 2 MB favicon.** The form says max 100 KB — does it reject cleanly or hang?
- **Upload a non-image file as favicon.** Does it reject?
- **Set Markdown content with a `<script>` tag.** Is it rendered or escaped? (Should be escaped — XSS check.)

### Map client

- **Refresh during the initial load.** Does the partially-hydrated state cause a crash?
- **Pan to the antimeridian (lng > 180).** Do tile requests still go out? Are layers visible on both sides?
- **Zoom to max + scroll-wheel up.** Does the map clamp cleanly or oscillate?
- **Open SearchPanel on a layer, then toggle that layer off.** Does the panel still allow filter changes? Does anything render?
- **Submit a SearchPanel filter that matches zero features.** Empty state in ResultsDrawer? Loading spinner that never resolves?
- **Submit a filter that matches 50,000+ features.** Pagination? Truncation? Crash?
- **Apply 5 filters across 5 different layers simultaneously.** Does the URL grow unbounded? Does the network panel show 5 separate requests or are they batched?
- **Open GlobalSearch and type something with a `%` character** (e.g. `5%`). Does it get URL-encoded correctly into the CQL2 filter?
- **Click rapidly on the same feature 10 times.** Does FeatureDetail flicker, leak event listeners, or reopen reliably?
- **Click a feature on a layer that has no `propertyDisplay`.** Are all properties shown? Is the order stable across clicks?
- **Click a feature whose `propertyDisplay` references properties that don't exist on this feature** (e.g. null values). What's rendered for null/missing?
- **Toggle a layer off while its tiles are mid-flight.** Are pending requests aborted? Or do they complete and pollute the map after the user has already moved on?
- **Drop the network during tile fetching.** Does the map gray out, show stale tiles, or display an error?
- **Switch basemaps mid-pan.** Does the map handle the concurrent style change + pan?
- **Open Measure, draw a 50-vertex polygon by clicking 50 times.** Performance OK? Does the area calc match `turf.area()`?
- **Open Selection, draw a box across the entire visible map.** Does it select 10k features without freezing?
- **CSV export with a 10k-feature filter.** How long does it take? Does the file open cleanly in Excel?
- **PDF export at A4 vs A3 vs portrait vs landscape.** Does the legend overflow? Does the basemap clip oddly?
- **Use Selection across two layers at once.** What's the union behavior?
- **Open the Info modal, then click anywhere outside it.** Does it close? Is there a focus trap?
- **Tab through the page.** Does keyboard focus visit every interactive element in a logical order? Are there focus traps?
- **Use a screen reader (VoiceOver or NVDA, or check ARIA via DevTools).** Are the panel buttons labelled? Is the legend announced?
- **Resize the browser to 600x400 (mobile).** Does the layout collapse usefully? Do panels become drawer-like?
- **Set browser zoom to 200%.** Do controls overflow each other?
- **Switch the OS to dark mode.** Does the map app respect it (it probably doesn't, but worth filing if there's no theme story).

### Cross-cutting

- **Hold the page open for an hour.** Are there any background polls, leaks, or token expirations?
- **Run two map-clients in two tabs against the same config.** Edit a layer in the admin in a third tab, republish — do the open tabs notice or stay stale?
- **Test on Firefox / Safari** if Chromium passes. Different vector tile rendering, different CSS support.

## When in doubt — file or note?

- Reproducible 2x with `localStorage` cleared between → **file**
- Hard to repro, vague feeling something was wrong → **note in the report under "non-reproducible observations"**
- Clearly intended behavior but bad UX → **file** with `ux` label
- Silent data corruption (saved value differs from displayed value) → **file as bug, even if minor** — these are the worst class

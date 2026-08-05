# Issue Reporting Template

How to file GitHub issues from a QA session so they're actionable, deduplicatable, and routable to the right person without follow-up questions.

## Repo + labels

- **Default repo:** `techtraverse/map-traverse`. Confirm with the user if working against a fork.
- **Required label:** `qa-session` (so all session findings can be queried as a group). Create it once if missing:
  ```bash
  gh label create qa-session --color "BFE5BF" \
    --description "Found during a Claude QA session" \
    -R techtraverse/map-traverse
  ```
- **Type label** (pick one):
  - `bug` — something is broken or returns the wrong result
  - `enhancement` — a missing capability that the schema/UI doesn't yet support
  - `ux` — works correctly but the user experience is wrong (confusing, inconsistent, accessibility)
  - `documentation` — a doc-only fix would close it
- **Optional area label** if it exists in the repo (`admin-app`, `map-client`, etc.). Don't create new area labels mid-session — file with the type label only.

## Severity guide

Encode severity in the issue body's first paragraph (and the title prefix when it would otherwise look minor). Severity drives priority, not labels.

| Severity | Definition | Examples |
|---|---|---|
| **critical** | Blocks all use of a major surface. Page crash, data loss, security hole. | `#89` (map-client white-screen on every config) |
| **major** | A core feature is broken or returns wrong data. | `#92` (SearchPanel options leak), CSV export missing rows |
| **minor** | Edge case, bad UX in a non-critical flow, or workaround exists. | `#90` (spurious style block), `#94` (dropdown clutter), `#95` (color textbox mismatch) |
| **trivial** | Cosmetic. Pluralization, contrast, alignment. | `#93` (`1 search fields`) |
| **enhancement** | Missing feature. Not a regression. | `#91` (text-field expressions) |

## Title format

```
<area>: <one-sentence description, lowercase, no trailing period>
```

Examples:
- `map-client: white-screen crash with React error #185 (infinite render loop) on every config`
- `wizard StyleEditor: polygon-only layer is initialized with a spurious LineString style block`
- `select search field: prefetch: true ignores explicit options and shows raw distinct values`
- `schema: layout.text-field rejects expressions, blocking data-driven labels`

Rules:
- Start with the area in lowercase: `map-client`, `wizard`, `admin`, `schema`, `tipg`, `select search field`, etc.
- One sentence. Imperative summary, not "the map crashes" — say what is broken: `map-client: white-screen crash with React error #185...`
- No emoji, no severity tags, no `[QA]` prefix (the `qa-session` label is enough)
- ≤ 100 chars

## Body template

Copy this verbatim and fill in. Sections can be omitted only when truly N/A.

```markdown
## Summary

<One-paragraph overview. Lead with the user-visible failure, then the root area. End with a sentence about the impact.>

Affects the **deployed bundle on `<branch>` HEAD (`<commit-sha>`, bundle `<hash>.js`)**. <Same in local? Mention.>

## Reproduction

1. <Numbered, copy-pasteable steps.>
2. <Include URLs, exact text typed, exact buttons clicked.>
3. <Capture network requests, console messages, file contents.>

Confirmed reproducible with `localStorage` and `sessionStorage` cleared, across <how many tries / which environments>.

## Expected

<What should happen. One paragraph.>

## Actual

<What does happen. Console / network / screenshot evidence here.>

\`\`\`
<error message or wrong output, verbatim>
\`\`\`

## Impact

**<Severity>.** <One sentence on who is affected and how.>

## Likely areas to investigate

<For bugs you couldn't trace fully: which files / hooks / functions are the most likely culprit and why. Don't speculate beyond what the evidence supports — note "couldn't bisect from minified bundle" if true.>

- `path/to/file.tsx` — <reason>
- `path/to/other.ts` — <reason>

## Recommended next step

<One concrete action a developer can take to make progress. Often "run a non-minified dev build to get the React component name" or "check the schema definition at line N".>

## Artifacts

- Screenshot: `<path in repo, usually .playwright-mcp/qa-session/...>`
- Network log: <if attached>
- Config used: <UUID + name + whether kept on the deployment>

Found during a Claude-driven QA session against the deployment on <YYYY-MM-DD>.
```

## Filing flow

1. **Verify the bug is reproducible.** Hit it twice, ideally with a fresh browser context. If it's a one-off, write it under "non-reproducible observations" in the report and skip filing.
2. **Search existing issues** before filing:
   ```bash
   gh issue list -R techtraverse/map-traverse --state all --search "<short keyword>"
   ```
   If there's an existing issue, comment with your repro instead of opening a duplicate. Tag with `qa-session` via `gh issue edit N --add-label qa-session` if it isn't already.
3. **Take a screenshot** at the failure state — save to `.playwright-mcp/qa-session/NN-short-description.png`. Reference the relative path in the issue body.
4. **File via gh CLI**, using a heredoc to preserve formatting:
   ```bash
   gh issue create -R techtraverse/map-traverse \
     --title "<title>" \
     --label "bug,qa-session" \
     --body "$(cat <<'EOF'
   <body following the template>
   EOF
   )"
   ```
5. **Note the issue number in the session report** so the closing summary can link to all of them.

## Filing dos and don'ts

**Do:**
- File one issue per distinct bug, even if you found 5 in one session.
- Include the deployed bundle hash and branch HEAD. Future readers need to know if a fix is in.
- Quote console output verbatim. Don't paraphrase error messages.
- Link to the specific code path you suspect, with `file:line`. Even a wrong guess focuses the developer.
- Note when you couldn't fully diagnose ("couldn't bisect from minified bundle"). Honesty helps, hand-waving doesn't.

**Don't:**
- Don't file a single mega-issue with 5 unrelated bugs. They'll never all close.
- Don't file pluralization / spelling / color contrast as separate issues. Group small UX nits into one "wizard UX polish — N items" issue per session unless one of them blocks a workflow.
- Don't file something you can't reproduce. Note it in the report instead.
- Don't speculate about root cause beyond what the evidence supports. "Likely caused by X" with reasoning is useful; "definitely caused by X" without proof wastes the developer's time.
- Don't @-mention people in QA-session issues unless the user explicitly asks. Let the team triage on their schedule.
- Don't file issues against `main` branch state when you're testing a feature branch. Verify the bug is on the branch HEAD that's deployed (commit hash matters).
- Don't comment "any update?" on existing issues during a QA session. That's not the job.

## After filing

Update `.playwright-mcp/qa-session/REPORT.md` with:

```markdown
## Issues filed

| # | Severity | Area | Title |
|---|---|---|---|
| 89 | critical | map-client | white-screen React #185 infinite-loop on every config |
| 90 | minor | wizard StyleEditor | spurious LineString block on polygon-only layers |
| ... | ... | ... | ... |
```

This table is the artifact the user reads first. Make it scannable.

## Closing the loop

When a session finishes, post a single comment summary message to the user with:

- Issue count by severity
- Direct links to the critical/major issues
- The kept-or-deleted state of the `test` config
- A pointer to `.playwright-mcp/qa-session/REPORT.md`

Do not ping anyone, do not auto-close anything, do not push to `main`.

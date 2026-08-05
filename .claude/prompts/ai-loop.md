# AI Loop — Orchestrator Prompt

Paste everything below the line into a fresh Claude Code session to start the loop.

---

You are an orchestrator (the lead agent) executing a phased development plan. You will iterate through 5 phases, creating agent teams for parallel work and working solo for sequential work.

## Setup

1. Read `PLAN.md` in the repo root. It contains the full plan with 5 phases, chunk details, and execution strategy.
2. Read `AGENTS.md` in the repo root for project conventions.
3. Confirm you are on the `ai/main` branch. If not: `git checkout ai/main && git pull origin ai/main`
4. Run `pnpm verify` to confirm the branch is green before starting. If it fails, STOP and report.

## Phase Execution

Iterate through phases 1–5 in order. Check PLAN.md for each phase's details.

---

### PARALLEL phases (Phases 1 and 3) — use agent teams

For these phases, create an agent team where each teammate handles one chunk (or chunk group) on its own branch.

**Phase 1 — create a team of 3 teammates:**

```
Create an agent team with 3 teammates to implement Phase 1 in parallel. Each teammate works on a separate branch from ai/main. No teammate should run Docker commands — only pnpm verify.

Teammate 1 (chunk-1a): Create branch `ai/phase-1-chunk-a` from ai/main. Your task is to move the admin app's database tables into a dedicated `map_admin` schema. Read `.agents/skills/project-conventions/SKILL.md` and `AGENTS.md` first. Then read PLAN.md Phase 1, Chunk 1A for the full plan. Make your changes, run `pnpm verify`, fix any failures, commit your work. Do NOT merge into ai/main. Do NOT run docker compose. Report your branch name and whether verify passed.

Teammate 2 (chunk-1b): Create branch `ai/phase-1-chunk-b` from ai/main. Your task is to fix the broken shapefile export. Read `.agents/skills/project-conventions/SKILL.md` and `AGENTS.md` first. Then read PLAN.md Phase 1, Chunk 1B for the full plan. Make your changes, run `pnpm verify`, fix any failures, commit your work. Do NOT merge into ai/main. Do NOT run docker compose. Report your branch name and whether verify passed.

Teammate 3 (chunk-1c): Create branch `ai/phase-1-chunk-c` from ai/main. Your task is to rename "configurations" to "maps" throughout the admin app UI. Read `.agents/skills/project-conventions/SKILL.md` and `AGENTS.md` first. Then read PLAN.md Phase 1, Chunk 1C for the full plan. Make your changes, run `pnpm verify`, fix any failures, commit your work. Do NOT merge into ai/main. Do NOT run docker compose. Report your branch name and whether verify passed.
```

After all 3 teammates finish, you (the lead) perform the merge:
1. `git checkout ai/main`
2. Merge each branch: `git merge ai/phase-1-chunk-a --no-ff`, then `ai/phase-1-chunk-b --no-ff`, then `ai/phase-1-chunk-c --no-ff`
3. If a merge conflict occurs, attempt to resolve it: read both sides, understand the intent, and produce a correct merged result. Only STOP and report to the user if you're unsure which change to keep (e.g., the two sides contradict each other or the intent is ambiguous).
4. Run `pnpm verify`. If it fails and the fix is obvious (missing import, type error from merge): fix, commit, re-run. If not obvious: STOP.
5. Docker smoke test (Phase 1 only — because it changed DB schema): `docker compose down -v && docker compose up -d`. Wait for healthy. Verify admin app: `curl -s http://localhost:3001/`. If Docker fails: STOP.
6. Clean up the team.
7. Log: "Phase 1 complete. ai/main is green."

**Phase 3 — create a team of 3 teammates:**

```
Create an agent team with 3 teammates to implement Phase 3 in parallel. Each teammate works on a separate branch from ai/main. No teammate should run Docker commands — only pnpm verify.

Teammate A (geo-zoom): Create branch `ai/phase-3-agent-a` from ai/main. Your tasks are Chunks 3B (smarter zoom-to) and 3C (go-to lat/long). Read `.agents/skills/project-conventions/SKILL.md`, `.agents/skills/add-map-component/SKILL.md`, and `AGENTS.md` first. Then read PLAN.md Phase 3, Chunks 3B and 3C for the full plans. These both touch geo utilities and coordinate components. Make your changes, run `pnpm verify`, fix any failures, commit your work. Do NOT merge into ai/main. Report your branch name and whether verify passed.

Teammate B (export-results): Create branch `ai/phase-3-agent-b` from ai/main. Your tasks are Chunks 3A (export selected features) and 3D (interactive results table). Read `.agents/skills/project-conventions/SKILL.md`, `.agents/skills/add-map-component/SKILL.md`, and `AGENTS.md` first. Then read PLAN.md Phase 3, Chunks 3A and 3D for the full plans. These touch ExportModal and ResultsDrawer — different files from the other teammates. Make your changes, run `pnpm verify`, fix any failures, commit your work. Do NOT merge into ai/main. Report your branch name and whether verify passed.

Teammate C (admin-json): Create branch `ai/phase-3-agent-c` from ai/main. Your task is Chunk 3E (JSON editor in review step + import config). Read `.agents/skills/project-conventions/SKILL.md` and `AGENTS.md` first. Then read PLAN.md Phase 3, Chunk 3E for the full plan. This is entirely in apps/admin-app/ — no overlap with other teammates. Make your changes, run `pnpm verify`, fix any failures, commit your work. Do NOT merge into ai/main. Report your branch name and whether verify passed.
```

After all 3 teammates finish, you (the lead) perform the merge:
1. `git checkout ai/main`
2. Merge each branch in order: agent-a, then agent-b, then agent-c
3. Resolve merge conflicts. STOP only if unsure which change to keep.
4. Run `pnpm verify`. Fix obvious issues or STOP.
5. No Docker smoke test needed for Phase 3.
6. Clean up the team.
7. Log: "Phase 3 complete. ai/main is green."

---

### SEQUENTIAL phases (Phases 2, 4, and 5) — you work solo

For these phases, you (the lead) do all the work yourself. No team needed — this saves tokens because the context (config.ts, UIConfigEditor, etc.) stays warm across chunks.

**Phase 2:**
1. Read `.agents/skills/project-conventions/SKILL.md` and `.agents/skills/extend-map-config/SKILL.md`
2. Create branch `ai/phase-2` from `ai/main`
3. Work through Chunks 2A → 2B → 2C → 2D → 2E in order (read each from PLAN.md)
4. Commit after each chunk with a descriptive message
5. After all chunks: run `pnpm verify`, fix any failures
6. If you modified the public API of packages/map-ui-lib, update the consuming apps in the same PR (no changeset — the lib is internal-only)
7. Merge into ai/main: `git checkout ai/main && git merge ai/phase-2 --no-ff`
8. Log: "Phase 2 complete. ai/main is green."

**Phase 4:**
1. Read `.agents/skills/project-conventions/SKILL.md`, `.agents/skills/extend-map-config/SKILL.md`, and `.agents/skills/add-map-component/SKILL.md`
2. Create branch `ai/phase-4` from `ai/main`
3. Work through Chunks 4A → 4B → 4C → 4D in order (read each from PLAN.md)
4. Commit after each chunk
5. After all chunks: `pnpm verify`, fix failures
6. Merge into ai/main: `git checkout ai/main && git merge ai/phase-4 --no-ff`
7. Log: "Phase 4 complete. ai/main is green."

**Phase 5:**
1. Read `.agents/skills/project-conventions/SKILL.md`, `.agents/skills/extend-map-config/SKILL.md`, and `.agents/skills/add-map-component/SKILL.md`
2. Create branch `ai/phase-5` from `ai/main`
3. Work through Chunks 5A → 5B → 5C → 5D → 5E in order (read each from PLAN.md)
4. Commit after each chunk
5. After all chunks: `pnpm verify`, fix failures
6. Merge into ai/main: `git checkout ai/main && git merge ai/phase-5 --no-ff`
7. Log: "Phase 5 complete. ai/main is green."

---

## Between Phases

After each phase:
1. Verify you are on `ai/main` and it's clean: `git status`
2. Run `pnpm verify` as a sanity check
3. If the phase touched DB/Docker code (Phase 1): verify Docker services are healthy
4. Log the phase completion and proceed to the next

## Stop Conditions

HALT the entire loop and report to the user if:
- A merge conflict is ambiguous (unsure which change to keep)
- `pnpm verify` fails after a phase and can't be fixed
- A teammate reports ambiguous requirements or a broken prerequisite
- A teammate fails to complete its task
- Docker smoke test fails (Phase 1)

When stopping, report:
- Which phase and chunk caused the issue
- The exact error or conflict
- Which branches exist and their state
- A suggested next step for the human

## Phase Reference

- **Phase 1**: TEAM (3 teammates) — DB schema migration, shapefile fix, rename configs→maps
- **Phase 2**: SOLO (lead only) — legend order, scale bar, tooltip suppression, coordinate formats, versioning design doc
- **Phase 3**: TEAM (3 teammates) — Teammate A: zoom+goto, Teammate B: export+results, Teammate C: JSON editor+import
- **Phase 4**: SOLO (lead only) — color themes, expanded search, PDF export, imagery thumbnails
- **Phase 5**: SOLO (lead only) — side menu component, then control positions, layout toggle, icons, mobile audit

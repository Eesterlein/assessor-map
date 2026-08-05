@AGENTS.md

# Claude Code specifics

Everything canonical lives in `AGENTS.md` (imported above) and `.agents/skills/`.
This file holds only what other harnesses can't use.

## Worktrees
`EnterWorktree` branches from `origin/main` by default — wrong for this repo.
Create manually off `ai/main` first, then enter by path:
`git worktree add .claude/worktrees/<name> -b ai/<name> ai/main`

## Team tasks
Each teammate gets its own worktree off `ai/main`. The lead merges all branches
into `ai/main` after teammates finish (full orchestrator prompt:
`.claude/prompts/ai-loop.md`). Coordination mechanism:
- `TeamCreate` once → shared task list at `~/.claude/tasks/<team>/`.
- `TaskCreate` one task per workstream; create a final lead-integration task and set `addBlockedBy` to the workstream task IDs.
- Spawn each teammate via `Agent` with `team_name` + `name` + a self-contained prompt pointing at one plan section. Use `run_in_background: true` so the lead's context stays free.
- Teammates report via `SendMessage` to the lead. Don't poll — messages arrive as turns.
- After lead's integration task: `TeamDelete` cleans up the task list and team config.

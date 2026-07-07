# AI Strategy — Context Engineering Across Harnesses

This repo is built to work with **any** AI coding agent (Claude Code, Codex,
OpenCode, Cursor, Copilot, …). Instead of maintaining per-harness instruction
files, we standardize on two open formats and keep per-harness footprint to the
minimum shim each tool requires.

## The two standards

| Standard | What it covers | Spec |
|---|---|---|
| **AGENTS.md** | Project instructions: commands, architecture rules, git workflow, gotchas | [agents.md](https://agents.md/) (Linux Foundation / Agentic AI Foundation) |
| **Agent Skills** | On-demand task playbooks: one folder per skill with a `SKILL.md` | [agentskills.io](https://agentskills.io/) (originated by Anthropic, now open) |

`AGENTS.md` is always-loaded context — keep it terse, facts only. Skills are
loaded only when relevant (progressive disclosure: agents see just the
`name`/`description` until a task matches), so long-form procedures, templates,
and checklists belong there, not in `AGENTS.md`.

## Where things live

```
AGENTS.md                  ← canonical instructions (every harness)
.agents/skills/<name>/     ← canonical skills (every harness)
CLAUDE.md                  ← shim: "@AGENTS.md" import + Claude-only team-task choreography
.claude/skills             ← symlink → ../.agents/skills (Claude Code discovery path)
.claude/settings.json      ← Claude Code permission allowlist
.claude/prompts/ai-loop.md ← Claude Code multi-agent orchestrator prompt
.mcp.json                  ← MCP servers (postgres) — Claude Code convention
.claudeignore              ← Claude Code context excludes
docs/DEVELOPMENT.md        ← dev setup + Docker troubleshooting (referenced from AGENTS.md)
```

## Harness support matrix

| Harness | AGENTS.md | Skills | Shim needed |
|---|---|---|---|
| Codex | native | native (`.agents/skills/`) | none |
| OpenCode | native | native (reads `.agents/`, `.claude/`, `.opencode/`) | none |
| Cursor / Copilot / Zed / Jules / … | native | native (`.agents/skills/`) | none |
| Claude Code | via `@AGENTS.md` import in `CLAUDE.md` | via `.claude/skills` symlink | `CLAUDE.md` stub + symlink (already committed) |

## Rules of the road

1. **Canonical content goes in `AGENTS.md` or a skill — never in a
   harness-specific file.** If you're about to add a rule to `CLAUDE.md`, stop:
   it belongs in `AGENTS.md` (a fact every agent needs) or a skill (a procedure
   loaded on demand).
2. **Harness-specific files may only contain what that harness alone can use**:
   permissions, MCP wiring, tool-specific orchestration (e.g. Claude's
   `TeamCreate`/`SendMessage` team workflow).
3. **Facts vs. procedures**: a one-line constraint ("no MapLibre in lib") →
   `AGENTS.md`. A multi-step playbook with templates ("add a component") → a
   skill.
4. **Don't duplicate.** The pre-2026-07 setup repeated the architecture rules in
   five places (`CLAUDE.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `.agent/`,
   skills). One canonical home each, everything else references it.
5. **After changing agent config** (AGENTS.md, skills, symlinks), smoke-test
   discovery headlessly: `claude -p "list your project skills"` and
   `opencode run "list your skills"` — both should show the 7 skills and
   AGENTS.md content.

## Adding a skill

```
.agents/skills/my-skill/
├── SKILL.md          # required — frontmatter: name, description (stick to these two)
└── references/       # optional supporting files, loaded on demand
```

Keep frontmatter to the standard `name` + `description` fields so the skill
works in every harness. The `description` is the trigger — write it as "use
when …" with the phrases a user would actually say.

## What's deliberately harness-specific

- **`.claude/settings.json`** — Claude Code Bash/WebFetch permission allowlist.
  OpenCode/Codex users: configure equivalents in `opencode.json` /
  `~/.codex/config.toml` if you want the same guardrails; not required.
- **`.mcp.json`** — postgres MCP server. OpenCode configures MCP in
  `opencode.json`, Codex in `config.toml`; add locally if you need direct DB
  queries from your agent.
- **`.claude/prompts/ai-loop.md`** + `CLAUDE.md` "Team tasks" — multi-agent
  team orchestration uses Claude-only tools. The *invariants* (worktrees off
  `ai/main`, lead merges) are in `AGENTS.md` and apply to every harness.
- **GitHub Actions** (`claude.yml`, `claude-code-review.yml`) — CI-side agents,
  independent of local harness choice.

## History

Migrated 2026-07 from a four-convention layout (`CLAUDE.md` + `.cursorrules` +
`.cursor/rules/` + `.agent/`) to the standards above. Cursor's files were
deleted outright — Cursor reads `AGENTS.md` and `.agents/skills/` natively.

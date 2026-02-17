# Loofi Veo Prompt Generator — Claude Code Instructions

> **Canonical instructions**: `.ai/INSTRUCTIONS.md`
> This file contains Claude-specific overrides only. Read `.ai/INSTRUCTIONS.md` first.

---

## Claude-Specific Configuration

### Model Routing

| Agent                        | Claude Model |
| ---------------------------- | ------------ |
| project-coordinator          | opus         |
| architecture-advisor         | sonnet       |
| backend-builder              | sonnet       |
| frontend-integration-builder | sonnet       |
| code-implementer             | sonnet       |
| test-writer                  | haiku        |
| release-planner              | haiku        |

### Agent Paths

| Purpose           | Path                    |
| ----------------- | ----------------------- |
| Agent definitions | `.claude/agents/`       |
| Agent memory      | `.claude/agent-memory/` |

### Cost Rules

- **opus**: Only for complex planning/coordination (~15% of calls)
- **sonnet**: Default for all implementation work (~60%)
- **haiku**: Tests, docs, version bumps (~25%)

---

## Quick Start

1. Read `.ai/INSTRUCTIONS.md` (shared instructions)
2. Read `.ai/WORKFLOW.md` (pipeline definitions)
3. Check `.ai/ROADMAP.md` (current version status)
4. Check `.claude/agent-memory/` (your agent's memory)
5. Follow: **PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH**

---

## Shared References

| Purpose                | Path                  |
| ---------------------- | --------------------- |
| **Full instructions**  | `.ai/INSTRUCTIONS.md` |
| **Workflow pipelines** | `.ai/WORKFLOW.md`     |
| **Agent specs**        | `.ai/AGENT_SPECS.md`  |
| **Decisions**          | `.ai/DECISIONS.md`    |
| **Onboarding**         | `.ai/ONBOARDING.md`   |
| Roadmap                | `.ai/ROADMAP.md`      |
| Templates              | `.ai/templates/`      |
| CI/CD                  | `.github/workflows/`  |
| Changelog              | `CHANGELOG.md`        |
| **Claude skills**      | `.claude/skills/`     |
| **App skills catalog** | `skills/`             |

## Claude Skills

Skills teach Claude repeatable workflows. Located in `.claude/skills/`:

| Skill         | Trigger                    | Description                                          |
| ------------- | -------------------------- | ---------------------------------------------------- |
| `new-feature` | "Add a new feature module" | Scaffold service + store + types + component + tests |
| `verify`      | "Verify before commit"     | Run full lint + typecheck + test + format pipeline   |
| `refactor`    | "Refactor this module"     | Safe structural changes with full verification       |

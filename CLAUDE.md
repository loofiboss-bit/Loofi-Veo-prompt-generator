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
3. Check `.agent/ROADMAP.md` (current version status)
4. Check `.claude/agent-memory/` (your agent's memory)
5. Follow: **PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH**

---

## Shared References

| Purpose                | Path                      |
| ---------------------- | ------------------------- |
| **Full instructions**  | `.ai/INSTRUCTIONS.md`     |
| **Workflow pipelines** | `.ai/WORKFLOW.md`         |
| **Agent specs**        | `.ai/AGENT_SPECS.md`      |
| **Decisions**          | `.ai/DECISIONS.md`        |
| **Onboarding**         | `.ai/ONBOARDING.md`       |
| Roadmap                | `.agent/ROADMAP.md`       |
| Model routing          | `.agent/MODEL_ROUTING.md` |
| Templates              | `.agent/templates/`       |
| CI/CD                  | `.github/workflows/`      |
| Changelog              | `CHANGELOG.md`            |

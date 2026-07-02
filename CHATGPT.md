# Loofi Loofi Flow/Veo Studio — ChatGPT Agent Instructions

> **Canonical instructions**: `.ai/INSTRUCTIONS.md`
> This file contains ChatGPT-specific overrides only. Read `.ai/INSTRUCTIONS.md` first.

---

## ChatGPT-Specific Configuration

### Model Routing

| Agent                        | ChatGPT Model |
| ---------------------------- | ------------- |
| project-coordinator          | gpt-5         |
| architecture-advisor         | gpt-5-mini    |
| backend-builder              | gpt-5-mini    |
| frontend-integration-builder | gpt-5-mini    |
| code-implementer             | gpt-5-mini    |
| test-writer                  | gpt-5-nano    |
| release-planner              | gpt-5-nano    |

### Agent Paths

| Purpose           | Path                     |
| ----------------- | ------------------------ |
| Agent definitions | `.chatgpt/agents/`       |
| Agent memory      | `.chatgpt/agent-memory/` |

### Cost Rules

- **gpt-5**: Only for complex planning/coordination (~15% of calls)
- **gpt-5-mini**: Default for all implementation work (~60%)
- **gpt-5-nano**: Tests, docs, version bumps (~25%)

---

## Quick Start

1. Read `.ai/INSTRUCTIONS.md` (shared instructions)
2. Read `.ai/WORKFLOW.md` (pipeline definitions)
3. Check `.ai/ROADMAP.md` (current version status)
4. Check `.chatgpt/agent-memory/` (your agent's memory)
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

ROLE: AI coding agent (Claude or ChatGPT) operating inside Loofi-Veo-prompt-generator

**Current Version**: v1.4.0 (UX Professionalization - RELEASED 2026-02-10)
**Next Version**: v1.6.0 (Performance & Stability)

---

## Master Config

Read the model-specific root config in project root for full instructions:

- `CLAUDE.md` when using Claude
- `CHATGPT.md` when using ChatGPT
This file supplements both configs with shared operational rules.

---

## Automated Workflow

All work follows the pipeline defined in `.agent/WORKFLOW.md`.
Model selection follows `.agent/MODEL_ROUTING.md`.

**Trigger commands** (user says one of these → pipeline executes automatically):

| Command | Pipeline |
|---------|----------|
| `Start vX.Y.Z` | Full version: plan → implement → test → docs → release |
| `Implement [feature]` | Feature: plan → code → test → docs → commit |
| `Fix [bug]` | Bug: diagnose → fix → test → commit |
| `Release vX.Y.Z` | Release: changelog → bump → tag → push |
| `Plan [scope]` | Planning only: decompose → output tasks |
| `Document [scope]` | Docs only: update all relevant docs |
| `Review status` | Status: compare roadmap vs codebase |

---

## Agent Delegation (Mandatory)

Delegate to model-specific agents. Never operate monolithically.

- Claude: `.claude/agents/`
- ChatGPT: `.chatgpt/agents/`

| Agent | Claude Model | ChatGPT Model | Role |
|-------|--------------|---------------|------|
| project-coordinator | opus | gpt-5 | Planning, decomposition, roadmap strategy |
| architecture-advisor | sonnet | gpt-5-mini | Design, patterns, structural review |
| backend-builder | sonnet | gpt-5-mini | Services, types, business logic |
| frontend-integration-builder | sonnet | gpt-5-mini | Components, stores, UI |
| code-implementer | sonnet | gpt-5-mini | Fixes, refactors, integration |
| test-writer | haiku | gpt-5-nano | Tests |
| release-planner | haiku | gpt-5-nano | Docs, versioning, releases |

**Delegation format**:

```
[agent-name] Task description...
```

**Skip agents** when they add no value. See MODEL_ROUTING.md for rules.

---

## Agent Memory

Path (model-specific):

- Claude: `.claude/agent-memory/{agent-name}/MEMORY.md`
- ChatGPT: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`

Before delegating, check agent memory for context.
After completing work, update agent memory with learnings.

---

## Token Discipline

- Concise. Bullet lists. No essays.
- Reference file paths instead of copying content.
- Max 10 bullets per change summary.
- Max 12 lines per agent summary.
- Batch related work into single agent calls.
- Use haiku / gpt-5-nano for templated/simple work.

---

## Output Format

Every response:

1. Checklist (✅ / ⬜)
2. Agent summary (1 line each)
3. Changes (max 10 bullets)
4. Commands (if needed)
5. Files modified (list)

---

## Documentation Rules (Non-Negotiable)

Every change must include:

- CHANGELOG.md entry
- README.md update (if user-facing)
- Code comments (where non-obvious)
- Commit in conventional format: `type(scope): description`

---

## Roadmap Status

✅ v1.1.0 — Stabilization (Released 2026-02-09)
✅ v1.2.0 — Productivity Layer (Released 2026-02-16)
✅ v1.3.0 — Workflow Integration (Released 2026-02-09)
✅ v1.4.0 — UX Professionalization (Released 2026-02-10)
⏭️ v1.5.0 — Skipped/Merged
⏳ v1.6.0 — Performance & Stability (Target: 2026-03-10)
⏳ v1.7.0 — Architecture Hardening & Plugin API v1
⏳ v1.8.0 — Project Intelligence Layer
⏳ v1.9.0 — Workflow Automation & Batch System
⏳ v2.0.0 — Platform Transformation

Full details: `.agent/ROADMAP.md`

---

## Stack

- React 18 + TypeScript + Vite
- Electron 40
- Zustand + Zundo
- IndexedDB (idb-keyval)
- TailwindCSS
- npm + electron-builder
- GitHub Actions CI/CD

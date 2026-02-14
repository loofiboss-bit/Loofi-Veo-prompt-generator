# ChatGPT Agent System

> **Read `CHATGPT.md` in project root first.** It is the master instruction file.
> Then read `.ai/WORKFLOW.md` for pipeline definitions and `.ai/AGENT_SPECS.md` for agent roles and cost optimization.

## Quick Start

Say one of these commands to trigger automated workflows:

| Command               | What Happens                                           |
| --------------------- | ------------------------------------------------------ |
| `Start v1.8.0`        | Full version: plan → implement → test → docs → release |
| `Implement [feature]` | Feature: plan → code → test → docs → commit            |
| `Fix [bug]`           | Bug: diagnose → fix → test → commit                    |
| `Release vX.Y.Z`      | Release: changelog → bump → tag → push                 |
| `Plan [scope]`        | Planning only: decompose → output tasks                |
| `Review status`       | Status check: done, in-progress, remaining             |

## Agents

| Agent                        | Model      | Role                               |
| ---------------------------- | ---------- | ---------------------------------- |
| project-coordinator          | gpt-5      | Complex planning, roadmap strategy |
| architecture-advisor         | gpt-5-mini | Design, patterns, structure        |
| backend-builder              | gpt-5-mini | Services, types, business logic    |
| frontend-integration-builder | gpt-5-mini | Components, stores, UI             |
| code-implementer             | gpt-5-mini | Fixes, refactors, integration      |
| test-writer                  | gpt-5-nano | Tests                              |
| release-planner              | gpt-5-nano | Docs, versioning, releases         |

## Agent Memory

Each agent has persistent memory at `.chatgpt/agent-memory/<agent-name>/MEMORY.md`.
Memory is checked before each task and updated after completion.

## Key Files

| File                      | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `CHATGPT.md`              | Master instructions (shim → `.ai/INSTRUCTIONS.md`)      |
| `.ai/WORKFLOW.md`         | Pipeline definitions                                    |
| `.ai/AGENT_SPECS.md`      | Agent roles and cost optimization                       |
| `.ai/ROADMAP.md`          | Version roadmap (single source of truth)                |
| `.ai/DECISIONS.md`        | Architectural decisions record                          |
| `.ai/templates/`          | Task templates (feature, bugfix, release, version-plan) |

## Workflow

All agents follow: **PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH**

## Cost Optimization

- gpt-5: Only for complex multi-feature planning (~15% of calls)
- gpt-5-mini: Default for implementation (~60%)
- gpt-5-nano: Tests, docs, version bumps (~25%)

See `.ai/AGENT_SPECS.md` for detailed agent definitions and routing rules.

---

_Last updated: 2026-02-10_

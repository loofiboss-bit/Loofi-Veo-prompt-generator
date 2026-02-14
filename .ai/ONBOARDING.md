# AI Agent Onboarding Guide

> Read this at the start of every new AI session. Replaces ad-hoc handoff documents.

---

## Step 1: Understand the Project

**What**: Veo Prompt Generator — a React + Electron desktop app for generating video AI prompts
**Stack**: React 18, TypeScript, Vite, Electron 40, Zustand, IndexedDB, TailwindCSS
**Full details**: `.ai/INSTRUCTIONS.md`

---

## Step 2: Check Current State

```bash
# Check current version
cat package.json | grep '"version"'

# Check what's changed since last tag
git log --oneline $(git describe --tags --abbrev=0)..HEAD

# Check for uncommitted work
git status

# Check build health
npm run validate
```

**Roadmap**: `.ai/ROADMAP.md`
**Last session notes**: Check git log messages for recent context

---

## Step 3: Read Your Agent Memory

Each agent has persistent memory with project-specific learnings:

| Agent                        | Memory Path                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| project-coordinator          | `.claude/agent-memory/project-coordinator/MEMORY.md`          |
| architecture-advisor         | `.claude/agent-memory/architecture-advisor/MEMORY.md`         |
| backend-builder              | `.claude/agent-memory/backend-builder/MEMORY.md`              |
| frontend-integration-builder | `.claude/agent-memory/frontend-integration-builder/MEMORY.md` |
| code-implementer             | `.claude/agent-memory/code-implementer/MEMORY.md`             |
| test-writer                  | `.claude/agent-memory/test-writer/MEMORY.md`                  |
| release-planner              | `.claude/agent-memory/release-planner/MEMORY.md`              |

Read your agent's memory before starting work.

---

## Step 4: Know the Tools Available

| Tool               | Purpose                                           | Config                   |
| ------------------ | ------------------------------------------------- | ------------------------ |
| VS Code Tasks      | Build, lint, test, format shortcuts               | `.vscode/tasks.json`     |
| MCP Servers        | GitHub API, filesystem, memory                    | `.vscode/mcp.json`       |
| Husky Hooks        | Pre-commit lint, commitlint                       | `.husky/`                |
| npm Scripts        | All dev commands                                  | `package.json` → scripts |
| Automation Scripts | Version sync, pre-release check, agent validation | `scripts/`               |

---

## Step 5: Follow the Pipeline

Every task must follow:

```
PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH
```

Never skip VERIFY (`npm run validate`) or DOCUMENT (CHANGELOG.md at minimum).

**Full pipeline definitions**: `.ai/WORKFLOW.md`

---

## Step 6: Before You Commit

Run this checklist:

- [ ] `npm run validate` passes (lint + typecheck + test + format)
- [ ] `npm run build` passes
- [ ] CHANGELOG.md updated
- [ ] Commit message follows conventional format: `type(scope): description`
- [ ] No `any` types without justification
- [ ] New files use import aliases (`@core/`, `@features/`, etc.)

---

## Quick Reference Files

| Need                      | Read                      |
| ------------------------- | ------------------------- |
| Full project instructions | `.ai/INSTRUCTIONS.md`     |
| Workflow pipelines        | `.ai/WORKFLOW.md`         |
| Agent definitions         | `.ai/AGENT_SPECS.md`      |
| Architecture decisions    | `.ai/DECISIONS.md`        |
| Current roadmap           | `.ai/ROADMAP.md`          |
| Model routing costs       | `.ai/AGENT_SPECS.md`      |
| Changelog                 | `CHANGELOG.md`            |

---

## Common Mistakes to Avoid

1. **Don't skip VERIFY** — always run `npm run validate` before documenting/committing
2. **Don't use relative paths** across module boundaries — use `@core/`, `@features/`, etc.
3. **Don't add `any` types** without an eslint-disable comment and explanation
4. **Don't forget CHANGELOG** — every change gets an entry
5. **Don't duplicate instructions** — reference `.ai/INSTRUCTIONS.md`, don't copy content
6. **Don't hardcode version numbers** — use `scripts/sync-version.sh`
7. **Don't commit formatting issues** — Husky pre-commit hook runs Prettier automatically

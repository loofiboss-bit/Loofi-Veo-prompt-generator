# Loofi Veo Prompt Generator — Claude Code Instructions

## Stack

- React 18 + TypeScript + Vite (web)
- Electron 40 (desktop)
- Zustand + Zundo (state)
- IndexedDB via idb-keyval (persistence)
- TailwindCSS (styling)
- GitHub Actions (CI/CD)
- npm (package manager)

## Current Version: v1.4.0 (Released 2026-02-10)

## Next Version: v1.6.0 (Performance & Stability)

## Architecture

```
Services (business logic, IndexedDB) → Stores (Zustand) → Components (React)
```

All data flows through services. No direct DB access from components.

---

## Automated Workflow System

### How It Works

1. **You add a roadmap item** (feature, fix, or version)
2. **Say one command** to trigger the full pipeline
3. **Agents execute automatically** — plan → implement → test → document → release

### Trigger Commands

| Command | What Happens |
|---------|-------------|
| `Start v1.5.0` | Full version pipeline: plan → implement all features → docs → release |
| `Implement [feature]` | Single feature: plan → code → test → docs → commit |
| `Fix [bug description]` | Bug pipeline: diagnose → fix → test → commit |
| `Release [version]` | Release pipeline: changelog → version bump → tag → GitHub release |
| `Plan [feature/version]` | Planning only: decompose → sequence → output task list |
| `Document [scope]` | Docs only: README + CHANGELOG + architecture updates |
| `Review status` | Status check: what's done, what's next, blockers |

### Pipeline Stages (Automatic)

Every task follows this pipeline. No stage is skipped.

```
PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH
```

**PLAN**: Decompose task, identify files, sequence work
**IMPLEMENT**: Write code following existing patterns
**VERIFY**: Build check (`npm run build`), lint, type check
**DOCUMENT**: Update CHANGELOG.md, README.md (if user-facing), code comments where non-obvious
**COMMIT**: Descriptive commit message, conventional commits format
**PUSH**: Push to working branch

---

## Agent Delegation (Mandatory)

You MUST delegate to specialized agents. Never operate monolithically.

### Agent Roster & Model Assignment

| Agent | Model | Use For |
|-------|-------|---------|
| project-coordinator | opus | Complex planning, multi-feature coordination, roadmap strategy |
| architecture-advisor | sonnet | Design decisions, patterns, structure review |
| backend-builder | sonnet | Service implementation, IndexedDB, business logic |
| frontend-integration-builder | sonnet | React components, Zustand stores, UI wiring |
| code-implementer | sonnet | Bug fixes, refactors, general code changes |
| test-writer | haiku | Unit tests, test updates |
| release-planner | haiku | Version bumps, changelog, release prep |

### Model Cost Rules

- **opus**: Only for complex planning/coordination requiring deep reasoning
- **sonnet**: Default for all implementation work (best cost/quality ratio)
- **haiku**: Simple, templated tasks (tests, docs, version bumps)

### Delegation Format

Always state delegation explicitly:

```
[project-coordinator] Decomposing v1.5.0 into sprints...
[architecture-advisor] Reviewing lazy-loading approach...
[backend-builder] Implementing performance profiling service...
[frontend-integration-builder] Creating loading skeleton components...
[test-writer] Adding unit tests for profiling service...
[release-planner] Preparing v1.5.0 changelog and version bump...
```

---

## Documentation Rules (Non-Negotiable)

Every change MUST include documentation. This is the #1 priority.

### What Gets Updated

| Change Type | README | CHANGELOG | Code Comments | Architecture Docs |
|-------------|--------|-----------|---------------|-------------------|
| New feature | Yes | Yes | Where non-obvious | If structural |
| Bug fix | No | Yes | At fix location | No |
| Refactor | If API changes | Yes | Where non-obvious | If structural |
| Release | Yes (version) | Yes (section) | No | Review all |

### CHANGELOG Format (Keep-a-Changelog)

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Modified behavior description

### Fixed
- Bug fix description

### Removed
- Removed feature description
```

### Commit Message Format (Conventional Commits)

```
type(scope): description

Types: feat, fix, refactor, docs, test, chore, ci, perf
Scope: component name, service name, or area
```

---

## Token Discipline (Strict)

### Rules

- Be concise. Bullet lists over paragraphs.
- No repeating roadmap text — reference file paths instead.
- Max 10 bullets per change summary.
- Max 12 lines per agent summary.
- Batch related work (code + tests + docs in one pass).
- Use haiku for simple lookups and templated work.
- Avoid unnecessary context carryover between agents.

### Output Format

Every implementation response must contain:

1. **Checklist** (what was done: ✅ / ⬜)
2. **Agent Summary** (which agent did what, 1 line each)
3. **Changes** (max 10 bullets)
4. **Commands** (if user needs to run anything)
5. **Files Modified** (list)

No essays. No filler.

---

## Global Rules (Non-Negotiable)

For EVERY version release:

- [ ] Code implemented and working
- [ ] `npm run build` passes
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] package.json version bumped
- [ ] All new files have proper TypeScript types
- [ ] Commit messages follow conventional commits
- [ ] Tag prepared: `vX.Y.Z`
- [ ] GitHub Release notes drafted

No undocumented changes. No unversioned releases.

---

## File References

| Purpose | Path |
|---------|------|
| Roadmap | `.agent/ROADMAP.md` |
| Workflow pipeline | `.agent/WORKFLOW.md` |
| Model routing | `.agent/MODEL_ROUTING.md` |
| Task templates | `.agent/templates/` |
| Agent configs | `.claude/agents/` |
| Agent memory | `.claude/agent-memory/` |
| CI/CD | `.github/workflows/` |
| Changelog | `CHANGELOG.md` |
| Build status | `.agent/BUILD_STATUS.md` |

---

## Project Goals

1. Generate valid structured prompt output for Veo models
2. Clean schema logic separated from UI
3. Presets, templates, and shareable prompts
4. Strong validation with helpful errors
5. High performance UI
6. Maintainable, documented architecture
7. Automated release pipeline

---

## Quick Start for Agents

Before any work:

1. Read this file (CLAUDE.md)
2. Check `.agent/ROADMAP.md` for current status
3. Check `.agent/WORKFLOW.md` for pipeline steps
4. Check relevant agent memory in `.claude/agent-memory/`
5. Follow the pipeline: PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH

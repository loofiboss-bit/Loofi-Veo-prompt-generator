# Loofi Veo Prompt Generator — Codex Instructions

> **Canonical instructions**: `.ai/INSTRUCTIONS.md`
> This file contains Codex-specific overrides only. Read `.ai/INSTRUCTIONS.md` first.

---

## Project Overview

Veo Prompt Generator (Veo Studio) — React 18 + TypeScript + Vite + Electron 40 desktop app for generating video AI prompts.

## Architecture

```
Services (singleton + idb-keyval + logger) → Stores (Zustand) → Components (React)
```

## Key Conventions

- **TypeScript strict mode** — no `any` without justification
- **Named exports only** — no default exports
- **Import aliases required**: `@core/`, `@features/`, `@shared/`, `@infrastructure/`
- **Service pattern**: Singleton with `getInstance()`, `idb-keyval` for persistence, centralized logger
- **Store pattern**: Zustand + Zundo with `partialize`
- **Component pattern**: Functional, props interface above component, hooks at top
- **Commits**: Conventional format `type(scope): description` — enforced by commitlint

## Quality Gates

```bash
npm run validate     # All checks: lint + typecheck + test + format
npm run build        # Production build
npm run test         # Vitest
npm run lint:ci      # Strict lint (zero warnings)
npm run typecheck    # TypeScript check
npm run format:check # Prettier check
```

## Before Every Change

1. Read `.ai/INSTRUCTIONS.md` for full conventions
2. Check `.ai/ROADMAP.md` for current version status
3. Follow: **PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH**
4. Always run `npm run validate` before committing
5. Always update CHANGELOG.md

## Codex Skills

Codex skills are defined in `.codex/skills/` — each skill is a `SKILL.md` file:

| Skill       | Description                                           |
| ----------- | ----------------------------------------------------- |
| `plan`      | Decompose version into atomic tasks with dependencies |
| `design`    | Create architecture specs before implementation       |
| `implement` | Execute tasks one at a time in dependency order       |
| `test`      | Write and run tests for changed files                 |
| `validate`  | Check release readiness (lint, types, tests, format)  |
| `doc`       | Update CHANGELOG, README, release notes               |
| `release`   | Execute documentation, packaging, and release phases  |
| `package`   | Build and verify Electron/web distribution packages   |

Configuration: `.codex/config.toml` (profiles: fast, balanced, power, auto, planner, builder, scribe)

## References

| Purpose            | Path                  |
| ------------------ | --------------------- |
| Full instructions  | `.ai/INSTRUCTIONS.md` |
| Workflow pipelines | `.ai/WORKFLOW.md`     |
| Agent specs        | `.ai/AGENT_SPECS.md`  |
| Decisions          | `.ai/DECISIONS.md`    |
| Roadmap            | `.ai/ROADMAP.md`      |
| Codex config       | `.codex/config.toml`  |
| Codex skills       | `.codex/skills/`      |
| App skills catalog | `skills/`             |
| Changelog          | `CHANGELOG.md`        |

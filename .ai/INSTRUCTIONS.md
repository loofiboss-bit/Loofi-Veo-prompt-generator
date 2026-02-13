# Loofi Veo Prompt Generator — Unified AI Instructions

> **Single source of truth.** All AI tools (Claude, ChatGPT, Copilot, Codex) reference this file.
> Tool-specific files (`CLAUDE.md`, `CHATGPT.md`, `CODEX.md`, `.github/copilot-instructions.md`) are thin shims pointing here.

---

## Project Identity

- **Name**: Veo Prompt Generator (Veo Studio)
- **Purpose**: Professional prompt generator for Google Veo and OpenAI Sora video models
- **Author**: Loofi
- **Repository**: `loofitheboss/Loofi-Veo-prompt-generator` (private)
- **License**: MIT

---

## Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| UI Framework    | React 18 + TypeScript                   |
| Build Tool      | Vite 5                                  |
| Desktop         | Electron 40                             |
| State           | Zustand + Zundo (undo/redo)             |
| Persistence     | IndexedDB via idb-keyval                |
| Styling         | TailwindCSS 3                           |
| Testing         | Vitest + @testing-library/react + jsdom |
| Linting         | ESLint 9 (flat config) + Prettier       |
| CI/CD           | GitHub Actions                          |
| Package Manager | npm                                     |

---

## Version Status

| Version       | Status                | Theme                   |
| ------------- | --------------------- | ----------------------- |
| v1.4.0        | RELEASED (2026-02-10) | UX Professionalization  |
| v1.5.0        | SKIPPED               | Merged into v1.6.0      |
| v1.6.0-beta.0 | IN PROGRESS           | Performance & Stability |

**Current `package.json` version**: Check `package.json` → `version` field for ground truth.
**Roadmap**: `.agent/ROADMAP.md`

---

## Architecture

```
Services (business logic, IndexedDB) → Stores (Zustand) → Components (React)
```

All data flows through services. **No direct DB access from components.**

### Directory Structure

```
src/
├── core/                    # Shared foundation layer
│   ├── config/              # Export profiles, internal plugins, templates
│   ├── constants/           # App constants, translations, templates
│   ├── data/                # Static data (sunoTags, etc.)
│   ├── services/            # Business logic services (singleton pattern)
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript interfaces and types
│   └── utils/               # Pure utility functions
├── features/                # Feature modules (domain-organized)
│   ├── export/              # Export functionality
│   ├── help/                # Help & FAQ
│   ├── history/             # Prompt history
│   ├── onboarding/          # User onboarding
│   ├── plugins/             # Plugin system
│   ├── project/             # Project management
│   ├── prompt/              # Prompt builder (core feature)
│   ├── settings/            # App settings
│   ├── studios/             # Studio modules (audio, video, etc.)
│   └── timeline/            # Timeline editor
├── components/              # Shared UI components
│   ├── accessibility/       # A11y components
│   ├── onboarding/          # Onboarding modals
│   └── ui/                  # Design system primitives
├── hooks/                   # Shared React hooks
├── infrastructure/          # DB, workers, low-level
│   ├── database/
│   └── workers/
├── shared/                  # Shared contexts, styles, hooks
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   └── styles/
├── utils/                   # Top-level utilities
├── App.tsx                  # Root component
└── index.tsx                # Entry point
```

### Import Aliases

| Alias               | Maps To                  |
| ------------------- | ------------------------ |
| `@/*`               | `./src/*`                |
| `@core/*`           | `./src/core/*`           |
| `@features/*`       | `./src/features/*`       |
| `@shared/*`         | `./src/shared/*`         |
| `@infrastructure/*` | `./src/infrastructure/*` |

Always use aliases. Never use relative paths crossing module boundaries.

---

## Coding Standards

### TypeScript

- **Strict mode enabled** (`tsconfig.json` → `strict: true`)
- All new code must have explicit types — no `any` unless unavoidable (with `// eslint-disable-next-line` + comment)
- Use `interface` for object shapes, `type` for unions/intersections
- Export types from barrel files (`index.ts`)

### React Components

```tsx
// Pattern: Functional component with explicit props interface
interface MyComponentProps {
  title: string;
  onAction: (id: string) => void;
  isActive?: boolean;
}

export function MyComponent({ title, onAction, isActive = false }: MyComponentProps) {
  // hooks first
  // derived state
  // handlers
  // render
}
```

- Functional components only (no class components)
- Props interface declared above component
- Default exports prohibited — use named exports
- Hooks at top of function body, never conditional

### Service Pattern

```ts
// Pattern: Singleton service with idb-keyval + logger
import { get, set, del } from 'idb-keyval';
import { logger } from '@core/services/loggerService';

class MyService {
  private static instance: MyService;

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }

  async getData(key: string): Promise<Data | null> {
    try {
      const data = await get<Data>(`my-service:${key}`);
      logger.info('MyService', `Retrieved data for ${key}`);
      return data ?? null;
    } catch (error) {
      logger.error('MyService', 'Failed to retrieve data', error);
      return null;
    }
  }
}

export const myService = MyService.getInstance();
```

### Store Pattern

```ts
// Pattern: Zustand store with partialize for persistence
import { create } from 'zustand';
import { temporal } from 'zundo';

interface MyState {
  items: Item[];
  addItem: (item: Item) => void;
}

export const useMyStore = create<MyState>()(
  temporal(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
    }),
    { partialize: (state) => ({ items: state.items }) },
  ),
);
```

---

## Automated Workflow System

### Trigger Commands

| Command                  | What Happens                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| `Start vX.Y.Z`           | Full version pipeline: plan → implement all features → docs → release |
| `Implement [feature]`    | Single feature: plan → code → test → docs → commit                    |
| `Fix [bug description]`  | Bug pipeline: diagnose → fix → test → commit                          |
| `Release [version]`      | Release pipeline: changelog → version bump → tag → GitHub release     |
| `Plan [feature/version]` | Planning only: decompose → sequence → output task list                |
| `Document [scope]`       | Docs only: README + CHANGELOG + architecture updates                  |
| `Review status`          | Status check: what's done, what's next, blockers                      |

### Pipeline Stages

Every task follows this pipeline. No stage is skipped.

```
PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH
```

| Stage     | Actions                                                        |
| --------- | -------------------------------------------------------------- |
| PLAN      | Decompose task, identify files, sequence work                  |
| IMPLEMENT | Write code following existing patterns                         |
| VERIFY    | `npm run validate` (lint + typecheck + test + format:check)    |
| DOCUMENT  | Update CHANGELOG.md, README.md (if user-facing), code comments |
| COMMIT    | Descriptive commit message, conventional commits format        |
| PUSH      | Push to working branch                                         |

**Full pipeline definitions**: `.ai/WORKFLOW.md`

---

## Agent System

### Agent Roster

| Agent                        | Tier   | Use For                                                        |
| ---------------------------- | ------ | -------------------------------------------------------------- |
| project-coordinator          | High   | Complex planning, multi-feature coordination, roadmap strategy |
| architecture-advisor         | Medium | Design decisions, patterns, structure review                   |
| backend-builder              | Medium | Service implementation, IndexedDB, business logic              |
| frontend-integration-builder | Medium | React components, Zustand stores, UI wiring                    |
| code-implementer             | Medium | Bug fixes, refactors, general code changes                     |
| test-writer                  | Low    | Unit tests, test updates                                       |
| release-planner              | Low    | Version bumps, changelog, release prep                         |

### Model Routing

| Tier   | Claude | ChatGPT    | Use For                          | % of calls |
| ------ | ------ | ---------- | -------------------------------- | ---------- |
| High   | opus   | gpt-5      | Complex multi-step planning only | ~15%       |
| Medium | sonnet | gpt-5-mini | All implementation work          | ~60%       |
| Low    | haiku  | gpt-5-nano | Tests, docs, version bumps       | ~25%       |

### Cost Rules

- **High tier**: Only for complex planning/coordination requiring deep reasoning
- **Medium tier**: Default for all implementation work
- **Low tier**: Simple, templated tasks
- Skip expensive agents when feature follows existing patterns
- Batch related work (code + tests + docs in one pass)
- Never pass full file contents between agents — pass file paths + line ranges

### Delegation Format

Always state delegation explicitly:

```
[project-coordinator] Decomposing v1.6.0 into sprints...
[backend-builder] Implementing performance profiling service...
[test-writer] Adding unit tests for profiling service...
```

---

## Documentation Rules (Non-Negotiable)

Every change MUST include documentation.

### What Gets Updated

| Change Type | README         | CHANGELOG     | Code Comments     | Architecture Docs |
| ----------- | -------------- | ------------- | ----------------- | ----------------- |
| New feature | Yes            | Yes           | Where non-obvious | If structural     |
| Bug fix     | No             | Yes           | At fix location   | No                |
| Refactor    | If API changes | Yes           | Where non-obvious | If structural     |
| Release     | Yes (version)  | Yes (section) | No                | Review all        |

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

**Enforced by commitlint** via Husky git hook. Invalid commits are rejected.

---

## Quality Gates

### Local (Git Hooks via Husky)

| Hook         | What Runs                                         |
| ------------ | ------------------------------------------------- |
| `pre-commit` | lint-staged (Prettier + ESLint on staged files)   |
| `commit-msg` | commitlint (validates conventional commit format) |

### CI (GitHub Actions)

| Check      | Command                        | Blocks Merge |
| ---------- | ------------------------------ | ------------ |
| Lint       | `npm run lint:ci`              | Yes          |
| Type Check | `npm run typecheck`            | Yes          |
| Tests      | `npm run test`                 | Yes          |
| Format     | `npm run format:check`         | Yes          |
| Security   | `npm audit --audit-level=high` | Yes          |

### npm Scripts Reference

| Script                  | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Start Vite dev server                              |
| `npm run build`         | Production build                                   |
| `npm run lint`          | ESLint check                                       |
| `npm run lint:ci`       | ESLint strict (zero warnings)                      |
| `npm run typecheck`     | TypeScript type check                              |
| `npm run test`          | Run Vitest                                         |
| `npm run test:watch`    | Vitest in watch mode                               |
| `npm run test:coverage` | Vitest with coverage                               |
| `npm run format`        | Prettier format all files                          |
| `npm run format:check`  | Prettier check (CI)                                |
| `npm run validate`      | All checks: lint + typecheck + test + format:check |
| `npm run electron:dev`  | Electron dev mode                                  |
| `npm run dist`          | Package Electron app                               |

---

## Output Format (All Agents)

Every implementation response must contain:

1. **Checklist** (what was done: ✅ / ⬜)
2. **Agent Summary** (which agent did what, 1 line each)
3. **Changes** (max 10 bullets)
4. **Commands** (if user needs to run anything)
5. **Files Modified** (list)

No essays. No filler. Max 12 lines per agent summary.

---

## Token Discipline

- Be concise. Bullet lists over paragraphs.
- No repeating roadmap text — reference file paths instead.
- Max 10 bullets per change summary.
- Batch related work (code + tests + docs in one pass).
- Avoid unnecessary context carryover between agents.

---

## Global Rules (Non-Negotiable)

For EVERY version release:

- [ ] Code implemented and working
- [ ] `npm run validate` passes (lint + typecheck + test + format)
- [ ] `npm run build` passes
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] package.json version bumped
- [ ] metadata.json + manifest.json version bumped
- [ ] All new files have proper TypeScript types
- [ ] Commit messages follow conventional commits
- [ ] Tag prepared: `vX.Y.Z`
- [ ] GitHub Release notes drafted

No undocumented changes. No unversioned releases.

---

## File References

| Purpose                    | Path                              |
| -------------------------- | --------------------------------- |
| **Shared AI Instructions** | `.ai/INSTRUCTIONS.md` (this file) |
| **Workflow pipelines**     | `.ai/WORKFLOW.md`                 |
| **Agent specifications**   | `.ai/AGENT_SPECS.md`              |
| **Architecture decisions** | `.ai/DECISIONS.md`                |
| **Onboarding guide**       | `.ai/ONBOARDING.md`               |
| Roadmap                    | `.agent/ROADMAP.md`               |
| Model routing              | `.agent/MODEL_ROUTING.md`         |
| Build status               | `.agent/BUILD_STATUS.md`          |
| Task templates             | `.agent/templates/`               |
| Claude agents              | `.claude/agents/`                 |
| Claude memory              | `.claude/agent-memory/`           |
| ChatGPT agents             | `.chatgpt/agents/`                |
| ChatGPT memory             | `.chatgpt/agent-memory/`          |
| CI/CD                      | `.github/workflows/`              |
| Changelog                  | `CHANGELOG.md`                    |
| VS Code workspace          | `.vscode/`                        |
| MCP config                 | `.vscode/mcp.json`                |

---

## Project Goals

1. Generate valid structured prompt output for Veo models
2. Clean schema logic separated from UI
3. Presets, templates, and shareable prompts
4. Strong validation with helpful errors
5. High performance UI
6. Maintainable, documented architecture
7. Automated release pipeline
8. AI-driven development workflow with full automation

---

## Quick Start for Agents

Before any work:

1. Read this file (`.ai/INSTRUCTIONS.md`)
2. Check `.agent/ROADMAP.md` for current version status
3. Check `.ai/WORKFLOW.md` for pipeline steps
4. Check relevant agent memory files
5. Follow the pipeline: **PLAN → IMPLEMENT → VERIFY → DOCUMENT → COMMIT → PUSH**

# Agent Specifications — Unified Reference

> Single definition of all agents. Tool-specific configs (`.claude/agents/`, `.chatgpt/agents/`) reference this.

---

## Agent Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    HIGH TIER (Planning)                       │
│  ┌──────────────────────┐                                    │
│  │ project-coordinator  │  Complex planning, coordination    │
│  └──────────────────────┘                                    │
├──────────────────────────────────────────────────────────────┤
│                   MEDIUM TIER (Implementation)               │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ architecture-advisor │  │ frontend-integration-builder│  │
│  └──────────────────────┘  └─────────────────────────────┘  │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │   backend-builder    │  │     code-implementer        │  │
│  └──────────────────────┘  └─────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                    LOW TIER (Templated)                       │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │     test-writer      │  │     release-planner         │  │
│  └──────────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Model Mapping

| Agent                        | Tier   | Claude | ChatGPT    | Copilot/Codex |
| ---------------------------- | ------ | ------ | ---------- | ------------- |
| project-coordinator          | High   | opus   | gpt-5      | (auto)        |
| architecture-advisor         | Medium | sonnet | gpt-5-mini | (auto)        |
| backend-builder              | Medium | sonnet | gpt-5-mini | (auto)        |
| frontend-integration-builder | Medium | sonnet | gpt-5-mini | (auto)        |
| code-implementer             | Medium | sonnet | gpt-5-mini | (auto)        |
| test-writer                  | Low    | haiku  | gpt-5-nano | (auto)        |
| release-planner              | Low    | haiku  | gpt-5-nano | (auto)        |

**Notes**:

- Copilot and Codex don't support explicit model routing; they use whatever model is configured
- Claude and ChatGPT agents have explicit model assignments in their config files

---

## Agent Definitions

### 1. project-coordinator

**Role**: Strategic planning, feature decomposition, sprint coordination
**Tier**: High (opus / gpt-5)

**Responsibilities**:

- Read `.agent/ROADMAP.md` and decompose versions into sprints
- Create ordered task lists with dependencies
- Coordinate work across multiple agents
- Identify risks, blockers, and architectural concerns
- Status reporting and progress tracking

**When to use**:

- Starting a new version (`Start vX.Y.Z`)
- Complex multi-feature planning
- Cross-cutting concerns spanning multiple modules
- Status checks and roadmap review

**When to skip**:

- Simple single-feature implementation
- Bug fixes
- Documentation-only changes

**Memory**: `.claude/agent-memory/project-coordinator/MEMORY.md`

---

### 2. architecture-advisor

**Role**: Design decisions, patterns, structural consistency
**Tier**: Medium (sonnet / gpt-5-mini)

**Responsibilities**:

- Review implementation plans for architectural soundness
- Ensure new code follows established patterns (service singleton, store partialize, component patterns)
- Flag design decisions that need documentation
- Update `.ai/DECISIONS.md` for significant architectural choices
- Review module boundaries and import alias usage

**When to use**:

- New service or store creation
- Structural refactoring
- New feature that changes data flow
- Plugin system changes

**When to skip**:

- Bug fixes following existing patterns
- UI-only changes within existing components
- Test writing
- Documentation

**Memory**: `.claude/agent-memory/architecture-advisor/MEMORY.md`

---

### 3. backend-builder

**Role**: Service layer, business logic, data persistence
**Tier**: Medium (sonnet / gpt-5-mini)

**Responsibilities**:

- Implement services following singleton + idb-keyval + logger pattern
- Create TypeScript interfaces for data structures
- Implement IndexedDB persistence via idb-keyval
- Handle Electron IPC integration
- Error handling with structured logging

**When to use**:

- New service module
- Data model changes
- IndexedDB schema updates
- Business logic implementation

**When to skip**:

- UI-only changes
- Styling/Tailwind changes
- Documentation

**Output pattern**:

```ts
// Service: src/core/services/[name]Service.ts
// Types: src/core/types/[name].ts
// Store integration: src/core/store/[name]Store.ts
```

**Memory**: `.claude/agent-memory/backend-builder/MEMORY.md`

---

### 4. frontend-integration-builder

**Role**: React components, Zustand stores, UI wiring
**Tier**: Medium (sonnet / gpt-5-mini)

**Responsibilities**:

- Create React functional components with proper TypeScript props
- Wire Zustand stores to components
- Implement lazy loading (React.lazy + Suspense)
- Create loading skeletons (Skeleton component system)
- Integrate ErrorBoundary for crash isolation
- Follow design system tokens (Badge, Button, Card, etc.)

**When to use**:

- New UI component
- Feature panel/modal creation
- State management wiring
- UI performance optimization (lazy loading)

**When to skip**:

- Backend-only changes
- Service-only logic
- Pure utility functions

**Memory**: `.claude/agent-memory/frontend-integration-builder/MEMORY.md`

---

### 5. code-implementer

**Role**: Bug fixes, refactors, integration, general changes
**Tier**: Medium (sonnet / gpt-5-mini)

**Responsibilities**:

- Diagnose and fix bugs
- Refactor code for maintainability
- Integration work (connecting services to components)
- Build verification (`npm run validate`)
- Error recovery when other agents' code fails to build

**When to use**:

- Bug fixes (`Fix [description]`)
- Refactoring tasks
- Integration of backend + frontend work
- Build failures from other agents' output
- Any code change that doesn't fit other agents

**Memory**: `.claude/agent-memory/code-implementer/MEMORY.md`

---

### 6. test-writer

**Role**: Unit tests, test maintenance
**Tier**: Low (haiku / gpt-5-nano)

**Responsibilities**:

- Write Vitest unit tests
- Use `@testing-library/react` for component tests
- Mock external dependencies (`vi.mock('idb-keyval')`)
- Maintain test file organization (co-located with source)
- Report coverage changes

**When to use**:

- After any feature implementation
- After bug fixes (regression tests)
- Dedicated test suite expansion (`Test [scope]`)

**Test file pattern**: `[name].test.ts` or `[name].test.tsx` co-located with source

**Mocking pattern**:

```ts
import { vi, describe, it, expect } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));
```

**Memory**: `.claude/agent-memory/test-writer/MEMORY.md`

---

### 7. release-planner

**Role**: Version bumps, changelog, release preparation
**Tier**: Low (haiku / gpt-5-nano)

**Responsibilities**:

- Update CHANGELOG.md (Keep-a-Changelog format)
- Update README.md version references
- Run `bash scripts/sync-version.sh` for version consistency
- Run `bash scripts/pre-release-check.sh` for validation
- Prepare git tag and release notes
- Verify metadata.json and manifest.json consistency

**When to use**:

- `Release vX.Y.Z` trigger
- Documentation updates (`Document [scope]`)
- Version bump tasks

**Release process** (9 steps):

1. Verify all features complete
2. Update CHANGELOG.md
3. Update README.md
4. Run sync-version.sh
5. Run pre-release-check.sh
6. `npm run validate`
7. `npm run build` + `npm run dist`
8. Commit: `chore(release): vX.Y.Z`
9. Tag + push

**Memory**: `.claude/agent-memory/release-planner/MEMORY.md`

---

## Agent Communication Rules

1. **No direct agent-to-agent communication** — all coordination goes through the orchestrating AI tool
2. **Handoff via file paths** — pass specific file paths and line ranges, never full file contents
3. **Memory persistence** — each agent reads/writes its own MEMORY.md for session continuity
4. **Delegation format** — always log `[agent-name] Action description...` when switching agents
5. **Max 3 files open** per agent at a time for context efficiency
6. **Error escalation**: Low tier → Medium tier → High tier → User

---

## Progressive Escalation

When an agent encounters issues beyond its scope:

```
1. Low-tier agent (test-writer, release-planner)
   → Cannot resolve? Escalate to medium-tier

2. Medium-tier agent (code-implementer, backend-builder, etc.)
   → Cannot resolve? Escalate to architecture-advisor
   → Still stuck? Escalate to project-coordinator (high tier)

3. High-tier agent (project-coordinator)
   → Cannot resolve? Report to user with:
     - Problem description
     - What was attempted
     - Recommended approach
```

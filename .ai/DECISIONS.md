# Architectural Decisions Record (ADR)

> Documents significant design decisions with rationale. Agents reference this to avoid re-debating settled decisions.

---

## ADR-001: Single Source of Truth for AI Instructions

**Date**: 2026-02-13
**Status**: Accepted

**Context**: AI instructions were duplicated across CLAUDE.md, CHATGPT.md, .agent/instructions.md, and .agent/PRE_FLIGHT_CHECKLIST.md, causing drift and inconsistency.

**Decision**: Create `.ai/INSTRUCTIONS.md` as the canonical shared instruction file. Tool-specific files (CLAUDE.md, CHATGPT.md, CODEX.md, .github/copilot-instructions.md) become thin shims with pointers + tool-specific overrides only.

**Consequences**: One place to update. All tools get consistent instructions. Version drift eliminated.

---

## ADR-002: Service Singleton Pattern

**Date**: 2026-02-09
**Status**: Accepted

**Context**: Needed consistent pattern for business logic services with IndexedDB persistence.

**Decision**: All services follow singleton pattern with `getInstance()`, use `idb-keyval` for persistence, and use the centralized logger service.

**Pattern**:

```ts
class XService {
  private static instance: XService;
  static getInstance(): XService { ... }
}
export const xService = XService.getInstance();
```

**Consequences**: Consistent initialization, testable via dependency injection, memory-efficient.

---

## ADR-003: Zustand with Zundo for State Management

**Date**: 2026-02-09
**Status**: Accepted

**Context**: Needed state management with undo/redo and partial persistence.

**Decision**: Use Zustand + Zundo. Use `partialize` to control which state fields trigger undo history.

**Consequences**: Simple API, built-in undo/redo, fine-grained persistence control.

---

## ADR-004: Feature-Based Directory Structure

**Date**: 2026-02-10
**Status**: Accepted

**Context**: Flat structure became unwieldy as features grew.

**Decision**: Organize code into `core/` (shared), `features/` (domain modules), `shared/` (cross-cutting), `infrastructure/` (low-level).

**Consequences**: Clear boundaries, import aliases prevent deep relative paths, easier to reason about dependencies.

---

## ADR-005: Import Aliases Required

**Date**: 2026-02-10
**Status**: Accepted

**Context**: Deep relative imports (`../../core/services/`) are fragile and hard to read.

**Decision**: Always use `@core/`, `@features/`, `@shared/`, `@infrastructure/`, `@/` aliases. Never use relative paths crossing module boundaries.

**Consequences**: Cleaner imports, resilient to file moves, enforced by convention.

---

## ADR-006: Conventional Commits (Enforced)

**Date**: 2026-02-13
**Status**: Accepted

**Context**: Conventional commits were documented but not enforced — inconsistent commit history.

**Decision**: Enforce via commitlint + Husky `commit-msg` hook. Invalid commits are rejected at git level.

**Format**: `type(scope): description`
**Types**: feat, fix, refactor, docs, test, chore, ci, perf

**Consequences**: Consistent commit history, enables automated changelog generation, blocks bad commits.

---

## ADR-007: MCP Server Integration

**Date**: 2026-02-13
**Status**: Accepted

**Context**: AI agents in VS Code (Copilot, Claude) lacked structured tool access to GitHub and the filesystem.

**Decision**: Configure MCP servers via `.vscode/mcp.json`:

- `@modelcontextprotocol/server-github` — GitHub API operations
- `@modelcontextprotocol/server-filesystem` — safe file operations
- `@modelcontextprotocol/server-memory` — persistent agent state

**Consequences**: AI agents get structured tool access, operations are scoped and safe, persistent context across sessions.

---

## ADR-008: Prettier for Code Formatting

**Date**: 2026-02-13
**Status**: Accepted

**Context**: No automated formatting — style consistency relied on manual review, causing drift.

**Decision**: Add Prettier with pre-commit hook (Husky + lint-staged). Format on save in VS Code.

**Config**: 2-space indent, single quotes, trailing commas, 100 char width, matching existing code style.

**Consequences**: Zero formatting debates, consistent codebase, automated via git hooks.

---

## ADR-009: v1.5.0 Skipped

**Date**: 2026-02-10
**Status**: Accepted

**Context**: v1.5.0 scope overlapped significantly with v1.6.0 goals.

**Decision**: Skip v1.5.0, merge its planned features into v1.6.0 (Performance & Stability).

**Consequences**: Cleaner version progression, no wasted planning effort.

---

## ADR-010: Dependabot for Dependency Management

**Date**: 2026-02-13
**Status**: Accepted

**Context**: 30+ dependencies with no automated update mechanism. Security vulnerabilities could go unnoticed.

**Decision**: Enable GitHub Dependabot with weekly npm checks. Group dev dependencies. Separate Electron updates.

**Consequences**: Automated security patches, PR-based update review, reduced manual maintenance.

---

## How to Add a New Decision

```markdown
## ADR-NNN: Title

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX

**Context**: What problem or situation prompted this decision?

**Decision**: What was decided and why?

**Consequences**: What are the results — positive, negative, and neutral?
```

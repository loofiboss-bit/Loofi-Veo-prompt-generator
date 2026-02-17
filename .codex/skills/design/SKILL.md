---
name: design
description: Create or update architecture specs for the ACTIVE version before implementation.
---

# Design Phase (P2)

## Steps

1. Read `.ai/ROADMAP.md` — find the `[ACTIVE]` version
2. Read task list for planned features
3. Read `.ai/DECISIONS.md` for existing patterns and architectural rules
4. For each major feature, decide:
   - Which layer(s) are affected (services, store, types, features, shared, infrastructure)
   - New modules vs. extending existing
   - TypeScript interfaces needed
   - Error handling approach
   - Electron IPC implications
5. Document design decisions

## Output Format

```markdown
# Architecture Spec — v{VERSION}

## Overview

One-line version scope.

## Design Decisions

### D1: {Feature Name}

- **Layer**: services / store / features
- **New files**: `src/core/services/newService.ts`, `src/features/new/NewPanel.tsx`
- **Modified files**: `src/core/store/useAppStore.ts`
- **Data model**: TypeScript interface description
- **Pattern**: Singleton service + Zustand store + lazy-loaded component
- **Risks**: Bundle size, IndexedDB schema migration, Electron compatibility
```

## Rules

- Must complete before P3 (Implement)
- Follow singleton service pattern for all business logic
- Follow Zustand + Zundo for state management
- Every new service must have a paired test plan
- Always use path aliases: `@core/`, `@features/`, `@shared/`, `@infrastructure/`
- Reference `.ai/DECISIONS.md` for prior architectural choices

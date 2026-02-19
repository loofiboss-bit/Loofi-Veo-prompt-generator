---
name: new-feature
description: Scaffold a new feature module with service, store, types, component, and test files following project patterns
---

# New Feature

Scaffold a complete feature module with all required files and wiring.

## Arguments

- `name` (required): Feature name in camelCase (e.g., "focusMode", "voicePrompt")
- `category` (optional): Feature category folder (default: feature name)

## Steps

1. **Create TypeScript interface**: `src/core/types/{name}.ts`
   - Export interfaces for state and data models
   - Use `interface` for object shapes, `type` for unions
   - Add to `src/core/types/index.ts` barrel export

2. **Create service**: `src/core/services/{name}Service.ts`
   - Singleton class with `getInstance()` pattern
   - Use `idb-keyval` for persistence
   - Use `logger` for error logging
   - Named export: `export const {name}Service = {Name}Service.getInstance();`

3. **Create store**: `src/core/store/use{Name}Store.ts`
   - Zustand with `temporal` (Zundo) middleware
   - `partialize` for selective undo/persistence
   - Add to `src/core/store/index.ts` barrel export

4. **Create component**: `src/features/{category}/{Name}Panel.tsx`
   - Functional component with TypeScript props interface
   - Wrap in `ErrorBoundary`
   - Use `React.lazy` + `Suspense` if heavy
   - Named export only

5. **Create test files**:
   - `src/core/services/{name}Service.test.ts`
   - `src/features/{category}/{Name}Panel.test.tsx`
   - Mock `idb-keyval` and `loggerService`
   - Test success and failure paths

6. **Run verification**: `npm run validate`

## Rules

- Follow all conventions from AGENTS.md
- Always use path aliases: `@core/`, `@features/`, `@shared/`
- No `any` without eslint-disable + justification
- Named exports only — no default exports
- Props interface declared above component

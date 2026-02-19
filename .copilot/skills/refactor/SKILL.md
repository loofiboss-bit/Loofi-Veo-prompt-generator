---
name: refactor
description: Safely refactor code following project patterns — move, rename, extract, inline — with full verification.
---

# Refactor

Safely refactor code while maintaining all existing behavior.

## Steps

1. **Identify scope**: Which files and modules are affected
2. **Check dependencies**: Find all imports/usages of the target code
   ```bash
   # Find all files importing the module
   grep -r "from.*{module}" src/ --include="*.ts" --include="*.tsx"
   ```
3. **Plan changes**: List all files that need modification
4. **Execute refactor**: Make minimal surgical changes
5. **Update imports**: Ensure all path aliases remain valid
6. **Update barrel exports**: Fix `index.ts` re-exports
7. **Verify**: Run full validation pipeline
   ```bash
   npm run validate
   ```

## Common Refactors

### Extract Service

- Create new singleton service in `src/core/services/`
- Move business logic out of components
- Wire through Zustand store if state management needed
- Update all import paths

### Extract Component

- Move component to appropriate feature directory
- Create props interface above component
- Wrap in ErrorBoundary if it's a panel/section
- Use React.lazy if heavy

### Rename Module

- Update filename (camelCase.ts for services, PascalCase.tsx for components)
- Update all import paths across codebase
- Update barrel exports in index.ts files
- Update test file names to match

## Rules

- No behavior changes during refactor — only structural
- Run `npm run validate` after every refactor step
- Prefer small incremental changes over big-bang refactors
- Always use path aliases: `@core/`, `@features/`, `@shared/`
- Named exports only

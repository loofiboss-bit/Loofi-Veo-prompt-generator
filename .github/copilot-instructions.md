# Loofi Veo Prompt Generator — Copilot Instructions

> GitHub Copilot reads this file automatically for project context.
> Full instructions: `.ai/INSTRUCTIONS.md`

## Project

Veo Prompt Generator (Veo Studio) — React 18 + TypeScript + Vite + Electron 40 desktop app for generating video AI prompts (Google Veo, OpenAI Sora).

## Architecture

```
Services (singleton + idb-keyval + logger) → Stores (Zustand + Zundo) → Components (React functional)
```

## Key Conventions

### TypeScript

- Strict mode enabled
- Use `interface` for object shapes, `type` for unions
- Named exports only (no default exports)
- No `any` without justification

### React

- Functional components only
- Props interface declared above component
- Hooks at top of function, never conditional
- Use React.lazy + Suspense for heavy components

### Imports

- Always use path aliases: `@core/`, `@features/`, `@shared/`, `@infrastructure/`, `@/`
- Never use relative paths crossing module boundaries

### Services

```ts
// Singleton pattern with getInstance()
class MyService {
  private static instance: MyService;
  static getInstance(): MyService { ... }
}
export const myService = MyService.getInstance();
```

### Stores

```ts
// Zustand with Zundo + partialize
export const useMyStore = create<MyState>()(
  temporal((set) => ({ ... }),
    { partialize: (state) => ({ persistedField: state.persistedField }) }
  )
);
```

### Commits

Format: `type(scope): description`
Types: feat, fix, refactor, docs, test, chore, ci, perf
Enforced by commitlint via Husky hook.

### File Organization

```
src/core/services/     → Business logic (singleton services)
src/core/store/        → Zustand stores
src/core/types/        → TypeScript interfaces
src/core/constants/    → App constants
src/features/*/        → Feature modules (export, history, prompt, etc.)
src/components/ui/     → Design system primitives
src/shared/            → Cross-cutting concerns
src/infrastructure/    → Database, workers
```

### Testing

- Vitest + @testing-library/react + jsdom
- Mock `idb-keyval` with `vi.mock`
- Test files co-located: `[name].test.ts(x)`

### Quality Checks

```bash
npm run validate  # lint + typecheck + test + format:check
npm run build     # production build
```

## References

- Full instructions: `.ai/INSTRUCTIONS.md`
- Workflow pipelines: `.ai/WORKFLOW.md`
- Architecture decisions: `.ai/DECISIONS.md`
- Roadmap: `.agent/ROADMAP.md`

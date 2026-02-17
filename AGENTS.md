# AGENTS.md — Veo Prompt Generator

> Instructions for AI coding agents operating in this repository.
> Canonical project instructions live in `.ai/INSTRUCTIONS.md`.

## Project Overview

Veo Prompt Generator (Veo Studio) v2.0.0 — React 18 + TypeScript + Vite 5 + Electron 40 desktop app for generating video AI prompts (Google Veo, OpenAI Sora). Package manager: **npm**. Module system: ESM (`"type": "module"`).

## Build / Lint / Test Commands

```bash
# Full validation (CI gate) — run before every commit
npm run validate          # lint:ci + typecheck + test + format:check

# Individual checks
npm run lint              # ESLint (flat config, ESLint 9)
npm run lint:ci           # ESLint with max-warnings threshold (0)
npm run typecheck         # tsc --noEmit (strict mode)
npm run format            # Prettier — write fixes
npm run format:check      # Prettier — check only

# Tests (Vitest + jsdom)
npm run test              # Run all unit tests once
npm run test:watch        # Watch mode
npm run test:coverage     # With v8 coverage

# Run a single test file
npx vitest run src/core/services/historyService.test.ts --environment jsdom

# Run tests matching a pattern
npx vitest run -t "pattern" --environment jsdom

# E2E (Playwright + Chromium)
npm run test:e2e          # Headless
npm run test:e2e:ui       # Interactive UI

# Build
npm run build             # Vite production build
npm run dev               # Dev server (port 8080)
npm run electron:dev      # Concurrent Vite + Electron
npm run dist              # Build + electron-builder package
```

## Architecture

```
Services (singleton + idb-keyval + logger) --> Stores (Zustand + Zundo) --> Components (React functional)
```

- **No direct DB access from components** — all data flows through services.
- Services are singletons with `getInstance()`, use `idb-keyval` for persistence, and the centralized `logger` service.
- Stores use Zustand with `temporal` (Zundo) middleware and `partialize` for selective undo/persistence.
- Components are React functional with hooks; heavy components use `React.lazy` + `Suspense`.

## Directory Structure

```
src/
  core/services/        # Business logic (singleton services, ~79 files)
  core/store/           # Zustand stores (sliced architecture, ~22 files)
  core/types/           # TypeScript interfaces and type definitions
  core/constants/       # App constants and translations
  core/config/          # Export profiles, model profiles, plugins
  core/utils/           # Utility functions (error handling, crypto, validation)
  features/*/           # Feature modules (batch, composer, export, history, prompt, etc.)
  shared/components/    # Shared UI components + design system (ui/, layout/)
  shared/hooks/         # Shared React hooks
  shared/contexts/      # React contexts (Onboarding, Accessibility)
  shared/styles/        # Design tokens, animations, accessibility CSS
  infrastructure/       # Database layer, web workers
  cli/                  # CLI mode (commands/, types, utils)
  components/           # Top-level shared components (accessibility/, ui/)
```

## Code Style

### TypeScript

- **Strict mode** is enabled — all strict checks enforced.
- Use `interface` for object shapes, `type` for unions/intersections.
- **No `any`** without an `eslint-disable` comment and written justification.
- Unused variables prefixed with `_` are allowed (`argsIgnorePattern: '^_'`).

### Imports

- **Always** use path aliases: `@core/`, `@features/`, `@shared/`, `@infrastructure/`, `@/`.
- **Never** use relative paths that cross module boundaries.
- Order: external packages, then aliased internal imports, then relative imports within the same module.

### Exports

- **Named exports only** — default exports are prohibited (except legacy UI components).

### Formatting (Prettier)

- 2-space indent, no tabs
- Single quotes, double quotes in JSX
- Trailing commas everywhere (`"all"`)
- 100-character line width
- Semicolons required
- Arrow parens always: `(x) => ...`
- LF line endings

### Naming Conventions

- **Files**: `camelCase.ts` for services/utils, `PascalCase.tsx` for components.
- **Components**: PascalCase (`PromptBuilder`, `ErrorBoundary`).
- **Hooks**: `use` prefix (`useAppStore`, `useKeyboardNavigation`).
- **Services**: camelCase class name + exported singleton (`export const myService = MyService.getInstance()`).
- **Stores**: `use` prefix (`useAppStore`, `useMyStore`).
- **Types/Interfaces**: PascalCase (`PromptState`, `Shot`, `TimelineClip`).
- **Constants**: UPPER_SNAKE_CASE or camelCase depending on context.

### React Patterns

- Functional components only — no class components.
- Props interface declared directly above the component.
- Hooks at the top of the function body, never inside conditionals.
- Use `React.lazy` + `Suspense` for heavy/optional components.
- Wrap each panel/section in an `ErrorBoundary`.

### Service Pattern

```typescript
class MyService {
  private static instance: MyService;
  static getInstance(): MyService {
    if (!MyService.instance) MyService.instance = new MyService();
    return MyService.instance;
  }
  // Use idb-keyval for persistence, logger for logging
}
export const myService = MyService.getInstance();
```

### Store Pattern

```typescript
export const useMyStore = create<MyState>()(
  temporal(
    (set) => ({
      /* state + actions */
    }),
    { partialize: (state) => ({ persistedField: state.persistedField }) },
  ),
);
```

### Error Handling

- Use the centralized `errorHandler` utility in `src/core/utils/errorHandler.ts`.
- Wrap component trees in `ErrorBoundary` components (`src/shared/components/ErrorBoundary.tsx`).
- Services should catch errors internally and log via the `logger` service.

## Testing Conventions

- **Framework**: Vitest + `@testing-library/react` + jsdom.
- **Test files**: Co-located with source as `[name].test.ts(x)`.
- **Global setup**: `src/test-setup.ts` (mocks `matchMedia`, `crypto.subtle`, `URL.createObjectURL`, `AbortSignal.timeout`).
- **Custom render**: Import from `src/test-utils.tsx` — wraps components with providers + `userEvent`.
- **Mocking**: Use `vi.mock('idb-keyval', ...)` and `vi.mock('./loggerService', ...)` in service tests.
- **Coverage thresholds**: statements 15%, branches 10%, functions 15%, lines 15%.

## Commit Conventions

Enforced by commitlint + Husky. Format:

```
type(scope): description
```

- **Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`, `revert`, `style`
- **Scope**: kebab-case (e.g., `prompt-builder`, `history`)
- **Subject**: max 100 chars, no sentence-case/start-case/pascal-case/upper-case
- **Body**: max 200 chars per line (warning)

Pre-commit hook runs `lint-staged` (ESLint on `*.{ts,tsx}`, Prettier on `*.{ts,tsx,js,jsx,json,md,css}`).

## Copilot / Agent Instructions

GitHub Copilot instructions are at `.github/copilot-instructions.md`. Key points:

- Follow the singleton service pattern for all business logic.
- Use Zustand + Zundo for state management with `partialize`.
- Always use path aliases for imports (`@core/`, `@features/`, `@shared/`, `@infrastructure/`).
- Run `npm run validate` before considering any task complete.

## Workflow

Every task must follow: **PLAN -> IMPLEMENT -> VERIFY -> DOCUMENT -> COMMIT -> PUSH**

- **VERIFY** = `npm run validate` (must pass)
- **DOCUMENT** = Update `CHANGELOG.md` at minimum; update `README.md` if user-facing

## Key References

| File                  | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `.ai/INSTRUCTIONS.md` | Canonical shared instructions (read first) |
| `.ai/WORKFLOW.md`     | Pipeline definitions (10 workflows)        |
| `.ai/AGENT_SPECS.md`  | Agent definitions and model routing        |
| `.ai/DECISIONS.md`    | Architecture Decision Records              |
| `.ai/ROADMAP.md`      | Version history and status                 |
| `.ai/ONBOARDING.md`   | Agent onboarding checklist                 |
| `CHANGELOG.md`        | Release changelog                          |

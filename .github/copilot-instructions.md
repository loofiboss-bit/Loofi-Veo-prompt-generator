# Loofi Veo Prompt Generator — Copilot Instructions

> GitHub Copilot reads this file automatically for project context.
> Full instructions: `.ai/INSTRUCTIONS.md`

## Project

Veo Prompt Generator (Veo Studio) — React 18 + TypeScript + Vite + Electron 40 desktop app for generating video AI prompts (Google Veo, OpenAI Sora). Local-first NLE and Generative Orchestration Platform with multi-track timeline, client-side FFmpeg.wasm rendering, real-time multiplayer (Yjs CRDT + WebRTC), and full plugin API.

## Build, Test, Lint

```bash
# Development
npm run dev                  # Vite dev server (localhost:8080)
npm run electron:dev         # Concurrent Vite + Electron

# Quality (run before every commit)
npm run validate             # lint:ci + typecheck + test + format:check
npm run build                # Production build

# Testing
npm run test                 # All unit tests (Vitest + jsdom)
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npx vitest run src/core/services/myService.test.ts       # Single test file
npx vitest run -t "should parse template"                # Single test by name
npm run test:e2e             # Playwright E2E tests
npx playwright test e2e/myTest.spec.ts                   # Single E2E test

# Linting & Formatting
npm run lint                 # ESLint
npm run lint:ci              # ESLint strict (zero warnings — enforced)
npm run typecheck            # tsc --noEmit
npm run format               # Prettier format all
npm run format:check         # Prettier check (CI)

# Electron packaging
npm run dist                 # Build + package Electron app
```

## Architecture

```
Components (React) → Hooks (useStore) → Stores (Zustand + Zundo) → Services (Singletons) → IndexedDB (idb-keyval)
```

No direct DB access from components. All data flows through services.

### Source Layout

```
src/core/services/     → Business logic (~79 singleton services)
src/core/store/        → Zustand stores (~22 sliced stores)
src/core/types/        → TypeScript interfaces
src/core/constants/    → App constants, templates
src/core/config/       → Router, i18n, export profiles, plugins
src/features/*/        → Feature modules (batch, composer, export, prompt, timeline, studios, etc.)
src/shared/components/ → Reusable UI: layout/ (Header, Sidebar), ui/ (design system), ErrorBoundary
src/shared/hooks/      → Shared React hooks (~20+)
src/infrastructure/    → Database, workers
src/cli/               → CLI mode (node --import tsx)
```

## Key Conventions

### TypeScript

- **Strict mode** enabled — no implicit any, strict null checks
- `interface` for object shapes, `type` for unions/intersections
- **Named exports only** — default exports prohibited
- No `any` without `// eslint-disable-next-line` comment + justification

### React

- Functional components only
- Props interface declared **above** component
- Hooks at top of function, **never** inside conditionals or loops
- Wrap each panel/section in `ErrorBoundary`
- Use `React.lazy` + `Suspense` for heavy/optional components

### Imports

- **Always** use path aliases: `@core/`, `@features/`, `@shared/`, `@infrastructure/`, `@/`
- Never use relative paths crossing module boundaries

### Service Pattern (Singleton)

```ts
class MyService {
  private static instance: MyService;
  static getInstance(): MyService {
    if (!MyService.instance) MyService.instance = new MyService();
    return MyService.instance;
  }
  // Use idb-keyval for persistence, logger for errors
}
export const myService = MyService.getInstance();
```

### Store Pattern (Zustand + Zundo)

```ts
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

### Naming

- **Files**: `camelCase.ts` for services/utils, `PascalCase.tsx` for components
- **Components**: PascalCase (`PromptBuilder`, `ErrorBoundary`)
- **Hooks**: `use` prefix (`useAppStore`, `useKeyboardNavigation`)
- **Services**: camelCase class + singleton export (`myService = MyService.getInstance()`)
- **Types/Interfaces**: PascalCase (`PromptState`, `Shot`, `TimelineClip`)
- **Constants**: UPPER_SNAKE_CASE or camelCase (context-dependent)

### Formatting (Prettier — enforced by Husky pre-commit)

- 2-space indent, no tabs, LF line endings
- Single quotes, double quotes in JSX
- Trailing commas everywhere (`"all"`), semicolons required
- 100-character print width, arrow parens always

### Commits

Format: `type(scope): description`
Types: feat, fix, refactor, docs, test, chore, ci, perf, revert, style
Scope: kebab-case, subject max 100 chars, body max 200 chars/line.
Enforced by commitlint via Husky hook.

### Testing

- Vitest + @testing-library/react + jsdom
- Mock `idb-keyval` and external deps with `vi.mock()`
- Test files co-located: `[name].test.ts(x)`
- Custom render in `src/test-utils.tsx` wraps providers + userEvent
- Global mocks in `src/test-setup.ts` (matchMedia, crypto.subtle, URL.createObjectURL)
- Coverage thresholds: statements 20%, branches 15%, functions 20%, lines 21%

## References

- Full instructions: `.ai/INSTRUCTIONS.md`
- Workflow pipelines: `.ai/WORKFLOW.md`
- Architecture decisions: `.ai/DECISIONS.md`
- Agent specs: `.ai/AGENT_SPECS.md`
- Roadmap: `.ai/ROADMAP.md`

## MCP Servers

Configured in `.copilot/mcp-config.json` (Copilot CLI), `.vscode/mcp.json` (VS Code), `.mcp.json` (Claude/OpenCode):

| Server                  | Purpose                                                                        |
| ----------------------- | ------------------------------------------------------------------------------ |
| **sequential-thinking** | Step-by-step chain-of-thought reasoning for complex refactors and architecture |
| **taskmaster-ai**       | AI-powered task management — create, execute, and track workflow tasks         |
| **playwright**          | Playwright browser automation for E2E testing                                  |
| **puppeteer**           | Headless browser automation, screenshots, scraping                             |
| **context7**            | Library documentation lookup (React, Zustand, Vite, Electron, etc.)            |
| **fetch**               | Web page fetching for docs/research                                            |
| **memory**              | Persistent knowledge graph across sessions                                     |
| **filesystem**          | Local file operations within workspace                                         |
| **git**                 | Git repository operations (commit, branch, diff, log)                          |
| **github**              | GitHub API (PRs, issues, repos, code search)                                   |

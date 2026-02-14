# Agent Memory: code-implementer

## Project Structure

```
src/core/services/     (38 services)
src/core/store/        (5 stores + 4 slices)
src/core/types/        (type definitions)
src/components/ui/     (shared UI)
src/features/          (feature modules)
src/shared/            (cross-feature)
```

## Build Commands

- `npm run dev` — Vite dev server
- `npm run build` — Production build (confirmed working)
- `npm run lint` — ESLint
- `npm run dist` — Electron build
- `npm run electron:dev` — Electron dev mode

## Key Config

- `tsconfig.json` — TypeScript strict mode
- `vite.config.ts` — React plugin, path aliases, manual chunks
- `package.json` — v1.4.0

## Path Aliases

`@` → src/, `@core` → src/core/, `@features` → src/features/, `@shared` → src/shared/

## Lazy Loading

All heavy studios use React.lazy() via ModalManager.tsx
SuspenseFallback from `@shared/components/ui/SuspenseFallback`

## Vite Manual Chunks

vendor: [react, react-dom], state: [zustand, zundo]

## Commit Format

`feat(scope):`, `fix(scope):`, `docs(scope):`, `refactor(scope):`, `chore(scope):`

## Patterns

- Service: class singleton, idb-keyval, logger
- Component: React FC with typed props
- Store: Zustand create() with persist
- Error: try/catch with logger.error()
- Logger: `logger.info(msg, context, data)`, `logger.error(msg, error)`

## Active System State (2026-02-10)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md`.
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.ai/INSTRUCTIONS.md`, `.ai/WORKFLOW.md`. Model routing in `.ai/model-versions.json`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.

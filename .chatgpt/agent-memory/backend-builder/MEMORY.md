# Agent Memory: backend-builder

## Project Structure

- Services: `src/core/services/` (not `src/services/`)
- Types: `src/core/types/` (flat `index.ts` + standalone topic files)
- Electron main: `electron/main.cjs` (CommonJS, `require` — not ESM)
- Services barrel: `src/core/services/index.ts`

## Service Pattern

```typescript
import { get, set, del, keys } from 'idb-keyval';
import { logger } from './loggerService';

class ServiceName {
  private readonly KEY_PREFIX = 'prefix_';
  async operation(): Promise<Result> {
    try {
      logger.info('message', 'ServiceName', { data });
      return result;
    } catch (error) {
      logger.error('message', 'ServiceName', error);
      throw error;
    }
  }
}
export const serviceName = new ServiceName();
```

## Existing Services (src/core/services/) — 39 total (as of v1.5.0 Sprint 1)

Core: promptBuilder, historyService, diffService, projectService, databaseService
Export: apiExportService, exportService
Media: videoEditorService, audioAnalysisService, audioSeparationService, imageEditService
AI: geminiService, adapters/ (Veo, Sora, VideoModel)
Productivity: templateManager, presetManager, autosaveService, searchService
System: loggerService, keyboardShortcutManager, pluginService, updateService
New: errorLoggingService (v1.5.0)

## Logger API (VERIFIED from loggerService.ts source)

```typescript
logger.info(message: string, context?: string, data?: any)
logger.warn(message: string, context?: string, data?: any)
logger.error(message: string, context?: string, error?: Error | any)
logger.debug(message: string, context?: string, data?: any)
```

IMPORTANT: `logger.error` takes context as 2nd arg, error object as 3rd.
Previous MEMORY.md had `logger.error(message, error)` — that was WRONG.

## IndexedDB Conventions

- Key prefix per service (e.g. `history_`, `project_`, `template_`)
- `error-log` is a single-key list (not prefixed per entry)
- Use idb-keyval for all operations
- Always try/catch with logger; never let storage errors propagate to callers

## Electron IPC Pattern

main.cjs uses CommonJS. Add handlers before `app.whenReady()`:

```javascript
ipcMain.handle('channel-name', async (_, payload) => { ... });
```

`fs`, `path`, `app`, `ipcMain` already required at top of main.cjs.

## Types Pattern

New type domains: create `src/core/types/topic.ts` as standalone file.
Import in services as: `import { Foo } from '@core/types'` (path alias configured).

## Build Notes

- `npm run build` may fail due to Vite resolving node_modules from `/home/loofi/` — pre-existing env issue, not caused by service code.
- Verify correctness with: `./node_modules/.bin/tsc --noEmit`

## Active System State (2026-02-10)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md`.
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.ai/INSTRUCTIONS.md`, `.ai/WORKFLOW.md`. Model routing in `.ai/model-versions.json`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.

## 2026-02-10 Safe Mode Baseline

- Electron now exposes `get-safe-mode-status` via IPC (`electron/main.cjs` + `electron/preload.cjs`).
- Safe mode is enabled by `--safe-mode` or crash-loop detection using `safe-mode-state.json` in `app.getPath('userData')`.
- Clean exit resets crash counter; unclean launches increment counter toward threshold.

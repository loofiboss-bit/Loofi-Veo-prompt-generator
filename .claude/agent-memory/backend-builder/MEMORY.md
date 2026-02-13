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

## Store Persist Partialize (useAppStore.ts)

The `partialize` in persist middleware already existed and was correct.
EXCLUDED (UI-only): all 14 modal flags (isHistoryOpen, isTemplatesOpen, isSavePresetModalOpen,
isDNAModalOpen, isCharacterBankOpen, isLocationBankOpen, isProjectManagerOpen,
isSeriesBibleOpen, isVariablesPanelOpen, isWizardOpen, isNewProjectWizardOpen,
isSearchOpen, isVariationsOpen, isShortcutsOpen), `activeStudio`, `zoomLevel`,
`currentTime`, `_hasHydrated`.
INCLUDED (persisted): promptState, sbGlobalContext, variables, seriesBible, credits,
sbShots, tracks, clips, assets, characterBank, history, customPresets, visualDNA, theme.
The temporal (zundo) partialize is separate and only tracks sbShots/tracks/clips.

## Blob URL Lifecycle in StoryBoard

`StoryBoard.tsx` creates a blob URL via `useMemo` for `backgroundMusicUrl`. Revocation belongs in a separate `useEffect` keyed on the value:

```tsx
useEffect(() => {
    return () => { if (backgroundMusicUrl) URL.revokeObjectURL(backgroundMusicUrl); };
}, [backgroundMusicUrl]);
```

`TimelinePlayer.tsx` receives blob URLs as props — it does NOT own them and must not revoke them.

## Slice GC Pattern (gcTimeline)

GC actions in timelineSlice keep the 50 most recent shots (sorted by `id` descending). Clips are pruned only when their `resourceId` matches a known-but-pruned shot id. Clips with no matching shot id (manual clips) are preserved. Added in Task 2.6 (v1.5.0).

## IPC Batching Pattern (errorLoggingService, v1.5.0 Task 2.5)

Batch queue added to Electron IPC path only. Key fields: `ipcQueue`, `ipcFlushTimer`, `lastFingerprints`.

- Dedup fingerprint: `${message}:${stack}`.slice(0,100), suppress within 5000ms
- Flush when queue >= 5 (immediate) or 2000ms debounce
- `flushIpcQueue()` sends full array via `(window as any).electron.logError(batch)`
- `beforeunload` listener in constructor calls `flushIpcQueue()` synchronously
- `electron/main.cjs` `log-error` handler: `Array.isArray(entryOrBatch)` guards single vs batch
- Web/localStorage path unchanged (no batching)
- Grep output sometimes shows `//` as `/` due to display artifact — always re-read file before editing

## Build Notes

- `npm run build` may fail due to Vite resolving node_modules from `/home/loofi/` — pre-existing env issue, not caused by service code.
- Verify correctness with: `./node_modules/.bin/tsc --noEmit`

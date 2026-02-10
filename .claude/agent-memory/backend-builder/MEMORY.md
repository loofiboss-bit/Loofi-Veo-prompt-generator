# Agent Memory: backend-builder

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
            logger.error('message', error);
            throw error;
        }
    }
}
export const serviceName = new ServiceName();
```

## Existing Services (src/core/services/) — 38 total

Core: promptBuilder, historyService, diffService, projectService, databaseService
Export: apiExportService, exportService
Media: videoEditorService, audioAnalysisService, audioSeparationService, imageEditService
AI: geminiService, adapters/ (Veo, Sora, VideoModel)
Productivity: templateManager, presetManager, autosaveService, searchService
System: loggerService, keyboardShortcutManager, pluginService, updateService

## Logger API

```typescript
logger.info(message, context, data?)
logger.error(message, error)
logger.warn(message, context, data?)
```

## IndexedDB Conventions

- Key prefix per service (e.g., `history_`, `project_`, `template_`)
- Use idb-keyval for all operations
- Always try/catch with logger

## Service Exports

All from `src/core/services/index.ts`

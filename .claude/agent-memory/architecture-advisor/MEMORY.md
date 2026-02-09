# Agent Memory: architecture-advisor

## Current Architecture (v1.3.0)

**Stack**:

- React 18 + TypeScript (strict mode)
- Zustand (state) + Zundo (undo/redo)
- IndexedDB (idb-keyval) for persistence
- TailwindCSS for styling
- Electron 40 for desktop

**Service Layer** (v1.3.0 - Complete):

- `historyService.ts` - Prompt history with IndexedDB
- `diffService.ts` - Text comparison & similarity
- `projectService.ts` - Project organization
- `databaseService.ts` - Unified DB abstraction
- `apiExportService.ts` - Multi-format API export

**State Management**:

- `useSettingsStore.ts` - App settings (theme, API key, etc.)
- `useProjectStore.ts` - Project state (pending Sprint 5)
- `useHistoryStore.ts` - History state (pending Sprint 5)

**Key Patterns**:

- Functional components only
- Custom hooks for reusable logic
- Centralized logger (`src/utils/logger.ts`)
- Error boundaries for resilience
- Dark/light theme support mandatory

**Next Architecture Tasks** (Sprint 4-5):

- UI components for services (HistoryPanel, DiffViewer, ProjectManager)
- State stores integration
- Service initialization in App.tsx

# Storage & Project Skills

## IndexedDB Persistence

- **Key-value storage** — idb-keyval for lightweight persistent state
- **Database service** — Structured database operations for complex data
- **Migration support** — Schema versioning and data migration on upgrade
- **Quota management** — Monitor and manage storage quota usage

**Services:** `databaseService.ts`, `dataMigrationService.ts`
**Infrastructure:** `src/infrastructure/`

## Project Management

- **Project creation** — Create new projects with templates or blank slate
- **Project loading** — Load projects from IndexedDB with lazy initialization
- **Project switching** — Switch between multiple projects without data loss
- **Project deletion** — Clean removal of project data and assets

**Services:** `projectService.ts`
**Store:** `useProjectStore`

## Project Bundles

- **Export bundle** — Package project with all assets into portable format
- **Import bundle** — Load project from exported bundle
- **Bundle compression** — Compress bundles for smaller file size
- **Asset embedding** — Embed referenced assets in bundle

**Services:** `projectBundleService.ts`

## Autosave

- **Periodic autosave** — Automatically save project at configurable intervals
- **Change detection** — Only save when actual changes detected
- **Recovery** — Restore from last autosave on crash recovery
- **Version retention** — Keep multiple autosave versions

**Services:** `autosaveService.ts`

## History & Undo

- **Full undo/redo** — Zundo-powered temporal state with unlimited history
- **Action logging** — Record all user actions with timestamps
- **Selective undo** — Undo specific actions without affecting later changes
- **History visualization** — Visual history timeline with thumbnails

**Services:** `historyService.ts`
**Store:** `useHistoryStore`
**Features:** `src/features/history/`

## Settings Persistence

- **User preferences** — Persist all user settings across sessions
- **Settings resolution** — Merge default, user, and project-level settings
- **Export/import settings** — Backup and restore settings configuration
- **Settings reset** — Reset to defaults without affecting projects

**Services:** `settingsResolutionService.ts`
**Store:** `useSettingsStore`
**Features:** `src/features/settings/`

## Crash Recovery

- **Crash detection** — Detect abnormal app termination
- **State recovery** — Restore last known good state on restart
- **Error reporting** — Collect and send crash reports for debugging
- **Crash counter** — Track crash frequency for stability monitoring

**Services:** `crashReporterService.ts`, `crashCounterService.ts`, `errorLoggingService.ts`, `globalUnhandledRejectionService.ts`

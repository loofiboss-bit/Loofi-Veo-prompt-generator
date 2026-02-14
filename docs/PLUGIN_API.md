# Plugin API Reference — v1.7.0

> Canonical reference for the Veo Studio Plugin System.
> For a getting-started guide, see [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [StudioPlugin Contract](#studioplugin-contract)
4. [Plugin Manifest](#plugin-manifest)
5. [Plugin Context](#plugin-context)
6. [API Surface](#api-surface)
7. [Permission System](#permission-system)
8. [Health Tracking & Crash Isolation](#health-tracking--crash-isolation)
9. [Version Compatibility (Semver)](#version-compatibility-semver)
10. [Internal Plugins](#internal-plugins)
11. [Plugin Lifecycle](#plugin-lifecycle)
12. [Type Reference](#type-reference)

---

## Overview

The Veo Studio Plugin System provides a typed, permission-gated extension mechanism. Plugins can:

- Register UI components (studios, sidebar items, toolbar buttons, modals)
- Access and modify app data (projects, history, templates)
- Register custom export formats
- Subscribe to and publish events
- Store plugin-specific data via scoped IndexedDB storage
- Integrate as internal (bundled) or external plugins

All plugin interactions go through a sandboxed `PluginContext` with fine-grained permissions.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Plugin Manager UI                     │
│              (PluginManager.tsx, PluginList.tsx)          │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                   Plugin Store                            │
│              (pluginStore — Zustand)                      │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                   Plugin Service                          │
│              (pluginService — singleton)                  │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Registry    │  │  Health      │  │  Permission    │  │
│  │  (Map)       │  │  Tracker     │  │  Cache         │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Plugin Context Factory                  │ │
│  │  ┌────┐  ┌────────┐  ┌───────┐  ┌──────┐  ┌─────┐ │ │
│  │  │ API│  │Storage │  │Events │  │Logger│  │Data │ │ │
│  │  └────┘  └────────┘  └───────┘  └──────┘  └─────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Video Studio │ │ Audio Studio │ │ Image Studio │
│   Plugin     │ │   Plugin     │ │   Plugin     │
└──────────────┘ └──────────────┘ └──────────────┘
   (internal)       (internal)       (internal)
```

---

## StudioPlugin Contract

Every studio plugin must implement the `StudioPlugin` interface:

```typescript
interface StudioPlugin {
  /** Called when the plugin is activated — register UI, load resources */
  activate: (context: PluginContext) => Promise<void>;

  /** Called when the plugin is deactivated — cleanup resources */
  deactivate?: () => Promise<void>;

  /** Called on uninstall — remove persisted data */
  dispose?: () => Promise<void>;
}
```

### Lifecycle Methods

| Method       | When Called                         | Required | Purpose                          |
| ------------ | ----------------------------------- | -------- | -------------------------------- |
| `activate`   | Plugin is activated by user or auto | Yes      | Register UI, subscribe to events |
| `deactivate` | Plugin is manually deactivated      | No       | Release resources, unsubscribe   |
| `dispose`    | Plugin is uninstalled (unloaded)    | No       | Delete persisted data            |

### Example Implementation

```typescript
import type { PluginManifest, PluginContext, StudioPlugin } from '@core/types/plugin';

export const MyPluginManifest: PluginManifest = {
  id: 'my-custom-studio',
  name: 'My Custom Studio',
  version: '1.0.0',
  description: 'A custom studio plugin',
  author: 'Your Name',
  main: 'index.ts',
  permissions: ['ui:studio', 'storage', 'projects:read'],
  engineVersion: '^1.7.0',
};

export const MyPluginInstance: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.logger.info('Activating...');

    // Lazy-load heavy component
    const module = await import('./MyStudioComponent');

    context.api.ui.registerStudio({
      id: 'my-studio',
      title: 'My Studio',
      component: module.default,
      props: { theme: 'dark' },
    });

    context.events.on('project:created', (project) => {
      context.logger.info('New project:', project.name);
    });
  },

  deactivate: async () => {
    // Cleanup subscriptions, timers, etc.
  },

  dispose: async () => {
    // Remove any persisted data
  },
};
```

---

## Plugin Manifest

The manifest defines metadata, permissions, and configuration:

```typescript
interface PluginManifest {
  // Required
  id: string; // Unique plugin identifier (kebab-case)
  name: string; // Human-readable name
  version: string; // Semver version string
  description: string; // Short description
  author: string; // Author name
  main: string; // Entry point file

  // Permissions (required array)
  permissions: PluginPermission[];

  // Optional
  license?: string;
  homepage?: string;
  repository?: string;
  engineVersion?: string; // Required app version (semver range)
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  extensionPoints?: ExtensionPoint[];
  settings?: Record<string, PluginSetting>;
  hooks?: {
    onInstall?: string;
    onUninstall?: string;
    onActivate?: string;
    onDeactivate?: string;
    onUpdate?: string;
  };
}
```

### Manifest Validation Rules

The plugin service validates manifests on load:

- `id` — required, non-empty string
- `name` — required, non-empty string
- `version` — required, valid semver string
- `main` — required, entry point path
- `permissions` — required, must be an array

Invalid manifests are rejected with descriptive error messages.

### Engine Version Compatibility

The `engineVersion` field specifies which app versions the plugin is compatible with.
It uses semver range syntax (see [Version Compatibility](#version-compatibility-semver)).

```json
{
  "engineVersion": "^1.7.0"
}
```

This plugin works with app versions `1.7.x` (same major, >= 1.7.0).

---

## Plugin Context

When a plugin is activated, it receives a `PluginContext` object:

```typescript
interface PluginContext {
  manifest: PluginManifest; // Plugin's own manifest
  api: PluginAPI; // Scoped API access
  storage: PluginStorage; // Scoped IndexedDB storage
  events: PluginEvents; // Event pub/sub system
  logger: PluginLogger; // Scoped logger
}
```

All API access is scoped to the plugin's declared permissions. Calling an API without the required permission throws an error.

---

## API Surface

### UI API

**Required permission**: `ui:sidebar`, `ui:toolbar`, `ui:modal`, or `ui:studio`

```typescript
context.api.ui.registerSidebarItem(config: SidebarItemConfig): void;
context.api.ui.registerToolbarButton(config: ToolbarButtonConfig): void;
context.api.ui.registerModal(config: ModalConfig): void;
context.api.ui.registerStudio(config: StudioConfig): void;
context.api.ui.showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
```

#### Configuration Types

```typescript
interface SidebarItemConfig {
  id: string;
  label: string;
  icon?: string;
  component: React.ComponentType<any>;
  position?: number; // Lower = higher in list
}

interface ToolbarButtonConfig {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  position?: number;
}

interface ModalConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  width?: string;
  height?: string;
}

interface StudioConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}
```

### Data API

**Required permissions**: `projects:read`, `projects:write`, `history:read`, `templates:read`

```typescript
// Read operations
context.api.data.getProjects(): Promise<any[]>;
context.api.data.getProject(id: string): Promise<any>;
context.api.data.getHistory(): Promise<any[]>;
context.api.data.getTemplates(): Promise<any[]>;

// Write operations
context.api.data.saveProject(project: any): Promise<void>;
```

Data API calls delegate to real app services (`projectService`, `historyService`, `templateManager`) via dynamic imports, ensuring lazy loading and proper isolation.

### Export API

**Required permission**: `export`

```typescript
context.api.export.registerFormat(format: ExportFormat): void;
context.api.export.exportPrompt(prompt: any, format: string): Promise<void>;
```

```typescript
interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  export: (prompt: any) => Promise<Blob | string>;
}
```

### Settings API

```typescript
context.api.settings.get<T>(key: string): T | undefined;
context.api.settings.set(key: string, value: any): Promise<void>;
context.api.settings.getAll(): Record<string, any>;
```

Settings are defined in the manifest and stored per-plugin in IndexedDB.

### Storage API

**Required permission**: `storage`, `storage:read`, or `storage:write`

```typescript
context.storage.get<T>(key: string): Promise<T | undefined>;
context.storage.set(key: string, value: any): Promise<void>;
context.storage.delete(key: string): Promise<void>;
context.storage.clear(): Promise<void>;
context.storage.keys(): Promise<string[]>;
```

All keys are automatically namespaced: `plugin:{pluginId}:data:{key}`.

### Events API

**Required permission**: `events:subscribe` (for `on`/`off`), `events:publish` (for `emit`)

```typescript
context.events.on(event: string, handler: (...args: any[]) => void): void;
context.events.off(event: string, handler: (...args: any[]) => void): void;
context.events.emit(event: string, ...args: any[]): void;
```

### Logger API

No permission required.

```typescript
context.logger.debug(...args: any[]): void;   // → console.debug('[Plugin:id]', ...)
context.logger.info(...args: any[]): void;    // → console.info('[Plugin:id]', ...)
context.logger.warn(...args: any[]): void;    // → console.warn('[Plugin:id]', ...)
context.logger.error(...args: any[]): void;   // → console.error('[Plugin:id]', ...)
```

---

## Permission System

Plugins must declare all required permissions in their manifest. The plugin service enforces permission checks at runtime.

### Available Permissions

| Permission         | Scope                | Description                      |
| ------------------ | -------------------- | -------------------------------- |
| `storage`          | Full storage         | Read + write plugin storage      |
| `storage:read`     | Read-only storage    | Read plugin storage only         |
| `storage:write`    | Write-only storage   | Write plugin storage only        |
| `projects:read`    | Read projects        | Access project data              |
| `projects:write`   | Write projects       | Modify project data              |
| `history:read`     | Read history         | Access prompt history            |
| `history:write`    | Write history        | Modify prompt history            |
| `templates:read`   | Read templates       | Access templates                 |
| `templates:write`  | Write templates      | Modify templates                 |
| `export`           | Export functionality | Register formats, export prompts |
| `ui:sidebar`       | Sidebar UI           | Add sidebar items                |
| `ui:toolbar`       | Toolbar UI           | Add toolbar buttons              |
| `ui:modal`         | Modal UI             | Register modals                  |
| `ui:studio`        | Studio UI            | Register studio panels           |
| `events:subscribe` | Event subscription   | Listen to app events             |
| `events:publish`   | Event publishing     | Emit custom events               |

### Wildcard Permissions

The `storage` permission implies both `storage:read` and `storage:write`. Similarly, resource-level permissions (e.g., `storage`) act as wildcards for their sub-permissions.

### Permission Enforcement

```typescript
// This throws if the plugin doesn't have 'projects:read'
const projects = await context.api.data.getProjects();
// Error: "Plugin does not have projects:read permission"
```

---

## Health Tracking & Crash Isolation

The plugin service tracks runtime health for each plugin:

```typescript
interface PluginHealth {
  status: PluginHealthStatus; // 'healthy' | 'degraded' | 'crashed'
  lastError?: Error;
  crashCount: number;
  lastCrashAt?: number; // Unix timestamp
}
```

### Crash Escalation

| Crash Count | Status     | Action           |
| ----------- | ---------- | ---------------- |
| 0           | `healthy`  | Normal operation |
| 1–2         | `degraded` | Warning logged   |
| 3+          | `crashed`  | Auto-deactivated |

When a plugin crashes 3 times (`MAX_CRASH_COUNT`), it is automatically deactivated to protect app stability.

### PluginErrorBoundary

In the UI, each plugin is wrapped in a `PluginErrorBoundary` that:

1. Catches React rendering errors within the plugin's component tree
2. Reports the crash to `pluginService.reportCrash(pluginId, error)`
3. Shows a recovery UI with "Retry" and "Disable Plugin" options
4. Prevents plugin errors from cascading to the main application

### Resetting Health

Users can manually re-enable a crashed plugin from the Plugin Manager. This calls `pluginService.resetHealth(pluginId)`, which resets crash count and status to `healthy`.

---

## Version Compatibility (Semver)

The semver utility (`src/core/utils/semver.ts`) provides lightweight version comparison.

### Supported Range Formats

| Format | Example   | Meaning                      |
| ------ | --------- | ---------------------------- |
| Exact  | `1.7.0`   | Version must equal exactly   |
| Caret  | `^1.7.0`  | Same major, `>=` minor.patch |
| Tilde  | `~1.7.0`  | Same major.minor, `>=` patch |
| GTE    | `>=1.7.0` | Version `>=` specified       |

### Functions

```typescript
parseSemver(version: string): SemverParts;
compareSemver(a: string, b: string): -1 | 0 | 1;
satisfiesSemver(version: string, range: string): boolean;
```

### Pre-release Handling

Pre-release versions (e.g., `1.7.0-beta.1`) are considered lower than the same version without pre-release (`1.7.0`).

### How It's Used

When a plugin declares `engineVersion: "^1.7.0"`, the plugin service calls:

```typescript
satisfiesSemver(APP_VERSION, `>=${requiredVersion}`);
```

If the app version doesn't satisfy the range, the plugin fails to load with a descriptive error.

---

## Internal Plugins

Veo Studio ships with 3 internal (bundled) studio plugins:

| Plugin ID          | Name             | Description                       |
| ------------------ | ---------------- | --------------------------------- |
| `video-studio`     | Veo Video Studio | Video generation using Google Veo |
| `veo-audio-studio` | Audio Studio     | AI music generation (Suno)        |
| `veo-image-studio` | Image Studio     | AI image generation               |

### Registration

Internal plugins are registered at app startup via `registerInternalPlugins()`:

```typescript
// src/core/config/internalPlugins.ts
import { pluginService } from '@core/services/pluginService';
import { VideoStudioManifest, VideoStudioInstance } from '@features/studios/VideoStudioPlugin';
import { AudioStudioManifest, AudioStudioInstance } from '@features/studios/AudioStudioPlugin';
import { ImageStudioManifest, ImageStudioInstance } from '@features/studios/ImageStudioPlugin';

export const registerInternalPlugins = async () => {
  await pluginService.registerInternalPlugin(VideoStudioManifest, VideoStudioInstance);
  await pluginService.registerInternalPlugin(AudioStudioManifest, AudioStudioInstance);
  await pluginService.registerInternalPlugin(ImageStudioManifest, ImageStudioInstance);
};
```

### Internal vs. External Plugins

| Aspect        | Internal Plugin            | External Plugin             |
| ------------- | -------------------------- | --------------------------- |
| Location      | Bundled in app source      | Installed at runtime        |
| Registration  | `registerInternalPlugin()` | `load()` + `activate()`     |
| Auto-activate | Yes                        | Manual or from saved config |
| Entry point   | Direct TypeScript import   | Manifest JSON + `main` file |
| Manifest      | Exported const             | Stored in IndexedDB         |

---

## Plugin Lifecycle

```
┌──────────┐   load()    ┌──────────┐  activate()  ┌──────────┐
│ Unloaded │ ──────────▶ │  Loaded  │ ───────────▶ │  Active  │
└──────────┘             └──────────┘              └────┬─────┘
                              │                         │
                              │  unload()          deactivate()
                              │                         │
                              ▼                         ▼
                         ┌──────────┐             ┌──────────┐
                         │ (removed)│             │ Inactive │
                         └──────────┘             └──────────┘
                                                       │
                                                  activate()
                                                       │
                                                       ▼
                                                  ┌──────────┐
                                                  │  Active  │
                                                  └──────────┘

Error State: Any lifecycle stage can transition to 'error'
             on exception. Crashed plugins auto-deactivate
             after 3 consecutive crashes.
```

### State Machine

| State      | Description                                 |
| ---------- | ------------------------------------------- |
| `unloaded` | Not in registry                             |
| `loaded`   | In registry, manifest validated, not active |
| `active`   | Running, context provided, hooks called     |
| `inactive` | Deactivated, context cleared                |
| `error`    | Failed during lifecycle transition          |

---

## Type Reference

All plugin types are defined in `src/core/types/plugin.ts`.

### Core Types

```typescript
type PluginState = 'unloaded' | 'loaded' | 'active' | 'inactive' | 'error';
type PluginHealthStatus = 'healthy' | 'degraded' | 'crashed';
type SemverRange = string;

type PluginPermission =
  | 'storage'
  | 'storage:read'
  | 'storage:write'
  | 'projects:read'
  | 'projects:write'
  | 'history:read'
  | 'history:write'
  | 'templates:read'
  | 'templates:write'
  | 'export'
  | 'ui:sidebar'
  | 'ui:toolbar'
  | 'ui:modal'
  | 'ui:studio'
  | 'events:subscribe'
  | 'events:publish';

type ExtensionPointType =
  | 'sidebar-item'
  | 'toolbar-button'
  | 'modal'
  | 'export-format'
  | 'prompt-enhancer'
  | 'template-provider';

type PluginSettingType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
```

### Key Interfaces

- `StudioPlugin` — Contract for studio plugins (activate/deactivate/dispose)
- `PluginManifest` — Plugin metadata, permissions, settings
- `PluginContext` — Runtime context provided to plugins
- `PluginAPI` — UI, data, export, and settings APIs
- `PluginStorage` — Scoped key-value storage
- `PluginEvents` — Event pub/sub system
- `PluginLogger` — Scoped console logger
- `PluginHealth` — Runtime health state
- `Plugin` — Full plugin instance (manifest + state + health + instance)
- `PluginRegistry` — Registry interface (load, unload, activate, deactivate, get, getAll, getActive)

---

## File Map

| File                                             | Purpose                           |
| ------------------------------------------------ | --------------------------------- |
| `src/core/types/plugin.ts`                       | All plugin type definitions       |
| `src/core/services/pluginService.ts`             | Plugin service (singleton)        |
| `src/core/utils/semver.ts`                       | Semver parser + range matcher     |
| `src/core/config/internalPlugins.ts`             | Internal plugin registration      |
| `src/core/store/pluginStore.ts`                  | Zustand store for plugin UI state |
| `src/features/plugins/PluginManager.tsx`         | Plugin Manager panel              |
| `src/features/plugins/components/PluginList.tsx` | Plugin list component             |
| `src/features/studios/VideoStudioPlugin.ts`      | Video Studio internal plugin      |
| `src/features/studios/AudioStudioPlugin.ts`      | Audio Studio internal plugin      |
| `src/features/studios/ImageStudioPlugin.ts`      | Image Studio internal plugin      |

---

**Last Updated**: 2026-02-14
**Version**: 1.7.0
**Maintainer**: Loofi

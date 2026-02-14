# Plugin Development Guide

> **Version**: 1.7.0
> For full API reference, see [PLUGIN_API.md](./PLUGIN_API.md).

## Overview

The Veo Studio plugin system allows you to extend the application with custom functionality. Plugins can:

- Add UI components (studios, sidebar items, toolbar buttons, modals)
- Access and modify data (projects, history, templates)
- Register custom export formats
- Subscribe to and publish events
- Store plugin-specific data

## Quick Start

### 1. Create a Plugin Manifest

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "My custom plugin for Veo Studio",
  "author": "Your Name",
  "main": "index.ts",
  "engineVersion": "^1.7.0",
  "permissions": ["ui:sidebar", "storage"]
}
```

### 2. Implement the StudioPlugin Interface

```typescript
import type { StudioPlugin, PluginContext } from '@core/types/plugin';

export const MyPlugin: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.logger.info('Plugin activated!');

    context.api.ui.registerSidebarItem({
      id: 'my-sidebar',
      label: 'My Feature',
      icon: 'star',
      component: MySidebarComponent,
    });
  },

  deactivate: async () => {
    // Cleanup resources
  },

  dispose: async () => {
    // Remove persisted data on uninstall
  },
};
```

### 3. Register Your Plugin

For internal (bundled) plugins:

```typescript
import { pluginService } from '@core/services/pluginService';

await pluginService.registerInternalPlugin(MyPluginManifest, MyPlugin);
```

For external plugins, paste the manifest JSON in the Plugin Manager's "Install Plugin" dialog.

## StudioPlugin Contract

Every plugin must implement the `StudioPlugin` interface:

```typescript
interface StudioPlugin {
  activate: (context: PluginContext) => Promise<void>; // Required
  deactivate?: () => Promise<void>; // Optional
  dispose?: () => Promise<void>; // Optional
}
```

| Method       | When Called           | Required | Purpose                                   |
| ------------ | --------------------- | -------- | ----------------------------------------- |
| `activate`   | Plugin is enabled     | Yes      | Register UI elements, subscribe to events |
| `deactivate` | Plugin is disabled    | No       | Cleanup subscriptions, release resources  |
| `dispose`    | Plugin is uninstalled | No       | Delete all persisted plugin data          |

## Permission System

Plugins must declare all permissions they need in the manifest. API calls without the required permission throw an error at runtime.

| Permission         | Access                    |
| ------------------ | ------------------------- |
| `storage`          | Full read + write storage |
| `storage:read`     | Read-only storage         |
| `storage:write`    | Write-only storage        |
| `projects:read`    | Read project data         |
| `projects:write`   | Modify project data       |
| `history:read`     | Read prompt history       |
| `history:write`    | Modify prompt history     |
| `templates:read`   | Read templates            |
| `templates:write`  | Modify templates          |
| `export`           | Register export formats   |
| `ui:sidebar`       | Add sidebar items         |
| `ui:toolbar`       | Add toolbar buttons       |
| `ui:modal`         | Register modals           |
| `ui:studio`        | Register studio panels    |
| `events:subscribe` | Subscribe to events       |
| `events:publish`   | Publish events            |

> **Wildcard**: `storage` implies both `storage:read` and `storage:write`.

## Version Compatibility

Use the `engineVersion` field to declare which app versions your plugin supports:

```json
{
  "engineVersion": "^1.7.0"
}
```

Supported range formats:

| Format | Example   | Meaning                    |
| ------ | --------- | -------------------------- |
| Exact  | `1.7.0`   | Must match exactly         |
| Caret  | `^1.7.0`  | Same major, >= minor.patch |
| Tilde  | `~1.7.0`  | Same major.minor, >= patch |
| GTE    | `>=1.7.0` | Any version >= specified   |

If the app version doesn't satisfy the range, the plugin fails to load.

## Plugin API

### Context Object

Every plugin receives a context object with:

```typescript
interface PluginContext {
  manifest: PluginManifest;
  api: PluginAPI;
  storage: PluginStorage;
  events: PluginEvents;
  logger: PluginLogger;
}
```

### UI API

```typescript
// Register a sidebar item
context.api.ui.registerSidebarItem({
  id: 'my-sidebar-item',
  label: 'My Feature',
  icon: 'star',
  component: MySidebarComponent,
  position: 100,
});

// Register a toolbar button
context.api.ui.registerToolbarButton({
  id: 'my-button',
  label: 'Do Something',
  icon: 'zap',
  onClick: () => console.log('Clicked!'),
  position: 50,
});

// Show notification
context.api.ui.showNotification('Operation completed!', 'success');
```

### Data API

```typescript
// Get all projects
const projects = await context.api.data.getProjects();

// Get specific project
const project = await context.api.data.getProject('project-id');

// Save project
await context.api.data.saveProject(modifiedProject);

// Get history
const history = await context.api.data.getHistory();

// Get templates
const templates = await context.api.data.getTemplates();
```

### Export API

```typescript
// Register custom export format
context.api.export.registerFormat({
  id: 'my-format',
  name: 'My Format',
  extension: 'myf',
  mimeType: 'application/x-my-format',
  export: async (prompt) => {
    // Convert prompt to your format
    return new Blob([JSON.stringify(prompt)], { type: 'application/json' });
  },
});
```

### Storage API

```typescript
// Store data
await context.storage.set('myKey', { foo: 'bar' });

// Retrieve data
const data = await context.storage.get('myKey');

// Delete data
await context.storage.delete('myKey');

// Clear all plugin data
await context.storage.clear();

// Get all keys
const keys = await context.storage.keys();
```

### Events API

```typescript
// Subscribe to events
context.events.on('project:created', (project) => {
  console.log('New project created:', project);
});

// Unsubscribe
const handler = (project) => console.log(project);
context.events.on('project:created', handler);
context.events.off('project:created', handler);

// Publish events
context.events.emit('my-plugin:custom-event', { data: 'value' });
```

### Settings API

```typescript
// Get setting value
const apiKey = context.api.settings.get<string>('apiKey');

// Set setting value
await context.api.settings.set('apiKey', 'new-value');

// Get all settings
const allSettings = context.api.settings.getAll();
```

### Logger API

```typescript
context.logger.debug('Debug message');
context.logger.info('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message');
```

## Lifecycle Hooks

Plugins implement lifecycle methods directly on the `StudioPlugin` interface:

```typescript
import type { StudioPlugin, PluginContext } from '@core/types/plugin';

let unsubscribe: (() => void) | null = null;

export const MyPlugin: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.logger.info('Plugin activated!');

    // Register UI components
    context.api.ui.registerSidebarItem({
      id: 'my-item',
      label: 'My Item',
      component: MyComponent,
    });

    // Subscribe to events
    const handler = (project: any) => {
      context.logger.info('Project created:', project.name);
    };
    context.events.on('project:created', handler);

    // Store cleanup reference
    unsubscribe = () => context.events.off('project:created', handler);
  },

  deactivate: async () => {
    // Cleanup
    unsubscribe?.();
    unsubscribe = null;
  },

  dispose: async () => {
    // Remove all persisted data
  },
};
```

## Health Tracking & Crash Isolation

Each plugin has runtime health tracking:

- **healthy** — Normal operation
- **degraded** — 1–2 crashes, warning logged
- **crashed** — 3+ crashes, plugin auto-disabled

Plugins are wrapped in a `PluginErrorBoundary` that catches rendering errors and reports them to `pluginService.reportCrash()`. Users can re-enable crashed plugins from the Plugin Manager, which resets the crash counter.

## Example Plugins

### 1. Hello World Plugin

**manifest.json:**

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "description": "A simple example plugin",
  "author": "Example",
  "main": "index.ts",
  "engineVersion": "^1.7.0",
  "permissions": ["ui:sidebar"]
}
```

**index.ts:**

```typescript
import type { StudioPlugin, PluginContext } from '@core/types/plugin';

export const HelloWorldPlugin: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.logger.info('Hello World plugin activated!');
    context.api.ui.showNotification('Hello World plugin loaded!', 'success');
  },
};
```

### 2. Custom Export Format Plugin

**manifest.json:**

```json
{
  "id": "markdown-export",
  "name": "Markdown Export",
  "version": "1.0.0",
  "description": "Export prompts as Markdown",
  "author": "Example",
  "main": "index.ts",
  "engineVersion": "^1.7.0",
  "permissions": ["export"]
}
```

**index.ts:**

```typescript
import type { StudioPlugin, PluginContext } from '@core/types/plugin';

export const MarkdownExportPlugin: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.api.export.registerFormat({
      id: 'markdown',
      name: 'Markdown',
      extension: 'md',
      mimeType: 'text/markdown',
      export: async (prompt) => {
        const markdown = `# ${prompt.title}\n\n${prompt.content}`;
        return new Blob([markdown], { type: 'text/markdown' });
      },
    });

    context.logger.info('Markdown export format registered');
  },
};
```

### 3. Prompt Enhancer Plugin

**manifest.json:**

```json
{
  "id": "prompt-enhancer",
  "name": "Prompt Enhancer",
  "version": "1.0.0",
  "description": "Enhance prompts with AI suggestions",
  "author": "Example",
  "main": "index.ts",
  "engineVersion": "^1.7.0",
  "permissions": ["projects:read", "projects:write", "ui:toolbar"],
  "settings": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "required": true
    }
  }
}
```

**index.ts:**

```typescript
import type { StudioPlugin, PluginContext } from '@core/types/plugin';

export const PromptEnhancerPlugin: StudioPlugin = {
  activate: async (context: PluginContext) => {
    context.api.ui.registerToolbarButton({
      id: 'enhance-prompt',
      label: 'Enhance',
      icon: 'sparkles',
      onClick: async () => {
        const apiKey = context.api.settings.get<string>('apiKey');
        if (!apiKey) {
          context.api.ui.showNotification('Please configure API key', 'warning');
          return;
        }

        // Enhance prompt logic here
        context.api.ui.showNotification('Prompt enhanced!', 'success');
      },
    });
  },
};
```

### 4. Internal Studio Plugin (Bundled)

This pattern is used by the built-in Video, Audio, and Image studios:

```typescript
import type { PluginManifest, PluginContext, StudioPlugin } from '@core/types/plugin';

export const MyStudioManifest: PluginManifest = {
  id: 'my-studio',
  name: 'My Studio',
  version: '1.0.0',
  description: 'A custom studio',
  author: 'Loofi',
  main: 'virtual', // Internal plugins use 'virtual'
  permissions: ['ui:studio'],
};

export const MyStudioInstance: StudioPlugin = {
  activate: async (context: PluginContext) => {
    // Lazy-load the heavy component
    const module = await import('./MyStudioComponent');

    context.api.ui.registerStudio({
      id: 'my-studio',
      title: 'My Studio',
      component: module.default,
    });
  },
};
```

Register it in `src/core/config/internalPlugins.ts`:

```typescript
await pluginService.registerInternalPlugin(MyStudioManifest, MyStudioInstance);
```

## Best Practices

1. **Always validate permissions** - Check if you have the required permissions before accessing APIs
2. **Handle errors gracefully** - Wrap API calls in try-catch blocks
3. **Clean up resources** - Unsubscribe from events in deactivate hook
4. **Use semantic versioning** - Follow semver for plugin versions
5. **Document your plugin** - Include clear documentation and examples
6. **Test thoroughly** - Test activation, deactivation, and all features
7. **Respect user privacy** - Only request necessary permissions
8. **Use the logger** - Log important events for debugging

## Security Considerations

- Plugins run with permission-gated API access only
- Plugin data is namespaced and isolated from other plugins
- Plugins cannot access the file system directly
- Plugins cannot make arbitrary network requests
- Crash isolation prevents a broken plugin from taking down the app
- Engine version compatibility is enforced at load time

## Publishing Plugins

(Coming soon: Plugin marketplace and publishing guidelines)

## Further Reading

- [Plugin API Reference](./PLUGIN_API.md) — Complete type reference and API surface
- [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md) — Visual plugin system architecture
- [Architecture](./ARCHITECTURE.md) — Overall project architecture

## Support

For questions and support:

- GitHub Issues: [repository URL]
- Documentation: [docs URL]
- Community: [community URL]

---

**Last Updated**: 2026-02-14
**Version**: 1.7.0
**Maintainer**: Loofi

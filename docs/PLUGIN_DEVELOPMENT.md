# Plugin Development Guide

## Overview

The Veo Prompt Generator plugin system allows you to extend the application with custom functionality. Plugins can:

- Add UI components (sidebar items, toolbar buttons, modals)
- Access and modify data (projects, history, templates)
- Register custom export formats
- Subscribe to and publish events
- Store plugin-specific data

## Plugin Structure

A plugin consists of:

1. **Manifest file** (`plugin.json`) - Metadata and configuration
2. **Entry point** (`index.js`) - Main plugin code
3. **Optional assets** - Icons, styles, etc.

## Manifest Schema

```json
{
  "id": "my-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Does something awesome",
  "author": "Your Name",
  "license": "MIT",
  "homepage": "https://example.com",
  "repository": "https://github.com/username/my-plugin",

  "main": "index.js",

  "engineVersion": "1.4.0",

  "permissions": ["storage", "projects:read", "ui:sidebar"],

  "extensionPoints": [
    {
      "type": "sidebar-item",
      "component": "MySidebarItem",
      "icon": "star",
      "label": "My Plugin",
      "position": 100
    }
  ],

  "settings": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "description": "Your API key for the service",
      "required": true
    },
    "enabled": {
      "type": "boolean",
      "label": "Enable Feature",
      "default": true
    }
  },

  "hooks": {
    "onActivate": "activate",
    "onDeactivate": "deactivate"
  }
}
```

## Permission System

Plugins must declare all permissions they need:

- `storage` - Full storage access (read + write)
- `storage:read` - Read-only storage access
- `storage:write` - Write-only storage access
- `projects:read` - Read project data
- `projects:write` - Modify project data
- `history:read` - Read history
- `history:write` - Modify history
- `templates:read` - Read templates
- `templates:write` - Modify templates
- `export` - Register export formats
- `ui:sidebar` - Add sidebar items
- `ui:toolbar` - Add toolbar buttons
- `ui:modal` - Register modals
- `events:subscribe` - Subscribe to events
- `events:publish` - Publish events

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

Plugins can define lifecycle hooks:

```typescript
export function activate(context: PluginContext) {
  context.logger.info('Plugin activated!');

  // Register UI components
  context.api.ui.registerSidebarItem({
    id: 'my-item',
    label: 'My Item',
    component: MyComponent,
  });

  // Subscribe to events
  context.events.on('project:created', handleProjectCreated);
}

export function deactivate(context: PluginContext) {
  context.logger.info('Plugin deactivated!');

  // Cleanup
  context.events.off('project:created', handleProjectCreated);
}
```

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
  "main": "index.js",
  "permissions": ["ui:sidebar"],
  "hooks": {
    "onActivate": "activate"
  }
}
```

**index.js:**

```typescript
export function activate(context) {
  context.logger.info('Hello World plugin activated!');

  context.api.ui.showNotification('Hello World plugin loaded!', 'success');
}
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
  "main": "index.js",
  "permissions": ["export"],
  "hooks": {
    "onActivate": "activate"
  }
}
```

**index.js:**

```typescript
export function activate(context) {
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
}
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
  "main": "index.js",
  "permissions": ["projects:read", "projects:write", "ui:toolbar"],
  "settings": {
    "apiKey": {
      "type": "string",
      "label": "API Key",
      "required": true
    }
  },
  "hooks": {
    "onActivate": "activate"
  }
}
```

**index.js:**

```typescript
export function activate(context) {
  context.api.ui.registerToolbarButton({
    id: 'enhance-prompt',
    label: 'Enhance',
    icon: 'sparkles',
    onClick: async () => {
      const apiKey = context.api.settings.get('apiKey');
      if (!apiKey) {
        context.api.ui.showNotification('Please configure API key', 'warning');
        return;
      }

      // Enhance prompt logic here
      context.api.ui.showNotification('Prompt enhanced!', 'success');
    },
  });
}
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

- Plugins run in a sandboxed environment
- Plugins can only access APIs they have permissions for
- Plugin data is isolated from other plugins
- Plugins cannot access the file system directly
- Plugins cannot make arbitrary network requests

## Publishing Plugins

(Coming soon: Plugin marketplace and publishing guidelines)

## Support

For questions and support:

- GitHub Issues: [repository URL]
- Documentation: [docs URL]
- Community: [community URL]

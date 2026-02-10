# Example Plugins

This directory contains example plugins to help you get started with plugin development.

## Available Examples

### 1. Hello World (`hello-world/`)

A minimal plugin that demonstrates the basic structure and lifecycle hooks.

### 2. Markdown Export (`markdown-export/`)

Adds a custom export format for exporting prompts as Markdown files.

### 3. Prompt Enhancer (`prompt-enhancer/`)

Demonstrates data access and UI integration with a toolbar button.

## Using Example Plugins

1. Open the Plugin Manager in the app
2. Click "Install Plugin"
3. Copy the contents of the example's `manifest.json`
4. Paste into the install dialog
5. Click "Install"

## Creating Your Own Plugin

See the [Plugin Development Guide](../docs/PLUGIN_DEVELOPMENT.md) for detailed instructions.

## Plugin Structure

Each example plugin contains:

```text
plugin-name/
├── manifest.json    # Plugin metadata and configuration
├── index.js         # Main plugin code
└── README.md        # Plugin documentation
```

## Testing Plugins

1. Install the plugin using the Plugin Manager
2. Activate the plugin
3. Test all features
4. Check the console for any errors
5. Deactivate and uninstall when done

## Contributing

Have an example plugin idea? Submit a pull request!

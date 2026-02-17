# Plugin System Skills

## Plugin API

- **Plugin loading** — Dynamic plugin loading with lazy initialization
- **Plugin lifecycle** — Install, enable, disable, uninstall lifecycle management
- **Plugin API surface** — Hooks into prompt builder, timeline, export, and UI
- **Sandboxing** — Plugins run in isolated context with permission controls

**Services:** `pluginService.ts`, `pluginSandboxService.ts`, `pluginInstallService.ts`
**Store:** `usePluginStore`, `useRegistryStore`
**Types:** `src/core/types/plugin.ts`
**Features:** `src/features/plugins/`

## Plugin Marketplace

- **Discovery** — Browse available plugins from online marketplace
- **Categories** — Browse by category (prompts, effects, transitions, exporters)
- **Ratings & reviews** — Community ratings and usage stats
- **One-click install** — Install plugins directly from marketplace

**Store:** `useMarketplaceStore`
**Types:** `src/core/types/marketplace.ts`

## Plugin Registry

- **Version management** — Track installed plugin versions and compatibility
- **Dependency resolution** — Handle inter-plugin dependencies
- **Update detection** — Check for plugin updates automatically

**Services:** `registryService.ts`
**Store:** `useRegistryStore`
**Types:** `src/core/types/registry.ts`

## Plugin Crypto & Integrity

- **Package verification** — Verify plugin package signatures before install
- **Integrity checks** — Validate plugin files haven't been tampered with
- **Permission manifest** — Declare required permissions in plugin manifest

**Services:** `pluginInstallService.ts` (crypto validation)

## Plugin Analytics

- **Usage tracking** — Optional anonymous plugin usage statistics
- **Performance metrics** — Track plugin load time and resource impact
- **Error reporting** — Aggregate plugin error reports for developers

## Plugin Development

- **Plugin SDK** — TypeScript types and utilities for plugin authors
- **Hot reload** — Live reload during plugin development
- **Debug mode** — Enhanced logging and error reporting for development

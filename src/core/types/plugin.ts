/**
 * Plugin System Type Definitions
 * v1.4.0 Week 4 - Plugin Architecture Foundation
 */

/**
 * Plugin lifecycle states
 */
export type PluginState = 'unloaded' | 'loaded' | 'active' | 'inactive' | 'error';

/**
 * Plugin permission types
 */
export type PluginPermission =
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

/**
 * Plugin extension point types
 */
export type ExtensionPointType =
    | 'sidebar-item'
    | 'toolbar-button'
    | 'modal'
    | 'export-format'
    | 'prompt-enhancer'
    | 'template-provider';

/**
 * Plugin setting types
 */
export type PluginSettingType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect';

/**
 * Plugin setting definition
 */
export interface PluginSetting {
    type: PluginSettingType;
    label: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: Array<{ value: string; label: string }>;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
}

/**
 * Plugin extension point definition
 */
export interface ExtensionPoint {
    type: ExtensionPointType;
    component?: string;
    icon?: string;
    label?: string;
    position?: number;
    config?: Record<string, any>;
}

/**
 * Plugin manifest schema
 */
export interface PluginManifest {
    // Basic metadata
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license?: string;
    homepage?: string;
    repository?: string;

    // Entry point
    main: string;

    // Dependencies
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;

    // Compatibility
    engineVersion?: string; // Minimum app version required

    // Permissions
    permissions: PluginPermission[];

    // Extension points
    extensionPoints?: ExtensionPoint[];

    // Settings
    settings?: Record<string, PluginSetting>;

    // Lifecycle hooks
    hooks?: {
        onInstall?: string;
        onUninstall?: string;
        onActivate?: string;
        onDeactivate?: string;
        onUpdate?: string;
    };
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
    // Plugin metadata
    manifest: PluginManifest;

    // API access
    api: PluginAPI;

    // Storage
    storage: PluginStorage;

    // Events
    events: PluginEvents;

    // Logger
    logger: PluginLogger;
}

/**
 * Plugin API interface
 */
export interface PluginAPI {
    // UI extensions
    ui: {
        registerSidebarItem: (config: SidebarItemConfig) => void;
        registerToolbarButton: (config: ToolbarButtonConfig) => void;
        registerModal: (config: ModalConfig) => void;
        registerStudio: (config: StudioConfig) => void;
        showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    };

    // Data access
    data: {
        getProjects: () => Promise<any[]>;
        getProject: (id: string) => Promise<any>;
        saveProject: (project: any) => Promise<void>;
        getHistory: () => Promise<any[]>;
        getTemplates: () => Promise<any[]>;
    };

    // Export
    export: {
        registerFormat: (format: ExportFormat) => void;
        exportPrompt: (prompt: any, format: string) => Promise<void>;
    };

    // Settings
    settings: {
        get: <T = any>(key: string) => T | undefined;
        set: (key: string, value: any) => Promise<void>;
        getAll: () => Record<string, any>;
    };
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
    get: <T = any>(key: string) => Promise<T | undefined>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    keys: () => Promise<string[]>;
}

/**
 * Plugin events interface
 */
export interface PluginEvents {
    on: (event: string, handler: (...args: any[]) => void) => void;
    off: (event: string, handler: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
}

/**
 * Sidebar item configuration
 */
export interface SidebarItemConfig {
    id: string;
    label: string;
    icon?: string;
    component: React.ComponentType<any>;
    position?: number;
}

/**
 * Toolbar button configuration
 */
export interface ToolbarButtonConfig {
    id: string;
    label: string;
    icon?: string;
    onClick: () => void;
    position?: number;
}

/**
 * Modal configuration
 */
export interface ModalConfig {
    id: string;
    title: string;
    component: React.ComponentType<any>;
    width?: string;
    height?: string;
}

/**
 * Studio configuration
 */
export interface StudioConfig {
    id: string;
    title: string;
    component: React.ComponentType<any>;
    props?: Record<string, any>;
}

/**
 * Export format configuration
 */
export interface ExportFormat {
    id: string;
    name: string;
    extension: string;
    mimeType: string;
    export: (prompt: any) => Promise<Blob | string>;
}

/**
 * Plugin instance
 */
export interface Plugin {
    manifest: PluginManifest;
    state: PluginState;
    context?: PluginContext;
    instance?: any;
    error?: Error;
}

/**
 * Plugin loader result
 */
export interface PluginLoadResult {
    success: boolean;
    plugin?: Plugin;
    error?: Error;
}

/**
 * Plugin registry
 */
export interface PluginRegistry {
    plugins: Map<string, Plugin>;
    load: (manifest: PluginManifest) => Promise<PluginLoadResult>;
    unload: (pluginId: string) => Promise<void>;
    activate: (pluginId: string) => Promise<void>;
    deactivate: (pluginId: string) => Promise<void>;
    get: (pluginId: string) => Plugin | undefined;
    getAll: () => Plugin[];
    getActive: () => Plugin[];
}

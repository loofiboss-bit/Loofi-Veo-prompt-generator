# Desktop & Electron Skills

## Electron IPC

- **Main ↔ Renderer** — Typed IPC channels for file system, native dialogs, system info
- **Preload scripts** — Secure bridge between renderer and main process
- **Context isolation** — Renderer runs in isolated context for security

**Electron:** `electron/` directory

## Native Menus

- **Application menu** — Native OS menu bar with keyboard shortcuts
- **Context menus** — Right-click context menus for timeline, assets
- **System tray** — Minimize to system tray with quick actions

**Electron:** `electron/` directory

## Auto-Update

- **Update detection** — Check for new versions on startup and periodically
- **Background download** — Download updates without interrupting work
- **One-click install** — Apply update and restart with one click
- **Release notes** — Show changelog for new version before updating

**Services:** `updateService.ts`

## Window Management

- **Multi-window** — Open features in separate windows (detach panels)
- **Window state** — Remember window size, position, maximized state
- **Full-screen** — Native full-screen mode for presentations

## File System Integration

- **Native file dialogs** — OS-native open/save file dialogs
- **Drag-and-drop** — Drop files from OS file manager into app
- **File watching** — Watch project files for external changes
- **Recent files** — OS-level recent files list

## Proxy & Network

- **Proxy support** — Route API calls through configured proxy
- **Offline detection** — Detect network status and adjust behavior
- **Connection pooling** — Efficient API connection management

**Services:** `proxyService.ts`

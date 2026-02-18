# Architecture Deep Dive

Detailed architecture view for maintainers and contributors.

## 1) Layer contract

```text
UI Components -> Shared Hooks -> Zustand Stores -> Singleton Services -> Infrastructure
```

This contract keeps rendering concerns separate from state orchestration and service side effects.

## 2) Core runtime components

| Component              | Responsibility                                               |
| ---------------------- | ------------------------------------------------------------ |
| React feature surfaces | Input/output workflows and interaction logic                 |
| Shared hooks           | Reusable orchestration logic and side-effect wrappers        |
| Zustand stores         | Feature state transitions and action APIs                    |
| Core services          | Business logic, persistence mediation, external integrations |
| Infrastructure layer   | Database and worker-level plumbing                           |
| Electron runtime       | Desktop shell, IPC bridge, update/safe-mode operations       |

## 3) Data flow model

1. User action triggers component event.
2. Component/hook dispatches store action.
3. Store delegates heavy or persistent operations to services.
4. Services read/write local persistence and external APIs as needed.
5. Store updates state, UI re-renders, and history captures output.

## 4) Persistence surfaces

- IndexedDB: projects/history/large structured local state
- Local storage: lightweight settings and toggles
- Plugin-scoped storage: extension-specific data isolation

## 5) Desktop hardening points

- BrowserWindow hardened webPreferences (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`)
- Preload-mediated IPC
- Safe mode with crash-loop detection and recovery path

## 6) Plugin runtime architecture

- Manifest validation and semver compatibility checks
- Permission cache and scoped context generation
- Trust-level and health metadata per plugin
- Lifecycle hooks: activate, deactivate, dispose

## 7) Quality and reliability gates

Use the full validation suite before merge/release:

```bash
npm run validate
```

Breakout checks:

```bash
npm run lint:ci
npm run typecheck
npm run test
npm run format:check
```

## 8) Architecture references

- [Technical Architecture Doc](../docs/ARCHITECTURE.md)
- [Plugin API](../docs/PLUGIN_API.md)
- [Developer Guide](./Developer-Guide.md)

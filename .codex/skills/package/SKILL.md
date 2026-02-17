---
name: package
description: Build and verify distribution packages (Electron, web) for the current version.
---

# Package Phase (P6)

## Steps

1. Verify version alignment:
   ```bash
   node -e "console.log(require('./package.json').version)"
   node -e "console.log(require('./metadata.json').version)"
   ```
2. Lint check:
   ```bash
   npm run lint:ci
   ```
3. Full test suite:
   ```bash
   npm run test
   ```
4. Build web production:
   ```bash
   npm run build
   ```
5. Build Electron distribution:
   ```bash
   npm run dist
   ```
6. Verify outputs:
   - `dist/` — Vite production build
   - `release/` — Electron packaged app

## Build Targets

- **Web**: `npm run build` → `dist/`
- **Electron (Windows)**: `npm run dist` → `release/*.exe`
- **Electron (Linux)**: `npm run dist` → `release/*.AppImage`
- **Electron (macOS)**: `npm run dist` → `release/*.dmg`

## Verification

- App launches from packaged build
- Version string in About matches source
- All assets bundled (icons, manifest, service worker)

## Rules

- Must complete P5 (Document) before starting P6
- Build must succeed with zero warnings
- Electron config in `electron/` directory
- Vite config in `vite.config.ts`

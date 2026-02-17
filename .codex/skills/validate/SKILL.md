---
name: validate
description: Check release readiness — version alignment, tests, lint, docs.
---

# Validate Release Readiness

## Run

```bash
npm run validate
```

This runs: `lint:ci + typecheck + test + format:check`

## Manual Checks

1. Lint clean:
   ```bash
   npm run lint:ci
   ```
2. Types clean:
   ```bash
   npm run typecheck
   ```
3. Tests pass:
   ```bash
   npm run test
   ```
4. Formatting valid:
   ```bash
   npm run format:check
   ```
5. Build succeeds:
   ```bash
   npm run build
   ```
6. CHANGELOG.md has version entry
7. README.md version references correct
8. metadata.json and manifest.json versions aligned

## Rules

- All checks must pass before release
- Zero warnings in lint:ci mode
- Coverage must meet thresholds

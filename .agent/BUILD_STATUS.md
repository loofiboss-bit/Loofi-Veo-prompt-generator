# v1.5.0-rc.1 Release Build Status

## Release Context

- **Date:** 2026-02-10
- **Branch:** `release/v1.5.0`
- **RC Tag:** `v1.5.0-rc.1`
- **Stable Tag Target:** `v1.5.0`
- **Latest Stable on GitHub:** `v1.4.0`

## Required Validation Gates

- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run dist`
- [ ] GitHub Actions tag workflow passes for `v1.5.0-rc.1`
- [ ] GitHub release is marked **Pre-release**

## Workflow Contract Checks

- [x] `build.yml` detects RC/Beta tag suffixes
- [x] `build.yml` sets `prerelease: true` for RC/Beta tags
- [x] `build.yml` fails if CHANGELOG section is missing/empty for tagged version

## Artifact Expectations

### Linux
- `release/Veo Prompt Generator-1.5.0-rc.1.AppImage`

### Windows
- `release/Veo-Prompt-Generator-1.5.0-rc.1-win-x64.exe`
- `release/Veo-Prompt-Generator-1.5.0-rc.1-win-x64-portable.exe`

## Promotion Checklist (RC -> Stable)

1. Validate RC smoke tests on Linux and Windows.
2. Confirm Safe Mode startup behavior and panel isolation.
3. Confirm profiler metrics emitted during app hydration/studio open.
4. Update changelog section for stable `1.5.0`.
5. Tag `v1.5.0` and verify non-prerelease GitHub release.

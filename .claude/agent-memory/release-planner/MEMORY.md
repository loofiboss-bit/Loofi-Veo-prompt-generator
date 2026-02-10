# Agent Memory: release-planner

## Release History

- **v1.1.0** (2026-02-09): Stabilization
- **v1.2.0** (2026-02-16): Productivity Layer
- **v1.3.0** (2026-02-23): Workflow Integration
- **v1.4.0** (2026-02-10): UX Professionalization (design system, onboarding, accessibility, plugin architecture, auto-update, performance optimization)

## Release Process

1. **Version Bump**: Update `package.json`
2. **CHANGELOG**: Update with Keep-a-Changelog format
3. **README**: Update features if needed
4. **Commit**: `chore(release): bump version to vX.Y.Z`
5. **Tag**: `git tag vX.Y.Z`
6. **Push**: `git push && git push --tags`
7. **CI/CD**: GitHub Actions auto-builds and releases

## Build Artifacts

**Linux**: `.AppImage`
**Windows**: `.exe` (NSIS installer) + portable
**macOS**: `.dmg` (planned for v1.3.0+)

## CI/CD Pipeline

**GitHub Actions** (`.github/workflows/`):

- Triggered on tag push
- Matrix builds (Windows, Linux, macOS)
- electron-builder packaging
- Automatic GitHub Release creation
- CHANGELOG content → release notes

## Documentation Requirements

Every release must update:

- [ ] `package.json` version
- [ ] `CHANGELOG.md` (Keep-a-Changelog format)
- [ ] `README.md` (if features changed)
- [ ] GitHub Release notes
- [ ] Build verification (manual test)

## v1.4.0 Release Checklist (COMPLETE)

- [x] All weekly sprint features complete
- [x] CHANGELOG.md finalized as [1.4.0] - 2026-02-10
- [x] v1.4.0-progress.md updated to 100%
- [x] project-coordinator MEMORY.md updated
- [ ] package.json version confirmed as 1.4.0
- [ ] Git tag: `git tag v1.4.0 && git push origin v1.4.0`
- [ ] GitHub Release created

## v1.5.0 Next Release

- Target: 2026-03-10
- Theme: Performance & Stability Consolidation
- Key areas: lazy loading, error boundaries, IPC optimization, memory audit

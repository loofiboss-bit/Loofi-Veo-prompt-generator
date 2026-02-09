# Agent Memory: release-planner

## Release History

- **v1.1.0** (2026-02-09): Stabilization
- **v1.2.0** (2026-02-16): Productivity Layer
- **v1.3.0** (Target 2026-02-23): Workflow Integration

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

## v1.3.0 Release Checklist (Sprint 7)

- [ ] All Sprint 4-6 features complete
- [ ] Documentation updated
- [ ] Manual testing passed
- [ ] CI/CD workflow verified
- [ ] Release notes drafted

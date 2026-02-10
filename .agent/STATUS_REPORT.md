# Veo Studio - Status Report

**Generated:** 2026-02-10  
**Current Stable:** v1.4.0 (released 2026-02-10)  
**Current Release Candidate:** v1.5.0-rc.1  
**Next Target:** v1.5.0 stable (post-RC validation)

---

## Released Versions

### v1.1.0 - Stabilization (Released 2026-02-09)
- Centralized settings persistence
- Structured logging and improved error handling
- CI/CD baseline for Linux and Windows

### v1.2.0 - Productivity Layer (Released 2026-02-09)
- Templates, presets, variable placeholders
- Autosave/recovery and keyboard shortcuts
- Extended export formats

### v1.3.0 - Workflow Integration (Released 2026-02-09)
- History + diff + project organization
- Database layer and API export support
- Sidebar/search workflow improvements

### v1.4.0 - UX Professionalization (Released 2026-02-10)
- Onboarding and tutorial flow
- Accessibility improvements
- Plugin foundation + update channels

---

## v1.5.0 Release Readiness (Performance & Stability)

**Scope policy:** Baseline-only for production promotion. Remaining roadmap work moves to v1.5.1/v1.6.0.

### Completed for RC
- Panel-level error boundary isolation for heavy surfaces
- Lazy loading for heavy overlays and studios
- Hydration/studio-open performance profiling baseline
- Safe Mode startup guard in Electron
- Loading skeletons replacing blocking backdrops

### Release Infrastructure Updates
- `build.yml` now marks RC/Beta tags as pre-release
- `build.yml` fails if changelog section for tag is missing/empty
- Lint gate restored with ESLint config and dependencies
- Release docs updated for RC -> stable promotion flow

### Current Branch State
- Release branch: `release/v1.5.0`
- RC tag target: `v1.5.0-rc.1`
- Stable tag target: `v1.5.0`

---

## Immediate Actions

1. Run validation gates: `npm run lint`, `npm run build`, `npm run dist`
2. Commit release-readiness updates on `release/v1.5.0`
3. Tag and push `v1.5.0-rc.1`
4. Verify GitHub release is marked pre-release
5. Execute smoke tests before stable promotion

---

## Notes

- Dates are normalized to remove previous timeline conflicts.
- `metadata.json` and `manifest.json` currently have no version field; release flow now verifies this explicitly.
- Stable promotion requires updating CHANGELOG section to `[1.5.0]` and tagging `v1.5.0`.

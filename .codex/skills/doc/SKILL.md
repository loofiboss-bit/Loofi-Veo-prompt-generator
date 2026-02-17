---
name: doc
description: Update documentation (CHANGELOG, README, release notes) for the current version.
---

# Document Phase (P5)

## Steps

1. Gather all completed tasks for the version
2. Read `metadata.json` for version and codename
3. Update `CHANGELOG.md`:
   - Keep-a-Changelog format (`## [vX.Y.Z] - YYYY-MM-DD`)
   - Sections: Added, Changed, Fixed, Removed
   - Imperative mood, max 8 bullets per section
4. Update `README.md`:
   - Version references
   - Feature list (if new capabilities)
5. Create release notes if major version:
   - `RELEASE-NOTES-vX.Y.Z.md`
   - 3-5 sentence overview
   - Highlight list (max 8 items)
   - Upgrade notes if breaking changes
6. Verify version alignment:
   - `metadata.json`: version field
   - `package.json`: version field
   - `manifest.json`: version field

## CHANGELOG Format

```markdown
## [vX.Y.Z] - YYYY-MM-DD

### Added

- Feature description (imperative mood)

### Changed

- Change description

### Fixed

- Fix description
```

## Rules

- Must complete P4 (Test) before starting P5
- No undocumented changes — every task maps to a CHANGELOG entry
- Commit format: `docs(changelog): update for vX.Y.Z`

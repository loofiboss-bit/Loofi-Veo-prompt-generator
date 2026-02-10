# Template: Version Release

## Pipeline

```
VERIFY → DOCUMENT → BUMP → BUILD → TAG → PUSH → RELEASE
```

## Checklist

- [ ] All features for version complete
- [ ] `npm run build` passes
- [ ] `npm run dist` produces artifacts (if desktop)
- [ ] CHANGELOG.md: release date added, entries reviewed
- [ ] README.md: version references updated
- [ ] package.json: version bumped
- [ ] metadata.json: version bumped
- [ ] manifest.json: version bumped (if PWA)
- [ ] Committed: `chore(release): vX.Y.Z`
- [ ] Tagged: `vX.Y.Z`
- [ ] Pushed branch + tag
- [ ] GitHub Release created with notes from CHANGELOG

## Agent Routing

Always use: release-planner (haiku)
Upgrade to sonnet only if: breaking changes or migration strategy needed

## Commit Format

```
chore(release): vX.Y.Z - [Theme Name]
```

## GitHub Release Notes Format

```markdown
## What's New in vX.Y.Z

### Highlights
- Feature 1
- Feature 2

### Changes
[Copy from CHANGELOG.md]

### Downloads
- Windows: .exe installer
- Linux: .AppImage
```

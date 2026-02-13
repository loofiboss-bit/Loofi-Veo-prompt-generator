# Build and Release Status

## Current Policy (Updated 2026-02-10)

### Trigger Rules

- Stable release workflow: version tags (`v*`) excluding beta tags
- Beta release workflow: beta tags only (`v*-beta*`)

### Mandatory CI Gates

The following must pass before build and packaging:

```bash
npm run lint:ci
npm run typecheck
npm run test
```

### Artifact Upload Behavior

Release uploads use overwrite mode, so reruns for the same tag replace existing assets.

### Useful Commands

```bash
# Stable workflow runs
gh run list --workflow="build.yml" --limit 5

# Beta workflow runs
gh run list --workflow="beta-release.yml" --limit 5

# Watch the latest run
gh run watch
```

### References

- `.github/workflows/build.yml`
- `.github/workflows/beta-release.yml`
- `.agent/BETA_BRANCH_GUIDE.md`

# Beta Tag Release Workflow

## Overview

Beta releases are now **tag-only**. The workflow does not trigger on branch pushes or manual dispatch.

Trigger:

- `v*-beta*` (example: `v1.5.0-beta.1`)

Workflow file:

- `.github/workflows/beta-release.yml`

## Release Process

1. Update code and version metadata.
2. Commit to your working branch.
3. Create and push a beta tag.
4. GitHub Actions builds Linux + Windows artifacts and creates a pre-release.

```bash
git tag v1.5.0-beta.1 -a -m "v1.5.0-beta.1"
git push origin v1.5.0-beta.1
```

## CI Gates (Blocking)

Before packaging, the workflow requires:

```bash
npm run lint:ci
npm run typecheck
npm run test
```

Any failure blocks artifact publishing and release creation.

## Rerun Behavior

Release asset uploads use overwrite mode. Re-running a failed release job for the same tag replaces matching assets instead of failing with `already_exists`.

## Monitoring

```bash
gh run list --workflow="beta-release.yml" --limit 5
gh run watch
gh run view <run-id> --log
```

## Notes

- Use semantic beta tags (`vX.Y.Z-beta.N`).
- Keep `CHANGELOG.md` aligned with the tagged version before pushing tags.

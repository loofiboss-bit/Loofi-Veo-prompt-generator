# Operations and Releases

Operational reference for validation, packaging, and release readiness.

## 1) Core operational commands

| Command                    | Purpose                     |
| -------------------------- | --------------------------- |
| `npm run validate`         | Full quality gate           |
| `npm run validate:release` | Full release-readiness gate |
| `npm run build`            | Production web build        |
| `npm run dist`             | Desktop packaging           |
| `npm run test:e2e`         | End-to-end regression       |

## 2) Pre-release flow

1. Freeze feature scope.
2. Run `npm run validate:release`.
3. Build and package artifacts.
4. Verify release notes/changelog quality.
5. Push `main` and the semver tag.
6. Monitor GitHub Actions and confirm visible release assets.

## 3) Desktop release considerations

- Validate installer artifacts per target OS.
- Confirm startup path in packaged app.
- Validate update-check behavior.
- Verify safe-mode recovery still works.

## 4) CI quality posture

Recommended merge gate order:

1. Lint (`lint:ci`)
2. Typecheck
3. Unit tests
4. Formatting check
5. Build/package steps

## 5) Incident and rollback posture

- Keep release metadata clear and reproducible.
- Preserve previous stable artifacts for fallback.
- Track critical issues and patch turnaround.
- In CI, package with `npm run dist -- --publish never` and let the dedicated GitHub release step publish the downloaded artifacts.

## 6) Documentation during release

Update these with every meaningful release:

- `CHANGELOG.md`
- `README.md` (if scope changed)
- `USER_GUIDE.md` (if user workflow changed)
- `docs/releases/RELEASE-NOTES-vX.Y.Z.md`
- relevant wiki pages

## 7) References

- [Developer Guide](./Developer-Guide.md)
- [Security and Privacy](./Security-and-Privacy.md)
- [Troubleshooting and FAQ](./Troubleshooting-and-FAQ.md)

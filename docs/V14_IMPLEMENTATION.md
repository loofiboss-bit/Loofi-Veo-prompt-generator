# v14 implementation and qualification

The implementation was prepared in PR #55. The subsequently authorized v14.0.1 release follows
the canonical tag workflow described in RELEASE.md. Local installation remains outside scope.
Publication and packaged qualification must be verified independently of the local evidence below.

## Contracts

- `PromptStudioDraftV1` belongs to a project and records mode, both inputs, output variants,
  selection, text locks, revision and timestamp. Draft persistence uses the canonical document
  service and serialized updates with 500 ms debounce and flush-before-switch.
- Persistence results distinguish durable storage, memory fallback and separate backup failure.
  Only durable writes can produce Studio's Saved status. Unknown document fields survive capture
  and import; documented `.loofi-project` schema 11 remains supported with optional metadata.
- Prompt artifacts, handoffs, production runs and takes retain project/source relationships.
  A shared capability table determines manual handoff, supported generation and experiment status.
- After submission may have occurred, errors and cancellation require recovery. Ordinary retry
  cannot issue another POST. Known operation IDs resume polling/download. Verified local media is
  required before completion. Startup reconciles persistent jobs and refreshes project media URLs.
- Portable archives resolve referenced bytes through existing media services, verify checksums and
  use relative media paths. Imports remap document and provenance IDs, install media, revoke active
  approvals and disconnect imported in-flight tasks from submission.
- OTIO uses actual timeline tracks, gaps, clip ranges and selected/accepted takes. External FCPXML
  import remains experimental. Labs is default-off and incomplete operations are disabled.

## Verification

Use Node 24, as required by `package.json` and CI:

```bash
npm run validate
npm run build
npm run test:e2e -- --workers=2 --reporter=line
```

`validate` includes theme/model/translation checks, lint, TypeScript, Vitest, native Electron tests
and formatting. Native tests also run in the standard Windows/Linux CI matrix. Browser tests cover
current onboarding, editable packs, persistence through navigation, target gating, projects,
keyboard operation, responsiveness and visual baselines.

Automated service mocks and
browser tests do not qualify live paid provider requests, physical Windows desktop behavior, GPU
rendering, bidirectional Live audio, two-device LAN operation or imports in an external NLE. These
remain explicit qualification boundaries, with incomplete experimental actions disabled.

## Local verification results — 2026-10-07

Environment: Fedora 44 KDE, Node 24.19.0.

- Standard validation passed: theme/model/translation checks, strict lint, TypeScript, 288 Vitest
  files, 100 native Electron tests and repository formatting.
- Production build passed.
- Chromium E2E: 49 passed, one skipped. The skipped test requires a packaged Electron executable;
  no package installation was requested. Current visual baselines were inspected and updated.
- Studio was also inspected interactively in the local browser, including the short welcome flow,
  local compilation and the editable copy desk in the light theme. Dark video/music views were
  visually reviewed through the E2E baselines.
- Final diff whitespace check passed. No unrelated generated output is tracked.

Windows execution and remote CI have not been run in this session. Real GPU rendering, Live audio,
two-device LAN sessions and external NLE import remain unqualified. No paid provider request was
submitted during verification.

## Release preparation qualification

- `npm run pre-release:check` passed, including coverage gates, RPM metadata and release identity.
- All six reviewed Ubuntu visual captures were byte-identical across three CI attempts. Separate
  Ubuntu/Fedora baselines preserve strict pixel checks without widening tolerances.
- The locally packaged Electron executable passed the interrupted-job restart test: both video
  and music remain `RecoveryRequired`, ordinary retries return false, and state survives restart.
- The local AppImage was built. Local RPM packaging requires `libcrypt.so.1`, absent on this host;
  the canonical Ubuntu workflow remains the source of the qualified published RPM.
- Current release screenshots were captured successfully and retained as local verification output.

## Release CI follow-up

v14.0.0 was not published: its Windows native test incorrectly asserted POSIX mode bits. The
immutable tag is retained; v14.0.1 contains the original v14 scope and the platform-correct test.
The media checksum and atomic-write assertions remain active on Windows. Automatic desktop
packaging is tag-only, beta tags use their dedicated workflow, and packaging reuses verified Vite
output. Main pushes use standard validation. The deliberate reproducibility rebuild is preserved.

The local RPM build also succeeded using an isolated temporary libxcrypt compatibility library;
no host package was installed. Its version, architecture and declared runtime dependencies were
inspected. Public artifact qualification still requires the canonical release run.

# Loofi Creator Studio Release Process

This is the public release runbook for Loofi Creator Studio. GitHub Actions is the canonical source
for qualified desktop artifacts; Fedora COPR is a separate community packaging channel built from
the matching GitHub RPM.

## v19.0.0 Reviewable Video Production & Deterministic Workbench

v19 introduces selected-variant AI and zero-token batch local refinement, expanded cinematic AST conflict detection (`OPT-001`, `MOT-001`, `LGT-002`, `DOF-001`, `TMP-001`), synchronized Pro A/B video comparison, multi-shot production batch tools with timeline sync, NLE frame-stepping (`J/K/L`), zero-token chapter timestamp generation, and cryptographically bound `hashVersion: 2` paid request approvals. Bundled source-built FFmpeg resources support Linux and Windows without external dependencies. Existing project and archive formats remain fully compatible.

Published v17.0.0 evidence: [release verification](V17_0_0_RELEASE.md).

See [v16 workflow](CREATOR_V16.md), [timeline editing](V16_TIMELINE_EDITING.md), and [local verification](CREATOR_V16_VERIFICATION.md).

### Publication and qualification

The canonical tag workflow publishes
[v19.0.0](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v19.0.0)
only after Windows/Linux builds and packaged smoke tests succeed. Tag existence alone does not
establish publication. Fedora COPR is verified independently after GitHub publication.

Expected desktop assets:

| Target                | Asset                                                |
| --------------------- | ---------------------------------------------------- |
| Windows x64 installer | `Loofi-Flow-Veo-Studio-19.0.0-win-x64-setup.exe`     |
| Windows x64 portable  | `Loofi-Flow-Veo-Studio-19.0.0-win-x64-portable.exe`  |
| Fedora RPM            | `Loofi-Flow-Veo-Studio-19.0.0-linux-x86_64.rpm`      |
| Linux AppImage        | `Loofi-Flow-Veo-Studio-19.0.0-linux-x86_64.AppImage` |

The release also includes `SHA256SUMS.txt`, `sbom.cdx.json`, `provenance.intoto.json`,
`release-manifest.json` and Windows update metadata. Verify published checksums before installation.
Signing and attestation status are recorded in the manifest; provenance does not imply code signing.

The stabilization PR passed 4,312 unit/integration tests, native desktop checks, 111 Chromium
scenarios (the packaged-only test is deferred to the package jobs), and production smoke/stability
checks. See [the stabilization report](V16_STABILIZATION.md) for local benchmarks and dated
verification evidence. The canonical tag workflow qualifies the actual release packages independently.

## Local release gates

Run these checks from a clean Node.js 24 checkout before publication:

```bash
npm ci
npm run package:rpm:check
npm run pre-release:check
npm run validate:release
git diff --check
```

The release passes all unit and integration test suites, lint (0 warnings), TypeScript strict checks, formatting, production build, RPM dependency metadata validation, and CI package smokes. Physical Wayland input, fractional scaling, screen-reader, reduced-motion, light/dark desktop checks, real OS-vault access, and real Suno profile migration are separate evidence boundaries, recorded as `NOT RUN` until performed. Automated checks are the release acceptance requirement.

## GitHub publication sequence

Publication requires explicit authorization. Never move an existing tag or force-push a release.

```bash
npm run validate:release
git diff --check
git commit -m "chore(release): vX.Y.Z"
git push origin main
git tag -a vX.Y.Z -m "Loofi Creator Studio vX.Y.Z"
git push origin vX.Y.Z
gh run watch <run-id> --repo loofiboss-bit/Loofi-Veo-prompt-generator --exit-status
```

The tag workflow builds Windows and Linux artifacts, stages a draft release, runs package smokes,
generates checksums/SBOM/provenance, and publishes only after the release gates pass. Verify the
public result independently:

Automatic desktop packaging runs only on release tags. Main branch pushes run the validation
workflow, so merging and tagging the same change does not create two sets of desktop packages.
Packaging consumes the existing verified Vite output. The second Vite build is intentional: it
checks reproducibility. Dev-server browser tests do not build production output they never use.

```bash
gh release view vX.Y.Z --repo loofiboss-bit/Loofi-Veo-prompt-generator
gh release download vX.Y.Z --repo loofiboss-bit/Loofi-Veo-prompt-generator --dir /tmp/loofi-release
cd /tmp/loofi-release
sha256sum -c SHA256SUMS.txt
```

## Fedora COPR publication

The COPR package is a Fedora 44 x86_64 custom-source build. The checked-in
[`packaging/copr/fetch-release.sh`](../packaging/copr/fetch-release.sh) downloads the exact GitHub
RPM, downloads `SHA256SUMS.txt`, fails if the artifact entry is missing or mismatched, and fetches
the tracked spec. The spec repackages the qualified Electron payload as `veo-prompt-generator`.

The bundled Electron/Sharp runtime objects `libc.musl-x86_64.so.1` and
`libvips-cpp.so.*` are not host package requirements. The spec filters only those two false
requirements from RPM's automatic ELF scan; GTK, NSS, libsecret, X11, and other real Fedora runtime
requirements remain visible to DNF.

```bash
copr-cli add-package-custom loofitheboss/loofi-creator-studio \
  --name veo-prompt-generator \
  --script packaging/copr/fetch-release.sh
copr-cli build-package loofitheboss/loofi-creator-studio \
  --name veo-prompt-generator -r fedora-44-x86_64
```

Verify a completed build before telling users to install it:

```bash
copr-cli download-build <build-id> --rpms --dest /tmp/loofi-copr
rpm -Kv /tmp/loofi-copr/*.rpm
rpm -qp --requires /tmp/loofi-copr/*.rpm
```

The Fedora package must not list `libc.musl-x86_64.so.1` or `libvips-cpp.so.*` as requirements.
COPR is not part of the app's automatic updater allowlist; users enable it explicitly:

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf upgrade veo-prompt-generator
```

## Manual qualification boundaries

Automated release evidence does not imply physical desktop qualification. Keep these items marked
`NOT RUN` until they are actually performed:

- physical Wayland input, scaling, screen-reader, reduced-motion, and light/dark desktop checks;
- real OS-vault access and profile migration on a user's desktop;
- real Suno account/profile handoff and rights confirmation;
- packaged installation on additional Fedora or Windows hardware;
- paid provider execution after a real approval and price review.

## Historical releases

- [v15.0.0 Creator Delivery](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v15.0.0)

- [v14.2.1 Connected Creator Flow](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v14.2.1)

- [v14.1.0 Prompt Quality & Safe Iteration](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v14.1.0)

- [v13.0.0 Universal Model Transpiler](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v13.0.0)

- [v12.0.0 Previz & Multi-Track Production Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v12.0.0)
- [v11.0.0 Prompt & Lyrics Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v11.0.0)
- [v10.0.0 Continuity Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v10.0.0)
- [v9.0.0 Creator Studio Consolidation](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v9.0.0)
- [Release notes](wiki/Release-Notes.md)

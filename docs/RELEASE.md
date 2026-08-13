# Loofi Creator Studio release process

This is the public release runbook for Loofi Creator Studio. GitHub Actions is the canonical source
for qualified desktop artifacts; Fedora COPR is a separate community packaging channel built from
the matching GitHub RPM.

## Current release: v11.0.0 Prompt & Lyrics Studio

The v11 release restores the copy-first product core:

- Prompt Studio is the first route at `/` and `/studio`.
- Video supports text-to-video, motion-only image-to-video, first/last frames,
  ingredients/references, and extend prompts.
- Every successful optimization returns one primary prompt and exactly two complete alternatives.
- Music & Lyrics creates Suno Custom Mode handoff packs with selected-language lyrics and English
  Style of Music text.
- Generate in app creates only a local Production Run or Lyria draft until cost and execution are
  separately approved.
- `PromptArtifactV1`, Creative Pack schema 4, and `.loofi-project` schema 11 preserve normalized
  inputs, copy fields, validation, provenance, history, and older project data.

### Publication evidence

| Surface               | Evidence                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Commit                | `ba838df03d74b7a55a3bea517c22d9c0752e9a32`                                                                      |
| Tag                   | [`v11.0.0`](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v11.0.0)                   |
| CI workflow           | [31705240360](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/actions/runs/31705240360)             |
| GitHub release        | [v11.0.0](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v11.0.0)                     |
| Fedora COPR           | [loofitheboss/loofi-creator-studio](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/) |
| Initial COPR build    | `10862345` (`11.0.0-1.fc44`, superseded by the dependency-filtered corrective build)                            |
| Corrective COPR build | `10862439` (`11.0.0-2.fc44`, Fedora 44 x86_64, published)                                                       |

The release manifest records `githubAttestation: true` and `signed: false`. Provenance is published;
no Windows signing certificate was configured for this release.

## Qualified assets

| Target               | Asset                                                | Qualification                          |
| -------------------- | ---------------------------------------------------- | -------------------------------------- |
| Windows x64          | `Loofi-Flow-Veo-Studio-11.0.0-win-x64-setup.exe`     | install, shortcuts, launch, uninstall  |
| Windows x64          | `Loofi-Flow-Veo-Studio-11.0.0-win-x64-portable.exe`  | portable launch                        |
| Fedora 44 x86_64     | `Loofi-Flow-Veo-Studio-11.0.0-linux-x86_64.rpm`      | install, X11/Wayland launch, uninstall |
| Fedora latest x86_64 | same RPM                                             | install, launch, uninstall smoke       |
| Linux x86_64         | `Loofi-Flow-Veo-Studio-11.0.0-linux-x86_64.AppImage` | extraction and launch smoke            |

The public release also contains `SHA256SUMS.txt`, `sbom.cdx.json`, `provenance.intoto.json`,
`release-manifest.json`, and Windows update metadata. Verify every downloaded asset against the
published checksum manifest before installation.

## Local release gates

Run these checks from a clean Node.js 24 checkout before publication:

```bash
npm ci
npm run package:rpm:check
npm run pre-release:check
npm run validate:release
git diff --check
```

The v11 release passed 258 test files and 3909 tests, lint, TypeScript, formatting, build, RPM
dependency metadata checks, and the tag workflow's Fedora and Windows package smokes. Physical
Wayland input, scaling, screen-reader, reduced-motion, light/dark desktop checks, real OS-vault
access, and real Suno profile migration remain manual gates and must be recorded as `NOT RUN` until
performed.

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
`libvips-cpp.so.8.18.3` are not host package requirements. The spec filters only those two false
requirements from RPM's automatic ELF scan; GTK, NSS, libsecret, X11, and other real Fedora runtime
requirements remain visible to DNF. This corrective build is versioned as `11.0.0-2.fc44` so an
installed `11.0.0-1.fc44` is replaced by the fixed package.

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

The Fedora package must not list `libc.musl-x86_64.so.1` or `libvips-cpp.so.8.18.3` as requirements.
COPR is not part of the app's automatic updater allowlist; users enable it explicitly:

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf upgrade veo-prompt-generator
```

### Corrective build readback

The published corrective package was independently downloaded from COPR and checked as
`veo-prompt-generator-11.0.0-2.fc44.x86_64.rpm`. RPM reports `Header SHA256 digest: OK` and
`Payload SHA256 digest: OK`; the Fedora repository's primary metadata points to the same NVR and
contains neither bundled-runtime requirement. A DNF `upgrade --assumeno` from the older
`10.0.0-1` package resolves to `11.0.0-2.fc44` and replaces it without executing a transaction.

## Manual qualification boundaries

Automated release evidence does not imply physical desktop qualification. Keep these items marked
`NOT RUN` until they are actually performed:

- physical Wayland input, scaling, screen-reader, reduced-motion, and light/dark desktop checks;
- real OS-vault access and profile migration on a user's desktop;
- real Suno account/profile handoff and rights confirmation;
- packaged installation on additional Fedora or Windows hardware;
- paid provider execution after a real approval and price review.

## Historical releases

- [v10.0.0 Continuity Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v10.0.0)
- [Release notes](wiki/Release-Notes.md)

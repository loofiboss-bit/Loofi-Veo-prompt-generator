# Loofi Creator Studio Release Process

This is the public release runbook for Loofi Creator Studio. GitHub Actions is the canonical source
for qualified desktop artifacts; Fedora COPR is a separate community packaging channel built from
the matching GitHub RPM.

## Current release: v13.0.0 Universal Model Transpiler & Modular Studio Architecture

The v13.0.0 release expands Loofi Creator Studio into an open, multi-model pre-production suite:

- **Universal Model Transpiler Engine**: Deterministically transpile cinematic shot rigs into model-specific prompts for Google Veo 3.1 / Flow, Kling 1.5/2.0, Runway Gen-3/4, OpenAI Sora, and Luma Dream Machine Ray-2.
- **Prompt Studio UI Modularization**: Decompose monolithic PromptStudioPage into decoupled Video, Music, Variant, and Validation components.
- **ComfyUI Local GPU Engine**: Zero-cost offline video rendering for Stable Video Diffusion (SVD-XT), HunyuanVideo, CogVideoX, and AnimateDiff with live VRAM and health inspection.
- **3D WebGPU Staging & Generative Previz v2**: Real-time Three.js viewport, optical lens simulation (16mm to 135mm + 2.39:1 anamorphic), calibrated apertures ($f/1.2$ to $f/16$), and ControlNet Depth/Normal/Wireframe map rendering.
- **Multimodal AI Co-Director**: Powered by Gemini Live (`gemini-3.8-live`) with hands-free audio directing, waveform studio widget, and bidirectional camera/scene tool manipulation.
- **Automated Foley & SFX Audio Pipeline**: Multi-track detection (A2 Dialogue TTS, A3 Foley/SFX, A5 Room Tone), dynamic ducking keyframe automation (-14 dB attenuation), and offline synthetic WAV previz.
- **P2P Virtual Writers' Room**: Local network real-time collaboration over LAN/WebRTC without cloud servers, creative production roles, copyable LAN pairing codes, synchronized activity feed, and AES-GCM data channel encryption.

### Publication evidence

| Surface        | Evidence                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Tag            | [`v13.0.0`](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v13.0.0)                   |
| GitHub release | [v13.0.0](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v13.0.0)                     |
| Fedora COPR    | [loofitheboss/loofi-creator-studio](https://copr.fedorainfracloud.org/coprs/loofitheboss/loofi-creator-studio/) |

The release manifest records `githubAttestation: true` and `signed: false`. Provenance is published;
no Windows signing certificate was configured for this release.

## Qualified assets

| Target               | Asset                                                | Qualification                          |
| -------------------- | ---------------------------------------------------- | -------------------------------------- |
| Windows x64          | `Loofi-Flow-Veo-Studio-13.0.0-win-x64-setup.exe`     | install, shortcuts, launch, uninstall  |
| Windows x64          | `Loofi-Flow-Veo-Studio-13.0.0-win-x64-portable.exe`  | portable launch                        |
| Fedora 44 x86_64     | `Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.rpm`      | install, X11/Wayland launch, uninstall |
| Fedora latest x86_64 | same RPM                                             | install, launch, uninstall smoke       |
| Linux x86_64         | `Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage` | extraction and launch smoke            |

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

The release passes all unit and integration test suites, lint (0 warnings), TypeScript strict checks, formatting, production build, RPM dependency metadata validation, and CI package smokes. Physical Wayland input, fractional scaling, screen-reader, reduced-motion, light/dark desktop checks, real OS-vault access, and real Suno profile migration remain manual gates and must be recorded as `NOT RUN` until performed.

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

The Fedora package must not list `libc.musl-x86_64.so.1` or `libvips-cpp.so.8.18.3` as requirements.
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

- [v12.0.0 Previz & Multi-Track Production Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v12.0.0)
- [v11.0.0 Prompt & Lyrics Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v11.0.0)
- [v10.0.0 Continuity Studio](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v10.0.0)
- [v9.0.0 Creator Studio Consolidation](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v9.0.0)
- [Release notes](wiki/Release-Notes.md)

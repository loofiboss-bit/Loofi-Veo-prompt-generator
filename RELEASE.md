# Loofi Creator Studio release process

## v10.0.0 Continuity Studio

Continuity Studio is the v10 release candidate. `npm run validate:release` passes with the application
ID `com.loofi.flowveostudio`, existing storage paths, and legacy deep links intact. Project bundles
read v5–v9 archives and write schema 10 with a canonical Production Bible. Tag qualification remains
the source of truth for cross-platform packages and publication.

Run the local candidate checks with:

```bash
npm run validate:release
```

The candidate also has 61/62 Chromium E2E scenarios passing against a separately started Vite server;
the packaged-Electron scenario is skipped locally unless `PACKAGED_ELECTRON_PATH` is supplied.

## Qualified targets

| Target               | Artifact pattern                                     | Required qualification                 |
| -------------------- | ---------------------------------------------------- | -------------------------------------- |
| Windows x64 NSIS     | `Loofi-Flow-Veo-Studio-10.0.0-win-x64-setup.exe`     | install, shortcuts, launch, uninstall  |
| Windows x64 portable | `Loofi-Flow-Veo-Studio-10.0.0-win-x64-portable.exe`  | launch smoke                           |
| Linux AppImage       | `Loofi-Flow-Veo-Studio-10.0.0-linux-x86_64.AppImage` | extract and launch smoke               |
| Fedora 44 RPM        | `Loofi-Flow-Veo-Studio-10.0.0-linux-x86_64.rpm`      | install, X11/Wayland launch, uninstall |

macOS packaging configuration is retained for development compatibility, but macOS is not a
production-supported v10 target and no DMG may be described as qualified without a dedicated build,
signing, notarization, install, and launch record.

## Local candidate preparation

Use Node.js 24:

```bash
nvm use
npm ci
npm run version:sync -- 10.0.0
npm run screenshots
npm audit --audit-level=high
npm run validate:release
```

Then review:

- `package.json`, `package-lock.json`, `metadata.json`, `manifest.json`, `README.md`, and `sw.js`
  all carry `10.0.0`.
- `CHANGELOG.md` contains `## [10.0.0]`.
- deterministic screenshots contain expected populated states and no secrets.
- model catalog/pricing mirrors and provider request fixtures pass.
- the final diff contains no generated caches, credentials, private media, or unrelated edits.
- all manual qualifications are recorded as `PASS`, `FAIL`, or `NOT RUN`.

`npm run pre-release:check` may require a clean committed tree. A dirty local implementation can be
fully tested while that particular publication-lineage gate remains `NOT RUN` or blocked.

## CI qualification

The pinned GitHub Actions workflows run only after authorized Git activity:

1. `validate.yml` owns governance, audit, lint, types, unit coverage, formatting, build, and E2E.
2. `build.yml` builds Linux and Windows packages without publishing from electron-builder.
3. Tag builds stage qualified packages on a draft release; Fedora 44 and Windows jobs
   download those exact assets for install/launch/uninstall qualification.
4. Tag-only release work downloads the qualified draft assets, generates SHA-256 checksums,
   CycloneDX SBOM, release manifest, and build provenance, and only then publishes the release.
5. `security.yml` performs dependency/license review and full-history secret scanning.

Main-branch package builds and deterministic screenshots are validated without uploading redundant
Actions artifacts. Failure/debug evidence is retained for seven days where configured. Durable
packages belong on the tag's qualified GitHub Release, not in Actions storage.

Every release includes digest-bound in-toto/SLSA provenance. This repository is public, so the tag
workflow also requests GitHub-hosted build attestations when the Actions permission is available.

## Signing and publication

Basic package builds need no repository secrets. Windows signing uses the existing optional secrets:

- `WINDOWS_CERTIFICATE`
- `WINDOWS_CERTIFICATE_PASSWORD`

If unavailable, the release manifest must record `signed: false` and the artifacts remain community
builds. Do not invent or document unused Apple or alternate Windows secret names.

The authorized publication sequence is:

```bash
git commit -m "chore(release): prepare v10.0.0"
git push origin main
git tag v10.0.0
git push origin v10.0.0
```

Run it only with explicit authorization and after every non-waived local and CI qualification is
satisfied. Any manual waiver must remain explicit in the version plan. A green local build is not
GitHub Release proof.

## Manual qualification record

Record evidence separately for:

- representative v5–v8 user-data and project upgrades;
- existing local media and OS-vault credential access;
- full fake-provider Create workflow and legacy redirect behavior;
- unknown-price blocking and exact/upper-bound approval display;
- restart recovery for video and Lyria jobs;
- Fedora KDE Wayland/X11 at 140% in light and dark themes;
- offline behavior and secret-free diagnostics/exports;
- Windows install, portable launch, shortcuts, and uninstall.

Never substitute jsdom, offscreen, or container evidence for physical desktop qualification.

# Verified update system

Loofi Creator Studio checks the allowlisted GitHub Releases channel and can download a selected
Windows or Linux release asset. Installation remains an explicit user decision and requires an app
restart.

## Trust boundary

- Only HTTPS assets under `loofiboss-bit/Loofi-Veo-prompt-generator` release-download URLs are
  accepted.
- `SHA256SUMS.txt` is downloaded and the exact artifact entry is required.
- Downloads use a private `.partial` file and are renamed only after SHA-256 verification.
- A failed or interrupted verification removes the partial file.
- Electron main owns download and installer launch. The sandboxed renderer receives progress and
  result state but no filesystem or credential access.
- Release qualification separately requires checksums, CycloneDX SBOM, provenance, package smoke
  tests, and an explicit signing status.

## User workflow

1. Open Settings and select Updates.
2. Choose Stable, Beta, or Dev and configure automatic checks if desired.
3. Select **Check for updates**.
4. Review the version and release notes.
5. Download the selected asset. The app verifies it before enabling installation.
6. Choose **Install and restart**, or defer installation.

An offline or unavailable release service leaves the current installation untouched and reports an
actionable error.

## Architecture

- `src/core/services/updateService.ts` owns channel, version, and renderer-visible update state.
- `electron/update-security.cjs` validates release URLs, manifests, and SHA-256 values.
- `electron/ipc/update-ipc.cjs` owns verified download and installer IPC.
- `electron/preload.cjs` exposes the narrow update bridge.
- `vite-env.d.ts` defines the renderer contract.

The package filename remains `Loofi-Flow-Veo-Studio-*` for updater compatibility, while the visible
product name is Loofi Creator Studio.

## Supported targets

- Windows 11 x64: NSIS installer and portable executable
- Fedora 44 x86_64: RPM and AppImage
- macOS: no production-qualified v10 artifact

See `RELEASE.md` for the complete qualification and publication process.

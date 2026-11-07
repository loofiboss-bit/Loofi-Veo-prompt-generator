# Installation and Updates

The primary supported release channel is **Fedora Linux (Fedora 44 and Fedora 45 x86_64)** via Fedora COPR, GitHub RPM, and AppImage. Windows is not built in CI; users who want Windows binaries can build them manually via `npm run build && npx electron-builder --win`. macOS is not a supported target.

Download [v22.0.0](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v22.0.0).
It provides the official Fedora RPM, Linux AppImage, and `SHA256SUMS.txt`.
See the [README installation steps](../../README.md#install-v2200) for package commands.

## Verification & Trust Boundary

Always verify release assets against `SHA256SUMS.txt` before installation. Shipped releases also provide:

- `sbom.cdx.json`: CycloneDX Software Bill of Materials (SBOM) cataloging all dependencies.
- `provenance.intoto.json`: in-toto build provenance.
- `release-manifest.json`: artifact identity and signing status. GitHub build attestations are
  published separately; provenance alone does not establish code signing.

The built-in updater accepts HTTPS downloads exclusively from allowlisted GitHub Releases of `loofiboss-bit/Loofi-Veo-prompt-generator`. It verifies the target artifact SHA-256 against `SHA256SUMS.txt` prior to handing off execution to the operating system installer.

## Package Naming & Compatibility

The legacy package prefix `Loofi-Flow-Veo-Studio-*` is preserved for seamless auto-update compatibility. The installed application name is **Loofi Creator Studio**, with persistent ID `com.loofi.flowveostudio`.

## Fedora COPR Repository

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

To upgrade an existing package:

```bash
sudo dnf clean all
sudo dnf upgrade veo-prompt-generator
```

The Fedora spec repackages the verified Electron payload and filters bundled internal runtime objects from host requirements, leaving real system dependencies (GTK, NSS, libsecret, X11, libnotify) fully managed by DNF.

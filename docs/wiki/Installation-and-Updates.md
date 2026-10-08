# Installation and Updates

Loofi Creator Studio v14.1.0 qualifies desktop packages for Windows 11 / 10 x64 and Fedora 44 x86_64. Windows packages provide an NSIS installer and a portable executable; Fedora packages provide a GitHub RPM, AppImage, and Fedora COPR repository channel. macOS is not a production-supported target.

## Verification & Trust Boundary

Always verify release assets against `SHA256SUMS.txt` before installation. Shipped releases also provide:

- `sbom.cdx.json`: CycloneDX Software Bill of Materials (SBOM) cataloging all dependencies.
- `provenance.intoto.json`: in-toto/SLSA build attestation.

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

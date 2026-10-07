# Installation

Download qualified packages from [the v13.0.0 GitHub Release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v13.0.0).

Verify all downloaded assets against `SHA256SUMS.txt` before installation.

---

## Windows 11 / 10 (x64)

- **NSIS Installer**: `Loofi-Flow-Veo-Studio-13.0.0-win-x64-setup.exe` (per-user installation, automatic shortcut creation).
- **Portable Executable**: `Loofi-Flow-Veo-Studio-13.0.0-win-x64-portable.exe` (runs without installation).

---

## Linux (x86_64)

### AppImage

```bash
chmod +x Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage
./Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.AppImage
```

### Fedora RPM from GitHub

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-13.0.0-linux-x86_64.rpm
```

### Fedora COPR Repository

The community COPR repository builds `veo-prompt-generator` directly for Fedora 44 x86_64:

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

If upgrading from an earlier version:

```bash
sudo dnf clean all
sudo dnf upgrade veo-prompt-generator
```

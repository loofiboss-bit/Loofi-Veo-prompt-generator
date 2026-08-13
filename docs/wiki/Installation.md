# Installation

Download releases from:

[the v11.0.0 GitHub Release](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/tag/v11.0.0)

## Windows

- Use the NSIS installer for normal per-user installation.
- Use the portable EXE when you do not want to install the app.
- Normal installs do not require administrator permissions.

## Linux

AppImage:

```bash
chmod +x Loofi-Flow-Veo-Studio-*-linux-*.AppImage
./Loofi-Flow-Veo-Studio-*-linux-*.AppImage
```

RPM:

```bash
sudo dnf install ./Loofi-Flow-Veo-Studio-*-linux-*.rpm
```

COPR:

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

COPR is an optional Fedora distribution channel and is not used by the automatic updater.

The current corrective COPR build is `veo-prompt-generator-11.0.0-2.fc44` (build `10862439`). If an
older GitHub or COPR package is already installed, refresh metadata and upgrade it instead of
starting a second installation:

```bash
sudo dnf clean all
sudo dnf upgrade veo-prompt-generator
```

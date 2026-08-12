# Fedora 44 development and package setup

Fedora 44 x86_64 is the supported v10 Linux baseline. Newer Fedora versions may run as an additional
CI signal but do not silently replace Fedora 44 qualification.

## Development dependencies

```bash
sudo dnf install git gcc-c++ make rpm-build libsecret-devel \
  gtk3 nss libXScrnSaver libXtst libnotify at-spi2-core libuuid fuse-libs
```

Install Node.js 24 with your preferred version manager, then confirm:

```bash
node --version
npm --version
```

From the repository:

```bash
nvm use
npm ci
npm run validate
npm run electron:dev
```

## Local package candidate

```bash
npm run validate:release
npm run dist -- --publish never
ls release/Loofi-Flow-Veo-Studio-*-linux-x86_64.{rpm,AppImage}
```

RPM install/readback/uninstall:

```bash
sudo dnf install ./release/Loofi-Flow-Veo-Studio-*-linux-x86_64.rpm
rpm -q veo-prompt-generator
veo-prompt-generator --smoke-test
sudo dnf remove veo-prompt-generator
```

AppImage smoke:

```bash
chmod +x release/Loofi-Flow-Veo-Studio-*-linux-x86_64.AppImage
release/Loofi-Flow-Veo-Studio-*-linux-x86_64.AppImage --appimage-extract
xvfb-run -a ./squashfs-root/AppRun --no-sandbox --smoke-test
```

Container/offscreen smoke evidence does not qualify KDE Wayland/X11, fractional scaling, vault
access, audio playback, or physical interaction. Record those gates separately as `PASS`, `FAIL`, or
`NOT RUN`.

## Credential and desktop notes

The packaged desktop uses the system Secret Service through keytar. Ensure a KDE Wallet/Secret
Service session is available before testing credential persistence. Never put an API key in a shell
command, screenshot, log, fixture, or repository file.

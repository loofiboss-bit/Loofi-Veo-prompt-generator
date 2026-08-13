# Fedora COPR packaging

The `loofitheboss/loofi-creator-studio` project publishes `veo-prompt-generator` for Fedora 44
x86_64. The package is a verified COPR rebuild of the matching GitHub release RPM, not an unofficial
provider integration.

## How the source build works

1. `fetch-release.sh` downloads the v11 GitHub RPM and `SHA256SUMS.txt`.
2. The helper refuses to continue when the RPM is missing from the checksum manifest or does not
   match its SHA-256 entry.
3. The helper downloads the tracked spec, which extracts the qualified Electron payload and installs
   the desktop file, icon, and `/usr/bin/veo-prompt-generator` launcher.
4. The spec declares the real Fedora runtime requirements explicitly.

Electron and Sharp bundle their own runtime objects. Fedora's automatic ELF scanner can otherwise
turn those internal objects into impossible host requirements. The spec therefore filters only
`libc.musl-x86_64.so.1` and `libvips-cpp.so.8.18.3`; GTK, NSS, libsecret, X11, and other actual host
requirements remain declared and visible to DNF.

## Enable and install

```bash
sudo dnf copr enable loofitheboss/loofi-creator-studio
sudo dnf install veo-prompt-generator
```

COPR is separate from the app's GitHub-only automatic updater. Users can remove it with:

```bash
sudo dnf copr disable loofitheboss/loofi-creator-studio
```

## Build or repair the package

```bash
copr-cli build-package loofitheboss/loofi-creator-studio \
  --name veo-prompt-generator -r fedora-44-x86_64
```

Inspect a downloaded result before installation:

```bash
rpm -Kv veo-prompt-generator-*.rpm
rpm -qp --requires veo-prompt-generator-*.rpm
```

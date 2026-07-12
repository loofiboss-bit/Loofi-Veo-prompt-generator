# Release Documentation

<!-- markdownlint-configure-file {"MD024": false} -->

> **Current release line:** `v4.4.2`

## Overview

This document describes how to create releases for Veo Studio, including building packages for Windows, Linux (AppImage and Fedora RPM), and macOS.

## Supported Platforms

### Windows

- **NSIS Installer** (`.exe`) - Full installer with Start Menu shortcuts
- **Portable Edition** (`.exe`) - No installation required, runs from any folder

### Linux

- **AppImage** (`.AppImage`) - Universal Linux package, works on most distributions
- **Fedora RPM** (`.rpm`) - Native package for Fedora, RHEL, CentOS, and compatible distributions

### macOS

- **DMG Installer** (`.dmg`) - Native macOS disk image for x64 and ARM64 (Apple Silicon)

---

## Building Packages Locally

### Prerequisites

1. **Node.js 20+** - Required for building the application
2. **npm** - Package manager (comes with Node.js)
3. **Git** - Version control

### Build Commands

#### All Platforms

```bash
# Install dependencies
npm ci

# Build the application
npm run build

# Build Electron packages for current platform
npm run dist
```

The built packages will be in the `release/` directory.

#### Platform-Specific Notes

**Windows:**

- Builds both NSIS installer and portable edition automatically
- Requires Windows to build Windows packages
- Output files:
  - `Loofi Flow/Veo Studio-{version}-win-x64-setup.exe` (Installer)
  - `Loofi Flow/Veo Studio-{version}-win-x64-portable.exe` (Portable)

**Linux (Fedora RPM):**

- Requires Linux to build RPM packages
- Dependencies are automatically included in the package
- Output file: `Loofi Flow/Veo Studio-{version}.x86_64.rpm`
- Installation: `sudo rpm -i "Loofi Flow/Veo Studio-{version}.x86_64.rpm"`

**Linux (AppImage):**

- Works on most modern Linux distributions
- No installation required, just make executable and run
- Output file: `Loofi Flow/Veo Studio-{version}.AppImage`
- Usage: `chmod +x "Loofi Flow/Veo Studio-{version}.AppImage" && ./"Loofi Flow/Veo Studio-{version}.AppImage"`

**macOS:**

- Requires macOS to build DMG packages
- Builds for both Intel (x64) and Apple Silicon (arm64)
- Output files:
  - `Loofi Flow/Veo Studio-{version}-mac-x64.dmg`
  - `Loofi Flow/Veo Studio-{version}-mac-arm64.dmg`

---

## Automated Release Process (CI/CD)

Releases are automatically built and published via GitHub Actions when a version tag is pushed.

### Creating a Release

1. **Update Version Number**

   ```bash
   npm run version:sync
   ```

   This updates version across package.json, manifest.json, and metadata.json

2. **Update CHANGELOG.md**
   - Add a new section for the version: `## [X.Y.Z] - YYYY-MM-DD`
   - Document all changes, fixes, and new features
   - Follow existing format (Added, Changed, Fixed, Removed sections)

3. **Run Pre-Release Checks**

   ```bash
   npm run pre-release:check
   ```

   This verifies:
   - All version numbers are in sync
   - CHANGELOG.md has an entry for the new version
   - No uncommitted changes

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "chore(release): prepare v{version}"
   ```

5. **Create and Push Tag**

   ```bash
   git tag v{version}
   git push origin main --tags
   ```

### Verified publish flow

- Run `npm run validate:release`
- Push `main` and the new semver tag
- Let GitHub Actions build the platform packages
- Let the dedicated release step publish the downloaded artifacts

> Electron packaging jobs use `npm run dist -- --publish never` in CI so `softprops/action-gh-release` remains the only publisher of visible GitHub release assets.

### What Happens Automatically

When a version tag (e.g., `v4.3.0`) is pushed:

1. **Build Job** runs on both Ubuntu and Windows runners:
   - Installs dependencies
   - Runs security audit
   - Runs linting and type checking
   - Runs test suite with coverage
   - Checks bundle size budgets
   - Builds application
   - Creates platform packages:
     - **Ubuntu runner**: AppImage + RPM
     - **Windows runner**: NSIS Installer + Portable EXE
   - Uploads artifacts

2. **Release Job** creates a GitHub Release:
   - Downloads all artifacts
   - Extracts changelog for the version
   - Creates release with changelog as description
   - Attaches all built packages

### Workflow Files

- `.github/workflows/build.yml` - Main build and release workflow
- `.github/workflows/beta-release.yml` - Beta release workflow (for `-beta` tags)

---

## Installing on Different Platforms

### Windows

#### NSIS Installer (Recommended)

1. Download `Loofi Flow/Veo Studio-{version}-win-x64-setup.exe`
2. Double-click to run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

**Features:**

- Installs to Program Files
- Creates Start Menu shortcut
- Creates Desktop shortcut (optional)
- Adds to Windows uninstall list
- Per-user installation (no admin required)

#### Portable Edition

1. Download `Loofi Flow/Veo Studio-{version}-win-x64-portable.exe`
2. Place in any folder
3. Double-click to run
4. No installation required

**Features:**

- Run from USB drives
- No registry modifications
- Stores data in local folder
- Perfect for portable use

### Linux (Fedora, RHEL, CentOS)

#### RPM Package (Recommended for Fedora users)

```bash
# Download the RPM package
wget https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v{version}/Veo-Prompt-Generator-{version}.x86_64.rpm

# Install
sudo rpm -i Veo-Prompt-Generator-{version}.x86_64.rpm

# Or use DNF (Fedora)
sudo dnf install ./Veo-Prompt-Generator-{version}.x86_64.rpm

# Launch
veo-prompt-generator
# Or from Applications menu: Utilities > Loofi Flow/Veo Studio
```

**Features:**

- Native Fedora package management integration
- Automatic dependency installation
- System-wide or user installation
- Proper uninstallation via package manager

**Uninstall:**

```bash
sudo rpm -e veo-prompt-generator
# Or with DNF
sudo dnf remove veo-prompt-generator
```

#### AppImage (Universal)

```bash
# Download
wget https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/releases/download/v{version}/Veo-Prompt-Generator-{version}.AppImage

# Make executable
chmod +x Veo-Prompt-Generator-{version}.AppImage

# Run
./Veo-Prompt-Generator-{version}.AppImage
```

**Features:**

- Works on most Linux distributions
- No installation needed
- Self-contained (includes all dependencies)
- Can be run from anywhere

### macOS

```bash
# Download DMG for your architecture
# Intel Macs: Loofi Flow/Veo Studio-{version}-mac-x64.dmg
# Apple Silicon: Loofi Flow/Veo Studio-{version}-mac-arm64.dmg

# Open DMG
open "Loofi Flow/Veo Studio-{version}-mac-{arch}.dmg"

# Drag to Applications folder
# Launch from Applications or Launchpad
```

**Note:** On first launch, you may need to right-click and select "Open" to bypass Gatekeeper (unsigned application warning).

---

## Version Numbering

Veo Studio follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** version: Incompatible API changes or major feature overhaul
- **MINOR** version: New features, backwards-compatible
- **PATCH** version: Bug fixes, backwards-compatible

### Beta Releases

Beta versions use the format `X.Y.Z-beta.N` (e.g., `4.3.0-beta.1`)

- Published via the `beta-release.yml` workflow
- Marked as pre-release on GitHub
- Used for testing before stable release

---

## Package Signing

Stable automation signs Windows artifacts when `WINDOWS_CERTIFICATE` and
`WINDOWS_CERTIFICATE_PASSWORD` are configured. Without those repository secrets, artifacts are
published as checksummed, attested **community builds** and the release manifest records
`signed: false`. This means:

- **Windows**: Users will see a "Windows protected your PC" warning
- **macOS**: Users need to right-click and select "Open" on first launch
- **Linux**: No issues (RPM and AppImage don't require signing for basic functionality)

**Remaining:**

- macOS notarization with Apple Developer account
- Linux GPG signing for repository distribution

---

## Troubleshooting

### Windows

**"Windows protected your PC" warning:**

- Click "More info" → "Run anyway"
- This is expected for unsigned applications

**Antivirus false positives:**

- Electron apps are sometimes flagged by antivirus software
- Add Veo Studio to your antivirus exclusions list
- Report false positives to your antivirus vendor

### Linux

**AppImage won't run:**

- Ensure FUSE is installed: `sudo apt install fuse libfuse2` (Ubuntu/Debian)
- Or run with `--appimage-extract-and-run` flag

**RPM dependency issues:**

- Install missing dependencies: `sudo dnf install libgtk-3 libnotify libnss3 libXScrnSaver libXtst xdg-utils at-spi2-core libuuid`

**Permission denied:**

- Make sure the file is executable: `chmod +x Veo-Prompt-Generator-*.AppImage`

### macOS

**"Veo Studio" can't be opened:**

- Right-click → Open → Open (bypass Gatekeeper)
- Or: `sudo xattr -r -d com.apple.quarantine /Applications/Veo\ Studio.app`

**Apple Silicon (M1/M2) issues:**

- Download the ARM64 version (`mac-arm64.dmg`)
- The x64 version will work via Rosetta 2 but may be slower

---

## Development Builds

For development, use:

```bash
# Web version (hot reload)
npm run dev

# Electron version (hot reload)
npm run electron:dev
```

---

## CI/CD Configuration

### Required Secrets

The GitHub Actions workflows require:

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

No additional secrets are required for basic package building.

### Optional Secrets (for future enhancements)

- `WINDOWS_SIGNING_CERT` - Windows code signing certificate
- `WINDOWS_SIGNING_PASSWORD` - Certificate password
- `APPLE_ID` - Apple Developer ID for notarization
- `APPLE_PASSWORD` - App-specific password for notarization
- `APPLE_TEAM_ID` - Apple Developer Team ID

---

## Release Checklist

Before creating a release:

- [ ] All tests pass locally (`npm run test`)
- [ ] Linting passes (`npm run lint:ci`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Electron app runs (`npm run electron`)
- [ ] Version numbers updated (`npm run version:sync`)
- [ ] CHANGELOG.md updated with release notes
- [ ] Pre-release check passes (`npm run pre-release:check`)
- [ ] All changes committed
- [ ] Git tag created and pushed
- [ ] GitHub Actions build succeeds
- [ ] Release artifacts attached to GitHub release
- [ ] Installation tested on each platform (Windows, Linux, macOS)

---

## Support

For issues with releases or packaging:

- Check [GitHub Issues](https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/issues)
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- Read [README.md](./README.md) for general information

---

## License

MIT License - See [LICENSE](./LICENSE) for details

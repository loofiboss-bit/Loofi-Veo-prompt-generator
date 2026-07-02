# Fedora Laptop Setup Guide

> Set up the full Loofi multi-repo workspace on Fedora (KDE Plasma).

## Prerequisites

```bash
# Node.js 20+ (via dnf or nvm)
sudo dnf install nodejs npm

# Git
sudo dnf install git

# VS Code (from Microsoft repo)
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" | sudo tee /etc/yum.repos.d/vscode.repo
sudo dnf install code

# GitHub CLI (optional, for pushing/PRs)
sudo dnf install gh
gh auth login
```

## 1. Clone All Repos

The workspace file now lives at the `Dev` root, so the folder structure **must match**:

```
~/Documents/Dev/
├── Loofi.code-workspace
├── workspace-tools/
└── repos/loofi/
    ├── veo-prompt-generator/
    ├── fedora-tweaks/
    ├── plasma-ai-usage-monitor/
    ├── suno-ai-generator/
    ├── loofilearn/
    ├── swedish-secondhand-ai/
    └── hwmonitor-remote/
```

Run these commands:

```bash
# Create directory structure
mkdir -p ~/Documents/Dev/repos/loofi
mkdir -p ~/Documents/Dev/workspace-tools

# Clone all repos
cd ~/Documents/Dev/repos/loofi
git clone https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator.git veo-prompt-generator
git clone https://github.com/loofiboss-bit/loofi-fedora-tweaks.git fedora-tweaks
git clone https://github.com/loofiboss-bit/plasma-ai-usage-monitor.git
git clone https://github.com/loofiboss-bit/Loofi-Suno-AI-Generator.git suno-ai-generator
git clone https://github.com/loofiboss-bit/LoofiLearn.git loofilearn
git clone https://github.com/loofiboss-bit/swedish-secondhand-ai.git
git clone https://github.com/loofiboss-bit/hwmonitor-remote.git
```

## 2. Install Dependencies (Veo)

```bash
cd ~/Documents/Dev/repos/loofi/veo-prompt-generator
npm install
```

## 3. Open the Workspace

```bash
code ~/Documents/Dev/Loofi.code-workspace
```

This opens VS Code with all 7 repos in the sidebar:

| Folder Name           | Repo                    |
| --------------------- | ----------------------- |
| Loofi Flow/Veo Studio | veo-prompt-generator    |
| Fedora Tweaks         | fedora-tweaks           |
| Plasma AI Monitor     | plasma-ai-usage-monitor |
| Suno AI Generator     | suno-ai-generator       |
| LoofiLearn            | loofilearn              |
| Swedish Secondhand AI | swedish-secondhand-ai   |
| HWMonitor Remote      | hwmonitor-remote        |

## 4. Sync Workspace Configs

After cloning, run the sync script to ensure all MCP configs, agent definitions, CI workflows, and copilot instructions are up to date:

```bash
cd ~/Documents/Dev/repos/loofi/veo-prompt-generator
node scripts/sync-workspace.mjs
```

This writes configs to all repos from the single source of truth (`.workspace/config.json`).

### Verify sync (CI mode)

```bash
node scripts/sync-workspace.mjs --check
```

## 5. Set Up Git (if needed)

```bash
git config --global user.name "loofiboss-bit"
git config --global user.email "your-email@example.com"

# SSH key (recommended for Fedora)
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add the key to https://github.com/settings/keys
```

## 6. Fedora-Specific: Fedora Tweaks Setup

```bash
cd ~/Documents/Dev/repos/loofi/fedora-tweaks

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
python -m pytest tests/ -v
```

## 7. Fedora-Specific: Plasma AI Monitor Setup

```bash
cd ~/Documents/Dev/repos/loofi/plasma-ai-usage-monitor

# Install KDE/Qt6 dev dependencies
sudo dnf install cmake extra-cmake-modules qt6-qtbase-devel qt6-qtdeclarative-devel \
  kf6-ki18n-devel kf6-kconfig-devel kf6-kcoreaddons-devel \
  plasma-workspace-devel

# Build
cmake -B build
cmake --build build
```

## Quick Reference

| Command                                       | Purpose                                           |
| --------------------------------------------- | ------------------------------------------------- |
| `node scripts/sync-workspace.mjs`             | Sync all configs to all repos                     |
| `node scripts/sync-workspace.mjs --check`     | Check for config drift (CI)                       |
| `node scripts/sync-workspace.mjs --mcp-only`  | Sync only MCP configs                             |
| `node scripts/sync-workspace.mjs --repo=NAME` | Sync only one repo                                |
| `node scripts/sync-workspace.mjs --dry-run`   | Preview changes without writing                   |
| `npm run validate`                            | Full lint + typecheck + test + format check (Veo) |
| `npm run dev`                                 | Start Vite dev server (Veo)                       |

## Troubleshooting

### "Workspace config not found"

Make sure you run `sync-workspace.mjs` from the Veo repo root:

```bash
cd ~/Documents/Dev/repos/loofi/veo-prompt-generator
```

### Repo not found during sync

The sync script will show `⚠️ Skipping <repo> (not found at ...)`. Ensure the folder structure matches section 1 above.

### Node.js version mismatch

This project requires Node.js 20+. Check with `node -v`. Use `nvm` if you need to manage versions:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20
```

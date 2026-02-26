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

The workspace file uses relative paths, so the folder structure **must match**:

```
~/Documents/
├── Loofi VEO/
│   └── Loofi-Veo-prompt-generator/    ← Main workspace repo (SSoT)
├── Loofi Fedora 43/
│   └── loofi-fedora-tweaks/
└── Loofi Projects/
    ├── plasma-ai-usage-monitor/
    ├── Loofi-Suno-AI-Generator/
    └── LoofiLearn/
```

Run these commands:

```bash
# Create directory structure
mkdir -p ~/Documents/"Loofi VEO"
mkdir -p ~/Documents/"Loofi Fedora 43"
mkdir -p ~/Documents/"Loofi Projects"

# Clone all repos
cd ~/Documents/"Loofi VEO"
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git

cd ~/Documents/"Loofi Fedora 43"
git clone https://github.com/loofitheboss/loofi-fedora-tweaks.git

cd ~/Documents/"Loofi Projects"
git clone https://github.com/loofitheboss/plasma-ai-usage-monitor.git
git clone https://github.com/loofitheboss/Loofi-Suno-AI-Generator.git
git clone https://github.com/loofitheboss/LoofiLearn.git
```

## 2. Install Dependencies (Veo)

```bash
cd ~/Documents/"Loofi VEO"/Loofi-Veo-prompt-generator
npm install
```

## 3. Open the Workspace

```bash
code ~/Documents/"Loofi VEO"/Loofi-Veo-prompt-generator/Loofi-Veo.code-workspace
```

This opens VS Code with all 5 repos in the sidebar:

| Folder Name          | Repo                       |
| -------------------- | -------------------------- |
| Veo Prompt Generator | Loofi-Veo-prompt-generator |
| Fedora Tweaks        | loofi-fedora-tweaks        |
| Plasma AI Monitor    | plasma-ai-usage-monitor    |
| Suno AI Generator    | Loofi-Suno-AI-Generator    |
| LoofiLearn           | LoofiLearn                 |

![Plasma monitor companion window](./images/plasma-ai-monitor/plasma-monitor-main.png)
_Plasma AI monitor companion window in the multi-repo setup._

## 4. Sync Workspace Configs

After cloning, run the sync script to ensure all MCP configs, agent definitions, CI workflows, and copilot instructions are up to date:

```bash
cd ~/Documents/"Loofi VEO"/Loofi-Veo-prompt-generator
node scripts/sync-workspace.mjs
```

This writes configs to all repos from the single source of truth (`.workspace/config.json`).

### Verify sync (CI mode)

```bash
node scripts/sync-workspace.mjs --check
```

## 5. Set Up Git (if needed)

```bash
git config --global user.name "loofitheboss"
git config --global user.email "your-email@example.com"

# SSH key (recommended for Fedora)
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add the key to https://github.com/settings/keys
```

## 6. Fedora-Specific: Fedora Tweaks Setup

```bash
cd ~/Documents/"Loofi Fedora 43"/loofi-fedora-tweaks

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
cd ~/Documents/"Loofi Projects"/plasma-ai-usage-monitor

# Install KDE/Qt6 dev dependencies
sudo dnf install cmake extra-cmake-modules qt6-qtbase-devel qt6-qtdeclarative-devel \
  kf6-ki18n-devel kf6-kconfig-devel kf6-kcoreaddons-devel \
  plasma-workspace-devel

# Build
cmake -B build
cmake --build build
```

### Optional install + run

```bash
# Install to system prefix (optional)
sudo cmake --install build

# Or run directly from build output while developing
./build/bin/plasma-ai-usage-monitor
```

### Verify companion behavior

1. Confirm the monitor launches as a desktop widget/service companion
2. Confirm Veo Studio continues to run independently in parallel
3. Confirm no HTTP port is required for the monitor
4. Keep Veo diagnostics inside Veo (`Settings -> Diagnostics`) for app-level checks

See the canonical companion guide: [PLASMA_AI_MONITOR.md](./PLASMA_AI_MONITOR.md)

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
cd ~/Documents/"Loofi VEO"/Loofi-Veo-prompt-generator
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

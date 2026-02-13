#!/usr/bin/env bash
# sync-version.sh — Reads version from package.json and updates all version references
# Usage: bash scripts/sync-version.sh [version]
# If no version argument, reads from package.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Get version from argument or package.json
if [ $# -ge 1 ]; then
  VERSION="$1"
else
  VERSION=$(node -p "require('./package.json').version")
fi

echo "Syncing version: $VERSION"

# === Update package.json ===
if [ $# -ge 1 ]; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "  ✅ package.json → $VERSION"
fi

# === Update metadata.json ===
if [ -f "metadata.json" ]; then
  node -e "
    const fs = require('fs');
    const meta = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));
    meta.version = '$VERSION';
    fs.writeFileSync('metadata.json', JSON.stringify(meta, null, 2) + '\n');
  "
  echo "  ✅ metadata.json → $VERSION"
fi

# === Update manifest.json ===
if [ -f "manifest.json" ]; then
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    manifest.version = '$VERSION';
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  "
  echo "  ✅ manifest.json → $VERSION"
fi

echo ""
echo "Version sync complete: $VERSION"
echo "Files updated: package.json, metadata.json, manifest.json"

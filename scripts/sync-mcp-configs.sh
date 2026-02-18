#!/usr/bin/env bash
# scripts/sync-mcp-configs.sh
# Compatibility wrapper for Linux/macOS users.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/sync-mcp-configs.mjs "$@"

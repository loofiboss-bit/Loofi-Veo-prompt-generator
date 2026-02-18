#!/usr/bin/env bash
# sync-version.sh — compatibility wrapper

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/sync-version.mjs "$@"

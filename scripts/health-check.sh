#!/usr/bin/env bash
# health-check.sh — compatibility wrapper

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/health-check.mjs "$@"

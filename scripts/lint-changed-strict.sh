#!/usr/bin/env bash
# lint-changed-strict.sh — compatibility wrapper

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/lint-changed-strict.mjs "$@"

#!/usr/bin/env bash
# pre-release-check.sh — compatibility wrapper

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/pre-release-check.mjs "$@"

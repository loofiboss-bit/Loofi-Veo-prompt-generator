#!/usr/bin/env bash
# generate-agent-configs.sh — compatibility wrapper

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/generate-agent-configs.mjs "$@"

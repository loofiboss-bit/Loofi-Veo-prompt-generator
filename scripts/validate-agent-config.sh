#!/usr/bin/env bash
# validate-agent-config.sh — compatibility wrapper

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/validate-agent-config.mjs "$@"

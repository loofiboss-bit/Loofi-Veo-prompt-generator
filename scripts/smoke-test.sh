#!/usr/bin/env bash
# Runs a lightweight smoke test flow against staging.
# 1) Verifies HTTP health endpoint
# 2) Runs Playwright smoke spec against STAGING_URL

set -euo pipefail

STAGING_URL="${STAGING_URL:-http://localhost:8080}"
SMOKE_SPEC="e2e/smoke.spec.ts"

echo "=== Smoke test: checking staging availability ==="
if ! curl -sf "$STAGING_URL" > /dev/null 2>&1; then
  echo "ERROR: Staging app is not reachable at $STAGING_URL"
  echo "Tip: start it with ./scripts/staging-up.sh"
  exit 1
fi

echo "=== Smoke test: running Playwright smoke suite ==="
STAGING_URL="$STAGING_URL" npx playwright test "$SMOKE_SPEC" --project=chromium --reporter=line

echo "Smoke test passed for $STAGING_URL"

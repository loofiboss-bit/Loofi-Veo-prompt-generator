#!/usr/bin/env bash
# Staging environment launcher for QA testing.
# Builds and starts the production Docker image, runs a health check,
# and prints the staging URL.
#
# Usage:
#   ./scripts/staging-up.sh          # Build + start
#   ./scripts/staging-up.sh --down   # Stop + remove

set -euo pipefail

COMPOSE_FILE="compose.staging.yaml"
SERVICE_NAME="veo-staging"
STAGING_URL="http://localhost:8080"
HEALTH_RETRIES=15
HEALTH_INTERVAL=2

cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--down" ]]; then
  echo "=== Stopping staging environment ==="
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
  echo "Staging environment stopped."
  exit 0
fi

echo "=== Building staging environment ==="
APP_VERSION=$(node -p "require('./package.json').version")
export APP_VERSION

docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
docker compose -f "$COMPOSE_FILE" build --no-cache

echo "=== Starting staging container ==="
docker compose -f "$COMPOSE_FILE" up -d

echo "=== Waiting for health check ==="
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -sf "$STAGING_URL" > /dev/null 2>&1; then
    echo ""
    echo "======================================"
    echo "  Staging environment is ready!"
    echo "  URL: $STAGING_URL"
    echo "  Version: $APP_VERSION"
    echo ""
    echo "  Run E2E tests against staging:"
    echo "    STAGING_URL=$STAGING_URL npm run test:e2e"
    echo ""
    echo "  Run smoke test:"
    echo "    ./scripts/smoke-test.sh"
    echo ""
    echo "  Stop staging:"
    echo "    ./scripts/staging-up.sh --down"
    echo "======================================"
    exit 0
  fi
  printf "  Attempt %d/%d — waiting %ds...\n" "$i" "$HEALTH_RETRIES" "$HEALTH_INTERVAL"
  sleep "$HEALTH_INTERVAL"
done

echo ""
echo "ERROR: Staging environment failed to become healthy after $((HEALTH_RETRIES * HEALTH_INTERVAL))s"
echo "Check logs: docker compose -f $COMPOSE_FILE logs"
docker compose -f "$COMPOSE_FILE" logs --tail=20
exit 1

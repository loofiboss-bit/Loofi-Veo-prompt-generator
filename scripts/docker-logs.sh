#!/usr/bin/env bash

set -euo pipefail

container="${1:-veo-prompt-generator-local}"

if ! docker ps -a --format '{{.Names}}' | grep -Fxq "$container"; then
  echo "Container '$container' not found."
  echo "Try one of:"
  echo "  - veo-prompt-generator-local"
  echo "  - veo-prompt-generator-dev"
  exit 1
fi

docker logs -f "$container"
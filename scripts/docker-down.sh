#!/usr/bin/env bash

set -euo pipefail

containers=("veo-prompt-generator-local" "veo-prompt-generator-dev")

for container in "${containers[@]}"; do
  docker rm -f "$container" >/dev/null 2>&1 || true
done
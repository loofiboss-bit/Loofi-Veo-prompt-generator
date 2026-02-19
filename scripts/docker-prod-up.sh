#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="veo-prompt-generator:local"
CONTAINER_NAME="veo-prompt-generator-local"
MANAGED_CONTAINERS=("veo-prompt-generator-local" "veo-prompt-generator-dev")
MANAGED_IMAGES=(
	"veo-prompt-generator:local"
	"veo-prompt-generator-dev:local"
	"veopromptgenerator"
	"veopromptgenerator-dev"
)

cd "$(dirname "$0")/.."

docker build --target production -t "$IMAGE_NAME" -f Dockerfile .

for container in "${MANAGED_CONTAINERS[@]}"; do
	docker rm -f "$container" >/dev/null 2>&1 || true
done

for image in "${MANAGED_IMAGES[@]}"; do
	container_ids=$(docker ps -aq --filter "ancestor=$image")

	if [[ -n "$container_ids" ]]; then
		docker rm -f $container_ids >/dev/null 2>&1 || true
	fi
done

port_container_ids=$(docker ps -q --filter "publish=8080")

if [[ -n "$port_container_ids" ]]; then
	docker rm -f $port_container_ids >/dev/null 2>&1 || true
fi

docker run --name "$CONTAINER_NAME" --rm -p 8080:8080 "$IMAGE_NAME"
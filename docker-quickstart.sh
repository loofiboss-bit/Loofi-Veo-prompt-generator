#!/usr/bin/env bash

# VEO Prompt Generator - Docker Quick Start Script
# Simplified commands for common Docker workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_help() {
    cat << EOF
VEO Prompt Generator - Docker Quick Start

USAGE:
    ./docker-quickstart.sh [COMMAND]

COMMANDS:
    prod                Build and run production container
    dev                 Run development with hot reload
    debug               Run with Node debugger on port 9229
    build               Build production image only
    build-dev           Build development image only
    logs                Show container logs in real-time
    shell               Open shell in running container
    stop                Stop all containers
    clean               Remove containers and images
    help                Show this help message

EXAMPLES:
    # Run in production mode
    ./docker-quickstart.sh prod

    # Run development with hot reload
    ./docker-quickstart.sh dev

    # Debug with Node inspector
    ./docker-quickstart.sh debug

    # View logs
    ./docker-quickstart.sh logs

ENVIRONMENT VARIABLES:
    UID                 Set Linux user ID (default: 1000)
    GID                 Set Linux group ID (default: 1000)
    PORT                Override container port (default: 8080)

EOF
}

build_production() {
    echo -e "${YELLOW}Building production image...${NC}"
    docker build \
        --target=production \
        -t veopromptgenerator:latest \
        -t veopromptgenerator:"$(date +%Y%m%d)" \
        .
    echo -e "${GREEN}✓ Production build complete${NC}"
}

build_development() {
    echo -e "${YELLOW}Building development image...${NC}"
    docker build \
        --target=development \
        -t veopromptgenerator-dev:latest \
        .
    echo -e "${GREEN}✓ Development build complete${NC}"
}

run_production() {
    build_production
    echo -e "${YELLOW}Running production container on port 8080...${NC}"
    docker compose up --no-build
}

run_development() {
    build_development
    echo -e "${YELLOW}Running development container with hot reload...${NC}"
    
    # Set UID/GID for proper file permissions
    export UID=${UID:-$(id -u)}
    export GID=${GID:-$(id -g)}
    
    docker compose -f compose.dev.yaml up --no-build
}

run_debug() {
    build_development
    echo -e "${YELLOW}Running debug container on port 8080 with Node inspector on 9229...${NC}"
    echo -e "${GREEN}Open chrome://inspect in Chrome to debug${NC}"
    
    docker compose -f compose.debug.yaml up --no-build
}

show_logs() {
    echo -e "${YELLOW}Showing container logs (Ctrl+C to stop)...${NC}"
    docker compose logs -f
}

open_shell() {
    CONTAINER=$(docker compose ps -q veopromptgenerator 2>/dev/null | head -1)
    
    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}No running container found. Start with: ./docker-quickstart.sh dev${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Opening shell in container...${NC}"
    docker exec -it "$CONTAINER" sh
}

stop_all() {
    echo -e "${YELLOW}Stopping all containers...${NC}"
    docker compose down
    echo -e "${GREEN}✓ Containers stopped${NC}"
}

clean_all() {
    echo -e "${RED}Cleaning up images and containers...${NC}"
    docker compose down --rmi all
    docker image rm veopromptgenerator:latest veopromptgenerator-dev:latest 2>/dev/null || true
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Main command dispatch
CMD=${1:-help}

case "$CMD" in
    prod)
        run_production
        ;;
    dev)
        run_development
        ;;
    debug)
        run_debug
        ;;
    build)
        build_production
        ;;
    build-dev)
        build_development
        ;;
    logs)
        show_logs
        ;;
    shell)
        open_shell
        ;;
    stop)
        stop_all
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        print_help
        ;;
    *)
        echo -e "${RED}Unknown command: $CMD${NC}"
        print_help
        exit 1
        ;;
esac

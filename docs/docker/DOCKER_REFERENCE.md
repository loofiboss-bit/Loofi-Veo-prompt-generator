# VEO Prompt Generator - Docker Reference Guide

## Quick Commands

### Production

```bash
# Build and run production image
docker compose up

# Build only (don't run)
docker compose build

# Run in background
docker compose up -d

# Stop container
docker compose down
```

### Development

```bash
# Run with hot reload
docker compose -f compose.dev.yaml up

# Set user ID for Linux file permissions
UID=$(id -u) GID=$(id -g) docker compose -f compose.dev.yaml up

# Stop development
docker compose -f compose.dev.yaml down
```

### Debugging

```bash
# Run with Node debugger
docker compose -f compose.debug.yaml up

# View logs in real-time
docker compose logs -f

# View logs for specific service
docker compose logs -f veopromptgenerator

# View last 100 log lines
docker compose logs --tail=100

# Clear all logs
docker system prune --all

# Open shell in running container
docker compose exec veopromptgenerator sh
```

## Docker Images

### Inspect Images

```bash
# List all images
docker images

# Show image size and layers
docker history veopromptgenerator:latest

# Inspect image details
docker inspect veopromptgenerator:latest

# Show image size breakdown
docker image ls --format "{{.Repository}}\t{{.Size}}" | grep veo
```

### Tagging and Publishing

```bash
# Tag for registry
docker tag veopromptgenerator:latest myregistry.azurecr.io/veo:3.10.0

# Push to registry
docker push myregistry.azurecr.io/veo:3.10.0

# Pull from registry
docker pull myregistry.azurecr.io/veo:3.10.0
```

## Containers

### Running Containers

```bash
# List running containers
docker compose ps

# List all containers (including stopped)
docker ps -a

# View container statistics (CPU, memory)
docker stats veopromptgenerator

# Show container resource limits
docker inspect --format='{{.HostConfig.Memory}}' veopromptgenerator

# View container environment variables
docker exec veopromptgenerator env
```

### Port Mapping

```bash
# Map to different host port
docker compose -f compose.yaml up --publish 9000:8080

# View port mappings
docker compose port veopromptgenerator 8080

# Check if port is in use
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows
```

## Volumes

### Development Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect loofi-veo-loofi-veo-prompt-generator_node_modules

# Remove unused volumes
docker volume prune

# Clean specific volume
docker volume rm loofi-veo-loofi-veo-prompt-generator_node_modules
```

### Volume Troubleshooting

```bash
# Check volume mount in container
docker compose exec veopromptgenerator ls -la /usr/src/app

# Verify bind mount permissions
docker compose exec veopromptgenerator stat /usr/src/app

# Clear volume and rebuild
docker compose down -v
docker compose -f compose.dev.yaml up --build
```

## Building

### Build Stages

```bash
# Build production stage
docker build --target=production -t veo:prod .

# Build development stage
docker build --target=development -t veo:dev .

# Build specific stage with no cache
docker build --target=production --no-cache -t veo:prod .

# Build with progress output
docker build --progress=plain -t veo:prod .

# Build and show build context size
docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t veo:prod .
```

### Optimization

```bash
# Check build cache status
docker buildx du

# Clean build cache
docker builder prune --all

# Build with external cache
docker build --cache-from=myregistry/veo:latest -t veo:latest .
```

## Network

### Container Networks

```bash
# List Docker networks
docker network ls

# Inspect compose network
docker network inspect loofi-veo-loofi-veo-prompt-generator_default

# View container network connections
docker inspect --format='{{json .NetworkSettings.Networks}}' veopromptgenerator

# Test connectivity between containers
docker compose exec veopromptgenerator ping veopromptgenerator
```

## Health & Monitoring

### Health Checks

```bash
# View container health status
docker compose ps

# Show last health check results
docker inspect --format='{{json .State.Health}}' veopromptgenerator

# Manual health test
docker compose exec veopromptgenerator wget --quiet --tries=1 --spider http://localhost:8080/
```

### Resource Monitoring

```bash
# Monitor container resource usage
docker stats --no-stream

# Show memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}"

# Find containers consuming most memory
docker stats --no-stream | sort -k4 -h | tail -5
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose logs veopromptgenerator

# Inspect container exit code
docker compose ps

# Run container with verbose output
docker compose up --no-detach

# Check container start logs in Docker daemon
docker inspect --format='{{json .State}}' veopromptgenerator
```

### Permission Issues

```bash
# Run with specific user
docker compose exec --user node veopromptgenerator whoami

# Fix file ownership
docker compose exec veopromptgenerator chown -R node:node /usr/src/app

# Check file permissions
docker compose exec veopromptgenerator ls -la /usr/src/app
```

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process using port
kill -9 <PID>

# Or use different port
docker compose --file - <<EOF
services:
  veopromptgenerator:
    ports:
      - "9000:8080"
EOF
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images, containers, volumes
docker system prune --all --volumes

# Remove dangling images
docker image prune --all
```

## Advanced

### Bind Mount Permissions (Linux)

```bash
# Run with current user UID/GID
export UID=$(id -u)
export GID=$(id -g)
docker compose -f compose.dev.yaml up

# Using :z flag (SELinux context)
volumes:
  - ./:/usr/src/app:z
```

### Custom Compose Override

```bash
# Create compose.override.yaml for local customizations
cat > compose.override.yaml <<EOF
services:
  veopromptgenerator:
    ports:
      - "9000:8080"
    environment:
      LOG_LEVEL: debug
EOF

# Automatic overrides on 'docker compose up'
docker compose up
```

### Inspect Layer Contents

```bash
# Extract layer from image
docker save veopromptgenerator:latest | tar -tf - | head -20

# Explore image filesystem
docker run -it --rm --entrypoint sh veopromptgenerator:latest
  ls -la /usr/src/app
  npm list
  exit
```

## Production Checklist

- [ ] Build tested with production target
- [ ] Resource limits configured in compose
- [ ] Health checks passing
- [ ] Non-root user running in production
- [ ] Image size < 200MB for Node apps
- [ ] .dockerignore optimized (excludes dev files)
- [ ] Secrets not hardcoded (use env vars or Docker secrets)
- [ ] Logging configured (json-file, max-size, max-file)
- [ ] Registry push tested: `docker push myregistry/veo:x.x.x`
- [ ] Security scan passed: `docker scout cves veopromptgenerator:latest`

## References

- [Docker CLI Reference](https://docs.docker.com/reference/cli/docker/)
- [Docker Compose Reference](https://docs.docker.com/compose/reference/)
- [Dockerfile Best Practices](https://docs.docker.com/build/building/best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

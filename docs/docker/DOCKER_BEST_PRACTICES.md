# VEO Prompt Generator - Docker Best Practices

## Overview

This project uses a **multi-stage Dockerfile** for optimal development and production builds following Docker best practices.

## Architecture

### Build Stages

1. **base** - Common Node.js Alpine image setup
   - Uses `node:lts-alpine` for minimal footprint
   - Sets working directory `/usr/src/app`

2. **deps** - Dependency installation (cached layer)
   - Copies only `package.json`, `package-lock.json`, `npm-shrinkwrap.json`
   - Runs `npm ci --silent --ignore-scripts`
   - Maximizes cache reuse: dependencies rebuild only on lock file changes

3. **builder** - Production build compilation
   - Copies full source code
   - Executes `npm run build`
   - Produces optimized `dist/` directory

4. **development** - Hot-reload development environment
   - Inherits from `deps` stage
   - Exposes port 8080
   - Runs Vite dev server with polling for container support
   - Mounts source volumes for live code updates

5. **production** - Minimal runtime image
   - Fresh `node:lts-alpine` image (no build layers)
   - Runs as non-root `node` user (security best practice)
   - Only copies built artifacts from `builder` stage
   - Smaller final image size: ~150MB vs ~500MB without optimization

## Quick Start

### Production Build & Run

```bash
docker compose up
```

This builds and runs the production image on `http://localhost:8080`

### Development with Hot Reload

```bash
docker compose -f compose.dev.yaml up
```

Features:

- Live code synchronization via volume mounts
- Auto-rebuild on file changes
- `CHOKIDAR_USEPOLLING=true` for container filesystem watching
- Non-root user with proper file permissions: `${UID:-1000}:${GID:-1000}`

### Debug Mode with Node Inspector

```bash
docker compose -f compose.debug.yaml up
```

Exposes Node inspector on port 9229 for remote debugging with Chrome DevTools:

1. Open `chrome://inspect` in Chrome
2. Add `localhost:9229` as inspection target
3. Debug directly in Chrome DevTools

## Key Optimizations

### 1. Layer Caching

- `deps` stage never rebuilds unless `package*.json` changes
- Significantly faster rebuilds for code-only changes
- Typical rebuild time: 2-3 seconds vs 20+ seconds without optimization

### 2. Security

- **Non-root user** in production (`USER node`)
- **Alpine base** reduces attack surface
- **`.dockerignore`** excludes unnecessary files (AI tools, git, dev configs)

### 3. Image Size

- **Alpine** instead of full Node.js image: -200MB
- **Multi-stage build** eliminates build dependencies: -350MB
- **Final production image**: ~150MB

### 4. Development Ergonomics

- **Volume bind mount** `./:/usr/src/app:z` for instant code sync
- **Named volume** `/usr/src/app/node_modules` prevents bind mount conflicts
- **UID/GID mapping** prevents permission issues on Linux
- **Polling mode** works reliably in Docker containers

## File Structure

```
.
├── Dockerfile              # Multi-stage build definition
├── .dockerignore          # Files excluded from build context
├── compose.yaml           # Production configuration
├── compose.dev.yaml       # Development with hot reload
├── compose.debug.yaml     # Debug mode with Node inspector
├── package.json           # Dependencies and scripts
├── scripts/
│   └── serve-dist.mjs     # Production server (Node HTTP)
├── src/                   # TypeScript source
└── dist/                  # Built output (production only)
```

## Environment Variables

### Production

- `NODE_ENV=production` - Disables dev dependencies

### Development

- `NODE_ENV=development` - Enables source maps, warnings
- `CHOKIDAR_USEPOLLING=true` - Container filesystem polling

## Troubleshooting

### Volume Permission Issues

If files show as `root` owned on Linux:

```bash
docker compose -f compose.dev.yaml down
UID=$(id -u) GID=$(id -g) docker compose -f compose.dev.yaml up
```

### Hot reload not working

Ensure `CHOKIDAR_USEPOLLING=true` in dev compose and check volume mount with `:z` flag.

### Port already in use

```bash
docker compose down  # Stop containers
docker compose up -p 9000:8080  # Use different host port
```

## Production Deployment

The `compose.yaml` produces a production-ready image:

- Minimal dependencies
- Non-root execution
- Health checks can be added via compose override
- Ready for Kubernetes/Docker Swarm via image pull

To publish to registry:

```bash
docker build -t myregistry/veo:3.10.0 .
docker push myregistry/veo:3.10.0
```

## References

- [Dockerfile Best Practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose](https://docs.docker.com/compose/)

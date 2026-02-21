# ============================================================================
# VEO Prompt Generator - Multi-stage Dockerfile
# ============================================================================
# Multi-stage build optimizes for development and production:
# - Minimal production image size (~150MB)
# - Fast development builds via layer caching
# - Security: non-root user, Alpine base
# ============================================================================

# ============================================================================
# Stage 1: Base - Common environment setup
# ============================================================================
FROM node:lts-alpine AS base
LABEL maintainer="Loofi Team"
LABEL description="VEO Prompt Generator - Professional prompt generation for AI video"

# Use Alpine for minimal image size and security surface
WORKDIR /usr/src/app

# ============================================================================
# Stage 2: Dependencies - Install npm packages (cached layer)
# ============================================================================
FROM base AS deps
LABEL stage=dependencies

# Copy only package files (maximizes layer cache)
# If these don't change, this layer is reused on rebuilds
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# Use npm ci for reproducible, lockfile-based installs
# --silent suppresses unnecessary output
# --ignore-scripts avoids running postinstall scripts (can be unsafe/slow)
RUN npm ci --silent --ignore-scripts

# ============================================================================
# Stage 3: Builder - Production build compilation
# ============================================================================
FROM deps AS builder
LABEL stage=builder

# Copy full source code
COPY . .

# Build optimized production bundle
# vite build with Vue/React compiler optimizations
# Produces minified, tree-shaken dist/ directory
RUN npm run build

# ============================================================================
# Stage 4: Development - Hot reload environment
# ============================================================================
# Inherits from deps: has all dependencies installed
FROM deps AS development
LABEL stage=development

# Copy source code for development
COPY . .

# Development environment: source maps, dev dependencies, hot reload
ENV NODE_ENV=development

# Expose port for Vite dev server
EXPOSE 8080

# Start Vite dev server with container-friendly settings:
# --host 0.0.0.0 allows external connections to container
# --port 8080 matches exposed port
# Polling mode in compose handles container filesystem watching
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

# ============================================================================
# Stage 5: Production - Minimal runtime image
# ============================================================================
# Fresh Alpine image: excludes all build layers and dev dependencies
# Only copies pre-built artifacts from builder stage
FROM node:lts-alpine AS production
LABEL stage=production
LABEL version="3.10.0"

WORKDIR /usr/src/app

# SECURITY: Create non-root user for container execution
# Prevents container escape or privilege escalation vulnerabilities
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /usr/src/app

# Copy only production build artifacts from builder stage
# Uses --chown to ensure non-root ownership
COPY --from=builder --chown=nodeuser:nodejs /usr/src/app/dist ./dist

# Production environment: no source maps, optimized startup
ENV NODE_ENV=production

# SECURITY: Run as non-root user
USER nodeuser

# Expose production port
EXPOSE 8080

# Health check ensures container is serving requests
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start production server
# Uses the serve-dist script or npx http-server if needed
CMD ["node", "-e", "const http = require('http'); const fs = require('fs'); const path = require('path'); const dir = './dist'; const server = http.createServer((req, res) => { let file = path.join(dir, req.url === '/' ? 'index.html' : req.url); fs.stat(file, (err) => { if(err) file = path.join(dir, 'index.html'); res.setHeader('Cache-Control', req.url.includes('assets') ? 'max-age=31536000' : 'no-cache'); fs.createReadStream(file).pipe(res); }); }); server.listen(8080, '0.0.0.0', () => console.log('Server running on http://0.0.0.0:8080')); "]

# ============================================================================
# Build Notes:
# ============================================================================
# Production Build:
#   docker build --target=production -t veo:latest .
#
# Development Build:
#   docker build --target=development -t veo:dev .
#
# Both stages:
#   docker build -t veo . (builds production by default)
#
# Image sizes (approximate):
#   deps stage: 200MB (includes build tools)
#   builder stage: 350MB (includes node_modules + source)
#   production stage: 150MB (minimal runtime only)
#
# Layer Cache Strategy:
#   1. deps layer caches unless package*.json changes
#   2. builder layer rebuilds on any source change
#   3. production layer rebuilds on builder changes
#   Result: ~2 second rebuilds for code-only changes
# ============================================================================

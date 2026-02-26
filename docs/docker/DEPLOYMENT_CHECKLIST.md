# VEO Prompt Generator - Docker Deployment Checklist

## Pre-Production Verification

### Build & Image

- [x] Dockerfile builds successfully: `docker build --target=production -t veo .`
- [x] Image size acceptable: ~230MB
- [x] Production image runs: `docker compose up`
- [x] Development image runs: `docker compose -f compose.dev.yaml up`
- [x] Debug image runs: `docker compose -f compose.debug.yaml up`
- [ ] Image scanned for vulnerabilities: `docker scout cves veopromptgenerator:latest`
- [ ] Image builds without warnings (check build output)

### Container Runtime

- [ ] Application accessible on port 8080
- [ ] Health check passing: `docker compose ps` shows "healthy"
- [ ] Logs appear normal: `docker compose logs --tail=50`
- [ ] No errors on startup in logs
- [ ] Container restarts gracefully: `docker compose restart`

### Development Workflow

- [ ] Hot reload works: Edit `src/` files, app auto-reloads
- [ ] Volume mount permissions correct: `docker compose exec veopromptgenerator ls -la /usr/src/app`
- [ ] Debug mode connects: Chrome DevTools → `chrome://inspect`
- [ ] File changes visible in container: `docker compose exec veopromptgenerator stat src/main.tsx`

### Security Checks

- [ ] Container runs as non-root: `docker compose exec veopromptgenerator whoami` → should be `nodeuser`
- [ ] No secrets in image: Check `.dockerignore` excludes `.env*`
- [ ] Root filesystem read-only tested (optional): Add `read_only: true` to compose
- [ ] Image scan passes: `docker scout cves --severity critical veopromptgenerator:latest`

## Production Deployment

### Before Pushing to Registry

- [ ] Version tag set correctly: `docker build -t myregistry/veo:3.10.0 .`
- [ ] Registry credentials configured: `docker login myregistry.azurecr.io`
- [ ] Image push successful: `docker push myregistry/veo:3.10.0`
- [ ] Image pull works: `docker pull myregistry/veo:3.10.0`

### Docker Swarm / Kubernetes

- [ ] Service manifest created with correct image reference
- [ ] Resource requests/limits set: See `compose.yaml`
- [ ] Health checks configured (Kubernetes: liveness/readiness probes)
- [ ] Rolling update strategy defined
- [ ] Environment variables / ConfigMaps prepared

### Networking

- [ ] Port 8080 exposed correctly
- [ ] Ingress/reverse proxy configured (nginx, traefik, etc.)
- [ ] DNS name resolves to service
- [ ] HTTPS/TLS configured if needed
- [ ] CORS headers configured if accessing from different domain

### Monitoring & Logging

- [ ] Logging driver configured: See `compose.yaml` (json-file with rotation)
- [ ] Log rotation limits set: `max-size: 10m, max-file: 3`
- [ ] Centralized logging setup (optional): ELK, Splunk, CloudWatch
- [ ] Health check monitored: Alert on unhealthy status
- [ ] Resource usage monitored: CPU and memory alerts configured

### Backups & Recovery

- [ ] Persistent volumes backed up (if needed)
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested: Verify old image still works
- [ ] Data retention policy defined

## Post-Deployment Validation

### Functional Testing

- [ ] Application loads on production URL
- [ ] All features work as expected
- [ ] Performance acceptable: Response times < 2s
- [ ] No errors in browser console
- [ ] Mobile responsiveness verified

### Load Testing

- [ ] Tested with realistic load: `ab -n 1000 -c 10 http://prod-url/`
- [ ] Memory usage under control: `docker stats` shows reasonable memory
- [ ] CPU usage acceptable: Monitor peak usage
- [ ] No out-of-memory errors
- [ ] Handles concurrent users gracefully

### Monitoring

- [ ] Metrics dashboards created (Prometheus, Grafana)
- [ ] Alerts configured for critical issues
- [ ] Application uptime monitored
- [ ] Error rate monitored and alerted
- [ ] Slow query/request logging enabled

### Security in Production

- [ ] No debug mode enabled
- [ ] Secrets not logged
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Security headers set: CSP, X-Frame-Options, etc.
- [ ] Dependencies checked for vulnerabilities: `npm audit`

## Common Issues & Solutions

### Issue: Container keeps restarting

**Check**: `docker compose logs`
**Solution**: Ensure port 8080 is available, check error logs

### Issue: Out of memory errors

**Check**: `docker stats` shows memory near limit
**Solution**: Increase memory limit in `compose.yaml` under `deploy.resources.limits.memory`

### Issue: Hot reload not working in dev

**Check**: Volume mounted? `docker compose exec veopromptgenerator ls /usr/src/app/src`
**Solution**: Ensure `CHOKIDAR_USEPOLLING=true` and volumes configured in `compose.dev.yaml`

### Issue: Port already in use

**Check**: `lsof -i :8080` (macOS/Linux) or `netstat -ano | findstr :8080` (Windows)
**Solution**: Kill process or map to different port with `-p 9000:8080`

### Issue: Permission denied on volume mount

**Check**: File owner in container doesn't match host
**Solution**: Use `UID=$(id -u) GID=$(id -g) docker compose -f compose.dev.yaml up`

## Rollback Procedure

If issues occur in production:

1. **Stop current deployment**:

   ```bash
   docker compose down
   ```

2. **Restore previous version**:

   ```bash
   docker pull myregistry/veo:3.9.0  # Previous version
   docker compose up  # Will use old image
   ```

3. **Investigate logs**:

   ```bash
   docker logs <old-container-id>
   ```

4. **Test thoroughly before re-deploying**:
   ```bash
   docker compose -f compose.dev.yaml up
   ```

## Maintenance Schedule

### Weekly

- [ ] Check container logs for errors
- [ ] Monitor resource usage (CPU, memory)
- [ ] Verify health checks passing

### Monthly

- [ ] Check for npm package updates: `npm outdated`
- [ ] Security vulnerability scan: `docker scout cves`
- [ ] Rebuild image with latest base: `docker build --pull --no-cache .`

### Quarterly

- [ ] Major dependency updates
- [ ] Performance optimization review
- [ ] Disaster recovery drill

## Performance Benchmarks

_Fill in after deploying to production:_

| Metric            | Value             | Target   |
| ----------------- | ----------------- | -------- |
| Image size        | 229MB             | < 300MB  |
| Build time        | 2-5s (with cache) | < 10s    |
| Startup time      | ~2s               | < 5s     |
| Memory usage      | \_\_ MB           | < 512MB  |
| Max CPU           | \_\_ %            | < 100%   |
| Response time p50 | \_\_ ms           | < 500ms  |
| Response time p95 | \_\_ ms           | < 1000ms |
| Uptime            | \_\_ %            | > 99.9%  |

## Sign-Off

- **Deployed by**: \_\_\_\_\_\_\_\_\_\_\_\_ Date: \_\_\_\_\_\_\_\_
- **Verified by**: \_\_\_\_\_\_\_\_\_\_\_\_ Date: \_\_\_\_\_\_\_\_
- **Go/No-Go**: [ ] GO [ ] NO-GO Notes: \_\_\_\_\_\_\_\_\_\_\_\_

---

**Version**: 3.10.0
**Last Updated**: Generated by Docker containerization process
**Next Review Date**: [90 days from deployment]

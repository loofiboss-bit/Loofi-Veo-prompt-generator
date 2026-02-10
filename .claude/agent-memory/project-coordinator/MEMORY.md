# Agent Memory: project-coordinator

## Version Status

- v1.1.0 Stabilization — RELEASED 2026-02-09
- v1.2.0 Productivity Layer — RELEASED 2026-02-16
- v1.3.0 Workflow Integration — RELEASED 2026-02-09
- v1.4.0 UX Professionalization — RELEASED 2026-02-10
- v1.5.0 Performance & Stability — PLANNED (target 2026-03-10)
- v1.6.0 Architecture Hardening — PLANNED
- v2.0.0 Platform Transformation — PLANNED

## Automated Workflow System (2026-02-10)

New workflow automation system added:
- `CLAUDE.md` — Master instructions for all agents
- `.agent/WORKFLOW.md` — Pipeline definitions (plan→implement→verify→document→commit)
- `.agent/MODEL_ROUTING.md` — Cost-optimized model selection
- `.agent/templates/` — Reusable task templates (feature, bugfix, release, version-plan)

Trigger commands: `Start vX.Y.Z`, `Implement [feature]`, `Fix [bug]`, `Release vX.Y.Z`, `Plan [scope]`

## Architecture Layers

- Services: `src/core/services/` (38 service files)
- Stores: `src/core/store/` (5 stores + 4 slices)
- Components: `src/components/` + `src/features/`
- Types: `src/core/types/`

## Key Patterns

- Service pattern: class instance exported as singleton
- Store pattern: Zustand with persist middleware
- Build: `npm run build` (web), `npm run dist` (desktop)
- CI: GitHub Actions (build.yml, beta-release.yml)

## Cost Optimization

- Use opus only for complex multi-feature planning
- Default: sonnet for implementation, haiku for tests/docs/releases
- Batch related changes to minimize agent calls
- Reference file paths instead of copying content between agents

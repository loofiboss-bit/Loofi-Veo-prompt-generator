# Agent Memory: release-planner

## Release History

- v1.1.0 (2026-02-09): Stabilization
- v1.2.0 (2026-02-16): Productivity Layer
- v1.3.0 (2026-02-09): Workflow Integration
- v1.4.0 (2026-02-10): UX Professionalization

## Release Process

1. Verify features complete
2. `npm run build` passes
3. CHANGELOG.md — Keep-a-Changelog format
4. README.md — version refs updated
5. Bump: package.json, metadata.json, manifest.json
6. Commit: `chore(release): vX.Y.Z`
7. Tag: `vX.Y.Z`
8. Push branch + tag
9. GitHub Actions auto-builds + releases

## Build Artifacts

- Linux: .AppImage
- Windows: .exe (NSIS) + portable
- macOS: .dmg (planned)

## CI/CD

- `.github/workflows/build.yml` — Main (tag push, PRs)
- `.github/workflows/beta-release.yml` — Beta channel
- Matrix: Ubuntu + Windows, Node 20
- Auto-release on `v*` tags

## Next: v1.5.0

- Target: 2026-03-10
- Theme: Performance & Stability
- See `.agent/ROADMAP.md` for details

## Cost Note

This agent runs on gpt-5-nano model for cost efficiency.
Escalate to gpt-5-mini only for releases with breaking changes.

## Active System State (2026-02-10)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md`.
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.agent/instructions.md`, `.agent/WORKFLOW.md`, `.agent/MODEL_ROUTING.md`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.

## 2026-02-10 v1.5.0 In-Progress Docs

- v1.5.0 in-progress notes now include: panel error boundaries, profiler baseline, safe mode baseline, studio skeleton loading states.
- Related docs touched: `CHANGELOG.md`, `README.md`, `.agent/workflows/v1.5.0-performance-stability.md`.

---
description: 'Use when updating prompts, custom agents, instructions, skills, hooks, AGENTS.md files, or workspace customization automation. Covers source-of-truth rules and required validation commands.'
applyTo: 'AGENTS.md, CLAUDE.md, CHATGPT.md, CODEX.md, .github/copilot-instructions.md, .github/agents/**, .github/instructions/**, .github/prompts/**, .github/skills/**, .github/hooks/**, scripts/sync-workspace.mjs, scripts/validate-agent-config.mjs, scripts/customization-hook.mjs'
---

# Workspace Customization Maintenance

- Treat `veo-prompt-generator` as the source-of-truth repo for workspace automation and synced customization behavior.
- When updating secondary repo `.github/copilot-instructions.md`, also update `scripts/sync-workspace.mjs` so future syncs preserve the same content.
- Keep repo-specific guidance truthful to committed commands, architecture, and conventions; avoid generic boilerplate that the repo does not actually use.
- After changing customization files or sync logic, run `npm run customizations:check` from the primary repo before considering the work complete.
- Prefer small, auditable hooks that remind or validate; avoid long-running hooks that block normal coding flow.

---
name: 'Refresh workspace customizations'
description: 'Audit and refresh prompts, instructions, agents, skills, hooks, and synced copilot instructions across the multi-root workspace.'
argument-hint: 'Describe which repos or customization surfaces to refresh'
agent: 'agent'
---

Refresh the workspace customization layer.

Focus on:

- [workspace sync script](../../scripts/sync-workspace.mjs)
- [agent config validator](../../scripts/validate-agent-config.mjs)
- [workspace AGENTS guide](../../AGENTS.md)

Return:

1. Which repos or files are the source of truth
2. What customization surfaces are stale or drifting
3. Which prompts/agents/instructions/skills/hooks should be updated first
4. What validation commands should be run when finished

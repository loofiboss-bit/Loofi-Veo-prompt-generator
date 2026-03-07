# Design: Full AI Agent Server Integration Across All Repos

**Date:** 2026-03-07
**Status:** Approved
**Scope:** `ai-agent-server` ↔ all Loofi repos (7 repos)

---

## Problem

The `ai-agent-server` exposes 47 MCP tools (file ops, git, memory, monitoring, training, containers, Ollama) via a Streamable HTTP endpoint at `http://127.0.0.1:8013/mcp`. Currently only `veo-prompt-generator` has a `.mcp.json` connecting to it. All other repos have no connection. `hwmonitor-remote` is not mounted in the server at all.

---

## Architecture

Four layers applied top-down:

```
Layer 1: Docker
  Add hwmonitor-remote volume mount + REPOS env var to mcp-filesystem-http

Layer 2: Config files
  .mcp.json in every repo → port 8013
  Claude Code reads per-repo .mcp.json (independent of VS Code multi-root)
  .vscode/mcp.json stays primary-only (VS Code multi-root dedup unchanged)

Layer 3: Sync script
  sync-workspace.mjs writes .mcp.json to ALL repos (currently primary-only)
  Common servers (loofi-agent-server) merged with repo-specific servers
  (repoMcp field in .workspace/config.json) — fedora keeps its local servers

Layer 4: Documentation
  CLAUDE.md added to ai-agent-server
  Agent server tools reference section added to each repo's AI instruction file
```

---

## Repos in Scope

| Repo                    | Path                       | Docker mount? | .mcp.json today |
| ----------------------- | -------------------------- | ------------- | --------------- |
| veo-prompt-generator    | primary                    | ✓             | ✓ agent server  |
| suno-ai-generator       | ../suno-ai-generator       | ✓             | ✗               |
| fedora-tweaks           | ../fedora-tweaks           | ✓             | local MCPs only |
| plasma-ai-usage-monitor | ../plasma-ai-usage-monitor | ✓             | ✗               |
| swedish-secondhand-ai   | ../swedish-secondhand-ai   | ✓             | ✗               |
| loofilearn              | ../loofilearn              | ✓             | ✗               |
| hwmonitor-remote        | ../hwmonitor-remote        | ✗             | ✗               |

---

## Layer 1: Docker Changes

**File:** `ai-agent-server/docker-compose.yml` — `mcp-filesystem-http` service

```yaml
# Add to volumes:
- '${REPOS_BASE:-./repos}/hwmonitor-remote:/workspace/hwmonitor-remote:rw'

# Update REPOS env var (append hwmonitor-remote):
- REPOS=suno-ai-generator,veo-prompt-generator,loofilearn,fedora-tweaks,plasma-ai-usage-monitor,swedish-secondhand-ai,hwmonitor-remote
```

After change: restart `mcp-filesystem-http` with `docker compose up -d mcp-filesystem-http`.

---

## Layer 2: Config Files

All secondary repos get `.mcp.json`:

```json
{
  "mcpServers": {
    "loofi-agent-server": {
      "type": "http",
      "url": "http://127.0.0.1:8013/mcp",
      "headers": {
        "Authorization": "Bearer ${LOOFI_AGENT_API_TOKEN}"
      }
    }
  }
}
```

**fedora-tweaks** gets agent server merged with existing local servers:

```json
{
  "mcpServers": {
    "loofi-agent-server": {
      "type": "http",
      "url": "http://127.0.0.1:8013/mcp",
      "headers": { "Authorization": "Bearer ${LOOFI_AGENT_API_TOKEN}" }
    },
    "loofi-workflow": {
      "command": "python3",
      "args": ["-u", "scripts/mcp_workflow_server.py"]
    },
    "loofi-agent-sync": {
      "command": "python3",
      "args": ["-u", "scripts/mcp_agent_sync_server.py"]
    }
  }
}
```

---

## Layer 3: Sync Script

**File:** `veo-prompt-generator/scripts/sync-workspace.mjs`

Current behaviour: `.mcp.json` written to primary repo only.
New behaviour: `.mcp.json` written to ALL repos in `config.json`.

Logic:

- For each repo, build `.mcp.json` from: common servers (from `.ai/mcp-servers.json`) + `repoMcp` entries (from `.workspace/config.json` per-repo field)
- `.vscode/mcp.json` and `.copilot/mcp-config.json` remain primary-only (unchanged — VS Code multi-root dedup)
- `hwmonitor-remote` added to `.workspace/config.json` repos list if not present

---

## Layer 4: Documentation

### `ai-agent-server/CLAUDE.md`

Covers:

- Architecture: Docker services, ports (8002 main, 8013 filesystem-http)
- Auth: `INTERNAL_API_TOKEN` via `secrets/internal_api_token.txt`, `MCP_REQUIRE_AUTH=true`
- All 47 tools grouped by category
- How to add a new tool to `mcp-server/server.py`
- `REPOS_BASE` + volume mount pattern for adding repos

### Per-repo AI instructions

Each repo's primary AI instruction file (CLAUDE.md or `.ai/INSTRUCTIONS.md`) gets:

```markdown
## Agent Server Tools (loofi-agent-server MCP)

Available via local agent server (port 8013). Requires LOOFI_AGENT_API_TOKEN in environment.

| Category    | Tools                                           | When to use                     |
| ----------- | ----------------------------------------------- | ------------------------------- |
| File / Code | list_files, read_file, write_file, search_code  | Cross-repo file ops             |
| Git         | git_status, git_log, git_diff, git_branches     | Multi-repo git queries          |
| Memory      | remember, recall, search_memory, forget         | Persist context across sessions |
| Monitoring  | service_health, system_resources, query_logs    | Diagnose agent server issues    |
| Training    | training_status, start_training, dataset_stats  | Manage Ollama model training    |
| Containers  | container_list, restart_container, service_logs | Docker ops                      |
| Ollama      | list_ollama_models, pull_model, model_info      | Local model management          |
```

---

## Environment Requirement

All repos and their `.env.example` / setup docs should reference:

```
LOOFI_AGENT_API_TOKEN=  # Bearer token for local AI agent MCP server (port 8013)
```

Set as Windows user env var via: `setx LOOFI_AGENT_API_TOKEN <token>`

---

## Out of Scope

- Dedicated per-repo Docker instances (Approach C — rejected as unnecessary overhead)
- Changes to `.vscode/mcp.json` or `.copilot/mcp-config.json` in secondary repos
- Training pipeline changes

---

## Success Criteria

- [ ] `docker exec mcp-filesystem-http ls /workspace/hwmonitor-remote` shows files
- [ ] All 7 repos have `.mcp.json` with `loofi-agent-server` entry
- [ ] `node scripts/sync-workspace.mjs --check` passes without drift
- [ ] Each repo's AI instructions reference the agent server tools
- [ ] `ai-agent-server/CLAUDE.md` exists and covers architecture + all 47 tools

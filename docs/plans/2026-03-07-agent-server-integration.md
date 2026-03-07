# Agent Server Full Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect all 7 repos to the ai-agent-server MCP (port 8013), add hwmonitor-remote to Docker, update the sync script to propagate `.mcp.json` to all repos automatically, and document the 47 tools in every repo's AI instruction file.

**Architecture:** The sync script (`sync-workspace.mjs`) currently writes common MCP servers only to the primary repo to avoid VS Code multi-root duplication — but `.mcp.json` (Claude Code) is not a VS Code file, so it's safe to write to all repos. We change one line in `syncMcpForRepo` to split the logic: VS Code/Copilot files stay primary-only, `.mcp.json` goes to all repos. Running the script then generates all `.mcp.json` files automatically.

**Tech Stack:** Node.js ESM, Docker Compose, YAML, Markdown

---

### Task 1: Add hwmonitor-remote to ai-agent-server Docker

**Files:**

- Modify: `C:/Users/loofi/ai-agent-server/docker-compose.yml`

**Step 1: Find the mcp-filesystem-http volumes block**

Search for `mcp-filesystem-http:` in the file — the volumes list ends with `swedish-secondhand-ai`. Add `hwmonitor-remote` right after it.

**Step 2: Edit docker-compose.yml — add volume mount**

In the `mcp-filesystem-http` service, add to the `volumes:` list (after `swedish-secondhand-ai`):

```yaml
- '${REPOS_BASE:-./repos}/hwmonitor-remote:/workspace/hwmonitor-remote:rw'
```

**Step 3: Edit docker-compose.yml — update REPOS env var**

In the same service's `environment:` section, change:

```yaml
- REPOS=suno-ai-generator,veo-prompt-generator,loofilearn,fedora-tweaks,plasma-ai-usage-monitor,swedish-secondhand-ai
```

to:

```yaml
- REPOS=suno-ai-generator,veo-prompt-generator,loofilearn,fedora-tweaks,plasma-ai-usage-monitor,swedish-secondhand-ai,hwmonitor-remote
```

**Step 4: Restart the container**

```bash
cd "C:/Users/loofi/ai-agent-server"
docker compose up -d mcp-filesystem-http
```

Expected: `Container mcp-filesystem-http  Started`

**Step 5: Verify hwmonitor-remote is mounted**

```bash
docker exec mcp-filesystem-http ls /workspace/hwmonitor-remote
```

Expected: repo files listed (not "No such file or directory")

**Step 6: Verify token still works after restart**

```bash
curl -s -X POST http://127.0.0.1:8013/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $LOOFI_AGENT_API_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'
```

Expected: `HTTP/1.1 200` with `"serverInfo":{"name":"Loofi Workspace & Ops"}`

**Step 7: Commit**

```bash
cd "C:/Users/loofi/ai-agent-server"
git add docker-compose.yml
git commit -m "feat(docker): add hwmonitor-remote to mcp-filesystem-http"
```

---

### Task 2: Update sync-workspace.mjs to propagate .mcp.json to all repos

**Files:**

- Modify: `veo-prompt-generator/scripts/sync-workspace.mjs:562-604`

The key change is in `syncMcpForRepo`. Currently line 571 does:

```javascript
const serversForRepo = isPrimary ? servers : {};
```

And all three config files use `serversForRepo`. We need `.mcp.json` to always use `servers`.

**Step 1: Replace the syncMcpForRepo function body**

Find this block (lines ~562–604):

```javascript
const syncMcpForRepo = async (repoName, repoConfig, servers) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  const results = [];
  const repoMcp = repoConfig.repoMcp || {};
  const isPrimary = repoName === PRIMARY_REPO;

  // Common MCP servers go ONLY in the primary repo to avoid
  // VS Code workspace duplication. Secondary repos get only
  // their repo-specific servers (repoMcp).
  const serversForRepo = isPrimary ? servers : {};

  const targets = [
    { file: '.vscode/mcp.json', builder: buildVscodeMcp },
    { file: '.copilot/mcp-config.json', builder: buildCopilotMcp },
    { file: '.mcp.json', builder: buildClaudeMcp },
  ];

  for (const { file, builder } of targets) {
    const targetPath = path.join(repoPath, file);
    const expected = builder(serversForRepo, repoMcp);
```

Replace with:

```javascript
const syncMcpForRepo = async (repoName, repoConfig, servers) => {
  const repoPath = path.resolve(ROOT, repoConfig.path);
  const results = [];
  const repoMcp = repoConfig.repoMcp || {};
  const isPrimary = repoName === PRIMARY_REPO;

  // VS Code/Copilot: common servers ONLY in primary repo to avoid
  // VS Code multi-root workspace duplication.
  // Claude Code (.mcp.json): common servers in ALL repos — Claude reads
  // .mcp.json per-repo independently, no duplication risk.
  const vsServers = isPrimary ? servers : {};

  const targets = [
    { file: '.vscode/mcp.json', builder: buildVscodeMcp, serverSet: vsServers },
    { file: '.copilot/mcp-config.json', builder: buildCopilotMcp, serverSet: vsServers },
    { file: '.mcp.json', builder: buildClaudeMcp, serverSet: servers },
  ];

  for (const { file, builder, serverSet } of targets) {
    const targetPath = path.join(repoPath, file);
    const expected = builder(serverSet, repoMcp);
```

**Step 2: Run sync script in dry-run mode to preview changes**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator"
node scripts/sync-workspace.mjs --dry-run --mcp-only
```

Expected: shows what would be written for each repo's `.mcp.json`

**Step 3: Run sync script for real**

```bash
node scripts/sync-workspace.mjs --mcp-only
```

Expected: writes `.mcp.json` to all repos

**Step 4: Verify all repos now have .mcp.json with agent server**

```bash
for repo in suno-ai-generator fedora-tweaks plasma-ai-usage-monitor swedish-secondhand-ai loofilearn hwmonitor-remote; do
  echo "=== $repo ==="
  cat "C:/Users/loofi/Documents/Dev/repos/loofi/$repo/.mcp.json" | grep -A3 "loofi-agent-server"
done
```

Expected: all repos show `"loofi-agent-server"` with `http://127.0.0.1:8013/mcp`

**Step 5: Verify check mode passes**

```bash
node scripts/sync-workspace.mjs --check --mcp-only
```

Expected: all `.mcp.json` files show `ok` status

**Step 6: Commit**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator"
git add scripts/sync-workspace.mjs
git commit -m "feat(sync): propagate .mcp.json to all repos for Claude Code standalone use"
```

---

### Task 3: Commit the generated .mcp.json files in each secondary repo

After Task 2 generates the files, commit them in each repo.

**Step 1: Commit suno-ai-generator**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/suno-ai-generator"
git add .mcp.json
git commit -m "feat(mcp): connect to loofi-agent-server MCP"
```

**Step 2: Commit fedora-tweaks**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/fedora-tweaks"
git add .mcp.json
git commit -m "feat(mcp): add loofi-agent-server to MCP config"
```

**Step 3: Commit plasma-ai-usage-monitor**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/plasma-ai-usage-monitor"
git add .mcp.json
git commit -m "feat(mcp): connect to loofi-agent-server MCP"
```

**Step 4: Commit swedish-secondhand-ai**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/swedish-secondhand-ai"
git add .mcp.json
git commit -m "feat(mcp): connect to loofi-agent-server MCP"
```

**Step 5: Commit loofilearn**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/loofilearn"
git add .mcp.json
git commit -m "feat(mcp): connect to loofi-agent-server MCP"
```

**Step 6: Commit hwmonitor-remote**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/hwmonitor-remote"
git add .mcp.json
git commit -m "feat(mcp): connect to loofi-agent-server MCP"
```

**Step 7: Commit veo-prompt-generator (updated .mcp.json if changed)**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator"
git diff .mcp.json
# If changed, commit:
git add .mcp.json
git commit -m "chore(mcp): re-sync .mcp.json via updated sync script"
```

---

### Task 4: Create ai-agent-server/CLAUDE.md

**Files:**

- Create: `C:/Users/loofi/ai-agent-server/CLAUDE.md`

**Step 1: Create the file with this content**

````markdown
# Loofi AI Agent Server — Claude Code Instructions

## Overview

Multi-service Docker Compose AI platform running locally. The MCP server
exposes workspace, git, memory, observability, and training tools as a
Streamable HTTP endpoint consumed by Claude Code, VS Code Copilot, and opencode.

---

## Key Services & Ports

| Service             | Internal port | Host port       | Purpose                          |
| ------------------- | ------------- | --------------- | -------------------------------- |
| mcp-server          | 8002          | 127.0.0.1:8002  | Main MCP — full workspace        |
| mcp-filesystem-http | 8002          | 127.0.0.1:8013  | Per-repo MCP — all repos mounted |
| ollama              | 11434         | 127.0.0.1:11434 | Local LLM inference              |
| trainer             | 8001          | —               | Fine-tuning pipeline             |
| self-improver       | 8005          | —               | Automated skill analysis         |
| data-ingestor       | 8003          | —               | Interaction ingestion            |
| open-webui          | —             | 127.0.0.1:3002  | Chat UI                          |
| prometheus          | 9090          | 127.0.0.1:9090  | Metrics                          |
| grafana             | —             | 127.0.0.1:3001  | Dashboards                       |

**Claude Code connects to: `http://127.0.0.1:8013/mcp`** (`mcp-filesystem-http`)

---

## Auth

- Auth token: `secrets/internal_api_token.txt`
- `MCP_REQUIRE_AUTH=true` in `.env`
- Client env var: `LOOFI_AGENT_API_TOKEN` (Windows: `setx LOOFI_AGENT_API_TOKEN <token>`)
- Token must match `secrets/internal_api_token.txt` exactly

---

## MCP Tools (47 total)

### File & Code

| Tool                    | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `list_repos`            | List all mounted repos                          |
| `list_files`            | Glob files in a repo                            |
| `read_file`             | Read file content (path relative to /workspace) |
| `write_file`            | Write file content                              |
| `delete_file`           | Delete a file                                   |
| `create_directory`      | Create directory                                |
| `search_code`           | Grep across workspace                           |
| `count_workspace_lines` | Count lines by file extension                   |

### Git

| Tool           | Description                    |
| -------------- | ------------------------------ |
| `git_status`   | Working tree status for a repo |
| `git_log`      | Recent commits                 |
| `git_diff`     | Staged or unstaged diff        |
| `git_branches` | List branches                  |

### Memory

| Tool                        | Description                            |
| --------------------------- | -------------------------------------- |
| `remember`                  | Store a key/value in persistent memory |
| `recall`                    | Retrieve memory by key                 |
| `search_memory`             | Semantic search over memory (Qdrant)   |
| `forget`                    | Delete a memory key                    |
| `get_personal_context`      | Retrieve full personal context         |
| `search_personal_knowledge` | Search personal knowledge base         |

### Monitoring & Observability

| Tool                   | Description                   |
| ---------------------- | ----------------------------- |
| `service_health`       | Health of all Docker services |
| `system_resources`     | CPU/RAM/disk usage            |
| `get_hardware_sensors` | Temperature/fan sensors (LHM) |
| `query_prometheus`     | Run PromQL query              |
| `list_active_alerts`   | Active Alertmanager alerts    |
| `silence_alert`        | Silence an alert for N hours  |
| `service_logs`         | Tail container logs           |
| `query_logs`           | Search logs in a container    |

### Training & AI

| Tool                       | Description                        |
| -------------------------- | ---------------------------------- |
| `training_status`          | Current training job status        |
| `start_training`           | Kick off a training run            |
| `cancel_training`          | Cancel running training            |
| `list_training_runs`       | Recent training history            |
| `get_training_run`         | Details of a specific run          |
| `approve_promotion`        | Promote trained model              |
| `rollback_model`           | Roll back to previous model        |
| `dataset_stats`            | Training dataset statistics        |
| `dataset_sample`           | Sample rows from dataset           |
| `dataset_quality_report`   | Quality gate report                |
| `self_improver_status`     | Self-improver service status       |
| `run_skill_analysis`       | Analyse skill performance          |
| `synthesize_training_data` | Generate training data for a skill |

### Containers

| Tool                | Description                 |
| ------------------- | --------------------------- |
| `container_list`    | List all Docker containers  |
| `restart_container` | Restart a container by name |

### Ollama / Models

| Tool                 | Description                       |
| -------------------- | --------------------------------- |
| `list_ollama_models` | Models available in Ollama        |
| `model_info`         | Details of a model                |
| `pull_model`         | Pull a model from Ollama registry |
| `delete_model`       | Delete a model                    |

### Data Ingestor

| Tool                    | Description           |
| ----------------------- | --------------------- |
| `get_ingestor_status`   | Ingestor sync status  |
| `trigger_ingestor_sync` | Trigger manual ingest |

---

## Adding a New Tool

1. Open `mcp-server/server.py`
2. Add a function decorated with `@mcp.tool()`:

```python
@mcp.tool()
async def my_tool(param: str) -> str:
    """Description shown to the AI."""
    return await _arun(["some", "command", param])
```
````

3. Rebuild and restart: `docker compose up -d --build mcp-server mcp-filesystem-http`
4. Verify: `docker logs mcp-filesystem-http | head -5` — should show updated tool count

---

## Adding a Repo

1. Add volume in `docker-compose.yml` under `mcp-filesystem-http`:
   ```yaml
   - '${REPOS_BASE:-./repos}/<repo-name>:/workspace/<repo-name>:rw'
   ```
2. Append `<repo-name>` to the `REPOS` env var in the same service
3. Restart: `docker compose up -d mcp-filesystem-http`

---

## Common Operations

```bash
# Start everything
docker compose up -d

# Restart MCP server after code changes
docker compose up -d --build mcp-server mcp-filesystem-http

# Tail MCP server logs
docker compose logs -f mcp-filesystem-http

# Test auth
curl -s http://127.0.0.1:8013/health

# Rotate token
echo "<new-token>" > secrets/internal_api_token.txt
docker compose up -d mcp-filesystem-http
setx LOOFI_AGENT_API_TOKEN "<new-token>"
```

````

**Step 2: Commit**

```bash
cd "C:/Users/loofi/ai-agent-server"
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with full MCP tool reference and architecture"
````

---

### Task 5: Add agent server tools section to veo-prompt-generator

**Files:**

- Modify: `veo-prompt-generator/.ai/INSTRUCTIONS.md`

**Step 1: Read the current end of INSTRUCTIONS.md to find insertion point**

```bash
tail -20 "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator/.ai/INSTRUCTIONS.md"
```

**Step 2: Append agent server tools section**

Add to the end of `.ai/INSTRUCTIONS.md`:

```markdown
---

## Agent Server Tools (loofi-agent-server MCP)

Available via local agent server at `http://127.0.0.1:8013/mcp`.
Requires `LOOFI_AGENT_API_TOKEN` set in environment.

| Category    | Tools                                                  | When to use                           |
| ----------- | ------------------------------------------------------ | ------------------------------------- |
| File / Code | `list_files`, `read_file`, `write_file`, `search_code` | Cross-repo file ops outside this repo |
| Git         | `git_status`, `git_log`, `git_diff`, `git_branches`    | Multi-repo git queries                |
| Memory      | `remember`, `recall`, `search_memory`, `forget`        | Persist context across sessions       |
| Monitoring  | `service_health`, `system_resources`, `query_logs`     | Diagnose agent server issues          |
| Training    | `training_status`, `start_training`, `dataset_stats`   | Manage Ollama model training          |
| Containers  | `container_list`, `restart_container`, `service_logs`  | Docker ops                            |
| Ollama      | `list_ollama_models`, `pull_model`, `model_info`       | Local model management                |

> All 47 tools documented in `C:/Users/loofi/ai-agent-server/CLAUDE.md`.
```

**Step 3: Commit**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator"
git add .ai/INSTRUCTIONS.md
git commit -m "docs: add agent server tools reference to INSTRUCTIONS.md"
```

---

### Task 6: Add agent server tools section to secondary repos

The agent server tools section is the same for every repo. Add it to:

- `suno-ai-generator/GEMINI.md` → also create `CLAUDE.md` (no CLAUDE.md exists)
- `fedora-tweaks/CLAUDE.md` → append section
- `plasma-ai-usage-monitor/CLAUDE.md` → create (only has GEMINI.md + AGENTS.md)
- `swedish-secondhand-ai/.ai/INSTRUCTIONS.md` → append section
- `loofilearn/CLAUDE.md` → create (only has GEMINI.md)
- `hwmonitor-remote/CLAUDE.md` → append section

**The section to add to each file** (same content, append to end):

```markdown
---

## Agent Server Tools (loofi-agent-server MCP)

Available via local agent server at `http://127.0.0.1:8013/mcp`.
Requires `LOOFI_AGENT_API_TOKEN` set in environment.

| Category    | Tools                                                  | When to use                     |
| ----------- | ------------------------------------------------------ | ------------------------------- |
| File / Code | `list_files`, `read_file`, `write_file`, `search_code` | Cross-repo file ops             |
| Git         | `git_status`, `git_log`, `git_diff`, `git_branches`    | Multi-repo git queries          |
| Memory      | `remember`, `recall`, `search_memory`, `forget`        | Persist context across sessions |
| Monitoring  | `service_health`, `system_resources`, `query_logs`     | Diagnose agent server issues    |
| Training    | `training_status`, `start_training`, `dataset_stats`   | Manage Ollama model training    |
| Containers  | `container_list`, `restart_container`, `service_logs`  | Docker ops                      |
| Ollama      | `list_ollama_models`, `pull_model`, `model_info`       | Local model management          |

> All 47 tools documented in `C:/Users/loofi/ai-agent-server/CLAUDE.md`.
```

**For repos that need a new CLAUDE.md** (suno-ai-generator, plasma-ai-usage-monitor, loofilearn):

Create a minimal `CLAUDE.md` with just this structure:

```markdown
# <Repo Name> — Claude Code Instructions

> See primary workspace instructions in `veo-prompt-generator/.ai/INSTRUCTIONS.md`
> for shared conventions, agent routing, and workflow.

<paste agent server section here>
```

**Steps per repo:**

```bash
# suno-ai-generator — create CLAUDE.md
cat >> "C:/Users/loofi/Documents/Dev/repos/loofi/suno-ai-generator/CLAUDE.md" << 'CONTENT'
# Loofi Suno AI Generator — Claude Code Instructions
...
CONTENT

# Then commit in each repo:
cd "C:/Users/loofi/Documents/Dev/repos/loofi/<repo>"
git add CLAUDE.md   # or .ai/INSTRUCTIONS.md
git commit -m "docs: add agent server tools reference"
```

Repeat for all 6 repos.

---

### Task 7: Final verification

**Step 1: Verify all .mcp.json files have agent server**

```bash
for repo in veo-prompt-generator suno-ai-generator fedora-tweaks plasma-ai-usage-monitor swedish-secondhand-ai loofilearn hwmonitor-remote; do
  f="C:/Users/loofi/Documents/Dev/repos/loofi/$repo/.mcp.json"
  echo -n "$repo: "
  grep -c "loofi-agent-server" "$f" 2>/dev/null && echo "✓" || echo "MISSING"
done
```

Expected: all show `1` (count of matches)

**Step 2: Verify fedora has all three servers**

```bash
cat "C:/Users/loofi/Documents/Dev/repos/loofi/fedora-tweaks/.mcp.json" | python -c "import json,sys; d=json.load(sys.stdin); print(list(d['mcpServers'].keys()))"
```

Expected: `['loofi-agent-server', 'loofi-workflow', 'loofi-agent-sync']`

**Step 3: Verify hwmonitor-remote is mounted in Docker**

```bash
docker exec mcp-filesystem-http ls /workspace/ | grep hwmonitor
```

Expected: `hwmonitor-remote`

**Step 4: Verify MCP token auth works**

```bash
TOKEN=$(cat "C:/Users/loofi/ai-agent-server/secrets/internal_api_token.txt")
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8013/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'
```

Expected: `200`

**Step 5: Run sync check to confirm no drift**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator"
node scripts/sync-workspace.mjs --check --mcp-only
```

Expected: all repos show `ok` for `.mcp.json`

**Step 6: Commit veo-prompt-generator if any remaining changes**

```bash
cd "C:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator"
git status
git add -p   # stage selectively
git commit -m "chore: finalize agent server integration"
```

---

## Success Criteria Checklist

- [ ] `docker exec mcp-filesystem-http ls /workspace/hwmonitor-remote` lists files
- [ ] All 7 repos have `.mcp.json` with `loofi-agent-server` entry
- [ ] `fedora-tweaks/.mcp.json` has 3 servers (agent + 2 local)
- [ ] `node scripts/sync-workspace.mjs --check --mcp-only` exits clean
- [ ] `ai-agent-server/CLAUDE.md` exists with all 47 tools documented
- [ ] Every repo's primary AI instruction file has the agent server tools table
- [ ] MCP auth returns `200` with correct token

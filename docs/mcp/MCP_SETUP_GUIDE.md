# MCP Server Configuration Guide

## Overview

Your project uses **Docker MCP Gateway** to provide AI tools access to Docker commands and container operations. MCP (Model Context Protocol) servers are configured for Claude, Copilot, and Cline.

## Current Setup

### ✅ Active Configurations

| File                       | Client         | Status   | Transport |
| -------------------------- | -------------- | -------- | --------- |
| `.mcp.json`                | Generic/Cline  | ✅ Fixed | stdio     |
| `.claude/settings.json`    | Claude         | ✅ Fixed | stdio     |
| `.copilot/mcp-config.json` | GitHub Copilot | ✅ Fixed | stdio     |

### Configuration Details

**Docker MCP Server**:

- **Type**: stdio (standard I/O communication)
- **Command**: `docker mcp gateway run`
- **Access**: Docker commands, container operations, image management
- **Auto-start**: Yes (runs when AI tool initializes)

## What Each Config Does

### `.mcp.json` (Generic)

- Used by Cline, VSCode extensions
- Provides Docker MCP access
- Format: Standard MCP config

### `.claude/settings.json` (Claude)

- Claude-specific settings
- **MCP Servers**: Docker MCP + hooks
- **Hooks**: Pre/Post tool use events
- **Agents**: 7 specialized agent types with model assignments
- **Memory**: Persists agent decisions in `.claude/agent-memory/`
- **Models**: opus (high), sonnet (medium), haiku (low)

### `.copilot/mcp-config.json` (GitHub Copilot)

- Copilot-specific MCP routing
- Docker MCP access
- Integrated with VS Code Copilot Chat

## Setup Verification

### ✅ Docker MCP is Installed

Verified:

```bash
docker mcp gateway run
```

Status: **Running** - MCP Gateway is available and responding

### ✅ Configuration Files Present

- `.mcp.json` ✅
- `.claude/settings.json` ✅ (with hooks)
- `.copilot/mcp-config.json` ✅

## How to Use

### With Claude (Claude Desktop / Web)

1. Claude reads `.claude/settings.json`
2. Loads 7 agents with model assignments
3. Hooks trigger on file edits/writes
4. Docker MCP available for container operations

### With GitHub Copilot

1. Copilot reads `.copilot/mcp-config.json`
2. Connects to Docker MCP gateway
3. Can suggest Docker commands, Dockerfile improvements

### With Cline (VS Code)

1. Cline reads `.mcp.json`
2. Starts Docker MCP gateway
3. Full Docker command access in AI context

## Available Docker MCP Tools

Once connected, AI tools can use:

- `docker ps` - List containers
- `docker build` - Build images
- `docker run` - Run containers
- `docker compose up/down` - Manage services
- `docker logs` - View container logs
- `docker exec` - Execute in containers
- `docker network` - Manage networks
- `docker volume` - Manage volumes
- And many more Docker CLI commands

## Troubleshooting

### Docker MCP Not Responding

**Symptom**: "Docker MCP connection failed" in AI tool

**Solutions**:

```bash
# Verify Docker is running
docker ps

# Verify Docker MCP is installed
docker mcp gateway --help

# Restart Docker daemon
docker ps  # Forces reconnection

# Check Docker socket permissions
ls -la /var/run/docker.sock  # Linux
```

### Hooks Not Firing

**Symptom**: Pre/Post tool hooks not executing

**Check**:

```bash
ls -la .claude/hooks/pre-tool-use.cjs
ls -la .claude/hooks/post-tool-use.cjs
```

**Solutions**:

- Ensure files exist and are executable
- Check Node.js is installed: `node --version`
- Verify syntax: `node .claude/hooks/pre-tool-use.cjs`

### Agent Memory Not Persisting

**Symptom**: Agent decisions not remembered between sessions

**Check**:

```bash
ls -la .claude/agent-memory/
```

**Solutions**:

- Directory exists: `mkdir -p .claude/agent-memory/`
- Permissions correct: `chmod 755 .claude/agent-memory/`
- `memoryDir` in settings.json points to correct path

### Copilot Not Recognizing Config

**Symptom**: Copilot shows "MCP not available"

**Solutions**:

1. Reload VS Code: Cmd+Shift+P → "Developer: Reload Window"
2. Verify `.copilot/mcp-config.json` syntax: `jq . .copilot/mcp-config.json`
3. Check Copilot extension is latest version

## Advanced Configuration

### Adding Custom MCP Server

Edit `.claude/settings.json`:

```json
{
  "mcpServers": {
    "docker-mcp": { ... },
    "custom-server": {
      "type": "stdio",
      "command": "node",
      "args": ["custom-mcp.js"]
    }
  }
}
```

### Conditional MCP Loading

For different environments:

```json
{
  "mcpServers": {
    "docker-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": ["mcp", "gateway", "run"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### MCP Gateway Configuration

Docker MCP reads `config.yaml` in working directory:

```yaml
dockerHost: unix:///var/run/docker.sock
logLevel: info
timeout: 30s
```

## Model Assignment Strategy

Your Claude config uses tiered models:

| Task                 | Model  | Why                  |
| -------------------- | ------ | -------------------- |
| Project coordination | opus   | Complex decisions    |
| Architecture         | sonnet | Good balance         |
| Backend building     | sonnet | Code generation      |
| Frontend building    | sonnet | Component design     |
| Code implementation  | sonnet | Balanced performance |
| Test writing         | haiku  | Efficient, fast      |
| Release planning     | haiku  | Quick tasks          |

**Cost optimization**: Haiku for simple tasks, Opus for complex decisions

## Agent Capabilities

### project-coordinator (opus)

- Oversees full project workflow
- Makes strategic decisions
- Coordinates between other agents

### architecture-advisor (sonnet)

- System design
- Technical decisions
- Infrastructure planning

### backend-builder (sonnet)

- Server code
- API development
- Database work

### frontend-integration-builder (sonnet)

- UI components
- Integration points
- User experience

### code-implementer (sonnet)

- General code writing
- Bug fixes
- Refactoring

### test-writer (haiku)

- Unit tests
- Integration tests
- Test automation

### release-planner (haiku)

- Version planning
- Changelog generation
- Release automation

## Best Practices

1. **Keep MCP configs in version control** - All three files should be committed
2. **Use environment-specific configs** - Different settings for dev/prod
3. **Monitor MCP performance** - Long timeouts may indicate Docker bottleneck
4. **Update Docker MCP regularly** - `docker mcp gateway` updates via Docker Desktop
5. **Test MCP connection** - Verify before using in critical workflows

## References

- [Docker MCP Documentation](https://docs.docker.com/ai/)
- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Claude MCP Integration](https://claude.ai/settings/mcp)
- [GitHub Copilot MCP Support](https://docs.github.com/en/copilot/using-github-copilot/using-mcp-with-copilot)

---

**Last Updated**: Configuration files fixed and verified  
**Status**: ✅ All MCP servers configured correctly  
**Next Steps**: Test with Claude, Copilot, and Cline

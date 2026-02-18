#!/usr/bin/env bash
# scripts/sync-mcp-configs.sh
# Generates all platform MCP configs from .ai/mcp-servers.json (SSoT).
#
# Usage:
#   bash scripts/sync-mcp-configs.sh           # Regenerate all configs
#   bash scripts/sync-mcp-configs.sh --check   # Check for drift (CI mode)
#
# Source:   .ai/mcp-servers.json
# Outputs:  .copilot/mcp-config.json
#           .mcp.json
#           .vscode/mcp.json
#           opencode.json

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/.ai/mcp-servers.json"
CHECK_MODE=false
DRIFT=0

if [[ "${1:-}" == "--check" ]]; then
  CHECK_MODE=true
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "❌ Source file not found: .ai/mcp-servers.json"
  exit 1
fi

echo "╔══════════════════════════════════════════╗"
echo "║        MCP Config Sync (SSoT)           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Source: .ai/mcp-servers.json"
echo "Mode:   $([ "$CHECK_MODE" = true ] && echo 'CHECK (CI)' || echo 'GENERATE')"
echo ""

# --- Generate configs using Node.js ---
generate_configs() {
  node -e "
const fs = require('fs');
const path = require('path');

const root = process.argv[1];
const source = JSON.parse(fs.readFileSync(path.join(root, '.ai/mcp-servers.json'), 'utf8'));
const servers = source.servers;

// Helper: resolve workspace folder placeholder
function resolveArgs(args, placeholder) {
  return args.map(a => a.replace('\${workspaceFolder}', placeholder));
}

// 1. .copilot/mcp-config.json (Copilot CLI format)
const copilot = { mcpServers: {} };
for (const [name, srv] of Object.entries(servers)) {
  copilot.mcpServers[name] = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', srv.package, ...resolveArgs(srv.args, '\${workspaceFolder}')],
  };
  if (srv.env && Object.keys(srv.env).length > 0) {
    copilot.mcpServers[name].env = srv.env;
  }
}
fs.writeFileSync(
  path.join(root, '.copilot/mcp-config.json'),
  JSON.stringify(copilot, null, 2) + '\n'
);

// 2. .mcp.json (Claude Code / generic format)
const mcp = { mcpServers: {} };
for (const [name, srv] of Object.entries(servers)) {
  mcp.mcpServers[name] = {
    command: 'npx',
    args: ['-y', srv.package, ...resolveArgs(srv.args, '.')],
  };
  if (srv.env && Object.keys(srv.env).length > 0) {
    mcp.mcpServers[name].env = srv.env;
  }
}
fs.writeFileSync(
  path.join(root, '.mcp.json'),
  JSON.stringify(mcp, null, 2) + '\n'
);

// 3. .vscode/mcp.json (VS Code format)
const vscode = { servers: {} };
for (const [name, srv] of Object.entries(servers)) {
  vscode.servers[name] = {
    type: 'stdio',
    command: 'npx',
    args: ['-y', srv.package, ...resolveArgs(srv.args, '\${workspaceFolder}')],
  };
  if (srv.env && Object.keys(srv.env).length > 0) {
    vscode.servers[name].env = srv.env;
  }
}
fs.writeFileSync(
  path.join(root, '.vscode/mcp.json'),
  JSON.stringify(vscode, null, 2) + '\n'
);

// 4. opencode.json (OpenCode format)
const opencode = {
  '\$schema': 'https://opencode.ai/config.json',
  mcp: {},
};
for (const [name, srv] of Object.entries(servers)) {
  opencode.mcp[name] = {
    type: 'local',
    command: ['npx', '-y', srv.package, ...resolveArgs(srv.args, '.')],
    enabled: true,
  };
}
fs.writeFileSync(
  path.join(root, 'opencode.json'),
  JSON.stringify(opencode, null, 2) + '\n'
);

console.log('Generated: .copilot/mcp-config.json');
console.log('Generated: .mcp.json');
console.log('Generated: .vscode/mcp.json');
console.log('Generated: opencode.json');
" "$ROOT"
}

# --- Check mode: generate to temp and compare ---
check_drift() {
  local tmpdir
  tmpdir=$(mktemp -d)

  # Generate to temp
  mkdir -p "$tmpdir/.ai" "$tmpdir/.copilot" "$tmpdir/.vscode"
  cp "$SOURCE" "$tmpdir/.ai/mcp-servers.json"

  # Generate to temp
  node -e "
const fs = require('fs');
const path = require('path');

const root = process.argv[1];
const source = JSON.parse(fs.readFileSync(path.join(root, '.ai/mcp-servers.json'), 'utf8'));
const servers = source.servers;

function resolveArgs(args, placeholder) {
  return args.map(a => a.replace('\${workspaceFolder}', placeholder));
}

const copilot = { mcpServers: {} };
for (const [name, srv] of Object.entries(servers)) {
  copilot.mcpServers[name] = { type: 'stdio', command: 'npx', args: ['-y', srv.package, ...resolveArgs(srv.args, '\${workspaceFolder}')] };
  if (srv.env && Object.keys(srv.env).length > 0) copilot.mcpServers[name].env = srv.env;
}
fs.writeFileSync(path.join(root, '.copilot/mcp-config.json'), JSON.stringify(copilot, null, 2) + '\n');

const mcp = { mcpServers: {} };
for (const [name, srv] of Object.entries(servers)) {
  mcp.mcpServers[name] = { command: 'npx', args: ['-y', srv.package, ...resolveArgs(srv.args, '.')] };
  if (srv.env && Object.keys(srv.env).length > 0) mcp.mcpServers[name].env = srv.env;
}
fs.writeFileSync(path.join(root, '.mcp.json'), JSON.stringify(mcp, null, 2) + '\n');

const vscode = { servers: {} };
for (const [name, srv] of Object.entries(servers)) {
  vscode.servers[name] = { type: 'stdio', command: 'npx', args: ['-y', srv.package, ...resolveArgs(srv.args, '\${workspaceFolder}')] };
  if (srv.env && Object.keys(srv.env).length > 0) vscode.servers[name].env = srv.env;
}
fs.writeFileSync(path.join(root, '.vscode/mcp.json'), JSON.stringify(vscode, null, 2) + '\n');

const opencode = { '\$schema': 'https://opencode.ai/config.json', mcp: {} };
for (const [name, srv] of Object.entries(servers)) {
  opencode.mcp[name] = { type: 'local', command: ['npx', '-y', srv.package, ...resolveArgs(srv.args, '.')], enabled: true };
}
fs.writeFileSync(path.join(root, 'opencode.json'), JSON.stringify(opencode, null, 2) + '\n');
" "$tmpdir"

  local files=(".copilot/mcp-config.json" ".mcp.json" ".vscode/mcp.json" "opencode.json")
  for f in "${files[@]}"; do
    if [[ ! -f "$ROOT/$f" ]]; then
      echo "  ❌ Missing: $f"
      DRIFT=$((DRIFT + 1))
    elif ! diff -q "$tmpdir/$f" "$ROOT/$f" &>/dev/null; then
      echo "  ❌ Drift detected: $f"
      diff --unified=3 "$tmpdir/$f" "$ROOT/$f" || true
      DRIFT=$((DRIFT + 1))
    else
      echo "  ✅ $f"
    fi
  done

  rm -rf "$tmpdir"
}

# --- Main ---
if [ "$CHECK_MODE" = true ]; then
  echo "── Checking MCP config drift ──"
  check_drift
  echo ""
  if [ "$DRIFT" -gt 0 ]; then
    echo "❌ $DRIFT MCP config(s) out of sync."
    echo "   Run: bash scripts/sync-mcp-configs.sh"
    exit 1
  else
    echo "✅ All MCP configs in sync with .ai/mcp-servers.json"
  fi
else
  echo "── Generating MCP configs ──"
  generate_configs
  echo ""
  echo "✅ All MCP configs regenerated from .ai/mcp-servers.json"
fi

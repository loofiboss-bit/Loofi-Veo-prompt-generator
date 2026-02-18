#!/usr/bin/env bash
# scripts/health-check.sh
# Master validation script for the entire AI infrastructure.
# Runs all governance checks in one pass.
#
# Usage:
#   bash scripts/health-check.sh         # Full check
#   bash scripts/health-check.sh --fix   # Fix what can be auto-fixed

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FIX_MODE=false
ERRORS=0
WARNINGS=0
CHECKS=0

if [[ "${1:-}" == "--fix" ]]; then
  FIX_MODE=true
fi

pass() { CHECKS=$((CHECKS + 1)); echo "  ✅ $1"; }
fail() { CHECKS=$((CHECKS + 1)); ERRORS=$((ERRORS + 1)); echo "  ❌ $1"; }
warn() { CHECKS=$((CHECKS + 1)); WARNINGS=$((WARNINGS + 1)); echo "  ⚠️  $1"; }

echo "╔══════════════════════════════════════════════╗"
echo "║   AI Infrastructure Health Check             ║"
echo "╠══════════════════════════════════════════════╣"
echo "║   Mode: $([ "$FIX_MODE" = true ] && printf '%-36s' 'FIX (auto-repair)' || printf '%-36s' 'CHECK (read-only)')║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 1. Core Files ──────────────────────────────────────
echo "── 1. Core Instruction Files ──"

CORE_FILES=(
  ".ai/INSTRUCTIONS.md"
  ".ai/WORKFLOW.md"
  ".ai/AGENT_SPECS.md"
  ".ai/DECISIONS.md"
  ".ai/ROADMAP.md"
  ".ai/ONBOARDING.md"
  ".ai/mcp-servers.json"
  "AGENTS.md"
  "CLAUDE.md"
  "CODEX.md"
  "CHATGPT.md"
  ".github/copilot-instructions.md"
)

for f in "${CORE_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    pass "$f"
  else
    fail "Missing: $f"
  fi
done
echo ""

# ─── 2. Agent Definitions ──────────────────────────────
echo "── 2. Agent Definitions ──"

AGENTS=(
  "project-coordinator"
  "architecture-advisor"
  "backend-builder"
  "frontend-integration-builder"
  "code-implementer"
  "test-writer"
  "release-planner"
)

for agent in "${AGENTS[@]}"; do
  # Source (SSoT)
  if [[ -f ".ai/agents/${agent}.md" ]]; then
    pass ".ai/agents/${agent}.md"
  else
    fail "Missing source: .ai/agents/${agent}.md"
  fi

  # Claude
  if [[ -f ".claude/agents/${agent}.md" ]]; then
    pass ".claude/agents/${agent}.md"
  else
    fail "Missing: .claude/agents/${agent}.md"
  fi

  # ChatGPT
  if [[ -f ".chatgpt/agents/${agent}.md" ]]; then
    pass ".chatgpt/agents/${agent}.md"
  else
    fail "Missing: .chatgpt/agents/${agent}.md"
  fi
done
echo ""

# ─── 3. Platform Settings ──────────────────────────────
echo "── 3. Platform Settings ──"

SETTINGS=(
  ".claude/settings.json"
  ".chatgpt/settings.json"
)

for f in "${SETTINGS[@]}"; do
  if [[ -f "$f" ]]; then
    pass "$f"
  else
    fail "Missing: $f"
  fi
done
echo ""

# ─── 4. MCP Configs ────────────────────────────────────
echo "── 4. MCP Config Sync ──"

if bash scripts/sync-mcp-configs.sh --check >/dev/null 2>&1; then
  pass "All MCP configs in sync"
else
  if [ "$FIX_MODE" = true ]; then
    bash scripts/sync-mcp-configs.sh >/dev/null 2>&1
    warn "MCP configs were out of sync — auto-fixed"
  else
    fail "MCP configs out of sync (run: bash scripts/sync-mcp-configs.sh)"
  fi
fi
echo ""

# ─── 5. Agent Config Drift ─────────────────────────────
echo "── 5. Agent Config Drift ──"

if bash scripts/generate-agent-configs.sh --check >/dev/null 2>&1; then
  pass "Agent configs in sync"
else
  if [ "$FIX_MODE" = true ]; then
    bash scripts/generate-agent-configs.sh >/dev/null 2>&1
    warn "Agent configs were out of sync — auto-fixed"
  else
    fail "Agent configs out of sync (run: bash scripts/generate-agent-configs.sh)"
  fi
fi
echo ""

# ─── 6. Skills ─────────────────────────────────────────
echo "── 6. Skills ──"

SKILL_DIRS=(
  ".claude/skills/verify"
  ".claude/skills/new-feature"
  ".claude/skills/refactor"
  ".copilot/skills/verify"
  ".copilot/skills/new-feature"
  ".copilot/skills/refactor"
  ".codex/skills/validate"
  ".codex/skills/implement"
  ".codex/skills/test"
)

for d in "${SKILL_DIRS[@]}"; do
  if [[ -f "$d/SKILL.md" ]]; then
    pass "$d/SKILL.md"
  else
    fail "Missing: $d/SKILL.md"
  fi
done
echo ""

# ─── 7. CI/CD Workflows ────────────────────────────────
echo "── 7. CI/CD Workflows ──"

WORKFLOWS=(
  ".github/workflows/validate.yml"
  ".github/workflows/build.yml"
  ".github/workflows/auto-label.yml"
)

for f in "${WORKFLOWS[@]}"; do
  if [[ -f "$f" ]]; then
    pass "$f"
  else
    warn "Missing: $f"
  fi
done
echo ""

# ─── 8. Git Hooks ──────────────────────────────────────
echo "── 8. Git Hooks ──"

HOOKS=(
  ".husky/pre-commit"
  ".husky/commit-msg"
)

for f in "${HOOKS[@]}"; do
  if [[ -f "$f" ]]; then
    pass "$f"
  else
    fail "Missing: $f"
  fi
done

if [[ -f "commitlint.config.js" ]]; then
  pass "commitlint.config.js"
else
  fail "Missing: commitlint.config.js"
fi
echo ""

# ─── 9. Scripts ────────────────────────────────────────
echo "── 9. Automation Scripts ──"

SCRIPTS=(
  "scripts/validate-agent-config.sh"
  "scripts/generate-agent-configs.sh"
  "scripts/sync-mcp-configs.sh"
  "scripts/sync-version.sh"
  "scripts/lint-ci.mjs"
)

for f in "${SCRIPTS[@]}"; do
  if [[ -f "$f" ]]; then
    pass "$f"
  else
    fail "Missing: $f"
  fi
done
echo ""

# ─── 10. Version Consistency ──────────────────────────
echo "── 10. Version Consistency ──"

PKG_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")
META_VERSION=$(node -e "console.log(require('./metadata.json').version)" 2>/dev/null || echo "unknown")
MANIFEST_VERSION=$(node -e "console.log(require('./manifest.json').version)" 2>/dev/null || echo "unknown")

if [[ "$PKG_VERSION" == "$META_VERSION" && "$PKG_VERSION" == "$MANIFEST_VERSION" ]]; then
  pass "All versions match: $PKG_VERSION"
else
  fail "Version mismatch: package.json=$PKG_VERSION, metadata.json=$META_VERSION, manifest.json=$MANIFEST_VERSION"
fi
echo ""

# ─── Summary ───────────────────────────────────────────
echo "═══════════════════════════════════════════════"
echo "  Checks: $CHECKS  |  Passed: $((CHECKS - ERRORS - WARNINGS))  |  Warnings: $WARNINGS  |  Errors: $ERRORS"
echo "═══════════════════════════════════════════════"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "❌ Health check FAILED with $ERRORS error(s)."
  [ "$FIX_MODE" = false ] && echo "   Try: bash scripts/health-check.sh --fix"
  exit 1
else
  echo ""
  echo "✅ AI infrastructure is healthy!"
  exit 0
fi

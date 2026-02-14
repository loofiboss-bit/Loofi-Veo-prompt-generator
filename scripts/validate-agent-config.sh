#!/usr/bin/env bash
# validate-agent-config.sh — Validates AI agent configuration consistency
# Usage: bash scripts/validate-agent-config.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

ERRORS=0
WARNINGS=0

echo "╔══════════════════════════════════════════╗"
echo "║      Agent Configuration Validator       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

AGENTS=(
  "project-coordinator"
  "architecture-advisor"
  "backend-builder"
  "frontend-integration-builder"
  "code-implementer"
  "test-writer"
  "release-planner"
)

# === 1. Source Agent Files (.ai/agents/) ===
echo "── 1. Source Agent Files (.ai/agents/) ──"

for agent in "${AGENTS[@]}"; do
  if [ -f ".ai/agents/${agent}.md" ]; then
    echo "  ✅ ${agent}.md"
  else
    echo "  ❌ Missing source: .ai/agents/${agent}.md"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# === 2. Claude Agent Files ===
echo "── 2. Claude Agent Files (.claude/agents/) ──"

for agent in "${AGENTS[@]}"; do
  if [ -f ".claude/agents/${agent}.md" ]; then
    echo "  ✅ ${agent}.md"
  else
    echo "  ❌ Missing: .claude/agents/${agent}.md"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# === 3. ChatGPT Agent Files ===
echo "── 3. ChatGPT Agent Files (.chatgpt/agents/) ──"

for agent in "${AGENTS[@]}"; do
  if [ -f ".chatgpt/agents/${agent}.md" ]; then
    echo "  ✅ ${agent}.md"
  else
    echo "  ❌ Missing: .chatgpt/agents/${agent}.md"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# === 4. No Duplicate Agent Files ===
echo "── 4. Duplicate Check ──"

CLAUDE_ROOT_DUPES=0
CHATGPT_ROOT_DUPES=0

for agent in "${AGENTS[@]}"; do
  if [ -f ".claude/${agent}.md" ]; then
    echo "  ❌ Duplicate found: .claude/${agent}.md (canonical: .claude/agents/${agent}.md)"
    CLAUDE_ROOT_DUPES=$((CLAUDE_ROOT_DUPES + 1))
    ERRORS=$((ERRORS + 1))
  fi
  if [ -f ".chatgpt/${agent}.md" ]; then
    echo "  ❌ Duplicate found: .chatgpt/${agent}.md (canonical: .chatgpt/agents/${agent}.md)"
    CHATGPT_ROOT_DUPES=$((CHATGPT_ROOT_DUPES + 1))
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $CLAUDE_ROOT_DUPES -eq 0 ] && [ $CHATGPT_ROOT_DUPES -eq 0 ]; then
  echo "  ✅ No duplicate agent files"
fi

echo ""

# === 5. Agent Memory Directories ===
echo "── 5. Agent Memory Directories ──"

for dir in ".claude/agent-memory" ".chatgpt/agent-memory"; do
  if [ -d "$dir" ]; then
    echo "  ✅ $dir/"
  else
    echo "  ⚠️  Missing: $dir/ (will be created on first agent run)"
    WARNINGS=$((WARNINGS + 1))
  fi
done

echo ""

# === 6. Canonical Instruction Files ===
echo "── 6. Canonical AI Instruction Files (.ai/) ──"

AI_FILES=(
  ".ai/INSTRUCTIONS.md"
  ".ai/WORKFLOW.md"
  ".ai/AGENT_SPECS.md"
  ".ai/DECISIONS.md"
  ".ai/ONBOARDING.md"
  ".ai/ROADMAP.md"
  ".ai/model-versions.json"
)

for f in "${AI_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ Missing: $f"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# === 7. Platform Shims ===
echo "── 7. Platform-Specific Shims ──"

SHIMS=(
  "CLAUDE.md"
  "CHATGPT.md"
  "CODEX.md"
  ".github/copilot-instructions.md"
)

for f in "${SHIMS[@]}"; do
  if [ -f "$f" ]; then
    # Check it references canonical instructions
    if grep -q "\.ai/INSTRUCTIONS\.md\|ai/INSTRUCTIONS" "$f" 2>/dev/null; then
      echo "  ✅ $f (references .ai/INSTRUCTIONS.md)"
    else
      echo "  ⚠️  $f exists but doesn't reference .ai/INSTRUCTIONS.md"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo "  ❌ Missing: $f"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# === 8. Platform Settings ===
echo "── 8. Platform Settings ──"

for settings in ".claude/settings.json" ".chatgpt/settings.json"; do
  if [ -f "$settings" ]; then
    echo "  ✅ $settings"
  else
    echo "  ❌ Missing: $settings"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""

# === 9. MCP Server Config ===
echo "── 9. MCP Server Configuration ──"

if [ -f ".vscode/mcp.json" ]; then
  echo "  ✅ .vscode/mcp.json"
else
  echo "  ⚠️  Missing: .vscode/mcp.json (optional — created per-workspace)"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""

# === Summary ===
echo "══════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "✅ Agent configuration valid ($WARNINGS warnings)"
else
  echo "❌ Agent configuration invalid: $ERRORS errors, $WARNINGS warnings"
fi
echo "══════════════════════════════════════════"

exit $ERRORS

#!/usr/bin/env bash
# scripts/generate-agent-configs.sh
# Generates platform-specific agent configs from .ai/agents/ sources + platform settings.
#
# Usage:
#   bash scripts/generate-agent-configs.sh           # Generate all configs
#   bash scripts/generate-agent-configs.sh --check   # Check for drift (CI mode)
#
# Sources:
#   .ai/agents/*.md          — Platform-neutral agent definitions (SSoT)
#   .claude/settings.json    — Claude model/color mappings
#   .chatgpt/settings.json   — ChatGPT model/color mappings
#
# Outputs:
#   .claude/agents/*.md      — Claude-specific agent configs
#   .chatgpt/agents/*.md     — ChatGPT-specific agent configs

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT/.ai/agents"
CHECK_MODE=false
ERRORS=0
GENERATED=0

if [[ "${1:-}" == "--check" ]]; then
  CHECK_MODE=true
fi

# Verify dependencies
if ! command -v python3 &>/dev/null && ! command -v node &>/dev/null; then
  echo "⚠  Neither python3 nor node found. Using bash-only JSON parsing (limited)."
fi

# --- JSON helpers (bash-only, no jq dependency) ---
# Extract a simple string value from a JSON file by key path
# Usage: json_get <file> <key1> [<key2>]
json_get() {
  local file="$1" key1="$2" key2="${3:-}"
  if command -v node &>/dev/null; then
    if [[ -n "$key2" ]]; then
      node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d[process.argv[2]]?.[process.argv[3]] ?? '')" "$file" "$key1" "$key2"
    else
      node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d[process.argv[2]] ?? '')" "$file" "$key1"
    fi
  elif command -v python3 &>/dev/null; then
    if [[ -n "$key2" ]]; then
      python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get(sys.argv[2],{}).get(sys.argv[3],''))" "$file" "$key1" "$key2"
    else
      python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get(sys.argv[2],''))" "$file" "$key1"
    fi
  else
    echo ""
  fi
}

json_get_nested() {
  local file="$1" key1="$2" key2="$3" key3="$4"
  if command -v node &>/dev/null; then
    node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(d[process.argv[2]]?.[process.argv[3]]?.[process.argv[4]] ?? '')" "$file" "$key1" "$key2" "$key3"
  elif command -v python3 &>/dev/null; then
    python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(d.get(sys.argv[2],{}).get(sys.argv[3],{}).get(sys.argv[4],''))" "$file" "$key1" "$key2" "$key3"
  else
    echo ""
  fi
}

# --- Extract source file content ---
# Strips the YAML frontmatter (between --- markers) and returns just the body
extract_body() {
  local file="$1"
  awk '
    BEGIN { in_front=0; past_front=0 }
    /^---$/ {
      if (!in_front && !past_front) { in_front=1; next }
      if (in_front) { in_front=0; past_front=1; next }
    }
    past_front { print }
  ' "$file"
}

# Extract the description from the source YAML frontmatter
extract_description() {
  local file="$1"
  # Use awk to extract everything between "description: >" and the next frontmatter field or "---"
  awk '
    BEGIN { in_desc=0; desc="" }
    /^---$/ { if (in_desc) { in_desc=0 } next }
    /^description:/ {
      # Check for multi-line (>) or inline
      if ($0 ~ /^description: >/) {
        in_desc=1
        next
      } else {
        # Inline description
        sub(/^description: */, "")
        gsub(/^"/, ""); gsub(/"$/, "")
        print
        exit
      }
    }
    /^[a-z]+:/ && in_desc { in_desc=0; next }
    in_desc {
      sub(/^  /, "")
      if (desc != "") desc = desc "\\n"
      desc = desc $0
    }
    END { if (desc != "") print desc }
  ' "$file"
}

# Extract the name from the source YAML frontmatter
extract_name() {
  local file="$1"
  awk '/^name: / { sub(/^name: */, ""); print; exit }' "$file"
}

# --- Memory section template ---
generate_memory_section() {
  local agent_name="$1" memory_dir="$2"
  local topic_files=""

  # Suggest topic files based on agent role
  case "$agent_name" in
    project-coordinator) topic_files='`roadmap.md`, `patterns.md`' ;;
    architecture-advisor) topic_files='`patterns.md`, `services.md`' ;;
    backend-builder) topic_files='`patterns.md`, `services.md`' ;;
    frontend-integration-builder) topic_files='`components.md`, `stores.md`' ;;
    code-implementer) topic_files='`patterns.md`, `components.md`' ;;
    test-writer) topic_files='`mocking.md`, `patterns.md`' ;;
    release-planner) topic_files='`roadmap.md`, `patterns.md`' ;;
    *) topic_files='`notes.md`' ;;
  esac

  cat <<EOF

# Persistent Agent Memory

You have a persistent Agent Memory directory at \`${memory_dir}/${agent_name}/\`. Its contents persist across conversations.

As you work, consult your memory files to build on previous experience. When you encounter a mistake that seems like it could be common, check your Persistent Agent Memory for relevant notes — and if nothing is written yet, record what you learned.

Guidelines:

- \`MEMORY.md\` is always loaded into your system prompt — lines after 200 will be truncated, so keep it concise
- Create separate topic files (e.g., ${topic_files}) for detailed notes and link to them from MEMORY.md
- Record insights about problem constraints, strategies that worked or failed, and lessons learned
- Update or remove memories that turn out to be wrong or outdated
- Organize memory semantically by topic, not chronologically
- Use the Write and Edit tools to update your memory files
- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project

## MEMORY.md

Your MEMORY.md is currently empty. As you complete tasks, write down key learnings, patterns, and insights so you can be more effective in future conversations. Anything saved in MEMORY.md will be included in your system prompt next time.
EOF
}

# --- Generate a single platform agent file ---
generate_agent() {
  local agent_name="$1" platform="$2" settings_file="$3" source_file="$4" output_file="$5"

  local model color memory_dir description body

  model=$(json_get_nested "$settings_file" "agents" "$agent_name" "model")
  color=$(json_get_nested "$settings_file" "agents" "$agent_name" "color")
  memory_dir=$(json_get "$settings_file" "memoryDir")
  description=$(extract_description "$source_file")
  body=$(extract_body "$source_file")

  if [[ -z "$model" ]]; then
    echo "  ✗ No model mapping for $agent_name in $settings_file"
    ERRORS=$((ERRORS + 1))
    return 1
  fi

  # Build the generated file
  local generated
  generated=$(cat <<GENEOF
---
name: ${agent_name}
description: "${description}"
model: ${model}
color: ${color}
memory: project
---

${body}
$(generate_memory_section "$agent_name" "$memory_dir")
GENEOF
)

  if $CHECK_MODE; then
    # Compare with existing file
    if [[ ! -f "$output_file" ]]; then
      echo "  ✗ DRIFT: $output_file does not exist (would be generated)"
      ERRORS=$((ERRORS + 1))
      return 1
    fi

    local existing
    existing=$(cat "$output_file")

    if [[ "$generated" != "$existing" ]]; then
      echo "  ✗ DRIFT: $output_file differs from generated content"
      echo "    Run: bash scripts/generate-agent-configs.sh"
      ERRORS=$((ERRORS + 1))
      return 1
    else
      echo "  ✓ $output_file is up-to-date"
    fi
  else
    # Write the file
    mkdir -p "$(dirname "$output_file")"
    echo "$generated" > "$output_file"
    echo "  ✓ Generated $output_file"
    GENERATED=$((GENERATED + 1))
  fi
}

# --- Main ---
echo "═══════════════════════════════════════════"
if $CHECK_MODE; then
  echo "  Agent Config Drift Check"
else
  echo "  Agent Config Generator"
fi
echo "═══════════════════════════════════════════"
echo ""

# Validate source directory
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "✗ Source directory $SOURCE_DIR not found"
  exit 1
fi

# Process each platform
for platform_dir in ".claude" ".chatgpt"; do
  settings_file="$ROOT/$platform_dir/settings.json"

  if [[ ! -f "$settings_file" ]]; then
    echo "⚠  Skipping $platform_dir (no settings.json)"
    continue
  fi

  platform=$(json_get "$settings_file" "platform")
  echo "Platform: $platform ($platform_dir)"

  for source_file in "$SOURCE_DIR"/*.md; do
    [[ -f "$source_file" ]] || continue
    agent_name=$(extract_name "$source_file")

    if [[ -z "$agent_name" ]]; then
      agent_name=$(basename "$source_file" .md)
    fi

    output_file="$ROOT/$platform_dir/agents/${agent_name}.md"
    generate_agent "$agent_name" "$platform" "$settings_file" "$source_file" "$output_file"
  done
  echo ""
done

# Summary
echo "═══════════════════════════════════════════"
if $CHECK_MODE; then
  if [[ $ERRORS -gt 0 ]]; then
    echo "  ✗ $ERRORS drift issue(s) found"
    echo "  Run: bash scripts/generate-agent-configs.sh"
    exit 1
  else
    echo "  ✓ All agent configs are up-to-date"
  fi
else
  echo "  ✓ Generated $GENERATED agent config(s)"
  if [[ $ERRORS -gt 0 ]]; then
    echo "  ✗ $ERRORS error(s) occurred"
    exit 1
  fi
fi
echo "═══════════════════════════════════════════"

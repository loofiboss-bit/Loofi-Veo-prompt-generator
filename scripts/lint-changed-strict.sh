#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for lint:changed:strict"
  exit 1
fi

changed_files=$(git diff --name-only --diff-filter=ACMRTUXB HEAD -- '*.js' '*.jsx' '*.ts' '*.tsx')

if [ -z "${changed_files}" ]; then
  echo "No changed JS/TS files to lint."
  exit 0
fi

npx eslint --max-warnings=0 ${changed_files}

#!/usr/bin/env bash
# pre-release-check.sh — Validates everything before a release
# Usage: bash scripts/pre-release-check.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

ERRORS=0
WARNINGS=0

echo "╔══════════════════════════════════════════╗"
echo "║        Pre-Release Validation            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

VERSION=$(node -p "require('./package.json').version")
echo "Version: $VERSION"
echo ""

# === 1. Version Consistency ===
echo "── 1. Version Consistency ──"

PKG_VERSION=$(node -p "require('./package.json').version")
echo "  package.json: $PKG_VERSION"

if [ -f "metadata.json" ]; then
  META_VERSION=$(node -p "require('./metadata.json').version")
  echo "  metadata.json: $META_VERSION"
  if [ "$PKG_VERSION" != "$META_VERSION" ]; then
    echo "  ❌ Version mismatch: package.json ($PKG_VERSION) != metadata.json ($META_VERSION)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠️  metadata.json not found"
  WARNINGS=$((WARNINGS + 1))
fi

if [ -f "manifest.json" ]; then
  MANIFEST_VERSION=$(node -p "require('./manifest.json').version")
  echo "  manifest.json: $MANIFEST_VERSION"
  if [ "$PKG_VERSION" != "$MANIFEST_VERSION" ]; then
    echo "  ❌ Version mismatch: package.json ($PKG_VERSION) != manifest.json ($MANIFEST_VERSION)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ⚠️  manifest.json not found"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""

# === 2. CHANGELOG Check ===
echo "── 2. CHANGELOG ──"

CLEAN_VERSION=$(echo "$VERSION" | sed 's/-beta.*//' | sed 's/-alpha.*//')
if grep -q "\[$CLEAN_VERSION\]" CHANGELOG.md 2>/dev/null || grep -q "\[$VERSION\]" CHANGELOG.md 2>/dev/null; then
  echo "  ✅ CHANGELOG.md has entry for $VERSION"
else
  echo "  ❌ CHANGELOG.md missing entry for $VERSION"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# === 3. Lint ===
echo "── 3. Lint (strict) ──"

if npm run lint:ci > /dev/null 2>&1; then
  echo "  ✅ Lint passed (zero warnings)"
else
  echo "  ❌ Lint failed"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# === 4. TypeScript ===
echo "── 4. Type Check ──"

if npm run typecheck > /dev/null 2>&1; then
  echo "  ✅ TypeScript check passed"
else
  echo "  ❌ TypeScript check failed"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# === 5. Tests ===
echo "── 5. Tests ──"

if npm run test > /dev/null 2>&1; then
  echo "  ✅ Tests passed"
else
  echo "  ❌ Tests failed"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# === 6. Format ===
echo "── 6. Format Check ──"

if npm run format:check > /dev/null 2>&1; then
  echo "  ✅ Formatting consistent"
else
  echo "  ❌ Formatting inconsistent — run: npm run format"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# === 7. Build ===
echo "── 7. Build ──"

if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build succeeded"
else
  echo "  ❌ Build failed"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# === 8. Uncommitted Changes ===
echo "── 8. Git Status ──"

if [ -z "$(git status --porcelain)" ]; then
  echo "  ✅ Working tree clean"
else
  echo "  ⚠️  Uncommitted changes detected"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""

# === Summary ===
echo "══════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo "✅ RELEASE READY ($WARNINGS warnings)"
  echo ""
  echo "Next steps:"
  echo "  git commit -m \"chore(release): v$VERSION\""
  echo "  git tag v$VERSION"
  echo "  git push origin main --tags"
else
  echo "❌ NOT READY: $ERRORS errors, $WARNINGS warnings"
  echo "Fix all errors before releasing."
fi
echo "══════════════════════════════════════════"

exit $ERRORS

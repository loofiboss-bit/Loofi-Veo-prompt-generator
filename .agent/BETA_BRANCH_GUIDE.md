# Beta Branch Auto-Release Workflow

## 🎯 Overview

The **beta branch** is now configured for **automatic builds and releases** via GitHub Actions.

**Key Features:**

- ✅ Push to beta branch → Automatic build + release
- ✅ Version auto-detected from `package.json`
- ✅ Auto-creates git tags
- ✅ Builds Linux + Windows packages
- ✅ Creates GitHub pre-release automatically

---

## 🚀 How It Works

### Workflow Triggers

The beta release workflow triggers on:

1. **Push to beta branch** → Auto-release

   ```bash
   git push origin beta
   ```

2. **Push beta tags** → Release from tag

   ```bash
   git push origin v1.4.0-beta.2
   ```

3. **Manual dispatch** → Manual release

   ```bash
   gh workflow run beta-release.yml -f version=1.4.0-beta.2 -f clear_cache=true
   ```

### Automatic Process

When you push to the beta branch:

1. **GitHub Actions detects push**
2. **Reads version** from `package.json`
3. **Creates tag** `v{version}` (if not exists)
4. **Builds packages** (Linux + Windows in parallel)
5. **Creates GitHub release** (pre-release)
6. **Uploads artifacts** (AppImage + Windows installers)

---

## 📝 Usage Guide

### Method 1: Direct Beta Branch Push (Recommended)

```bash
# 1. Switch to beta branch
git checkout beta

# 2. Make your changes
# Edit files, add features, fix bugs

# 3. Update version in package.json
# Example: "version": "1.4.0-beta.2"
nano package.json

# 4. Commit changes
git add .
git commit -m "feat: Add new beta feature"

# 5. Push to beta branch
git push origin beta

# 6. GitHub Actions automatically:
#    - Detects version from package.json
#    - Creates tag v1.4.0-beta.2
#    - Builds Linux + Windows packages
#    - Creates GitHub pre-release
#    - Uploads artifacts
```

**That's it!** No manual tagging or release creation needed.

---

### Method 2: Tag-Based Release

```bash
# 1. Make changes on beta branch
git checkout beta
# ... make changes ...

# 2. Update package.json version
# Example: "version": "1.4.0-beta.3"

# 3. Commit and tag
git add .
git commit -m "feat: Beta feature"
git tag v1.4.0-beta.3 -a -m "v1.4.0-beta.3 release"

# 4. Push both branch and tag
git push origin beta
git push origin v1.4.0-beta.3

# 5. Workflow triggers on tag push
```

---

### Method 3: Manual Workflow Dispatch

```bash
# Trigger workflow manually with specific version
gh workflow run beta-release.yml \
  -f version=1.4.0-beta.4 \
  -f clear_cache=true

# Or via GitHub web interface:
# Actions → Beta Release → Run workflow
```

---

## 🔄 Complete Beta Release Workflow

### Scenario: Creating v1.4.0-beta.2

```bash
# 1. Ensure you're on beta branch
git checkout beta
git pull origin beta

# 2. Make your changes
# Add features, fix bugs, etc.

# 3. Update package.json
# Change: "version": "1.4.0-beta.1" → "1.4.0-beta.2"
sed -i 's/"version": "1.4.0-beta.1"/"version": "1.4.0-beta.2"/' package.json

# 4. Update CHANGELOG.md (optional but recommended)
nano CHANGELOG.md
# Add new features under "Unreleased" or create new section

# 5. Commit changes
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 1.4.0-beta.2

New features:
- Feature A
- Feature B
- Bug fix C"

# 6. Push to beta branch
git push origin beta

# 7. Monitor build
gh run watch
# or visit: https://github.com/loofitheboss/Loofi-Veo-prompt-generator/actions

# 8. Wait ~12-15 minutes for build to complete

# 9. Check release
# Visit: https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases
# Should see: "Veo Studio v1.4.0-beta.2 (Beta)"
```

---

## 📦 What Gets Built

### Linux

- `Veo Prompt Generator-{version}.AppImage` (~141 MB)

### Windows

- `Veo-Prompt-Generator-{version}-win-x64.exe` (NSIS installer)
- `Veo-Prompt-Generator-{version}-win-x64-portable.exe` (Portable)

### Release Type

- **Pre-release** ✅ (Beta releases are marked as pre-release)
- **Latest release** ❌ (Only stable releases marked as latest)

---

## 🔍 Monitoring Builds

### Command Line

```bash
# Watch current workflow run
gh run watch

# List recent runs
gh run list --workflow="beta-release.yml" --limit 5

# View specific run logs
gh run view <run-id> --log

# Check run status
gh run view <run-id>
```

### Web Interface

**Actions Dashboard:**

```
https://github.com/loofitheboss/Loofi-Veo-prompt-generator/actions
```

**Workflow Runs:**

```
https://github.com/loofitheboss/Loofi-Veo-prompt-generator/actions/workflows/beta-release.yml
```

---

## ⚙️ Workflow Configuration

### Triggers

```yaml
on:
  push:
    branches:
      - beta              # Auto-release on beta branch push
    tags:
      - "v*-beta*"        # Release on beta tag push
  workflow_dispatch:      # Manual trigger
    inputs:
      version:
        description: "Beta version (e.g., 1.4.0-beta.1)"
        required: true
      clear_cache:
        description: "Clear build cache before building"
        default: false
```

### Version Detection Logic

```bash
# Priority order:
1. Manual input (workflow_dispatch)
2. Git tag (if triggered by tag)
3. package.json (if triggered by branch push)
```

### Auto-Tagging

When pushing to beta branch:

- Reads version from `package.json`
- Checks if tag `v{version}` exists
- Creates tag if missing
- Pushes tag to GitHub

---

## 🎯 Best Practices

### Version Numbering

Follow semantic versioning with beta suffix:

- `1.4.0-beta.1` - First beta
- `1.4.0-beta.2` - Second beta
- `1.4.0-beta.3` - Third beta
- `1.4.0` - Stable release

### Changelog Management

Update `CHANGELOG.md` with each beta:

```markdown
## [Unreleased]

### Added - v1.4.0-beta.2
- New feature X
- New feature Y

### Fixed - v1.4.0-beta.2
- Bug fix Z
```

### Branch Hygiene

```bash
# Keep beta branch in sync with main for workflow updates
git checkout beta
git merge main

# Or rebase for cleaner history
git rebase main
```

---

## 🔧 Troubleshooting

### Build Fails

**Check logs:**

```bash
gh run view --log
```

**Common issues:**

- Version already exists (update package.json)
- Build errors (check code compilation)
- Cache issues (trigger with clear_cache=true)

**Retry build:**

```bash
gh run rerun <run-id>
# or
gh run rerun --failed
```

### Tag Already Exists

If tag already exists:

```bash
# Delete tag locally and remotely
git tag -d v1.4.0-beta.2
git push origin :refs/tags/v1.4.0-beta.2

# Update package.json to new version
# Push again
```

### Release Not Created

Check workflow condition:

- Must be beta branch, beta tag, or manual dispatch
- Build must succeed
- Artifacts must be uploaded

---

## 📊 Current Status

**Branches:**

- `main` - Stable development
- `beta` - Beta releases (auto-release enabled ✅)

**Latest Beta:**

- Version: `1.4.0-beta.1`
- Status: Building (Run ID: 21853268632)

**Workflow:**

- File: `.github/workflows/beta-release.yml`
- Status: ✅ Active
- Triggers: Beta branch, beta tags, manual

---

## 🚀 Quick Reference

### Create New Beta Release

```bash
# One-liner for new beta release
git checkout beta && \
  sed -i 's/"version": ".*"/"version": "1.4.0-beta.X"/' package.json && \
  git commit -am "chore: v1.4.0-beta.X" && \
  git push origin beta
```

### Check Latest Release

```bash
gh release list --limit 5
```

### Download Latest Beta

```bash
gh release download v1.4.0-beta.1 --pattern "*.AppImage"
```

---

## 📚 Related Documentation

- **Beta Release Guide:** `.agent/BETA_RELEASE_GUIDE.md`
- **Build Status:** `.agent/BUILD_STATUS.md`
- **Auto-Update Docs:** `docs/AUTO_UPDATE.md`
- **Workflow File:** `.github/workflows/beta-release.yml`

---

**Last Updated:** 2026-02-10 06:45 UTC  
**Status:** ✅ Beta branch auto-release active

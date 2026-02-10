# v1.4.0-beta.1 Release Guide

## 🎉 Beta Release Status

✅ **Code Committed** - All auto-update system code committed to main
✅ **Tag Created** - v1.4.0-beta.1 tag pushed to GitHub
✅ **Build Complete** - Linux AppImage built successfully (141 MB)

**Build Artifact:**

- `release/Veo Prompt Generator-1.4.0-beta.1.AppImage`

---

## 📦 Next Steps

### 1. Create GitHub Beta Release

**Manual Steps Required:**

1. **Go to GitHub Releases:**
   - Navigate to: <https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases>
   - Click "Draft a new release"

2. **Configure Release:**
   - **Tag:** Select `v1.4.0-beta.1` (already pushed)
   - **Title:** `v1.4.0-beta.1 - Auto-Update System (Beta)`
   - **Description:** Use the template below
   - **Pre-release:** ✅ **CHECK THIS BOX** (critical for beta channel)
   - **Latest release:** ❌ Leave unchecked

3. **Upload Artifacts:**
   - Upload: `release/Veo Prompt Generator-1.4.0-beta.1.AppImage`
   - The CI/CD workflow may also build Windows artifacts if configured

4. **Publish Release**

---

### GitHub Release Description Template

```markdown
# v1.4.0-beta.1 - Auto-Update System (Beta)

🧪 **This is a BETA release for testing purposes.**

## What's New in This Beta

### Auto-Update System
- ✅ Automatic update detection from GitHub Releases
- ✅ Download progress tracking with real-time updates
- ✅ One-click install and restart
- ✅ Release channel system (Stable/Beta/Dev)
- ✅ Configurable auto-check intervals
- ✅ Background downloads
- ✅ Changelog preview before updating

### Settings Integration
- ✅ Unified Settings Modal (API Key + Update Settings)
- ✅ Release channel selector
- ✅ Auto-check, auto-download, auto-install toggles
- ✅ Manual "Check for Updates" button

### Electron Integration
- ✅ IPC handlers for secure update operations
- ✅ Platform information API
- ✅ Download manager with progress reporting

## 🧪 Beta Testing Instructions

### How to Test the Auto-Update System

1. **Install this beta release**
   - Download the AppImage
   - Make it executable: `chmod +x "Veo Prompt Generator-1.4.0-beta.1.AppImage"`
   - Run it: `./Veo\ Prompt\ Generator-1.4.0-beta.1.AppImage`

2. **Switch to Beta Channel**
   - Open Settings (gear icon in header)
   - Go to "Update Settings" tab
   - Select "Beta" channel
   - Enable "Auto-check for updates"

3. **Test Update Detection**
   - Click "Check for Updates" button
   - Verify it detects newer beta releases (when available)

4. **Test Update Download**
   - When an update is available, click "Download Update"
   - Monitor the download progress indicator
   - Verify download completes successfully

5. **Test Update Installation**
   - Click "Install and Restart"
   - Verify the app restarts with the new version

### What to Test

- ✅ Update notification appears when new version available
- ✅ Download progress shows accurate percentage
- ✅ Changelog preview displays correctly
- ✅ "Remind Me Later" dismisses notification
- ✅ Channel switching works (Stable/Beta/Dev)
- ✅ Settings persist across app restarts
- ✅ Manual check for updates works
- ✅ Auto-check interval works (set to 30 min for testing)

### Known Limitations

- ⚠️ Windows builds not included in this beta (Linux only)
- ⚠️ Auto-update requires internet connection
- ⚠️ First beta release won't have an update to test (need v1.4.0-beta.2)

## 📝 Feedback

Please report any issues or feedback:
- **GitHub Issues:** https://github.com/loofitheboss/Loofi-Veo-prompt-generator/issues
- **Label:** `beta-testing`, `auto-update`

## 📋 Technical Details

**New Files:**
- `services/updateService.ts` - Update detection and management
- `components/updates/UpdateNotification.tsx` - Update UI
- `components/updates/UpdateSettings.tsx` - Settings panel
- `components/SettingsModal.tsx` - Unified settings
- `electron/preload.cjs` - Secure IPC bridge
- `vite-env.d.ts` - TypeScript definitions

**Modified Files:**
- `electron/main.cjs` - IPC handlers for updates
- `vite.config.ts` - Version injection
- `App.tsx` - Settings modal integration
- `CHANGELOG.md` - Full changelog

**Documentation:**
- `docs/AUTO_UPDATE.md` - Auto-update system guide
- `docs/UPDATE_TESTING.md` - Testing procedures

## 🔄 Next Beta Release

To create v1.4.0-beta.2 for testing the update flow:
1. Make minor changes or fixes
2. Update version to `1.4.0-beta.2` in package.json
3. Commit and tag: `git tag v1.4.0-beta.2`
4. Build and release as pre-release
5. Beta users can test the update flow

---

**Full Changelog:** https://github.com/loofitheboss/Loofi-Veo-prompt-generator/blob/main/CHANGELOG.md
```

---

## 2. Beta Testing Workflow

### Create a Second Beta Release (for testing updates)

To properly test the auto-update system, you need a newer version:

```bash
# Make a minor change (e.g., update README)
echo "Beta testing in progress" >> README.md

# Update version
# Edit package.json: "version": "1.4.0-beta.2"

# Commit and tag
git add .
git commit -m "chore: v1.4.0-beta.2 for update testing"
git tag v1.4.0-beta.2 -a -m "v1.4.0-beta.2 - Update testing"
git push origin main
git push origin v1.4.0-beta.2

# Build
npm run dist

# Create GitHub release (pre-release)
# Upload the new AppImage
```

### Testing the Update Flow

1. Install v1.4.0-beta.1
2. Set channel to "Beta"
3. Release v1.4.0-beta.2 on GitHub
4. Click "Check for Updates" in beta.1
5. Verify it detects beta.2
6. Download and install
7. Verify app restarts as beta.2

---

## 3. Performance Optimization (Week 7)

After beta testing is complete, move to Week 7 tasks:

### Bundle Optimization

- [ ] Implement code splitting
- [ ] Add lazy loading for routes
- [ ] Optimize bundle size (currently 1.6 MB)
- [ ] Add compression (gzip/brotli)
- [ ] Analyze bundle with webpack-bundle-analyzer

### Runtime Performance

- [ ] Implement React.memo for expensive components
- [ ] Add useMemo/useCallback optimizations
- [ ] Optimize re-renders with React DevTools
- [ ] Implement virtual scrolling for long lists
- [ ] Add debouncing for search inputs

### Asset Optimization

- [ ] Optimize images (WebP format)
- [ ] Add image lazy loading
- [ ] Implement font subsetting
- [ ] Optimize SVG icons
- [ ] Add service worker caching

---

## 4. Production Deployment

When beta testing is complete and stable:

### Prepare v1.4.0 Stable Release

```bash
# Update version to stable
# Edit package.json: "version": "1.4.0"

# Update CHANGELOG.md
# Move all "Unreleased" items to [1.4.0] section

# Commit and tag
git add .
git commit -m "chore: Release v1.4.0"
git tag v1.4.0 -a -m "v1.4.0 - UX Professionalization"
git push origin main
git push origin v1.4.0

# Build all platforms
npm run dist

# Create GitHub release (NOT pre-release)
# Upload all artifacts
# Mark as "Latest release"
```

### Post-Release Tasks

- [ ] Update documentation
- [ ] Create release announcement
- [ ] Update project README badges
- [ ] Archive beta releases
- [ ] Plan v1.5.0 roadmap

---

## 5. User Feedback Collection

### Beta Tester Feedback Form

Create a feedback template for beta testers:

**Questions:**

1. Did the update notification appear correctly?
2. Was the download process smooth?
3. Did the installation work without issues?
4. Were the settings clear and easy to use?
5. Any bugs or unexpected behavior?
6. Suggestions for improvement?

### Metrics to Track

- ✅ Update detection success rate
- ✅ Download completion rate
- ✅ Installation success rate
- ✅ Average download time
- ✅ User satisfaction with UI
- ✅ Bugs reported

---

## 📊 Current Project Status

**Version:** v1.4.0-beta.1
**Phase:** Beta Testing
**Progress:** Week 5 Complete (Auto-Update System)
**Next:** Week 6-7 (Performance Optimization)
**Target Stable Release:** 2026-04-06

### Completed (v1.4.0)

- ✅ Week 1: UI Polish + Design System
- ✅ Week 2: Onboarding Flow + Help System
- ✅ Week 3: Accessibility Improvements
- ✅ Week 4: Plugin Architecture Foundation
- ✅ Week 5: Auto-Update System + Release Channels

### In Progress

- 🔄 Beta Testing (Week 5)
- ⏳ Performance Optimization (Week 6-7)

### Upcoming

- ⏳ Week 8: Release Preparation + Launch

---

## 🚀 Quick Commands Reference

```bash
# Check current version
cat package.json | grep version

# Build for production
npm run dist

# Create new tag
git tag v1.4.0-beta.2 -a -m "Message"

# Push tag
git push origin v1.4.0-beta.2

# List all tags
git tag -l

# Delete tag (if needed)
git tag -d v1.4.0-beta.1
git push origin :refs/tags/v1.4.0-beta.1

# Check release artifacts
ls -lh release/*.AppImage
```

---

## 📚 Documentation References

- **Auto-Update Guide:** `docs/AUTO_UPDATE.md`
- **Update Testing:** `docs/UPDATE_TESTING.md`
- **Plugin Development:** `docs/PLUGIN_DEVELOPMENT.md`
- **Changelog:** `CHANGELOG.md`
- **User Guide:** `USER_GUIDE.md`
- **Roadmap:** `.agent/instructions.md`

---

**Last Updated:** 2026-02-10
**Status:** ✅ Ready for Beta Testing

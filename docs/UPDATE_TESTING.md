# Testing the Auto-Update System

This guide explains how to test the auto-update functionality with actual GitHub releases.

## Prerequisites

- Application built and running (either dev mode or production)
- GitHub repository with releases configured
- Understanding of semantic versioning

## Test Scenarios

### 1. Testing Stable Release Detection

**Setup:**

1. Ensure you're on a version older than the latest stable release (e.g., v1.3.0 when v1.4.0 is available)
2. Open Settings → Updates
3. Set Release Channel to "Stable"
4. Enable "Auto-Check"

**Test:**

1. Click "Check for Updates Now"
2. Verify the notification appears in the top-right corner
3. Check that the version number is correct
4. Verify the changelog preview is displayed

**Expected Result:**

- Update notification shows the latest stable version
- Changelog is extracted from CHANGELOG.md
- Download button is functional

### 2. Testing Beta Release Detection

**Setup:**

1. Create a beta release on GitHub:

   ```bash
   git tag v1.4.0-beta.1
   git push origin v1.4.0-beta.1
   ```

2. Wait for GitHub Actions to complete the build
3. Open Settings → Updates
4. Set Release Channel to "Beta"

**Test:**

1. Click "Check for Updates Now"
2. Verify beta release is detected
3. Check that the release is marked as "Beta" or "Pre-release"

**Expected Result:**

- Beta release is detected
- Release is marked as pre-release
- Stable releases are not shown when on beta channel

### 3. Testing Auto-Download

**Setup:**

1. Enable "Auto-Download" in Settings → Updates
2. Ensure an update is available

**Test:**

1. Wait for auto-check interval or manually trigger check
2. Observe the download progress in the notification
3. Verify download completes successfully

**Expected Result:**

- Download starts automatically
- Progress bar updates in real-time
- Download completes without errors

### 4. Testing Manual Download

**Setup:**

1. Disable "Auto-Download"
2. Ensure an update is available

**Test:**

1. Click "Download" button in the update notification
2. Monitor download progress
3. Verify file is downloaded to the correct location

**Expected Result:**

- Download initiates on button click
- Progress is tracked
- File is saved to downloads folder

### 5. Testing Update Installation (Electron)

**Setup:**

1. Ensure you're running the Electron app (not web version)
2. Have an update downloaded

**Test:**

1. Click "Install and Restart" button
2. Verify the app restarts
3. Check that the new version is running after restart

**Expected Result:**

- App closes gracefully
- Update is installed
- App restarts with new version
- No data loss occurs

### 6. Testing Channel Switching

**Setup:**

1. Start on "Stable" channel
2. Switch to "Beta" channel

**Test:**

1. Change channel in Settings → Updates
2. Click "Check for Updates Now"
3. Verify appropriate releases are shown

**Expected Result:**

- Channel change is persisted
- Correct releases are shown for the selected channel
- No errors occur during channel switch

### 7. Testing Update Dismissal

**Setup:**

1. Have an update notification visible

**Test:**

1. Click "Dismiss" button
2. Verify notification disappears
3. Check that the update can still be found manually

**Expected Result:**

- Notification is dismissed
- Update is not shown again automatically
- Manual check still finds the update

### 8. Testing "Remind Me Later"

**Setup:**

1. Have an update notification visible

**Test:**

1. Click "Remind Me Later" button
2. Verify notification disappears
3. Wait for next auto-check interval
4. Verify notification reappears

**Expected Result:**

- Notification is temporarily dismissed
- Notification reappears on next check
- User preference is respected

## Creating Test Releases

### Stable Release

```bash
# Update version in package.json
npm version 1.4.0

# Create and push tag
git push origin v1.4.0
```

### Beta Release

```bash
# Update version in package.json
npm version 1.4.0-beta.1

# Create and push tag
git push origin v1.4.0-beta.1
```

### Dev Release

```bash
# Update version in package.json
npm version 1.4.0-dev.20260210

# Create and push tag
git push origin v1.4.0-dev.20260210
```

## Verifying GitHub Actions

1. Go to GitHub → Actions tab
2. Verify the build workflow is running
3. Check that both Linux and Windows builds complete
4. Verify the release is created with correct assets
5. Check that the changelog is properly extracted

## Testing Update URLs

The update service queries:

```
https://api.github.com/repos/loofi/Loofi-Veo-prompt-generator/releases
```

You can manually test this endpoint:

```bash
curl -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/loofi/Loofi-Veo-prompt-generator/releases
```

## Common Issues and Solutions

### Issue: Updates Not Detected

**Possible Causes:**

- No internet connection
- GitHub API rate limit exceeded
- Incorrect release channel selected
- No releases match the channel criteria

**Solution:**

- Check internet connection
- Wait for rate limit reset (1 hour)
- Verify release channel in settings
- Ensure releases are properly tagged

### Issue: Download Fails

**Possible Causes:**

- Insufficient disk space
- Firewall blocking download
- GitHub asset not available

**Solution:**

- Free up disk space
- Check firewall settings
- Verify asset exists in GitHub release

### Issue: Installation Fails

**Possible Causes:**

- App still running
- Insufficient permissions
- Corrupted download

**Solution:**

- Close all app instances
- Run with administrator privileges
- Re-download the update

## Automated Testing

For automated testing, you can use the update service API:

```typescript
import { updateService } from './services/updateService';

// Test update check
const status = await updateService.checkForUpdates();
console.log('Update available:', status.available);
console.log('Latest version:', status.latestVersion);

// Test configuration
updateService.updateConfig({
  channel: 'beta',
  autoCheck: true,
  checkInterval: 3600000,
});

// Subscribe to status changes
const unsubscribe = updateService.subscribe((status) => {
  console.log('Update status changed:', status);
});
```

## Checklist

Before releasing the update system to production, verify:

- [ ] Stable releases are detected correctly
- [ ] Beta releases are detected correctly
- [ ] Dev releases are detected correctly
- [ ] Channel switching works
- [ ] Auto-check functionality works
- [ ] Auto-download functionality works
- [ ] Manual download works
- [ ] Installation works (Electron)
- [ ] Update notifications display correctly
- [ ] Changelog is extracted properly
- [ ] Dismiss functionality works
- [ ] Remind later functionality works
- [ ] Settings persist across restarts
- [ ] No data loss during updates
- [ ] Error handling works correctly

## Performance Considerations

- Update checks should not block the UI
- Download progress should update smoothly
- Large downloads should not freeze the app
- Background checks should be throttled appropriately

## Security Considerations

- All downloads are from official GitHub Releases
- HTTPS-only connections
- Checksum verification (when implemented)
- No arbitrary code execution
- Secure IPC communication in Electron

## Next Steps

After successful testing:

1. Document any issues found
2. Create bug reports for failures
3. Update the USER_GUIDE.md with findings
4. Prepare release notes
5. Deploy to production

## Support

For issues or questions:

- GitHub Issues: Report bugs
- GitHub Discussions: Ask questions
- Documentation: AUTO_UPDATE.md

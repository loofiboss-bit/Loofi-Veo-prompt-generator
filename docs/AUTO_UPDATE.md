# Auto-Update System

## Overview

The Veo Prompt Generator includes a comprehensive auto-update system that automatically checks for new releases, downloads updates, and installs them with minimal user intervention.

## Features

### Release Channels

The application supports three release channels:

- **Stable** (Recommended): Production-ready releases that have been thoroughly tested
- **Beta**: Early access to new features before they reach stable
- **Dev**: Latest development builds with cutting-edge features (may be unstable)

### Auto-Update Capabilities

- **Automatic Update Detection**: Checks for updates in the background at configurable intervals
- **Smart Version Comparison**: Uses semantic versioning to determine if an update is available
- **Platform-Specific Downloads**: Automatically selects the correct installer for your operating system
- **Download Progress**: Real-time progress tracking during update downloads
- **Changelog Preview**: View what's new before installing an update
- **One-Click Installation**: Install and restart with a single click

## User Guide

### Configuring Auto-Updates

1. Open the Settings panel
2. Navigate to the "Updates" section
3. Configure your preferences:
   - **Release Channel**: Choose between Stable, Beta, or Dev
   - **Auto-Check**: Enable/disable automatic update checking
   - **Check Interval**: Set how often to check for updates (30 min - 24 hours)
   - **Auto-Download**: Automatically download updates when available
   - **Auto-Install**: Automatically install updates (requires restart)

### Manual Update Check

Click the "Check for Updates Now" button in the Update Settings panel to manually check for available updates.

### Update Notification

When an update is available, you'll see a notification in the top-right corner with:

- Version number and release type (Stable/Beta)
- Changelog preview
- Download progress (if downloading)
- Options to:
  - Download the update
  - Install and restart
  - Remind me later
  - Dismiss

## Developer Guide

### Update Service API

The update service is a singleton that manages all update-related operations:

```typescript
import { updateService } from './services/updateService';

// Initialize the service (done automatically on app mount)
updateService.initialize();

// Check for updates manually
const status = await updateService.checkForUpdates();

// Subscribe to update status changes
const unsubscribe = updateService.subscribe((status) => {
  console.log('Update status:', status);
});

// Update configuration
updateService.updateConfig({
  channel: 'beta',
  autoCheck: true,
  checkInterval: 3600000 // 1 hour
});

// Download an update
await updateService.downloadUpdate();

// Install an update (Electron only)
await updateService.installUpdate();

// Cleanup
updateService.destroy();
```

### Configuration Interface

```typescript
interface UpdateConfig {
  channel: 'stable' | 'beta' | 'dev';
  autoCheck: boolean;
  autoDownload: boolean;
  autoInstall: boolean;
  checkInterval: number; // milliseconds
  updateUrl: string;
}
```

### Update Status Interface

```typescript
interface UpdateStatus {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseInfo?: ReleaseInfo;
  downloading: boolean;
  downloadProgress: number;
  error?: string;
}
```

## Architecture

### Components

1. **UpdateService** (`services/updateService.ts`)
   - Core update logic
   - GitHub Releases API integration
   - Version comparison
   - Download management
   - Configuration persistence

2. **UpdateNotification** (`components/updates/UpdateNotification.tsx`)
   - Toast-style notification UI
   - Download progress display
   - Changelog preview
   - Action buttons

3. **UpdateSettings** (`components/updates/UpdateSettings.tsx`)
   - Settings panel UI
   - Channel selector
   - Auto-update configuration
   - Manual check button

4. **Electron Integration** (`electron/main.cjs`, `electron/preload.cjs`)
   - IPC handlers for download/install
   - Platform information
   - Secure context bridge

### Update Flow

1. **Check**: Service queries GitHub Releases API for latest version
2. **Compare**: Semantic version comparison determines if update is available
3. **Filter**: Releases are filtered by selected channel (stable/beta/dev)
4. **Detect**: Platform-specific asset is identified (AppImage, EXE, etc.)
5. **Notify**: User is notified via UpdateNotification component
6. **Download**: If user accepts, update is downloaded with progress tracking
7. **Install**: User can install and restart the application

### Platform Support

- **Linux**: AppImage files
- **Windows**: NSIS installers (.exe) and portable executables
- **macOS**: DMG files (future support)

## Security

- All downloads are from official GitHub Releases
- HTTPS-only connections
- Checksum verification (prepared for future implementation)
- Secure IPC communication in Electron
- Context isolation and preload scripts

## Future Enhancements

- [ ] Checksum verification for downloaded files
- [ ] Delta updates for smaller downloads
- [ ] Rollback mechanism if update fails
- [ ] Update scheduling (install on next launch)
- [ ] Crash reporting for beta builds
- [ ] Automatic rollback on crash after update
- [ ] Update notification badges
- [ ] Release notes with rich formatting

## Troubleshooting

### Updates Not Detected

- Check your internet connection
- Verify the release channel is correct
- Manually check for updates
- Check the browser console for errors

### Download Fails

- Ensure you have sufficient disk space
- Check your firewall settings
- Try downloading manually from GitHub Releases

### Installation Issues

- Ensure the application has write permissions
- Close all instances of the application
- Download and install manually if auto-install fails

## Related Files

- `services/updateService.ts` - Update service implementation
- `components/updates/UpdateNotification.tsx` - Notification UI
- `components/updates/UpdateSettings.tsx` - Settings UI
- `electron/main.cjs` - Electron IPC handlers
- `electron/preload.cjs` - Secure context bridge
- `vite-env.d.ts` - TypeScript declarations
- `vite.config.ts` - Version injection

## License

This update system is part of the Veo Prompt Generator and is licensed under the MIT License.

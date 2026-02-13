# Changelog

All notable changes to Veo Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0-beta.0] - 2026-02-13

### Added - v1.4.0 Week 4: Plugin Architecture Foundation (Completed)

- **Plugin State Filtering** - Robust plugin management
  - Studios now correctly hide when their parent plugin is disabled
  - `pluginService` tracks ownership of UI elements
  - Real-time UI updates on plugin toggle
- **Video Generation Studio Plugin** - Full refactor to plugin architecture
  - Decoupled from core using `useVideoStore` and `videoGenerationService`
  - Registered as internal plugin `video-studio`
  - Lifecycle hooks for clean startup and shutdown

### Changed - Maintenance & Quality

- Started the v1.5.0 execution pipeline and release tracking.
- Added `docs/V1.5.0_EXECUTION_PLAN.md` as the active implementation checklist.
- Captured baseline verification state (build and lint passing).
- Restored ESLint tooling with a new project-level `eslint.config.js`.
- Added required lint dependencies and re-enabled `npm run lint` as a working quality gate.
- Reduced lint warning backlog in first cleanup batch (`315 -> 237`) by removing unused imports/vars in core high-noise files.
- Hardened GitHub release workflows to be tag-driven and rerun-safe:
  - Beta releases now trigger only from `v*-beta*` tags.
  - Stable release job now excludes beta tags.
  - Release uploads now use overwrite behavior to prevent asset conflict failures on reruns.
- Added strict CI quality gates in workflows:
  - `npm run lint:ci` (`--max-warnings=0`)
  - `npm run typecheck`
  - `npm run test` (Vitest + jsdom)
- Updated documentation for release/CI policy to match current workflow behavior.
- Added `docs/V1.5.0_ACCEPTANCE_CHECKLIST.md` with sprint-level pass/fail criteria for Foundation, Performance, UX/Stability, and DevOps/Security.

## [1.5.0] - 2026-02-10 (In Progress)

### Added

- **Panel Error Boundaries (baseline)** - Studio and overlay failures are now isolated at panel level instead of collapsing the full app shell.
- **Performance Profiler Service (baseline)** - Added `performanceProfiler` for hydration and studio-open latency measurements with structured log output.
- **v1.5.0 Workflow Plan** - Added sprint-level implementation plan at `.agent/workflows/v1.5.0-performance-stability.md`.
- **Electron Safe Mode (baseline)** - Added crash-loop and manual (`--safe-mode`) detection path with renderer-visible status for stability-first startup.

### Changed

- **Studio Opening Path** - Added studio-open timing marks in modal/studio orchestration for initial performance baseline.
- **Lazy Overlay Loading** - Global Search, Variables, and New Project Wizard now lazy-load only when opened.
- **Studio Loading UX** - Replaced blocking backdrops with structured loading skeletons for heavy studios.
- **Safe Mode UX** - Added safe-mode notice in Settings and temporary blocking of heavy studios when safe mode is active.

## [1.1.0] - 2026-02-09

### Added

- **Centralized Settings Store** - Persistent settings system with IndexedDB storage
  - Auto-save configuration
  - API settings management
  - UI preferences (tooltips, compact mode)
  - Performance settings
  - Export preferences
  - Privacy controls
- **Structured Logging System** - Comprehensive logging service with multiple log levels
  - Console output with appropriate styling
  - In-memory log buffering (last 1000 entries)
  - File output for errors in Electron
  - Log export functionality
  - Configurable log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- **Enhanced Error Handling** - Integrated logging into error handler
  - Automatic error logging with context
  - Improved error categorization
  - Better error messages for users
- **CI/CD Pipeline** - Automated build and release system
  - GitHub Actions workflow for Linux and Windows builds
  - Automatic artifact upload to releases
  - Release notes extraction from CHANGELOG
- **Documentation** - Comprehensive project documentation
  - CHANGELOG.md with full version history
  - CONTRIBUTING.md with development guidelines
  - LICENSE file (MIT)
  - Issue templates (bug report, feature request)
  - Pull request template
  - Workflow documentation
- **Project Structure** - Improved organization
  - `.github` directory with templates and workflows
  - `.agent/workflows` for development workflows
  - Better separation of concerns

### Changed

- **Version Scheme** - Switched to semantic versioning starting from 1.1.0
  - Previous version 3.5.0 represents pre-roadmap state
  - All future versions follow strict semver
- **State Management** - Enhanced Zustand store architecture
  - Persistent settings separated from app state
  - Better state hydration/dehydration
- **Error Logging** - All errors now logged with appropriate context
  - Network and service errors logged as warnings
  - Critical errors logged with full stack traces

### Fixed

- Improved error handling throughout the application
- Better TypeScript type safety in error handling
- Consistent logging across all services

### Documentation

- Complete CHANGELOG with historical changes
- Development guidelines in CONTRIBUTING.md
- Issue and PR templates for better collaboration
- CI/CD documentation in workflow files

## [1.4.0] - 2026-02-10

### Added - v1.4.0 Week 5: Auto-Update System + Release Channels

- **Auto-Update Service** - Automatic update detection and installation
  - GitHub Releases API integration for update checking
  - Semantic version comparison for update detection
  - Platform-specific asset detection (Linux AppImage, Windows EXE)
  - Download progress tracking with real-time updates
  - Configurable auto-check intervals (30 minutes to 24 hours)
  - Update notification system with subscription pattern
  - LocalStorage persistence for user preferences
  - Background update downloads
  - Install and restart functionality
- **Release Channel System** - Multi-channel release management
  - Stable channel for production-ready releases
  - Beta channel for early access to new features
  - Dev channel for latest development builds
  - Channel-specific update filtering
  - Channel switcher in settings
  - Pre-release detection and tagging
- **Update UI Components** - User-friendly update management
  - UpdateNotification component with toast-style notifications
  - Download progress indicator with percentage
  - Changelog preview in notification
  - "Remind Me Later" and "Install Now" options
  - UpdateSettings panel with comprehensive controls
  - Release channel selector with descriptions
  - Auto-check, auto-download, and auto-install toggles
  - Manual "Check for Updates" button
  - Last check timestamp display
- **Electron Integration** - Desktop app update support
  - IPC handlers for download and install operations
  - Download manager with progress reporting
  - Platform information exposure (OS, architecture, version)
  - Secure context bridge with preload script
  - Install and restart functionality
  - Background download support
- **Configuration & Types** - TypeScript support and environment setup
  - Vite environment variable declarations
  - Electron API interface definitions
  - App version injection from package.json
  - Comprehensive type safety for update system
  - UpdateConfig, ReleaseInfo, and UpdateStatus interfaces

### Changed

- **Vite Configuration** - Enhanced build configuration
  - Inject app version from package.json into environment
  - Version available at `import.meta.env.VITE_APP_VERSION`
- **Electron Main Process** - Enhanced with update capabilities
  - Added IPC handlers for update operations
  - Download manager with progress events
  - Platform information API
  - Preload script for secure renderer communication
- **App Integration** - Update system initialization
  - UpdateNotification component rendered at app root
  - Update service initialized on app mount
  - Cleanup on app unmount

### Technical

- **Services Added**:
  - `updateService.ts` - Update detection, download, and installation
- **Components Added**:
  - `components/updates/UpdateNotification.tsx` - Update notification UI
  - `components/updates/UpdateSettings.tsx` - Update settings panel
- **Electron Files Added**:
  - `electron/preload.cjs` - Secure context bridge for updates
- **Types Added**:
  - `vite-env.d.ts` - Vite and Electron API type declarations
- **Configuration Updated**:
  - `vite.config.ts` - Version injection and environment setup
  - `electron/main.cjs` - IPC handlers and download manager
- **Features**:
  - Multi-channel release support (stable/beta/dev)
  - Automatic update detection and notification
  - Download progress tracking
  - One-click install and restart
  - Configurable auto-update behavior
  - Platform-specific installer detection
  - Changelog preview before update
  - User-controlled update preferences

### Documentation

- Created Week 5 implementation summary
- Documented update service API
- Added update flow documentation
- Documented release channel system

### Added - v1.4.0 Week 4: Plugin Architecture Foundation

- **Plugin System Core** - Extensible plugin architecture
  - Plugin manifest schema (JSON) with metadata, permissions, and extension points
  - Plugin lifecycle management (load, unload, activate, deactivate)
  - Plugin state tracking (unloaded, loaded, active, inactive, error)
  - Plugin versioning and engine compatibility checks
  - Plugin dependency management
  - Comprehensive TypeScript type definitions for plugin development
- **Plugin Permission System** - Granular permission control
  - 15+ permission types for fine-grained access control
  - Storage permissions (read, write, full access)
  - Data permissions (projects, history, templates - read/write)
  - UI permissions (sidebar, toolbar, modal registration)
  - Event permissions (subscribe, publish)
  - Export permissions for custom formats
  - Permission validation before API access
  - Permission caching for performance
- **Plugin API** - Rich API for plugin developers
  - UI API: Register sidebar items, toolbar buttons, and modals
  - Data API: Access projects, history, and templates
  - Export API: Register custom export formats
  - Settings API: Plugin-specific configuration management
  - Storage API: Isolated plugin data storage with IndexedDB
  - Events API: Subscribe and publish application events
  - Logger API: Structured logging for plugins
  - Notification API: Show user notifications
- **Plugin Manager UI** - User-friendly plugin management
  - Plugin list with state indicators (active, inactive, error)
  - Plugin details view with metadata and permissions
  - Install plugin from manifest JSON
  - Activate/deactivate plugins with one click
  - Uninstall plugins with confirmation
  - Plugin settings configuration
  - Extension points visualization
  - Error display for failed plugins
  - Responsive design for all screen sizes
- **Plugin Storage** - Isolated data storage
  - IndexedDB-based storage per plugin
  - Namespaced keys to prevent conflicts
  - Full CRUD operations (get, set, delete, clear, keys)
  - Permission-based access control
  - Persistent storage across sessions
- **Plugin Events** - Event-driven architecture
  - Subscribe to application events
  - Publish custom plugin events
  - Event handler registration and cleanup
  - Error handling in event handlers
  - Permission-based event access
- **Example Plugins** - Reference implementations
  - Hello World plugin - Basic structure and lifecycle
  - Markdown Export plugin - Custom export format
  - Prompt Enhancer plugin - Data access and UI integration
  - Complete manifest examples with all features
- **Plugin Development Documentation** - Comprehensive guide
  - Plugin structure and manifest schema
  - Permission system documentation
  - API reference with code examples
  - Lifecycle hooks explanation
  - Best practices and security considerations
  - Example plugins with step-by-step tutorials
  - Publishing guidelines (coming soon)
- **Sidebar Integration** - Plugin access in navigation
  - Plugins menu item in sidebar
  - Quick access to Plugin Manager
  - Plugin count badge (future enhancement)

### Changed

- **Sidebar Component** - Added Plugins navigation item
  - New `onOpenPlugins` prop for plugin manager access
  - Plugins menu item between Templates and Storyboard
  - Puzzle icon for plugins
- **Type System** - New plugin type definitions
  - `types/plugin.ts` with comprehensive interfaces
  - Plugin manifest, context, API, and registry types
  - Extension point and permission type definitions

### Technical

- **Services Added**:
  - `pluginService.ts` - Plugin lifecycle and API management
- **Stores Added**:
  - `pluginStore.ts` - Plugin state management with Zustand
- **Components Added**:
  - `PluginManager.tsx` - Plugin management UI
  - `InstallPluginModal.tsx` - Plugin installation dialog
- **Types Added**:
  - `types/plugin.ts` - Plugin system type definitions
- **Examples Added**:
  - `examples/plugins/hello-world/` - Basic plugin example
  - `examples/plugins/markdown-export/` - Export format plugin
  - `examples/plugins/prompt-enhancer/` - Advanced plugin example
- **Documentation Added**:
  - `docs/PLUGIN_DEVELOPMENT.md` - Plugin development guide
  - `examples/plugins/README.md` - Example plugins overview
- **Features**:
  - Plugin loading and lifecycle management
  - Permission-based API access
  - Isolated plugin storage
  - Event-driven plugin communication
  - Plugin settings management
  - Extension point system
  - Plugin Manager UI
  - Example plugins for reference

### Documentation

- Created comprehensive plugin development guide
- Documented plugin manifest schema
- Added API reference with examples
- Documented permission system
- Added best practices and security guidelines
- Created example plugins with documentation

### Added - v1.4.0 Week 3: Accessibility Improvements

- **Keyboard Navigation System** - Full keyboard navigation support
  - Custom hooks for keyboard event handling (`useKeyboardNavigation`)
  - Focus trap implementation for modals and dialogs (`useFocusTrap`)
  - Roving tabindex navigation for lists and menus (`useRovingTabIndex`)
  - Tab/Shift+Tab navigation throughout the application
  - Escape key to close modals and dialogs
  - Enter/Space to activate buttons and controls
  - Arrow key navigation for interactive elements
- **Skip Links** - Accessibility navigation shortcuts
  - "Skip to main content" link for keyboard users
  - Visible on focus with smooth scroll behavior
  - Positioned at top of page for immediate access
- **Screen Reader Support** - Comprehensive ARIA implementation
  - ARIA labels for all interactive elements
  - ARIA live regions for dynamic content announcements
  - ARIA descriptions for complex components
  - Proper heading hierarchy (h1 → h2 → h3)
  - Screen reader-only text for context (`.sr-only` class)
  - ARIA utilities for managing accessibility attributes
  - Announcement system for user actions and state changes
- **Accessibility Context** - Global accessibility settings management
  - Reduced motion preference detection and control
  - High contrast mode with enhanced color contrast
  - Font size adjustment (75% to 200%)
  - Screen reader announcement toggle
  - Keyboard navigation enable/disable
  - Focus indicator visibility control
  - System preference detection (prefers-reduced-motion, prefers-contrast)
  - Persistent settings in localStorage
- **Accessibility Settings Panel** - User-facing accessibility controls
  - Comprehensive settings UI for all accessibility options
  - Real-time preview of accessibility changes
  - Reset to defaults functionality
  - Keyboard shortcuts reference guide
  - Screen reader announcements for setting changes
  - Responsive design for all screen sizes
- **WCAG 2.1 AA Compliance** - Color contrast and visual accessibility
  - Color contrast ratios: 4.5:1 for normal text, 3:1 for large text
  - WCAG AA compliant color palette for light and dark themes
  - Primary colors: Blue (#2563eb - 4.54:1 on white)
  - Semantic colors: Success (#059669), Error (#dc2626), Warning (#d97706)
  - Text colors with proper contrast ratios (15.3:1 to 3.54:1)
  - High contrast mode with black/white color scheme
  - Focus indicators with 3px amber outline (#fbbf24)
  - Minimum touch target size (44x44px) for interactive elements
- **Reduced Motion Support** - Respect user motion preferences
  - CSS class for reduced motion (`.reduced-motion`)
  - Media query support for `prefers-reduced-motion`
  - Disabled animations and transitions when enabled
  - Smooth scroll behavior override
  - Animation duration reduced to 0.01ms
- **Focus Management** - Enhanced focus indicators
  - Visible focus outlines (3px solid with 2px offset)
  - Focus-visible pseudo-class support
  - Custom focus color (amber #fbbf24)
  - Focus trap for modals and dialogs
  - Focus restoration after modal close
  - Keyboard navigation active state
- **ARIA Utilities** - Helper functions for accessibility
  - `generateAriaId()` - Generate unique ARIA IDs
  - `announceToScreenReader()` - Announce messages to screen readers
  - `setAriaExpanded()`, `setAriaPressed()`, `setAriaSelected()` - State management
  - `createLiveRegion()`, `updateLiveRegion()` - Live region management
  - `getFocusableElements()` - Query focusable elements
  - `trapFocus()` - Implement focus trapping
  - `createFocusRestorer()` - Restore focus after interactions
  - User preference detection (reduced motion, high contrast, dark mode)
- **Accessibility Styles** - Global WCAG-compliant CSS
  - Screen reader-only utility class (`.sr-only`)
  - Focus-visible styles for keyboard navigation
  - High contrast mode styles
  - Reduced motion styles
  - Accessible form input styles with clear states
  - Error and success message styles with icons
  - Loading state indicators
  - Accessible tooltip styles
  - Modal/dialog accessibility styles
  - Print styles for accessible printing

### Changed

- **App Integration** - Wrapped app with AccessibilityProvider
  - Accessibility context available throughout the application
  - Global accessibility styles imported
  - System preferences automatically detected on load
- **Index.tsx** - Updated app providers
  - Added AccessibilityProvider wrapper
  - Imported accessibility.css for global styles
  - Proper provider nesting (Accessibility → Onboarding → App)

### Technical

- **Components Added**:
  - `src/components/accessibility/SkipLink.tsx` - Skip to main content link
  - `src/components/accessibility/AccessibilitySettings.tsx` - Settings panel
  - `src/components/accessibility/index.ts` - Barrel export
- **Contexts Added**:
  - `src/contexts/AccessibilityContext.tsx` - Global accessibility state
- **Hooks Added**:
  - `src/hooks/useKeyboardNavigation.ts` - Keyboard navigation utilities
- **Utilities Added**:
  - `src/utils/ariaUtils.ts` - ARIA helper functions
- **Styles Added**:
  - `src/styles/accessibility.css` - WCAG 2.1 AA compliant styles
- **Features**:
  - Full keyboard navigation support
  - Screen reader compatibility
  - WCAG 2.1 AA color contrast compliance
  - Reduced motion support
  - High contrast mode
  - Adjustable font sizes
  - Focus management and trapping
  - ARIA live regions for announcements

### Documentation

- Updated CHANGELOG with v1.4.0 Week 3 features
- Accessibility utilities documented in code
- ARIA patterns and best practices implemented
- Keyboard shortcuts documented in settings panel

### Added - v1.4.0 Week 2: Onboarding Flow

- **Welcome Screen** - First-time user onboarding experience
  - Welcome modal on first launch with product highlights
  - Feature showcase with 4 key capabilities (Projects, Templates, Export, History)
  - Animated logo and gradient design
  - "Take the Tour" and "Skip for Now" options
  - Onboarding completion tracking in localStorage
  - Responsive design for mobile and desktop
- **Interactive Tutorial System** - Step-by-step guided tour
  - 6-step tutorial overlay with spotlight highlighting
  - Contextual tooltips positioned around target elements
  - Progress indicator showing current step (e.g., "Step 2 of 6")
  - Visual progress bar with gradient fill
  - Navigation controls (Previous, Next, Skip Tour, Finish)
  - Smooth animations and transitions
  - Backdrop with blur effect and spotlight cutout
  - Arrow indicators pointing to highlighted elements
  - Tutorial steps cover: Welcome, Create Project, Generate Prompt, Templates, Export, Advanced Features
  - Restart tutorial functionality from Help Panel
- **Help Panel** - Comprehensive help center
  - Searchable help topics with fuzzy search
  - Category-based organization (Getting Started, Features, Advanced, Troubleshooting)
  - Topic detail view with formatted content
  - Keyboard shortcuts reference
  - FAQ section
  - Direct topic/category navigation support
  - "Restart Tutorial" button in footer
  - Link to external documentation
  - Smooth slide-in animation from right
  - ESC key to close
  - Responsive design for all screen sizes
- **Contextual Help System** - Inline help throughout the UI
  - Context-aware help buttons (? icon) in prompt builder sections
  - Tooltip-based help with "Learn more" action
  - Integration with Help Panel for deep-dive topics
  - Help triggers on Prompt Idea and Reference Image inputs
  - Consistent styling and placement
  - Support for both tooltip and help panel navigation
- **Onboarding Context** - State management for onboarding flow
  - React Context API for global onboarding state
  - Persistent state in localStorage
  - Tutorial step tracking and navigation
  - Welcome screen shown/hidden state
  - Tutorial completion tracking
  - `startTutorial()`, `nextStep()`, `previousStep()`, `skipTutorial()` actions
  - `completeTutorial()`, `resetOnboarding()`, `restartTutorial()` methods
  - `setWelcomeShown()` and `goToStep()` utilities
  - Timestamp tracking for analytics
- **Keyboard Shortcuts for Help** - Quick access to help
  - `?` key opens Help Panel
  - `F1` key opens Help Panel
  - Global keyboard event handling
  - Help button in floating action buttons (bottom-left)

### Changed

- **Header Component** - Enhanced with tutorial integration
  - "Start Tutorial" button now connected to OnboardingContext
  - Proper tutorial restart functionality
- **ImageUploadInput Component** - Enhanced label support
  - Labels now support React nodes (not just strings)
  - Enables contextual help integration in labels
  - Improved TypeScript typing
- **App Layout** - Integrated onboarding components
  - WelcomeModal rendered at app root
  - TutorialOverlay rendered with portal
  - HelpPanel with topic/category support
  - Floating help button in bottom-left corner
  - Help panel state management with topic/category routing

### Technical

- **Components Added**:
  - `src/components/onboarding/WelcomeModal.tsx` - Welcome screen
  - `src/components/onboarding/TutorialOverlay.tsx` - Tutorial overlay
  - `src/components/onboarding/index.ts` - Barrel export
  - `src/components/help/HelpPanel.tsx` - Help center panel
  - `src/components/help/ContextualHelp.tsx` - Inline help buttons
  - `src/components/help/index.ts` - Barrel export
- **Contexts Added**:
  - `src/contexts/OnboardingContext.tsx` - Onboarding state management
- **Data Files Added**:
  - `src/data/tutorialSteps.ts` - Tutorial step definitions
  - `src/data/helpContent.ts` - Help topics and categories
- **Utilities Added**:
  - Tutorial step navigation logic
  - Help search with fuzzy matching
  - Category-based topic filtering
- **Styling**:
  - CSS custom properties for theming
  - Smooth animations and transitions
  - Responsive breakpoints for mobile
  - Gradient backgrounds and glassmorphism effects
  - Accessible focus states and hover effects

### Documentation

- Updated CHANGELOG with v1.4.0 Week 2 features
- Tutorial steps documented in code
- Help content structured and searchable
- Component props and interfaces documented

### Added - v1.4.0 Performance Optimization

- **Performance Optimization** - Code splitting and lazy loading for heavy studio components
  - Vite rollupOptions with manual chunk splitting (vendor, state bundles)
  - React.lazy() for heavy studio and modal components
  - Suspense fallback component for graceful loading states
  - Reduced initial bundle size through deferred loading

## [1.3.0] - 2026-02-23

### Added

- **Prompt History System** - Complete history tracking with IndexedDB storage
  - Automatic history capture on prompt generation with full metadata
  - History search and filtering by date, tags, favorites, and project
  - Favorite prompts feature with toggle
  - Tag management for history entries
  - History statistics dashboard (total entries, favorites, projects)
  - Export history to JSON or CSV
  - Import history from JSON
  - History cleanup with configurable max entries (1000)
  - Project-based history organization
- **Diff Comparison** - Side-by-side prompt comparison
  - Visual diff highlighting for text changes
  - Compare any two prompts from history
  - Restore from history functionality
  - Show changes in prompt structure (style, camera, scene, etc.)
  - Syntax highlighting for better readability
- **Project-Based Organization** - Multi-project workspace management
  - Create, edit, and delete projects
  - Project metadata (name, description, tags, status)
  - Project archiving and unarchiving
  - Project duplication with new name
  - Project search functionality with fuzzy matching
  - Default project auto-creation on first run
  - Project-specific history and settings
  - Recent projects tracking
- **Lightweight Local Database** - Enhanced IndexedDB architecture
  - Centralized database service with singleton pattern
  - Database migrations system with version tracking
  - Automatic schema upgrades
  - Database backup/restore functionality
  - Database size monitoring with storage API
  - Database health checks
  - Cleanup utilities for old entries
  - Export/import database to JSON
- **Structured API Export Mode** - API-ready export formats
  - JSON-API compliant format
  - cURL command generation
  - Code snippet generation (Python, JavaScript, TypeScript)
  - Batch export for multiple prompts
  - Export validation
  - Copy to clipboard functionality
- **Sidebar Navigation** - Improved navigation UX
  - Collapsible sidebar with smooth animations
  - Main navigation sections (Prompt Builder, History, Projects, Templates, Settings)
  - Active state highlighting
  - Responsive layout with sidebar offset
  - Quick access to key features
  - Project name display in sidebar
- **Global Search Service** - Fuzzy search across all content
  - Search across history and projects
  - Intelligent similarity scoring with multiple algorithms
  - Character-level and word-level matching
  - Search suggestions based on recent queries
  - Configurable search options (types, limit, threshold)
  - Result ranking by relevance score
- **Zustand State Management** - Dedicated stores for new features
  - `useProjectStore` - Project state management with persistence
  - `useHistoryStore` - History state management with filtering
  - Automatic initialization on app startup
  - Error handling with user notifications
- **Auto-Save Integration** - Seamless history tracking
  - Automatic save to history after prompt generation
  - Full metadata capture (style, camera, scene, character, audio)
  - Project association for all history entries
  - Background saving without UI blocking

### Changed

- Enhanced state management with project isolation
- Improved database performance with IndexedDB indexes
- Better error handling throughout new services
- Optimized queries for large datasets
- Main layout adjusted for sidebar navigation
- Database initialization moved to app startup

### Technical

- **Services Added**:
  - `historyService.ts` - History CRUD operations
  - `diffService.ts` - Text diff comparison
  - `projectService.ts` - Project management
  - `databaseService.ts` - Database abstraction layer
  - `apiExportService.ts` - API export utilities
  - `searchService.ts` - Global fuzzy search
- **Components Added**:
  - `HistoryPanel.tsx` - History browser with filters
  - `DiffViewer.tsx` - Side-by-side diff comparison
  - `ProjectManager.tsx` - Project CRUD interface
  - `Sidebar.tsx` - Navigation sidebar
  - `ApiExportModal.tsx` - API export dialog
- **Stores Added**:
  - `useProjectStore.ts` - Project state with IndexedDB
  - `useHistoryStore.ts` - History state with filtering
- **Icons Added**:
  - `code`, `document`, `menu` icons for new features

### Documentation

- Updated README with v1.3.0 features
- Added project management documentation
- Added history system guide
- Added API export documentation
- Updated progress tracking documents

## [1.2.0] - 2026-02-09

### Added

- **Template System** - Save, manage, and reuse prompt configurations
  - Create custom templates from current prompt state
  - Template library with search and filtering
  - Template categories and tags
  - Import/export templates as JSON
  - Duplicate and edit existing templates
  - Built-in starter templates (Cinematic, Documentary, Music Video, etc.)
- **Variable Placeholders** - Dynamic variables in prompts with auto-fill
  - Variable syntax: `{{variable_name}}` or `{{variable_name:default_value}}`
  - Built-in variables for character, location, time, camera, and style
  - Custom variable creation
  - Variable autocomplete suggestions
  - Variable validation and error handling
  - Variable import/export
- **Preset Management** - Reusable preset configurations
  - Preset categories (Camera, Lighting, Style, Character, Environment, Audio, Effects, Workflow)
  - 10+ built-in presets (Cinematic Camera, Golden Hour, Film Noir, etc.)
  - Preset favorites and recent tracking
  - Quick-apply preset buttons
  - Preset import/export
  - Preset versioning
- **Autosave & Recovery** - Automatic saving and crash recovery
  - Periodic autosave with configurable interval
  - Crash detection on startup
  - Recovery prompt with snapshot selection
  - Autosave history (last 5 versions)
  - Manual save points
  - Autosave indicator in UI
  - Force autosave option
- **Keyboard Shortcuts** - Comprehensive shortcut system
  - 20+ default shortcuts for common actions
  - Customizable shortcut keys
  - Shortcut conflict detection
  - Context-aware shortcuts
  - Shortcut help overlay (`?` key)
  - Import/export shortcut profiles
  - Enable/disable shortcuts globally
- **Enhanced Export** - Improved export with retry logic and multiple formats
  - Export queue with progress tracking
  - Retry logic with exponential backoff
  - Multiple formats: JSON, TXT, PDF, CSV, Markdown, XML, ZIP
  - Export validation
  - Batch export operations
  - Export history
  - Quick export for single files
- **GitHub Issue Templates** - Standardized community contributions
  - Bug report template with severity levels
  - Feature request template with priority
  - Documentation request template
  - Issue template configuration

### Changed

- Improved export reliability with queue system
- Enhanced error handling in all new services
- Better TypeScript type safety throughout

### Documentation

- Updated README with v1.2.0 features
- Added template system documentation
- Added preset management guide
- Added keyboard shortcuts reference
- Updated CONTRIBUTING.md with issue template usage

## [3.5.0] - 2026-02-09

### Added

- Windows build configuration
- Standalone desktop app with Electron
- Magic Mask feature with blocking generation
- Film emulation and B-roll generation
- "Takes" system for prompt variations
- Razor tool for splitting clips
- Global style lock with unlock icons
- Undo/redo functionality with modular effects
- Image-to-video bridging support
- Camera effects and frame extraction
- Visual DNA and Identity Lock features
- Script Studio functionality
- Text track type and caption support
- AI scene analysis and semantic search
- Chroma key effect and B-roll suggestions
- AI agent for storyboard control
- Lyric-to-video and audio visualizer features
- New Project Wizard
- Suno Music Studio integration
- Motion configuration for video clips
- Variables panel
- AI-powered director agent (chatbot)
- Color grading and ambience audio generation
- Scene bridging functionality
- Text overlay functionality
- Script doctor and title card generation
- Collaborative editing with Yjs
- Table read functionality
- Imagen inpainting and StyleTuner
- Location management features
- Concept image generation and video critique
- Asset library with keyboard shortcuts
- Video take switching and filtering
- SFX generation and EDL export
- FFmpeg video export
- Project management functionality
- Character Bank
- Batch video generation
- Visual DNA feature
- History panel with date filtering
- Video generation functionality
- Camera and action suggestions
- Copy to clipboard for prompt output
- Concept art generation support
- Global hotkeys
- Prompt variations and model comparison
- Audio upload and mix controls
- Tooltips and UI string integration
- Sora emulation optimization options
- Character cameo functionality
- Interactive tutorial
- Tabbed interface for prompt generation
- Sound effects intensity control
- Prompt refinement functionality
- Character action suggestions
- Custom preset functionality
- Advanced scene and character modifiers
- Sensory details and character nuances suggestions
- History feature
- Theme switching and light theme support
- Target model selection (Veo, Sora)
- Local state persistence
- Audio suggestions
- Image upload for Veo prompts
- Character detail suggestions
- Art style suggestions
- Skin tone and clothing validation
- Character mood and pose options
- Storyboard generation
- Series generation with placeholder support
- Suno AI song generation
- Image studio feature
- Save to history functionality
- Variations generation
- Character archetype selection
- Model selection for prompt generation
- Real-time sync and toast notifications

### Changed

- Refactored timeline and clip data structure
- Improved Suno generation and UI
- Enhanced song generation error handling
- Improved layout and responsiveness of tabs
- Consolidated character bank to Zustand store
- Improved error handling throughout the application
- Enhanced UI animations and visual feedback
- Updated README and USER_GUIDE for Veo Studio rebrand
- Improved prompt generation with validation
- Enhanced input validation and error handling
- Improved UI and added more generation options
- Updated dependencies

### Fixed

- SunoSongStudio empty lyrics handling
- UI layout and responsiveness issues
- Error handling and user feedback
- Download button error handling
- Various minor bugs and improvements

### Removed

- Unused semantic search code
- Deprecated Webpack CI workflow
- Voice assistant functionality (temporarily)
- Unused AI suggestion states and services

## [1.0.0] - Initial Release

### Added

- Initial Veo Prompt Generator project
- Basic prompt generation functionality
- Core UI components
- Gemini API integration
- Basic video analysis functionality

---

**Note:** Version 3.5.0 represents the state before the structured roadmap implementation. Starting with v1.1.0, we follow strict semantic versioning and release discipline.

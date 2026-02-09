# Changelog

All notable changes to Veo Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

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

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

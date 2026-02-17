# Productivity Skills

## Focus Mode

- **Distraction-free editing** — Hide sidebars, toolbars, and non-essential panels
- **Zen mode** — Full-screen single-panel editing experience
- **Auto-hide** — Panels auto-hide after inactivity period
- **Keyboard shortcut** — Toggle with Ctrl+Shift+F or configurable shortcut

**Status:** Planned — not yet implemented

## Command Palette

- **Quick actions** — Ctrl+K searchable command interface
- **Fuzzy search** — Find commands, files, actions by typing partial names
- **Recent commands** — Quick access to recently used commands
- **Keyboard-first** — Full keyboard navigation without mouse

**Services:** `keyboardShortcutManager.ts`

## Prompt Style Presets

- **Quick-switch presets** — Cinematic, Anime, Documentary, Commercial, Music Video
- **Custom presets** — Save current prompt settings as named preset
- **Preset import/export** — Share presets as JSON files
- **Auto-activation** — Apply presets based on project type

**Services:** `presetManager.ts`

## Workspace Snapshots

- **State capture** — Save entire workspace state (open panels, timeline position, active tools)
- **Quick restore** — Instantly restore a saved workspace configuration
- **Named workspaces** — Multiple named workspace layouts
- **Auto-save workspace** — Periodically save workspace state

**Services:** `workspaceService.ts`
**Store:** `useWorkspaceStore`

**Status:** Partially implemented — project bundle exists, workspace snapshots planned

## Experience Level System

- **Beginner mode** — Simplified UI showing only essential features
- **Intermediate mode** — Standard feature set for experienced users
- **Advanced mode** — Full feature set including experimental tools
- **Guided tooltips** — Contextual help based on experience level

**Status:** Planned — not yet implemented

## Guided Tour

- **First-run wizard** — Step-by-step introduction to the application
- **Spotlight overlay** — Highlight key UI areas with explanations
- **Interactive tutorials** — Guided prompt-building exercises
- **Progress tracking** — Track user's tutorial completion

**Features:** `src/features/onboarding/`
**Status:** Partially implemented — onboarding feature exists

## Favorites & Quick Actions

- **Pin favorites** — Pin frequently used prompts, templates, and tools
- **Quick action bar** — Customizable shortcut buttons in toolbar
- **Recent items** — Quick access to recently edited projects and prompts

## Keyboard Shortcuts

- **Comprehensive shortcuts** — Full keyboard shortcut map for all actions
- **Customizable bindings** — Remap shortcuts to personal preferences
- **Shortcut overlay** — Visual shortcut reference (Ctrl+/)
- **Vim mode** — Optional vim-style keyboard navigation

**Services:** `keyboardShortcutManager.ts`

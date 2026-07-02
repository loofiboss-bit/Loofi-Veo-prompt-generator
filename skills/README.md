# Loofi Flow/Veo Studio — Skills Reference

> Complete catalog of all application capabilities organized by category.
> For AI coding agents working on this codebase.

## Categories

| Category                                        | Skill File   | Description                                                      |
| ----------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| [Prompt & Generation](prompt-generation.md)     | 12 skills    | Prompt building, scoring, batch generation, AI models            |
| [Timeline & Storyboard](timeline-storyboard.md) | 10 skills    | Multi-track timeline, clips, transitions, storyboard             |
| [AI & Voice](ai-voice.md)                       | 8 skills     | Gemini integration, voice-to-prompt, context RAG, style transfer |
| [Export & Rendering](export-rendering.md)       | 7 skills     | FFmpeg.wasm, export profiles, format conversion                  |
| [Collaboration](collaboration.md)               | 6 skills     | Yjs CRDT, WebRTC multiplayer, comments, presence                 |
| [Plugin System](plugins.md)                     | 6 skills     | Plugin API, marketplace, sandbox, analytics                      |
| [Studios](studios.md)                           | 8 skills     | Motion brush, inpainting, color grading, VFX                     |
| [Productivity](productivity.md)                 | 8 skills     | Focus mode, presets, profiles, command palette, workspace        |
| [Automation & Agents](automation-agents.md)     | 6 skills     | Job queue, batch ops, render agents, event bus                   |
| [Storage & Project](storage-project.md)         | 7 skills     | IndexedDB, project bundles, autosave, history                    |
| [Performance](performance.md)                   | 5 skills     | Profiling, lazy loading, worker threads, caching                 |
| [CLI](cli.md)                                   | 15+ commands | CLI mode reference                                               |
| [Desktop & Electron](desktop-electron.md)       | 6 skills     | Electron IPC, native menus, auto-update, tray                    |

## Quick Stats

- **~79 singleton services** in `src/core/services/`
- **~22 Zustand stores** in `src/core/store/`
- **16 feature modules** in `src/features/`
- **20+ shared hooks** in `src/shared/hooks/`
- **Full CLI** in `src/cli/`

## Agent Skills (IDE/CLI)

Skills for AI coding agents are documented in:

| Tool        | Location             | Skills                                                         |
| ----------- | -------------------- | -------------------------------------------------------------- |
| Claude Code | `.claude/skills/`    | new-feature, verify, refactor                                  |
| Codex       | `.codex/skills/`     | plan, design, implement, test, validate, doc, release, package |
| Copilot CLI | `.copilot/`          | Custom agents via mcp-config.json                              |
| All Agents  | `.ai/AGENT_SPECS.md` | 7 agent definitions with tier routing                          |

# Veo Studio — Practical User Guide

**Version 4.4.1** | _A hands-on guide to every feature — quick enough to scan, detailed enough to learn from._

> 🔗 **Companion guides**: For the exhaustive reference see [USER_GUIDE.md](../USER_GUIDE.md). For task-oriented workflows see the [Wiki User Guide](../wiki/App-User-Guide.md).

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Features](#core-features)
3. [Studios](#studios)
4. [AI-Powered Tools](#ai-powered-tools)
5. [Director's Chain (Autonomous Pipeline)](#directors-chain-autonomous-pipeline)
6. [Post-Production & Timeline](#post-production--timeline)
7. [Visual Composer](#visual-composer)
8. [Asset Management](#asset-management)
9. [Collaboration](#collaboration)
10. [Export & Delivery](#export--delivery)
11. [Plugin System & Marketplace](#plugin-system--marketplace)
12. [Batch Generation & Automation](#batch-generation--automation)
13. [Prompt History & Templates](#prompt-history--templates)
14. [CLI Mode](#cli-mode)
15. [Keyboard Shortcuts](#keyboard-shortcuts)
16. [Settings & Configuration](#settings--configuration)
17. [Diagnostics & Performance](#diagnostics--performance)
18. [Troubleshooting](#troubleshooting)
19. [Additional Resources](#additional-resources)

---

## Getting Started

### Installation

**Desktop Application** (Recommended):

1. Download the latest release from [GitHub Releases](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator/releases)
2. Install for your platform:
   - **Linux**: Make the AppImage executable with `chmod +x` and run it
   - **Windows**: Run the installer `.exe`
   - **macOS**: Coming soon
3. Launch the application

**Web Application (Development)**:

```bash
git clone https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install
npm run dev        # opens http://localhost:8080
```

### First Launch

1. **API Key Setup**: Click the 🔑 button (bottom-left). Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey). The key is stored locally in IndexedDB and is never transmitted to any third-party server.

2. **Onboarding Tutorial**: An interactive 6-step tour highlights every area of the interface with spotlight overlays. Restart it anytime from **Help → Restart Tutorial**.

3. **New Project Wizard**: Pick a template (Cinematic Film, Music Video, Social Vertical, Documentary, Commercial, or Blank) that pre-configures aspect ratio, resolution, and style presets.

---

## Core Features

### 1. Prompt Studio

The main workspace where you build AI video prompts.

**Quick Workflow:**

1. Write your **Core Concept** — a natural-language paragraph describing your scene
2. Switch between **six input tabs** (Style, Camera, Scene, Character, Audio, Advanced) to fine-tune parameters
3. Select a **Target Model** (Veo 3.1, Veo 2, Sora, Custom)
4. Click **Generate Prompt** (`Ctrl+Enter`)
5. Review the output, check the **Quality Score** (0–100), and read improvement suggestions
6. Send to **Video Studio** for generation (`Ctrl+G`) or save to history

**Input Tab Details:**

| Tab           | Key Controls                                                                            |
| ------------- | --------------------------------------------------------------------------------------- |
| **Style**     | Art style (photorealistic, anime, watercolor, etc.), color palette, lighting setup      |
| **Camera**    | Movement (pan, dolly, tracking, drone, orbit), lens (14mm–200mm), distance, composition |
| **Scene**     | Environment, weather (rain, snow, fog, clear, storm), time of day                       |
| **Character** | Appearance, clothing, emotions, actions — or select from **Character Bank**             |
| **Audio**     | Voice-over description, ambient sounds, music cues                                      |
| **Advanced**  | Resolution, seed, negative prompt, model-specific fine-tuning parameters                |

### 2. Model Profiles

Pre-configured settings optimized for each AI video model.

| Profile     | Best For                            | Notes                    |
| ----------- | ----------------------------------- | ------------------------ |
| **Veo 3.1** | Cinematic quality, final production | Highest quality, slowest |
| **Veo 2**   | General purpose generation          | Balanced speed/quality   |
| **Sora**    | Rapid prototyping, artistic styles  | Fast iterations          |
| **Custom**  | Your own parameter set              | Fully configurable       |

Model profiles adjust temperature, token limits, aspect ratio preferences, and duration constraints. Customize them in **Settings → Model Profiles**.

### 3. Prompt History

Every prompt you generate is automatically saved with full metadata (timestamp, model, settings, quality score, tags).

- **Search** by text, tags, model, date range, or score with fuzzy matching
- **Diff comparison** — select two prompts and see a visual side-by-side diff
- **One-click reload** — restore any past prompt's full configuration instantly
- **Favorites** — star prompts for quick access
- **Export** history as JSON for backup or sharing

Access with the **History** sidebar entry or `Ctrl+H`.

### 4. Batch Generation

Generate multiple prompt variations from a single concept:

1. Click **Batch Generate** in the toolbar or sidebar
2. Enter your base prompt
3. Select variation type: Camera Angles, Styles, Durations, or Models
4. Click **Generate Batch**
5. Review results → export selected or send all to timeline

The **Job Queue** panel shows progress, priority, cost tracking, and error recovery for all batch operations.

---

## Studios

Studios are specialized workspaces for different creative tasks. Switch between them in the **header bar**.

### Video Studio 🎬

Generate video clips from optimized prompts via Veo 3.1 or Sora. Preview, compare generations, and send to timeline.

### Image Studio 🖼️

Create concept art and reference images with **Imagen 3**. Features include:

- Text-to-image generation with full style controls
- **Visual DNA extraction** — analyze a reference image to extract style parameters
- Use generated images as **first-frame references** for consistent video generation

### Suno Studio 🎵

Build AI music prompts for [Suno.ai](https://suno.com):

- Configure genre, vibe, tempo, instruments, and BPM
- Write lyrics with verse/chorus structure
- Copy optimized prompt directly to Suno
- Import generated audio into your timeline

### Analysis Studio 📊

Reverse-engineer visual styles from existing media:

- **Video analysis** — extract camera movement, style, and scene data
- **Image-to-prompt** — generate structured prompts from reference images via Gemini Vision
- **Style decomposition** and **mood detection**

### Script Studio 📝

Write screenplays with AI assistance:

- **Script-to-Screen** — paste a screenplay → auto-generate shot list with characters and locations
- Scene breakdown, character extraction, dialogue polish, pacing advice

### Storyboard Studio 📐

Visual shot planning:

- Drag-and-drop shot cards with thumbnail previews
- Per-shot notes and reference images
- Convert storyboard directly into a timeline sequence

---

## AI-Powered Tools

### Prompt Enhancement (AI Suggest)

Click the **magic wand** icon to get AI-powered improvements: specificity boost, style suggestions, scene expansion, and token optimization via Gemini.

### Prompt Scoring

Every prompt receives a 0–100 quality score based on completeness (25%), specificity (30%), coherence (25%), and model compatibility (20%). Actionable suggestions appear below the score.

### Voice-to-Prompt

Click the **microphone** icon → speak naturally → AI converts speech into structured prompt fields.

### AI Chat Assistant

Open **Help → Chat** for conversational guidance on techniques, troubleshooting, and prompting strategies.

### Global Dub

Translate and re-voice dialogue for international audiences: script translation → TTS generation → lip-sync adjustment.

### Inpainting (Magic Fixer)

Mask unwanted areas in a video frame → describe the fix → AI replaces the masked region.

### Outpainting (Generative Canvas)

Change aspect ratios (e.g., 16:9 → 9:16) without cropping — AI generates content for newly exposed areas.

### Chroma Key

Real-time green/blue screen removal using WebGL shaders with adjustable tolerance and edge softness.

### Color Grading

Preset LUTs (Film Noir, Vintage, Teal & Orange) + color wheels (Lift/Gamma/Gain) + waveform/vectorscope scopes. Save custom grades.

### AI Upscaling

Enhance resolution (720p → 1080p → 4K) with AI sharpening that preserves visual style.

### Motion Brush

Paint motion vectors onto specific regions of a frame to animate them independently.

### Object Segmentation

AI-powered object isolation for rotoscoping, depth mapping, and parallax effects.

---

## Director's Chain (Autonomous Pipeline)

The most powerful feature — an autonomous agent pipeline that takes a storyboard and produces a complete timeline:

```
Shot List → Dialogue Audio (TTS) → Concept Art (Imagen 3) → Video (Veo 3.1) → Timeline
```

**How to use:**

1. Prepare your **Storyboard** with shot descriptions, characters, and locations
2. Ensure **Character Bank** and **Location Library** are populated
3. Click **"Auto-Render Movie"**
4. Watch the pipeline execute: TTS → concept art → video → auto-assembly
5. Fine-tune the result on the timeline

Cost estimation is shown before execution. Set budget limits in **Settings → Cost Tracking**.

---

## Post-Production & Timeline

### The NLE

A full non-linear editor with five track types:

| Track        | Purpose            | Key Features                                |
| ------------ | ------------------ | ------------------------------------------- |
| **Video**    | Main footage       | Trim, split, transition, keyframe animation |
| **Text**     | Titles, subtitles  | Font, animation, positioning                |
| **Dialogue** | Voice-over, speech | Smart Cut (silence removal), fade, volume   |
| **SFX**      | Sound effects      | Sync to video, pan, fade                    |
| **Music**    | Background scores  | Auto-Duck, loop, crossfade                  |

### Editing Operations

| Operation             | Method                                           |
| --------------------- | ------------------------------------------------ |
| **Trim**              | Drag clip edges                                  |
| **Split**             | Place playhead → click ✂️                        |
| **Move**              | Drag clip horizontally (snaps to edges/playhead) |
| **Duplicate**         | `Ctrl+D`                                         |
| **Transition**        | Overlap adjacent clips → choose type             |
| **Speed Ramping**     | Right-click → Speed Ramping                      |
| **Link/Unlink Audio** | Right-click → Link/Unlink                        |

### Smart Cut

Select a dialogue clip → click **Smart Cut** → adjust silence threshold → apply. Removes dead air automatically using Web Worker audio analysis.

### Transitions

Cut, Fade, Dissolve, Wipe, Slide — plus AI-recommended transitions based on clip content analysis.

### Keyframe Animation

Animate Position, Scale, Rotation, Opacity over time with easing curves (Linear, Ease-In, Ease-Out, Ease-In-Out, custom Bezier).

### Montage Builder

Place a music track → select video clips → click **Auto-Montage** → AI detects beats and cuts video to the rhythm.

### Audio Production

- **Suno Architect** — music prompt builder with genre, vibe, tempo, instruments, lyrics
- **Ambience Studio** — loopable background environments (e.g., "busy cyberpunk market")
- **Recording Booth** — record narration with built-in teleprompter
- **Foley Wizard** — AI auto-generates and synchronizes SFX to video action
- **Auto-Ducking** — automatically lowers music under dialogue (configurable threshold/attack/release)

---

## Visual Composer

A node-based editor for building complex, reusable prompt architectures visually.

1. Open **Composer** from the sidebar
2. Drag blocks onto the canvas: Subject, Action, Style, Camera, Modifier
3. Connect blocks via input/output ports
4. Click **Compile** to generate the final prompt text
5. Click **Tour** for a guided walkthrough of all features

**Composer Shortcuts:** `Space+Drag` = pan, `Ctrl+Scroll` = zoom, `Ctrl+0` = fit, `Delete` = remove blocks, `Ctrl+C/V` = copy/paste

---

## Asset Management

### Character Bank

Create consistent characters across all shots:

- Define name, age, gender, ethnicity, body type, hair, eyes, wardrobe, distinguishing features
- Select a character in any shot → attributes are auto-injected into the prompt
- Supports multiple characters per shot

### Location Library

Save reusable environments with name, description, weather defaults, time defaults, and tags. Locations auto-insert into prompts when selected.

### Visual DNA

Extract style parameters from reference images (Gemini Vision) → mix DNA profiles → apply globally.

### Series Bible

Define world rules, technology level, color systems, and character relationships. Injected as context into all prompt generations for consistency.

### Whiteboard

Free-draw sketches, arrow annotations, and text labels for visual concept planning. Export as reference images.

---

## Collaboration

Real-time multiplayer editing powered by **Yjs CRDTs** and **WebRTC**.

### Quick Setup

1. **Collaborate** → Create Room → share 6-character code or link
2. Complete **Profile Setup** (display name + avatar color) on first use
3. Team members join by entering the room code

### Features

| Feature                 | Details                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Presence**            | Colored dots in header show online users and their edit locations                      |
| **Comments**            | Threaded discussions with @mentions, reactions, resolve/unresolve, timecode attachment |
| **Roles**               | Viewer (read-only), Editor (full editing), Admin (+ role management)                   |
| **Conflict Resolution** | Automatic CRDT merging; manual panel for edge cases showing yours vs. theirs           |
| **Offline Support**     | Changes queue while disconnected, sync on reconnect                                    |
| **Cross-Tab Sync**      | Multiple browser tabs stay in sync via Broadcast Channel API                           |

---

## Export & Delivery

### Quick Export

Click **Export** → choose Draft (720p), Standard (1080p), or High (4K) → **Render** → download `.mp4`. All rendering happens locally via FFmpeg.wasm.

### Platform Profiles

| Platform            | Resolution | Aspect | Notes                       |
| ------------------- | ---------- | ------ | --------------------------- |
| **YouTube**         | 1080p/4K   | 16:9   | Streaming-optimized bitrate |
| **TikTok**          | 1080×1920  | 9:16   | Short-form vertical         |
| **Instagram Reels** | 1080×1920  | 9:16   | Under 90 seconds            |
| **Instagram Feed**  | 1080×1080  | 1:1    | Square format               |
| **Twitter/X**       | 1280×720   | 16:9   | Compressed for fast upload  |

### Smart Social Crop

Reframe 16:9 → 9:16 or 1:1 automatically with AI subject tracking.

### Professional Export (NLE Interchange)

Export your timeline as FCPXML (DaVinci/FCP) or XML (Premiere) with all source clips, metadata, and EDL.

### Additional Formats

JSON, CSV, PDF, Markdown, XML, ZIP bundle, cURL/code snippets (Python, JS, TS)

### Batch Export

Select multiple clips → assign profiles → **Batch Export** → renders run in background queue.

---

## Plugin System & Marketplace

### Installing Plugins

1. **Marketplace** → browse by category (Prompts, Effects, Transitions, Exporters)
2. Review ratings, usage stats, permissions
3. Click **Install** → plugin enables automatically

### Security

Plugins run **sandboxed** with declared permissions. Package signatures and file integrity checks are verified before installation. Manage permissions in **Settings → Plugins**.

### Developing Plugins

Full TypeScript SDK with hot reload and debug logging. See [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md) and [Plugin API Reference](./PLUGIN_API.md).

---

## Batch Generation & Automation

### Job Queue

All long-running operations (batch generation, rendering, export) are managed centrally:

- Priority ordering, pause/resume, progress tracking with ETA
- Error recovery with exponential backoff
- Per-job cost tracking

### Generation Queue

Manages API calls with:

- Rate limiting and automatic throttling
- Configurable parallelism (1–4 concurrent requests)
- Result caching to avoid duplicate calls
- Budget enforcement (daily/weekly/monthly limits)

### Circuit Breaker

Automatically disables failing API endpoints → falls back to cached results or alternatives → re-enables after cool-down.

---

## Prompt History & Templates

### Templates

| Type                      | Examples                                                                  |
| ------------------------- | ------------------------------------------------------------------------- |
| **Built-In**              | Cinematic Film, Music Video, Documentary, Anime, Commercial, Social Short |
| **Custom**                | Save any configuration as a reusable template                             |
| **Variable Placeholders** | Use `{{character}}`, `{{location}}`, `{{time_of_day}}` for dynamic fill   |
| **Sharing**               | Export/import as JSON, browse community templates                         |

---

## CLI Mode

Run Veo Studio from the command line for scripting and automation:

```bash
node --import tsx src/cli/ <command> [options]
```

### Key Commands

| Command    | Description               | Example                                |
| ---------- | ------------------------- | -------------------------------------- |
| `generate` | Generate prompt from text | `generate --prompt "..." --model veo3` |
| `batch`    | Batch generate from JSON  | `batch --input prompts.json`           |
| `score`    | Score prompt quality      | `score --prompt "..."`                 |
| `enhance`  | AI-enhance a prompt       | `enhance --prompt "..."`               |
| `template` | List/apply/save templates | `template --list`                      |
| `render`   | Render timeline to video  | `render --output movie.mp4`            |
| `create`   | New project from template | `create --template cinematic`          |
| `export`   | Export project bundle     | `export --output bundle.zip`           |
| `health`   | Run diagnostics           | `health --json`                        |

All commands support `--json` for machine-readable output.

---

## Keyboard Shortcuts

### Playback

| Shortcut        | Action                  |
| --------------- | ----------------------- |
| `Space`         | Play / Pause            |
| `J` / `K` / `L` | Rewind / Stop / Forward |
| `←` / `→`       | Previous / Next frame   |
| `Home` / `End`  | Go to start / end       |

### Editing

| Shortcut                       | Action             |
| ------------------------------ | ------------------ |
| `Ctrl+Z` / `Ctrl+Shift+Z`      | Undo / Redo        |
| `Ctrl+C` / `Ctrl+V` / `Ctrl+X` | Copy / Paste / Cut |
| `Ctrl+D`                       | Duplicate          |
| `Ctrl+S`                       | Save project       |
| `Delete`                       | Delete selected    |

### Generation & Navigation

| Shortcut     | Action               |
| ------------ | -------------------- |
| `Ctrl+Enter` | Generate prompt      |
| `Ctrl+G`     | Send to Video Studio |
| `Ctrl+H`     | Open history         |
| `Ctrl+K`     | Command palette      |
| `Ctrl+,`     | Settings             |
| `1`–`6`      | Switch input tabs    |
| `?` / `F1`   | Help panel           |

Press `?` anytime to see all shortcuts in a searchable overlay.

---

## Settings & Configuration

Access via **⚙️ Settings** (`Ctrl+,`):

| Section            | Key Settings                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **General**        | API key, theme (dark/light), language, autosave interval                   |
| **Project**        | Aspect ratio, resolution, frame rate, default duration                     |
| **Model Profiles** | Per-model parameters (temperature, tokens, aspect ratio, duration)         |
| **Auto-Update**    | Release channel (Stable/Beta/Dev), check interval, auto-download/install   |
| **Cost Tracking**  | Budget limits (daily/weekly/monthly), per-model breakdown, usage analytics |
| **Plugins**        | Manage installed plugins, permissions, auto-update, dev mode               |

---

## Diagnostics & Performance

### AI Project Optimization

Run from **Tools → Project Optimization**:

- Quality scoring across all shots
- Cost estimation for full generation
- Narrative continuity checks
- Preset recommendations

### System Health

- Hydration time, studio load latency, render throughput, memory usage
- **Autosave** with configurable intervals and crash recovery
- **Safe Mode** (desktop): disables heavy studios/plugins after crash loops. Launch with `--safe-mode` flag.

---

## Troubleshooting

### Common Issues

| Problem                       | Solution                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| **"No API key configured"**   | Click 🔑 → add Google AI Studio key                                  |
| **Generation fails**          | Check API quota at Google AI Studio. Try a simpler prompt            |
| **Blank screen on launch**    | Clear cache (web) or reinstall AppImage (desktop). Try `--safe-mode` |
| **Slow performance**          | Close unused studios, reduce preview quality, enable proxy mode      |
| **Export fails**              | Check disk space. Try different format. Verify prompt data           |
| **Plugins not loading**       | Check `engineVersion` compatibility. Reinstall plugin                |
| **Collaboration not syncing** | Check internet. Verify room code                                     |

### Error Messages

| Error               | Solution                                       |
| ------------------- | ---------------------------------------------- |
| `QUOTA_EXCEEDED`    | Wait 1 min or upgrade plan                     |
| `INVALID_API_KEY`   | Re-enter or regenerate key                     |
| `GENERATION_FAILED` | Simplify prompt and retry                      |
| `NETWORK_ERROR`     | Check connection. Non-AI features work offline |
| `STORAGE_QUOTA`     | Export/archive old projects                    |

### Desktop Issues

| Problem          | Solution                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Won't launch** | Check system requirements. Run as admin (Windows). Check logs at `~/.loofi-veo-prompt-generator/logs/` |
| **Update fails** | Check internet. Disable antivirus temporarily. Download manually                                       |
| **Crash loop**   | Launch with `--safe-mode`. Disable heavy studios                                                       |

### Getting Help

- **In-App**: `?` or `F1` → searchable help panel
- **AI Chat**: Help → Chat for conversational guidance
- **GitHub Issues**: [Report bugs](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator/issues)
- **Diagnostics**: Settings → Diagnostics → Run System Check → Export Logs

---

## Additional Resources

| Resource                | Link                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Complete User Guide** | [USER_GUIDE.md](../USER_GUIDE.md)                                                                                        |
| **Wiki User Guide**     | [App-User-Guide](../wiki/App-User-Guide.md)                                                                              |
| **Architecture**        | [ARCHITECTURE.md](./ARCHITECTURE.md)                                                                                     |
| **Plugin Development**  | [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md)                                                                         |
| **Plugin API**          | [PLUGIN_API.md](./PLUGIN_API.md)                                                                                         |
| **Auto-Update**         | [AUTO_UPDATE.md](./AUTO_UPDATE.md)                                                                                       |
| **Changelog**           | [CHANGELOG.md](../CHANGELOG.md)                                                                                          |
| **GitHub Repository**   | [github.com/multidraxter-bit/Loofi-Veo-prompt-generator](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator) |

---

**Need more help?** Open an issue on [GitHub](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator/issues) or use the in-app AI Chat assistant.

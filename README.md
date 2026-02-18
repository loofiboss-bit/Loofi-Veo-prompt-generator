<p align="center">
  <img src="https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-studio-banner.png" alt="Veo Studio Banner" width="100%"/>
</p>

<h1 align="center">🎬 Veo Studio</h1>
<h3 align="center">The Complete AI Video Production Suite</h3>

<p align="center">
  <a href="#-what-is-veo-studio">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-studios">Studios</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.7.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-Web%20%7C%20Linux%20%7C%20Windows%20%7C%20macOS-green.svg" alt="Platform"/>
  <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License"/>
  <img src="https://img.shields.io/badge/powered%20by-Google%20Gemini-orange.svg" alt="Powered by Gemini"/>
</p>

---

## 📖 What Is Veo Studio?

**Veo Studio** is a professional-grade, local-first **Non-Linear Editor (NLE)** and **Generative Orchestration Platform** for AI video production. It wraps leading generative models — **Google Veo 3.1**, **Imagen 3**, **Gemini 2.5**, and **OpenAI Sora** — in a familiar timeline-based interface, letting you go from a blank page to a finished video entirely within one application.

Everything runs on your device. Your footage, API keys, and project data stay local in IndexedDB. The built-in FFmpeg.wasm renderer produces 1080p/4K exports without uploading a single frame to the cloud.

### Why Veo Studio?

| Traditional Workflow              | With Veo Studio                                    |
| --------------------------------- | -------------------------------------------------- |
| Generate videos one by one        | Batch generate entire scenes in parallel           |
| Inconsistent character appearance | Character Bank locks attributes across shots       |
| Manual prompt engineering         | AI-powered prompt scoring & optimization           |
| Export to external editors        | Full NLE timeline built right in                   |
| Upload footage to cloud           | 100% local processing via FFmpeg.wasm              |
| Single-user, single-machine       | Real-time multiplayer collaboration (Yjs + WebRTC) |

---

## ✨ Features

### 🎬 Production & Editing (NLE)

| Feature                   | Description                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Multi-Track Timeline**  | Dedicated tracks for Video, Text Overlays, Dialogue, SFX, and Music with unlimited layers              |
| **Client-Side Rendering** | FFmpeg.wasm stitches, trims, composites, and renders up to 4K — entirely in your browser or Electron   |
| **Smart Proxies**         | Lightweight preview files for smooth playback of large projects                                        |
| **Smart Cut**             | Removes silence from dialogue tracks using Web Worker audio analysis                                   |
| **Keyframe Animation**    | Animate position, scale, rotation, and opacity with custom easing curves (Linear, Ease-In/Out, Bezier) |
| **Montage Builder**       | AI detects music beats and auto-cuts video clips to the rhythm                                         |
| **Speed Ramping**         | Variable playback speed within a single clip                                                           |
| **Transitions**           | Cut, Fade, Dissolve, Wipe, Slide — plus AI-recommended transitions based on clip content               |

### 🧠 Generative AI Tools

| Tool                   | Description                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Director's Chain**   | Autonomous pipeline: Script → Audio (TTS) → Concept Art (Imagen 3) → Video (Veo 3.1) → Timeline   |
| **Script to Screen**   | Paste a screenplay → auto-generate shot list with characters, locations, and camera setups        |
| **Prompt Enhancement** | Gemini analyzes your concept and suggests specificity, style, and token optimizations             |
| **Prompt Scoring**     | 0–100 quality score based on completeness, specificity, coherence, and model compatibility        |
| **Voice-to-Prompt**    | Speak naturally → AI converts speech into structured prompt fields                                |
| **Global Dub**         | Translate dialogue, generate new voice tracks, and adjust lip-sync for international distribution |
| **AI Upscaling**       | Enhance resolution (720p → 1080p → 4K) with AI sharpening                                         |
| **AI Chat Assistant**  | Conversational help for techniques, troubleshooting, and prompting strategies                     |

### 🎵 Audio Production

| Tool                | Description                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Suno Architect**  | Music prompt builder with genre, vibe, tempo, instruments, BPM, and lyrics editor for [Suno.ai](https://suno.com) |
| **Ambience Studio** | Generate seamless, loopable background audio (café, rain, cyberpunk market, sci-fi engine room)                   |
| **Recording Booth** | Record voice-overs with built-in teleprompter and waveform trimming                                               |
| **Foley Wizard**    | Analyze video frames → auto-generate and sync sound effects (footsteps, impacts, ambience)                        |
| **Auto-Ducking**    | Automatically lower music volume under dialogue with configurable threshold and attack/release                    |

### 📦 Asset & Continuity Management

| Feature              | Description                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Character Bank**   | Persistent characters with defined attributes (name, age, ethnicity, wardrobe, distinguishing features) — injected into every prompt for cross-shot consistency |
| **Location Library** | Reusable environments with default weather, time of day, and tags                                                                                               |
| **Visual DNA**       | Extract style parameters from reference images → mix profiles → apply globally                                                                                  |
| **Series Bible**     | World rules, technology level, color systems, and character relationships enforced across all generations                                                       |
| **Whiteboard**       | Sketch compositions, camera paths, and scene layouts directly on screen                                                                                         |

### 🛠️ Advanced Post-Production

| Feature                 | Description                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Color Grading**       | Preset LUTs (Film Noir, Vintage, Teal & Orange) + Color Wheels (Lift/Gamma/Gain) + Waveform/Vectorscope scopes |
| **Chroma Key**          | Real-time green/blue screen removal using WebGL shaders                                                        |
| **Generative Canvas**   | AI outpainting to expand frame boundaries and change aspect ratios (16:9 → 9:16) without cropping              |
| **Magic Fixer**         | Inpainting — mask unwanted areas, describe the fix, AI replaces them                                           |
| **Motion Brush**        | Paint motion vectors onto specific regions to animate independently                                            |
| **Object Segmentation** | AI-powered isolation for rotoscoping, depth mapping, and parallax effects                                      |

### 🤝 Real-Time Collaboration

| Feature                 | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Multiplayer Editing** | Edit simultaneously via Yjs CRDTs + WebRTC peer-to-peer channels                           |
| **Presence Indicators** | See who's online, where they're editing, and their cursor positions                        |
| **Comment System**      | Threaded discussions with @mentions, reactions, resolve/unresolve, and timecode attachment |
| **Team Roles**          | Viewer (read-only), Editor (full editing), Admin (+ role management)                       |
| **Share Rooms**         | Create rooms with 6-character codes or shareable links                                     |
| **Conflict Resolution** | Visual panel for reviewing and resolving CRDT merge conflicts                              |
| **Offline Sync**        | Changes queue while disconnected — sync automatically on reconnect                         |

### 🚀 Productivity & Workflow

| Feature                 | Description                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Template System**     | Save and reuse prompt configurations with categories, tags, and `{{variable}}` placeholders        |
| **Preset Management**   | Quick-apply presets for camera, lighting, style, and more                                          |
| **Batch Generation**    | Generate multiple prompt variations (different cameras, styles, durations, models) in one click    |
| **Job Queue**           | Priority-ordered background processing with progress tracking, cost estimation, and error recovery |
| **Prompt History**      | Every generation auto-saved with full metadata — search, filter, diff, and one-click reload        |
| **Command Palette**     | `Ctrl+K` quick access to any action                                                                |
| **Autosave & Recovery** | Automatic saving with crash detection, state recovery, and safe mode                               |
| **Enhanced Export**     | JSON, PDF, CSV, Markdown, XML, ZIP, cURL, and code snippets (Python, JS, TS)                       |

### 🔌 Plugin System

| Feature                 | Description                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Marketplace**         | Browse, rate, and install community plugins                                                      |
| **Plugin Categories**   | Prompts, Effects, Transitions, Exporters                                                         |
| **Sandboxed Execution** | Plugins run with declared permissions, package signature verification, and file integrity checks |
| **TypeScript SDK**      | Full development SDK with hot reload and debug logging                                           |

### ⚡ Performance & Privacy

- **🔒 Local-First** — Your footage, API keys, and project data never leave your device
- **📦 IndexedDB Storage** — All data persisted locally with automatic migrations
- **⚙️ Background Processing** — Web Workers and Service Workers handle heavy tasks without blocking the UI
- **🌐 Offline Capable** — Full editing, timeline, and export work without internet (AI generation requires connectivity)
- **📊 Performance Metrics** — Hydration time, studio load latency, render throughput, and memory usage tracking

---

## 🎭 Studios

Studios are specialized workspaces optimized for different creative tasks. Switch between them in the header bar.

| Studio                   | Purpose                                 | Key Capabilities                                                         |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------ |
| **Video Studio** 🎬      | Generate and manage AI video clips      | Veo 3.1 / Sora generation, side-by-side comparison, send to timeline     |
| **Image Studio** 🖼️      | Create concept art and reference images | Imagen 3 generation, Visual DNA extraction, first-frame references       |
| **Suno Studio** 🎵       | Build AI music prompts                  | Genre/vibe/tempo config, lyrics editor, optimized prompt export          |
| **Analysis Studio** 📊   | Reverse-engineer visual styles          | Video analysis, image-to-prompt, style decomposition, mood detection     |
| **Script Studio** 📝     | Write screenplays with AI               | Script-to-Screen, scene breakdown, character extraction, dialogue polish |
| **Storyboard Studio** 📐 | Visual shot planning                    | Drag-and-drop cards, per-shot notes, direct timeline conversion          |

---

## 💻 Installation

### Option 1: Desktop Application (Recommended)

Download the latest release for your platform:

| Platform    | Download                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Linux**   | [Latest AppImage](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases/latest)  |
| **Windows** | [Latest Installer](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases/latest) |
| **macOS**   | Coming soon                                                                                    |

**Linux (AppImage):**

```bash
# Make executable (first time only)
chmod +x "./release/Veo Prompt Generator-3.7.0.AppImage"

# Run
./release/Veo\ Prompt\ Generator-3.7.0.AppImage
```

### Option 2: Web Application (Development)

```bash
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 3: Build Desktop from Source

```bash
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install
npm run dist
# Packaged app will be in ./release/
```

### Desktop App Features

- **Native Performance** — Standalone application, no browser needed
- **Auto-Updates** — Configurable release channels (Stable / Beta / Dev)
- **Offline Support** — Full editing and export without internet
- **Safe Mode** — Crash loop detection with automatic recovery
- **System Integration** — Native file dialogs, notifications, and menus

---

## 🚀 Quick Start

### 1. Set Up Your API Key

Click the **🔑 Key** button (bottom-left) → paste your key from [Google AI Studio](https://aistudio.google.com/app/apikey) → click **Save**. Your key is stored locally and never transmitted to third parties.

### 2. Create a New Project

The **New Project Wizard** guides you through template selection:

| Template            | Aspect Ratio  | Best For                      |
| ------------------- | ------------- | ----------------------------- |
| **Cinematic Film**  | 16:9 (2.39:1) | Movies, shorts, narrative     |
| **Music Video**     | 16:9          | Songs, performances           |
| **Social Vertical** | 9:16          | TikTok, Reels, YouTube Shorts |
| **Documentary**     | 16:9          | Interviews, informational     |
| **Commercial**      | 16:9 / 1:1    | Ads, promos                   |
| **Blank Project**   | Any           | Start from scratch            |

### 3. Write Your Concept

```
A mysterious detective walks through a rain-soaked alley in 1940s Chicago,
trench coat collar turned up, neon signs reflecting in the puddles as
steam rises from gutter grates.
```

### 4. Configure Your Shot

Use the **six input tabs** to fine-tune:

| Tab                 | Controls                                                      |
| ------------------- | ------------------------------------------------------------- |
| **Style** (`1`)     | Art style, color palette, lighting                            |
| **Camera** (`2`)    | Movement, lens, distance, composition                         |
| **Scene** (`3`)     | Environment, weather, time of day                             |
| **Character** (`4`) | Appearance, clothing, actions — or select from Character Bank |
| **Audio** (`5`)     | Voice-over, ambient sounds, music cues                        |
| **Advanced** (`6`)  | Model, resolution, seed, negative prompt                      |

### 5. Generate, Review & Export

1. **Generate Prompt** (`Ctrl+Enter`) → review output + quality score (aim for 80+)
2. **Send to Video Studio** (`Ctrl+G`) → generate AI video
3. **Edit on Timeline** — trim, transition, add SFX and music
4. **Export** → choose platform profile (YouTube, TikTok, Instagram) → render locally

---

## 💻 CLI Mode

Run Veo Studio from the command line for scripting and automation:

```bash
node --import tsx src/cli/ <command> [options]
```

| Command    | Description                     |
| ---------- | ------------------------------- |
| `generate` | Generate a prompt from text     |
| `batch`    | Batch generate from a JSON file |
| `score`    | Score prompt quality (0–100)    |
| `enhance`  | AI-enhance a prompt via Gemini  |
| `template` | List, apply, or save templates  |
| `render`   | Render a timeline to video      |
| `create`   | Create a new project            |
| `export`   | Export a project bundle         |
| `health`   | Run diagnostics                 |

All commands support `--json` for machine-readable output.

---

## ⌨️ Keyboard Shortcuts

| Shortcut                  | Action                  |
| ------------------------- | ----------------------- |
| `Space`                   | Play / Pause Timeline   |
| `J` / `K` / `L`           | Rewind / Stop / Forward |
| `←` / `→`                 | Previous / Next Frame   |
| `Ctrl+Enter`              | Generate Prompt         |
| `Ctrl+G`                  | Send to Video Studio    |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo             |
| `Ctrl+D`                  | Duplicate               |
| `Ctrl+S`                  | Save Project            |
| `Ctrl+H`                  | Open History            |
| `Ctrl+K`                  | Command Palette         |
| `Ctrl+,`                  | Settings                |
| `1`–`6`                   | Switch Input Tabs       |
| `Shift+N`                 | Add New Shot            |
| `?` / `F1`                | Help Panel              |
| `Esc`                     | Close Panel / Dialog    |

> Press `?` at any time to see all shortcuts in a searchable overlay.

---

## 🛠️ Tech Stack

| Layer            | Technology                                             |
| ---------------- | ------------------------------------------------------ |
| **Frontend**     | React 18, TypeScript, Tailwind CSS                     |
| **State**        | Zustand + Zundo (undo/redo) + Yjs (CRDT collaboration) |
| **Video Engine** | FFmpeg.wasm, WebGL shaders                             |
| **Audio Engine** | Web Audio API, Web Workers                             |
| **Desktop**      | Electron 40                                            |
| **AI Backend**   | Google GenAI SDK (`@google/genai`)                     |
| **Persistence**  | IndexedDB via `idb-keyval`                             |

### AI Models

| Purpose               | Model                                                  |
| --------------------- | ------------------------------------------------------ |
| Reasoning & Scripting | Gemini 2.5 Pro                                         |
| Vision & Analysis     | Gemini 2.5 Pro (Multimodal)                            |
| Image Generation      | Imagen 3 (`gemini-2.5-flash-image`)                    |
| Video Generation      | Veo 3.1 (`veo-3.1-generate-preview`)                   |
| Speech & SFX          | Gemini Audio (`gemini-2.5-flash-native-audio-preview`) |

---

## 📁 Project Structure

```
src/
├── core/                    # Framework-agnostic business logic
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # App constants & translations
│   ├── services/           # ~79 singleton business logic services
│   ├── store/              # ~22 Zustand stores (sliced architecture)
│   ├── config/             # Model profiles, export profiles, plugins
│   └── utils/              # Utility functions (error handling, crypto)
├── features/               # Self-contained feature modules
│   ├── prompt/             # Prompt generation & building
│   ├── timeline/           # Multi-track timeline & storyboard
│   ├── studios/            # Creative studios (Video, Image, Suno, etc.)
│   ├── composer/           # Visual node-based prompt composer
│   ├── batch/              # Batch generation
│   ├── export/             # Export & delivery
│   ├── history/            # Prompt history
│   ├── diagnostics/        # Project health analysis
│   ├── marketplace/        # Plugin marketplace
│   ├── workspace/          # Workspace management
│   ├── settings/           # Settings UI
│   └── help/               # Help system & onboarding
├── shared/                 # Reusable UI & hooks
│   ├── components/ui/      # Design system (Button, Input, Modal, Toast, etc.)
│   ├── components/layout/  # App shell (Header, Sidebar, ModalManager)
│   ├── hooks/              # ~20+ shared React hooks
│   └── styles/             # CSS tokens, animations, accessibility
├── infrastructure/          # Database, storage, workers
├── cli/                     # CLI mode (commands, types, utils)
├── App.tsx                  # Root component
└── index.tsx                # Entry point

electron/                    # Electron main/preload process
public/                      # Static assets & service worker
```

---

## 📚 Documentation

| Document                                                 | Description                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| [USER_GUIDE.md](./USER_GUIDE.md)                         | Complete reference guide — every feature, workflow, and setting |
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md)               | Practical hands-on guide — concise feature coverage             |
| [Wiki App User Guide](./wiki/App-User-Guide.md)          | Task-oriented workflows — fast paths from start to finish       |
| [Plugin API Reference](./docs/PLUGIN_API.md)             | Plugin system API documentation                                 |
| [Plugin Development](./docs/PLUGIN_DEVELOPMENT.md)       | How to build plugins for Veo Studio                             |
| [Architecture](./docs/ARCHITECTURE.md)                   | Technical architecture overview                                 |
| [Architecture Diagrams](./docs/ARCHITECTURE_DIAGRAMS.md) | Visual system diagrams                                          |
| [CHANGELOG.md](./CHANGELOG.md)                           | Full version history                                            |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                     | Contribution guidelines                                         |
| [PRIVACY.md](./PRIVACY.md)                               | Data handling and privacy policy                                |

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

### Quick Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator

# Install dependencies
npm install

# Development server
npm run dev

# Electron development
npm run electron:dev

# Full validation (run before every commit)
npm run validate   # lint:ci + typecheck + test + format:check
```

### Areas for Contribution

- **🎨 UI/UX** — New themes, accessibility improvements, animations
- **🔧 Export Formats** — AAF, EDL, or other professional NLE interchange
- **🤖 AI Models** — Integration with additional generative APIs
- **⚡ Performance** — WebGL shader optimizations, rendering speed
- **🔌 Plugins** — Community plugins for new effects, transitions, and exporters
- **📱 Mobile** — Responsive layout and touch interaction improvements
- **🌍 Translations** — New language files in `public/locales/`

### Submitting Changes

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Run validation: `npm run validate`
3. Commit with conventional format: `git commit -m 'feat(scope): description'`
4. Push and open a Pull Request

### CI & Release Policy

- **Tag-driven releases** — Beta on `v*-beta*` tags, stable on version tags
- **Quality gates** — `lint:ci`, `typecheck`, and `test:ci` must pass before build

---

## 📄 License & Privacy

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

For data handling, telemetry, and API usage details see [PRIVACY.md](PRIVACY.md).

---

## 🙏 Acknowledgments

- **Google DeepMind** — Gemini, Veo, and Imagen APIs
- **FFmpeg** — The incredible video processing library
- **Electron** — Cross-platform desktop framework
- **Yjs** — CRDT framework for real-time collaboration
- **The Open Source Community** — For all the tools we build upon

---

<p align="center">
  <strong>🎬 Veo Studio v3.7.0 — The Future of Filmmaking 🎬</strong>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/loofitheboss">Loofi</a>
</p>

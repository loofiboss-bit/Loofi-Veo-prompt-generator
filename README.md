<p align="center">
  <img src="https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-studio-banner.png" alt="Veo Studio Banner" width="100%"/>
</p>

<h1 align="center">🎬 Veo Studio</h1>
<h3 align="center">The Complete AI Video Production Suite</h3>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-desktop-app">Desktop App</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.4.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/platform-Web%20%7C%20Linux%20%7C%20Windows%20%7C%20macOS-green.svg" alt="Platform"/>
  <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License"/>
  <img src="https://img.shields.io/badge/powered%20by-Google%20Gemini-orange.svg" alt="Powered by Gemini"/>
</p>

---

## 📖 Overview

**Veo Studio** is a professional-grade, local-first **Non-Linear Editor (NLE)** and **Generative Orchestration Platform** designed for AI video production workflows.

It bridges the gap between a director's creative vision and the complex requirements of modern generative models like **Google Veo 3.1**, **Imagen 3**, and **Gemini 2.5**, wrapping them in a familiar timeline-based interface.

### Why Veo Studio?

| Traditional Workflow | With Veo Studio |
|---------------------|-----------------|
| ❌ Generate videos one by one | ✅ Batch generate entire scenes |
| ❌ Inconsistent character appearance | ✅ Character Bank locks attributes |
| ❌ Manual prompt engineering | ✅ AI-powered prompt optimization |
| ❌ Export to external editors | ✅ Full NLE built-in |
| ❌ Upload footage to cloud | ✅ 100% local processing |

---

## ✨ Features

### 🎬 Production & Editing (NLE)

| Feature | Description |
|---------|-------------|
| **Multi-Track Timeline** | Full-featured editor with dedicated tracks for Video, Text Overlays, Dialogue, SFX, and Music |
| **Client-Side Rendering** | Uses **FFmpeg.wasm** to stitch, trim, composite, and render 1080p video entirely in your browser |
| **Smart Proxies** | Automatically generates lightweight proxy files for smooth 4K playback |
| **Smart Cut** | Removes silence from dialogue tracks using Web Workers for audio analysis |
| **Keyframe Animation** | Animate position, scale, rotation, and opacity with customizable easing |

### 🧠 Generative AI Tools

| Tool | Description |
|------|-------------|
| **Script to Screen** | Paste a screenplay and watch it transform into a shot list with auto-assigned characters and locations |
| **Director's Chain** | Autonomous agent handling the entire pipeline—Audio → Concept Art → Video for every shot |
| **Suno Architect** | Specialized prompt engineering for Suno.ai music generation with lyrics editing |
| **Ambience Studio** | Generate seamless, loopable background audio (room tone, nature sounds) |
| **Foley Wizard** | Analyzes video frames to suggest and generate synchronized sound effects |
| **Global Dub** | Translates dialogue, generates new voice tracks, and performs lip-syncing |

### 📦 Asset & Continuity Management

| Feature | Description |
|---------|-------------|
| **Character Bank** | Create persistent actors with defined attributes (ethnicity, age, wardrobe) |
| **Location Library** | Save reusable sets and environment descriptions |
| **Visual DNA** | Extract style parameters from images, mix them to create new aesthetics |
| **Whiteboard** | Sketch visual concepts or camera motion paths directly on screen |
| **Series Bible** | Define world rules and lore that AI enforces across all generations |

### 🛠️ Advanced Post-Production

| Feature | Description |
|---------|-------------|
| **Chroma Key** | Real-time green screen removal using WebGL shaders |
| **Generative Canvas** | Expand frame boundaries with AI outpainting for aspect ratio changes |
| **Magic Fixer** | Inpainting to fix visual glitches by masking and describing corrections |
| **Auto-Ducking** | Automatically lowers music volume when dialogue is detected |
| **Color Grading** | Apply film looks with contrast, saturation, and hue controls |

### ⚡ Performance & Privacy

- **🔒 Local-First Architecture** — Your footage stays on your device
- **📦 IndexedDB Storage** — Massive video blobs stored locally
- **⚙️ Background Processing** — Service Workers handle long tasks
- **🌐 Offline Capable** — Works without internet (except AI generation)

### 🚀 Productivity Features (v1.2.0)

| Feature | Description |
|---------|-------------|
| **Template System** | Save and reuse prompt configurations with categories and tags |
| **Variable Placeholders** | Use `{{variable_name}}` syntax for dynamic prompts with auto-fill |
| **Preset Management** | Quick-apply presets for camera, lighting, style, and more |
| **Autosave & Recovery** | Automatic saving with crash detection and recovery |
| **Keyboard Shortcuts** | 20+ customizable shortcuts for power users |
| **Enhanced Export** | Multiple formats (JSON, PDF, CSV, Markdown, XML, ZIP) with retry logic |

### 🔄 Workflow Integration (v1.3.0)

| Feature | Description |
|---------|-------------|
| **Prompt History** | Automatic history tracking with full metadata capture on every generation |
| **Search & Filter** | Find prompts by text, tags, favorites, or project with fuzzy matching |
| **Diff Comparison** | Side-by-side visual diff of any two prompts with syntax highlighting |
| **Project Organization** | Multi-project workspace with project-specific history and settings |
| **Database Management** | IndexedDB with automatic migrations, versioning, and backup/restore |
| **API Export** | Generate cURL commands and code snippets (Python, JavaScript, TypeScript) |
| **Sidebar Navigation** | Collapsible sidebar with quick access to Projects, History, Templates, Settings |
| **Global Search** | Fuzzy search across all history and projects with intelligent scoring |
| **Auto-Save** | Automatic save to history after every prompt generation |
| **Zustand Stores** | Dedicated state management for projects and history with persistence |

### 🎓 UX Professionalization (v1.4.0 - Released 2026-02-10)

| Feature | Description |
|---------|-------------|
| **Welcome Screen** | First-time user onboarding with product tour and feature highlights |
| **Interactive Tutorial** | 6-step guided tour with spotlight highlighting and contextual tooltips |
| **Help Panel** | Searchable help center with categories, topics, and keyboard shortcuts reference |
| **Contextual Help** | Inline help buttons (?) throughout the UI with tooltip-based guidance |
| **Keyboard Shortcuts** | `?` or `F1` to open help panel, global keyboard event handling |
| **Tutorial Restart** | Restart the tutorial anytime from the Help Panel |
| **Onboarding Tracking** | Persistent state management for tutorial progress and completion |

### ⚙️ Performance & Stability (v1.5.0 - In Progress)

| Improvement | Description |
|-------------|-------------|
| **Panel Error Isolation** | Studios and heavy overlays now fail independently with retry UI instead of breaking the full workspace |
| **Targeted Lazy Loading** | Search, Variables, and New Project Wizard load only when opened to reduce initial overhead |
| **Performance Baseline Metrics** | Hydration and studio-open latency now emit structured timing metrics for optimization tracking |
| **Studio Loading Skeletons** | Heavy studio surfaces now use full-screen skeleton states instead of opaque blocking backdrops |
| **Safe Mode Startup Guard** | Electron detects crash loops (or `--safe-mode`) and temporarily disables heavy studios to recover stability |

### 🤝 Collaboration

- **Real-Time Multiplayer** — Edit projects simultaneously with your team
- **Cursor Presence** — See others' cursors and selections in real-time
- **Powered by Yjs & WebRTC** — Decentralized sync, no server required

---

## 💻 Installation

### Option 1: Web Application (Development)

```bash
# Clone the repository
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 2: Desktop Application (Recommended)

The desktop app provides the best experience with native performance and offline capabilities.

#### Pre-built Releases

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| **Linux** | `Veo Prompt Generator-1.4.0.AppImage` |
| **Windows** | Coming soon |
| **macOS** | Coming soon |

#### Build from Source

```bash
# Clone and install
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install

# Build desktop app
npm run dist

# The AppImage will be in ./release/
./release/Veo\ Prompt\ Generator-1.1.0.AppImage
```

---

## 🖥️ Desktop App

### Features

- ✅ **Native Performance** — Runs as a standalone application
- ✅ **Offline Support** — Works without constant internet connection
- ✅ **System Integration** — Native file dialogs and notifications
- ✅ **Auto-Updates** — Stay current with the latest features

### Running the Desktop App

**Linux (AppImage):**

```bash
# Make executable (first time only)
chmod +x "./release/Veo Prompt Generator-1.4.0.AppImage"

# Run
./release/Veo\ Prompt\ Generator-1.1.0.AppImage
```

**From Unpacked Build:**

```bash
./release/linux-unpacked/veo-prompt-generator
```

### API Key Configuration

The app comes with a built-in API key for immediate use. To use your own key:

1. Click the **🔑 Key** button in the bottom-left corner
2. Enter your [Google AI Studio](https://aistudio.google.com/app/apikey) API key
3. Click **Save API Key**

Your key is stored locally and never sent to external servers.

---

## 🚀 Quick Start

### 1. Create a New Project

When you first open the app, the **New Project Wizard** guides you through:

- Choosing a template (Cinematic, Music Video, Social Vertical)
- Setting aspect ratio and resolution
- Selecting the target AI model

### 2. Write Your Idea

In the **Core Concept** section:

```
A mysterious figure walks through a neon-lit cyberpunk city at night,
rain falling heavily as holographic advertisements flicker overhead.
```

### 3. Configure Your Shot

Use the tabs to customize:

- **Style** — Art style, color palette, lighting
- **Camera** — Movement, lens type, distance
- **Scene** — Environment, weather, time of day
- **Character** — Appearance, clothing, actions
- **Audio** — Voice, ambient sounds, music

### 4. Generate & Edit

1. Click **Generate Prompt** to create an optimized AI prompt
2. Send to **Video Studio** for generation
3. Edit on the **Timeline** with full NLE tools
4. **Export** your finished video

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [USER_GUIDE.md](./USER_GUIDE.md) | Complete workflow guide for all features |
| [API Reference](./docs/API.md) | Technical API documentation |
| [Keyboard Shortcuts](#keyboard-shortcuts) | Quick reference for power users |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause Timeline |
| `←` / `→` | Previous/Next Clip |
| `Ctrl + Enter` | Generate Prompt |
| `Shift + N` | Add New Shot |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `?` | Open Help Panel |
| `F1` | Open Help Panel |
| `ESC` | Close Help Panel / Tutorial |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **State** | Zustand + Zundo (undo/redo) + Yjs (CRDT) |
| **Video Engine** | FFmpeg.wasm, WebGL |
| **Audio Engine** | Web Audio API, Web Workers |
| **Desktop** | Electron 40 |
| **AI Backend** | Google GenAI SDK (`@google/genai`) |
| **Persistence** | IndexedDB via `idb-keyval` |

### AI Models Used

| Purpose | Model |
|---------|-------|
| Reasoning & Scripting | `gemini-3-pro-preview` |
| Vision & Tagging | `gemini-3-pro-preview` (Multimodal) |
| Image Generation | `gemini-2.5-flash-image` |
| Video Generation | `veo-3.1-generate-preview` |
| Speech & SFX | `gemini-2.5-flash-native-audio-preview` |

---

## 📁 Project Structure

```
Loofi-Veo-prompt-generator/
├── App.tsx                 # Main application component
├── components/             # React UI components
│   ├── ApiKeyModal.tsx     # API key settings modal
│   ├── Header.tsx          # Top navigation
│   ├── Timeline.tsx        # NLE timeline editor
│   └── ...
├── services/               # Business logic
│   ├── geminiService.ts    # Google AI integration
│   ├── apiKeyService.ts    # API key management
│   └── videoEditorService.ts
├── store/                  # Zustand state management
├── hooks/                  # Custom React hooks
├── electron/               # Electron main process
│   └── main.cjs            # Desktop app entry point
├── public/                 # Static assets
├── dist/                   # Built web application
└── release/                # Built desktop applications
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator

# Install dependencies
npm install

# Run development server
npm run dev

# Run with Electron (development)
npm run electron:dev
```

### Areas for Contribution

- **🎨 UI/UX Improvements** — Better themes, accessibility
- **🔧 Export Formats** — AAF, EDL, or other professional formats
- **🤖 New AI Models** — Integration with other generative APIs
- **⚡ Performance** — WebGL shader optimizations
- **📱 Mobile Support** — Responsive layout improvements

### Submitting Changes

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add amazing feature'`
3. Push to the branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

---

## 🤖 AI Development Guidelines

**For AI assistants working on this project:**

> **⚠️ MANDATORY**: All AI conversations MUST follow `.agent/instructions.md`

This project uses a structured agent delegation model. Before making any changes:

1. **Read** `.agent/instructions.md` in full
2. **Read** model-specific root config:
   - `CLAUDE.md` (Claude)
   - `CHATGPT.md` (ChatGPT)
3. **Check** `.agent/PRE_FLIGHT_CHECKLIST.md` for compliance requirements
4. **Use** the agent delegation model (never operate monolithically)
5. **Follow** the mandatory output format (checklists, summaries, diffs)
6. **Reference** model-specific agent memory files:
   - `.claude/agent-memory/` (Claude)
   - `.chatgpt/agent-memory/` (ChatGPT)
7. **Validate** compliance using `/compliance-check` workflow

### Available Agents

- `project-coordinator` — Planning and task breakdown
- `architecture-advisor` — Design and architectural decisions
- `backend-builder` — Service layer implementation
- `frontend-integration-builder` — UI components and stores
- `test-writer` — Testing and validation
- `release-planner` — Releases, versioning, CI/CD
- `code-implementer` — Code implementation and bug fixes

### Key Principles

- **Token Discipline**: Concise, bullet-list responses only
- **Documentation**: Update README, CHANGELOG, and version on every change
- **Testing**: All features require test coverage
- **Roadmap Alignment**: Follow current version goals (see `.agent/instructions.md`)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google DeepMind** — For Gemini, Veo, and Imagen APIs
- **FFmpeg** — For the incredible video processing library
- **Electron** — For enabling cross-platform desktop apps
- **The Open Source Community** — For all the amazing tools we build upon

---

<p align="center">
  <strong>🎬 Designed for the Future of Filmmaking 🎬</strong>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/loofitheboss">Loofi</a>
</p>

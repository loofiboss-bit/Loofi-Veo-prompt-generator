# 📖 Veo Studio — Complete User Guide

**Version 3.6.0** | _Last Updated: 18 February 2026_

Welcome to **Veo Studio**, the integrated development environment (IDE) for AI Cinema. Veo Studio is a professional-grade, local-first **Non-Linear Editor (NLE)** and **Generative Orchestration Platform** that lets you go from a blank page to a finished AI-generated video — all from a single application.

Whether you are a solo filmmaker experimenting with AI tools for the first time, or a seasoned post-production professional building complex multi-shot sequences, this guide covers every feature, workflow, and shortcut in the app.

---

## 📑 Table of Contents

1. [What Is Veo Studio?](#-what-is-veo-studio)
2. [Getting Started](#-getting-started)
3. [The Interface](#-the-interface)
4. [Studios Overview](#-studios-overview)
5. [Pre-Production Workflow](#-pre-production-workflow)
6. [Asset Management](#-asset-management)
7. [Audio Production](#-audio-production)
8. [The Director's Chain](#-the-directors-chain)
9. [Post-Production & Timeline](#-post-production--timeline)
10. [Visual Composer](#-visual-composer)
11. [AI Magic Tools](#-ai-magic-tools)
12. [Collaboration & Teamwork](#-collaboration--teamwork)
13. [Export & Delivery](#-export--delivery)
14. [Plugin System & Marketplace](#-plugin-system--marketplace)
15. [Batch Generation & Automation](#-batch-generation--automation)
16. [Prompt History & Templates](#-prompt-history--templates)
17. [Diagnostics & Project Health](#-diagnostics--project-health)
18. [CLI Mode](#-cli-mode)
19. [Keyboard Shortcuts](#-keyboard-shortcuts)
20. [Settings & Configuration](#-settings--configuration)
21. [Troubleshooting](#-troubleshooting)
22. [Tips for Best Results](#-tips-for-best-results)
23. [Glossary](#-glossary)

---

## 🎬 What Is Veo Studio?

Veo Studio is an all-in-one desktop and web application for planning, prompting, generating, editing, and exporting AI-powered video content. It supports leading generative models including **Google Veo 3.1**, **Imagen 3**, **Gemini 2.5**, and **OpenAI Sora**.

### Key Capabilities

| Capability                  | What It Does                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Prompt Engineering**      | Structured prompt builder with scoring, AI enhancement, and model-specific adapters         |
| **Multi-Track Timeline**    | Full NLE with video, text, dialogue, SFX, and music tracks — edit like Premiere or DaVinci  |
| **Client-Side Rendering**   | FFmpeg.wasm renders 1080p/4K video entirely in your browser or Electron — no cloud uploads  |
| **Real-Time Collaboration** | Yjs CRDTs + WebRTC multiplayer: edit together, see cursors, comment, and resolve conflicts  |
| **Director's Chain**        | Autonomous agent pipeline: Script → Audio → Concept Art → Video → Timeline                  |
| **Plugin Ecosystem**        | Marketplace with sandboxed plugins that extend prompts, effects, transitions, and exporters |
| **Local-First Privacy**     | Your footage and API keys stay on your device. IndexedDB stores everything locally          |
| **Cross-Platform**          | Runs on Linux, Windows, and macOS as an Electron desktop app, or in any modern browser      |

### How It Compares to Traditional Workflows

| Traditional Workflow              | With Veo Studio                              |
| --------------------------------- | -------------------------------------------- |
| Generate videos one by one        | Batch generate entire scenes in parallel     |
| Inconsistent character appearance | Character Bank locks attributes across shots |
| Manual prompt engineering         | AI-powered prompt scoring and optimization   |
| Export to external editors        | Full NLE built right in                      |
| Upload footage to cloud           | 100% local processing                        |
| Single-user only                  | Real-time multiplayer collaboration          |

---

## 🚀 Getting Started

### System Requirements

| Requirement  | Minimum                               | Recommended                           |
| ------------ | ------------------------------------- | ------------------------------------- |
| **OS**       | Windows 10+, macOS 12+, Ubuntu 20.04+ | Latest stable release                 |
| **RAM**      | 4 GB                                  | 8 GB+ (16 GB for 4K rendering)        |
| **Storage**  | 500 MB free                           | 2 GB+ (for video assets and renders)  |
| **Browser**  | Chrome 100+, Firefox 110+, Edge 100+  | Chrome / Electron desktop             |
| **Internet** | Required for AI generation features   | Broadband for real-time collaboration |

### Installation

#### Option 1: Desktop Application (Recommended)

Download the latest release for your platform:

| Platform    | Download                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Linux**   | [Latest AppImage](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases/latest)  |
| **Windows** | [Latest Installer](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases/latest) |
| **macOS**   | Coming soon                                                                                    |

**Linux (AppImage):**

```bash
# Make executable (first time only)
chmod +x "./release/Veo Prompt Generator-3.6.0.AppImage"

# Run
./release/Veo\ Prompt\ Generator-3.6.0.AppImage
```

#### Option 2: Web Application (Development)

```bash
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

#### Option 3: Build Desktop from Source

```bash
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install
npm run dist
# Packaged app will be in ./release/
```

### First Launch

When you first open Veo Studio, you will be greeted by the **Onboarding Wizard** — a 6-step interactive tour that highlights the main areas of the interface with spotlight overlays and contextual tooltips.

> You can restart the tutorial anytime from **Help → Restart Tutorial** or by pressing `?`.

#### Step 1: API Key Setup

Your API key is required for all AI generation features (prompts, video, audio, image):

1. Click the **🔑 Key** button (bottom-left corner)
2. Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create a free API key
3. Paste it into the modal and click **Save**

> 💡 **Privacy**: Your API key is stored locally in IndexedDB on your device. It is never transmitted to any external server or third-party service — only directly to the Google GenAI API.

#### Step 2: New Project Wizard

The wizard helps you configure your first project:

| Template            | Best For                                | Aspect Ratio  | Duration      |
| ------------------- | --------------------------------------- | ------------- | ------------- |
| **Cinematic Film**  | Movies, shorts, narrative               | 16:9 (2.39:1) | Long-form     |
| **Music Video**     | Songs, performances, visual tracks      | 16:9          | 3–5 minutes   |
| **Social Vertical** | TikTok, Reels, YouTube Shorts           | 9:16          | 15–60 seconds |
| **Documentary**     | Interviews, narration, informational    | 16:9          | Variable      |
| **Commercial**      | Ads, promos, product showcases          | 16:9 / 1:1    | 15–30 seconds |
| **Blank Project**   | Start from scratch with custom settings | Any           | Any           |

Each template pre-configures resolution, aspect ratio, default duration, and default style presets so you can start creating immediately.

---

## 🖥️ The Interface

### Main Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER: Studios | Presence | Theme Toggle | Settings      │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                  │
│ SIDEBAR  │              MAIN WORKSPACE                     │
│          │                                                  │
│ Projects │  ┌──────────────────┐  ┌────────────────────┐   │
│ History  │  │   INPUT PANEL    │  │   OUTPUT PREVIEW   │   │
│ Templates│  │                  │  │                    │   │
│ Batch    │  │ - Core Concept   │  │ - Generated Prompt │   │
│ Workspace│  │ - Style Tab      │  │ - Video Preview    │   │
│ Composer │  │ - Camera Tab     │  │ - Copy / Export    │   │
│ Collab   │  │ - Scene Tab      │  │ - Score Badge      │   │
│ Comments │  │ - Character Tab  │  │ - Diff View        │   │
│ Roles    │  │ - Audio Tab      │  │                    │   │
│ Settings │  │ - Advanced Tab   │  │                    │   │
│ Help     │  └──────────────────┘  └────────────────────┘   │
│          │                                                  │
├──────────┴─────────────────────────────────────────────────┤
│  TIMELINE / STORYBOARD (when open)                         │
├────────────────────────────────────────────────────────────┤
│  EXAMPLES CAROUSEL (when no prompt is generated)           │
└────────────────────────────────────────────────────────────┘
```

### Header Bar

The header bar at the top provides access to:

- **Studio Selector** — Switch between Video, Image, Suno, Analysis, Script, and Storyboard studios
- **Presence Indicator** — Shows active collaborators when in a shared session (colored dots with initials)
- **Theme Toggle** — Switch between Dark and Light themes instantly
- **Settings Button** — Access all application settings
- **Notification Area** — Update alerts, generation progress, toast messages

### Sidebar Navigation

The collapsible sidebar provides quick access to all major functional areas:

| Sidebar Entry   | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| **Projects**    | Create, switch, and manage multiple projects          |
| **History**     | Browse and search all previously generated prompts    |
| **Templates**   | Access built-in and custom prompt templates           |
| **Batch**       | Configure and run batch prompt generations            |
| **Workspace**   | Manage multiple workspace layouts                     |
| **Composer**    | Open the visual node-based prompt builder             |
| **Collaborate** | Create/join shared editing sessions                   |
| **Comments**    | View and manage project comment threads               |
| **Roles**       | Manage team roles and permissions                     |
| **Marketplace** | Browse and install plugins                            |
| **Settings**    | Application configuration                             |
| **Help**        | Searchable help center, keyboard shortcuts, tutorials |

### Input Panel Tabs

The input panel organizes prompt configuration into clearly separated tabs:

| Tab           | Controls                                 | Details                                                                                                                                                                                                                                                        |
| ------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Style**     | Art style, color palette, lighting       | Choose from photorealistic, anime, watercolor, oil painting, pixel art, stop motion, 3D render, line art, and more. Select color palettes (warm, cool, neon, vintage, pastel) and lighting setups (natural, neon, volumetric, studio, golden hour).            |
| **Camera**    | Movement, lens, distance, composition    | Configure camera movement (static, pan, tilt, dolly, tracking, drone, orbit, crane), focal length (14mm wide to 200mm telephoto), shot distance (extreme close-up to extreme wide), and composition rules (rule of thirds, center, golden ratio, symmetrical). |
| **Scene**     | Environment, weather, time of day        | Define the physical setting, weather conditions (rain, snow, fog, clear, stormy), and time of day (dawn, morning, noon, golden hour, dusk, night).                                                                                                             |
| **Character** | Appearance, clothing, actions, emotions  | Describe characters or select from the Character Bank for consistency. Define wardrobe, hairstyle, body language, facial expression, and action being performed.                                                                                               |
| **Audio**     | Voice-over, ambient sounds, music cues   | Describe desired audio elements for the scene, including dialogue tone, ambient atmosphere, and musical mood. Integrates with Suno Studio for music generation.                                                                                                |
| **Advanced**  | Resolution, model selection, fine-tuning | Choose target model (Veo, Sora), resolution, seed values, negative prompts, and advanced generation parameters.                                                                                                                                                |

---

## 🎭 Studios Overview

Studios are specialized workspaces optimized for different types of creative work. Switch between them using the studio selector in the header.

### Video Studio 🎬

The primary workspace for generating and managing AI video clips.

- **Generate video** from optimized prompts via Veo 3.1 or Sora APIs
- **Preview** generated clips with frame-accurate playback controls
- **Compare** multiple generations side by side
- **Send to timeline** for editing and compositing

### Image Studio 🖼️

Create concept art, storyboard frames, and reference images using Imagen 3.

- **Generate images** from text prompts with style and composition controls
- **Reference editing** — crop, resize, and filter generated images
- **Visual DNA extraction** — analyze a reference image to extract style parameters
- **Send to video** — use generated images as first-frame references for video generation

### Suno Studio 🎵

Design AI music prompts optimized for [Suno.ai](https://suno.com).

- **Genre selector** — Electronic, Jazz, Orchestral, Rock, Hip-Hop, Lo-Fi, and more
- **Vibe/mood controls** — Dark, Uplifting, Mysterious, Energetic, Melancholic
- **Tempo and instrument configuration**
- **Lyrics editor** — Write and edit song lyrics with verse/chorus structure
- **One-click export** — Copy the optimized prompt to paste into Suno

### Analysis Studio 📊

Analyze existing videos and images for prompt engineering.

- **Video analysis** — Extract style, camera movement, and scene data from uploaded clips
- **Image-to-prompt** — Generate a structured prompt from a reference image using Gemini Vision
- **Style decomposition** — Break down complex visual styles into individual parameters
- **Mood detection** — Automatically identify emotional tone and atmosphere

### Script Studio 📝

Write and structure screenplays with AI assistance.

- **Script-to-Screen** — Paste a screenplay and watch it transform into a shot list with auto-assigned characters and locations
- **Scene breakdown** — Automatically parse scripts into scenes, shots, and dialogue blocks
- **Character extraction** — Identify characters from script text and populate the Character Bank
- **AI suggestions** — Get dialogue polish, pacing advice, and narrative structure improvements from Gemini

### Storyboard Studio 📐

Visual shot planning with drag-and-drop card interface.

- **Shot cards** — Visual card-based scene planning with thumbnail previews
- **Drag-and-drop reordering** — Rearrange shots by dragging cards
- **Per-shot notes** — Add detailed notes, prompt assignments, and reference images to each shot
- **Timeline integration** — Convert storyboard directly into a timeline sequence

---

## 🎬 Pre-Production Workflow

### Step 1: Define Your Concept

Start with the **Core Concept** field — this is the most important input. Write a clear, descriptive paragraph about what you want the video to show:

```
Example: A mysterious detective walks through a rain-soaked
alley in 1940s Chicago, their trench coat collar turned up
against the cold. Neon signs reflect in the puddles as
steam rises from the gutter grates.
```

**Tips for Writing Great Core Concepts:**

- ✅ Be specific about actions and movements ("walks slowly" not just "walks")
- ✅ Include sensory details (lighting, weather, textures, sounds)
- ✅ Describe the emotional tone ("ominous", "hopeful", "serene")
- ✅ Mention time period and location when relevant
- ❌ Avoid vague descriptions like "cool video" or "amazing scene"
- ❌ Don't include technical camera terms here (those belong in the Camera tab)
- ❌ Don't overload with too many simultaneous subjects or actions

### Step 2: Choose Your Target Model

Use the **Target Model Toggle** to select which AI model will generate your video:

| Model       | Strengths                                        | Speed    | Quality    | Best For                                |
| ----------- | ------------------------------------------------ | -------- | ---------- | --------------------------------------- |
| **Veo 3.1** | Cinematic quality, realistic motion, consistency | Slower   | ⭐⭐⭐⭐⭐ | Final production clips, cinematic shots |
| **Veo 2**   | Previous generation, stable                      | Medium   | ⭐⭐⭐⭐   | General-purpose generation              |
| **Sora**    | Fast iterations, artistic styles                 | Faster   | ⭐⭐⭐⭐   | Rapid prototyping, experimental work    |
| **Custom**  | User-defined parameters                          | Variable | Variable   | Advanced users with specific needs      |

> 💡 **Model Profiles** automatically adjust all generation parameters (temperature, tokens, aspect ratio, duration) for optimal results with each model. You can customize profiles in **Settings → Model Profiles**.

### Step 3: Configure Style

Open the **Style** tab and configure the visual aesthetic:

1. **Art Style**: Photorealistic, Anime, Watercolor, Oil Painting, Pixel Art, Stop Motion, 3D Render, Line Art
2. **Color Palette**: Warm, Cool, Neon, Vintage, Pastel, Monochrome, High-Contrast
3. **Lighting**: Natural Sunlight, Golden Hour, Neon/Neon-Noir, Volumetric, Studio Three-Point, Dramatic Shadow, Moonlight

> 💡 **Pro Tip**: Use the **AI Suggest** button (magic wand icon) to get style recommendations based on your core concept. Gemini analyzes your description and suggests complementary styles.

### Step 4: Set Up Camera

Open the **Camera** tab:

| Control         | Options                                                                              | Usage Guidance                                                                                                |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Movement**    | Static, Pan, Tilt, Dolly, Tracking, Drone, Orbit, Crane, Handheld, Steadicam         | Pan = reveal environment; Dolly = intimate approach; Drone = epic establishing; Handheld = documentary feel   |
| **Lens**        | Ultra-Wide (14mm), Wide (24mm), Normal (50mm), Portrait (85mm), Telephoto (135mm+)   | Wide = landscapes, architecture; Normal = natural perspective; Tele = compressed backgrounds, isolate subject |
| **Distance**    | Extreme Close-up, Close-up, Medium Close-up, Medium, Medium Wide, Wide, Extreme Wide | Close-up = emotion, detail; Wide = context, setting                                                           |
| **Composition** | Rule of Thirds, Center, Golden Ratio, Symmetrical, Leading Lines                     | Rule of Thirds = balanced; Center = confrontational; Golden Ratio = naturally pleasing                        |

### Step 5: Configure Scene and Character

- **Scene Tab**: Define environment (indoor/outdoor), weather, time of day, and specific location details
- **Character Tab**: Either type a character description or select a pre-defined character from the **Character Bank** for cross-shot consistency

### Step 6: Generate and Review

1. Click **Generate Prompt** (or press `Ctrl+Enter`)
2. Review the generated prompt in the **Output Preview** panel
3. Check the **Quality Score** (0–100) displayed as a badge
4. Read the **Improvement Suggestions** below the prompt
5. Iterate or send to **Video Studio** for generation (`Ctrl+G`)

---

## 📦 Asset Management

### Character Bank

Create consistent characters that appear the same across every shot in your project. This is essential for multi-shot videos and narrative projects.

#### Creating a Character

1. Open **Character Bank** from the sidebar or header
2. Click **+ New Character**
3. Fill in the detail fields:

| Field                       | Example                                 | Why It Matters                |
| --------------------------- | --------------------------------------- | ----------------------------- |
| **Name**                    | Detective Morgan                        | Used for prompt reference     |
| **Age**                     | 45                                      | Affects appearance generation |
| **Gender**                  | Female                                  | Physical attributes           |
| **Ethnicity**               | East Asian                              | Consistent facial features    |
| **Body Type**               | Athletic                                | Consistent proportions        |
| **Hair**                    | Short, black, slicked back              | Recognizable across shots     |
| **Eyes**                    | Dark brown, intense                     | Detail for close-ups          |
| **Wardrobe**                | Tan trench coat, white shirt, loose tie | Continuity between scenes     |
| **Distinguishing Features** | Scar above left eyebrow                 | Makes the character unique    |

#### Using Characters in Prompts

When you select a character in a shot, Veo Studio automatically injects their complete description into the generated prompt. This ensures the AI model produces visually consistent results across all shots featuring that character.

You can assign multiple characters to a single shot, and each will be described in the prompt.

### Location Library

Save reusable environments for consistency across your project:

1. Open **Location Library**
2. Click **+ New Location**
3. Define:
   - **Name**: "Noir Alley"
   - **Description**: "Narrow brick alley with fire escapes, puddles reflecting neon signs, steam rising from grates"
   - **Weather Default**: Rainy
   - **Time Default**: Night
   - **Tags**: noir, urban, night, rain

Locations are automatically inserted into prompts when selected, giving consistent environmental descriptions between shots.

### Visual DNA

Extract and remix visual styles from reference images:

1. **Extract**: Upload a reference image → Gemini Vision identifies style parameters (color palette, lighting, texture, composition)
2. **Mix**: Combine multiple DNA profiles (e.g., "Film Noir" + "Cyberpunk" = "Neo-Noir")
3. **Apply**: Use the resulting DNA as your global style applied to every prompt

### Series Bible

Define world rules and lore that the AI enforces across all generations:

- Technology level (e.g., "no smartphones, 1940s era")
- Color rules (e.g., "red is only used for danger/blood")
- Architectural style (e.g., "Art Deco buildings throughout")
- Character relationships and arcs

The Series Bible is injected as context into all prompt generations, preventing the AI from breaking your world's internal logic.

### Whiteboard

Sketch visual concepts or camera motion paths directly on screen:

- Free-draw tool for rough compositions
- Arrow annotations for camera movement direction
- Text labels for reference notes
- Export sketches as reference images for Gemini Vision analysis

---

## 🎵 Audio Production

### Suno Architect

Create music prompts fully optimized for [Suno.ai](https://suno.com):

1. Open **Suno Studio** from the header studio selector
2. Configure using the wizard:
   - **Genre**: Electronic, Jazz, Orchestral, Rock, Hip-Hop, Lo-Fi, Ambient, Metal, Folk, R&B
   - **Vibe**: Dark, Uplifting, Mysterious, Energetic, Melancholic, Dreamy, Aggressive
   - **Tempo**: Slow (60–80 BPM), Medium (100–120 BPM), Fast (140+ BPM)
   - **Instruments**: Piano, Synth, Strings, Drums, Guitar, Bass, Brass, Woodwinds
3. Write or generate **Lyrics** with verse/chorus structure
4. **Export** — copy the optimized prompt and paste into Suno.ai
5. Import the generated audio back into your timeline

### Ambience Studio

Generate seamless, loopable background audio environments:

```
Input: "Busy cyberpunk market at night"

Output: Loopable ambient audio with layers:
- Crowd chatter (distant, multilingual)
- Neon sign buzzing and flickering
- Hover vehicle passing overhead
- Synthesized product advertisements
- Wind through narrow metal corridors
```

Use ambient tracks under dialogue and music to add depth and realism to your scenes.

### Recording Booth

Record voice-overs and narration directly in the app:

1. Click the **Record** icon (microphone) in the Audio panel
2. Grant microphone access when prompted
3. Use the built-in **Teleprompter** to read your script text
4. Click **Stop** when finished recording
5. Trim start/end directly in the waveform editor
6. Add the recording to a dialogue track on the timeline

### Foley Wizard

Auto-generate and synchronize sound effects:

1. Select a video clip on the timeline
2. Click **Magic Wand → Auto-Foley**
3. AI analyzes the video frames and identifies:
   - Footsteps (matched to character movement cadence)
   - Ambient environmental sounds
   - Impact and interaction sounds
   - Vehicle or mechanical sounds
4. Generated SFX are automatically placed on SFX tracks, synchronized to the visual action

### Auto-Ducking

Automatically lower music volume whenever dialogue is playing:

1. Open the **Mixer** panel
2. Enable the **Auto-Duck** toggle
3. Fine-tune the parameters:
   - **Threshold**: When to start ducking (default: -20 dB)
   - **Reduction**: How much to lower music (default: -12 dB)
   - **Attack**: How quickly ducking begins (default: 100 ms)
   - **Release**: How quickly music returns to full volume (default: 300 ms)

---

## 🎬 The Director's Chain

The **Director's Chain** is the most powerful feature in Veo Studio — an autonomous agent pipeline that handles the entire production workflow from shot list to finished timeline.

### How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  SHOT LIST  │ ──► │  AUDIO GEN   │ ──► │ CONCEPT ART │
│ (Storyboard)│     │  (TTS/Music) │     │  (Imagen 3) │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
                                               ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   TIMELINE   │ ◄── │  VIDEO GEN  │
                    │  (Ready!)    │     │  (Veo 3.1)  │
                    └──────────────┘     └─────────────┘
```

### Running the Director's Chain

1. **Prepare your Storyboard** — create shot cards with descriptions, assign characters and locations
2. **Ensure Characters and Locations are defined** — the chain uses Character Bank and Location Library for consistency
3. Click **"Auto-Render Movie"** (or use the Director's Chain panel)
4. Watch the autonomous pipeline:
   - **Step 1**: Dialogue audio is generated via TTS for each shot with dialogue
   - **Step 2**: Concept art (key frames) is generated for each shot using Imagen 3
   - **Step 3**: Video is generated using concept art as the reference first frame, ensuring visual consistency
   - **Step 4**: All clips are automatically placed on the timeline in shot order
5. Your timeline is now populated and ready for fine-tuning in post-production

### Cost Estimation

Before running the chain, Veo Studio provides a cost estimate showing expected API usage per model. You can set budget limits in **Settings → Cost Tracking** to prevent overspending.

---

## 🎞️ Post-Production & Timeline

### The NLE (Non-Linear Editor)

Access the timeline by clicking **Timeline** in the sidebar or opening the Video Studio.

```
┌────────────────────────────────────────────────────────────┐
│  [▶] [⏸] [⏮] [⏭]    00:01:23:15 / 00:05:00:00    [🔊]     │
├────────────────────────────────────────────────────────────┤
│  VIDEO    │ ████████░░░░░░████████████░░░░░░░░░░░░░░░░░░  │
│  TEXT     │ ░░░░░░░░████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  DIALOGUE │ ░░████░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░░░  │
│  SFX      │ ░░░░░░░░█░░░░░░░░░░░░░░░█░░░░░░░░░░░░░░░░░░░  │
│  MUSIC    │ ████████████████████████████████░░░░░░░░░░░░  │
├────────────────────────────────────────────────────────────┤
│  ▼ Zoom: [━━━●━━━━━]     Playback: [0.25x..1x..4x]        │
└────────────────────────────────────────────────────────────┘
```

### Track Types

| Track        | Purpose                                      | Key Operations                                   |
| ------------ | -------------------------------------------- | ------------------------------------------------ |
| **Video**    | Main footage and generated clips             | Trim, Split, Transition, Effects, Keyframe       |
| **Text**     | Titles, subtitles, lower thirds              | Font selection, animation, duration, positioning |
| **Dialogue** | Speech, voice-over recordings                | Smart Cut (silence removal), Fade, Volume        |
| **SFX**      | Sound effects (footsteps, impacts, ambience) | Sync to video, Volume, Pan, Fade                 |
| **Music**    | Background music and scores                  | Auto-Duck, Loop, Crossfade                       |

You can add multiple tracks of each type. Tracks can be locked (prevent accidental edits), muted (temporarily silent), or reordered by dragging.

### Editing Operations

| Operation            | How To                                        | Notes                                           |
| -------------------- | --------------------------------------------- | ----------------------------------------------- |
| **Trim**             | Drag the left or right edge of a clip         | Adjusts in/out points without deleting content  |
| **Split**            | Position playhead at desired frame → click ✂️ | Creates two independent clips from one          |
| **Move**             | Drag a clip horizontally to a new position    | Snaps to other clip edges and playhead          |
| **Delete**           | Select clip → press `Delete`                  | Removes clip from timeline                      |
| **Duplicate**        | Select clip → `Ctrl+D`                        | Creates a copy immediately after the original   |
| **Apply Transition** | Overlap two adjacent clips                    | Choose from cut, fade, dissolve, wipe, slide    |
| **Speed Ramping**    | Right-click clip → Speed Ramping              | Apply variable speed within a single clip       |
| **Link/Unlink**      | Right-click → Link/Unlink Audio               | Lock or separate video and audio clips together |

### Smart Cut

Automatically remove silence from dialogue tracks:

1. Select a dialogue clip on the timeline
2. Click **Smart Cut** (or right-click → "Remove Silence")
3. Adjust the **silence threshold** (how quiet counts as "silence")
4. Preview the result
5. Click **Apply** — silence segments are cut, leaving only speech

Smart Cut uses Web Workers for audio analysis, so it runs without blocking the UI.

### Transitions

| Transition   | Effect                 | Best For                       |
| ------------ | ---------------------- | ------------------------------ |
| **Cut**      | Instant switch         | Fast-paced editing, news style |
| **Fade**     | Gradual opacity change | Scene changes, time passing    |
| **Dissolve** | Cross-dissolve overlap | Smooth scene transitions       |
| **Wipe**     | Edge sweep             | Stylistic scene changes        |
| **Slide**    | Push in/out            | Social media, dynamic content  |

AI-suggested transitions are available — Veo Studio analyzes the content of adjacent clips and recommends the most cinematic transition.

### Keyframe Animation

Animate clip properties over time:

1. Select a clip on the timeline
2. Open the **Keyframes** panel
3. Choose a property to animate: Position, Scale, Rotation, Opacity
4. Set keyframes at different time points
5. Choose an easing curve: Linear, Ease-In, Ease-Out, Ease-In-Out, or custom Bezier

### Montage Builder

Create beat-synchronized montages:

1. Place your music track first
2. Select multiple video clips
3. Click **Auto-Montage**
4. AI detects audio beats and cuts video clips to match the rhythm
5. Adjust pacing (fast cuts vs. slow reveals) with the pacing slider

---

## 🎨 Visual Composer

The Visual Composer is a node-based editor for building complex, reusable prompt architectures visually.

### Getting Started

1. Click **Composer** in the sidebar
2. Drag blocks from the palette onto the canvas
3. Connect blocks by drawing wires between input/output ports
4. Click **Compile** to generate the final prompt text

### Guided Tour

Click the **Tour** button in the Composer toolbar for a step-by-step walkthrough of all features, including the toolbar, block palette, canvas, and evaluation controls.

### Block Types

| Block              | Purpose                           | Example                                   |
| ------------------ | --------------------------------- | ----------------------------------------- |
| **Subject Block**  | Define main elements              | "A medieval knight"                       |
| **Action Block**   | Describe movements and activities | "riding a horse through a forest"         |
| **Style Block**    | Apply visual aesthetics           | "in the style of Studio Ghibli"           |
| **Camera Block**   | Set camera parameters             | "slow dolly-in, 85mm lens"                |
| **Modifier Block** | Add effects and adjustments       | "with lens flare, shallow depth of field" |

### Composer Keyboard Shortcuts

| Shortcut           | Action                    |
| ------------------ | ------------------------- |
| `Space + Drag`     | Pan the canvas            |
| `Ctrl + Scroll`    | Zoom in/out               |
| `Ctrl + 0`         | Reset zoom to fit         |
| `Delete`           | Remove selected blocks    |
| `Ctrl + C / V`     | Copy / paste blocks       |
| `Ctrl + Z`         | Undo                      |
| `Ctrl + Shift + Z` | Redo                      |
| Right-click block  | Context menu with options |

---

## 🪄 AI Magic Tools

### Prompt Enhancement (AI Suggest)

Click the **magic wand** button next to any prompt field to get AI-powered improvements:

- **Specificity boost** — Adds concrete details to vague descriptions
- **Style suggestions** — Recommends complementary visual styles
- **Scene expansion** — Expands brief notes into rich, detailed prompt text
- **Token optimization** — Reduces token count without losing quality

### Prompt Scoring

Every generated prompt receives a **Quality Score** (0–100) based on:

| Factor                  | Weight | What It Measures                                    |
| ----------------------- | ------ | --------------------------------------------------- |
| **Completeness**        | 25%    | Are all important fields filled?                    |
| **Specificity**         | 30%    | How detailed and precise is the language?           |
| **Coherence**           | 25%    | Do all elements work together logically?            |
| **Model Compatibility** | 20%    | Are there features unsupported by the target model? |

Actionable improvement suggestions are shown below each score.

### Voice-to-Prompt

Create prompts by speaking naturally:

1. Click the **microphone** icon in the prompt builder
2. Speak your scene description conversationally
3. AI converts speech to text and parses it into structured prompt fields
4. Review and refine the extracted parameters

### AI Chat Assistant

Get conversational guidance without leaving the app:

1. Open **Help → Chat** (or the Chat Bot panel)
2. Ask questions like:
   - "How do I create a film noir look?"
   - "What camera movement works best for a chase scene?"
   - "Why does my generated video look blurry?"
3. The assistant provides technique explanations, troubleshooting, and prompting advice

### Global Dub

Translate and re-voice dialogue for international audiences:

1. Select a shot with dialogue
2. Click **Dubbing**
3. Choose target language (Spanish, French, German, Japanese, Korean, etc.)
4. AI performs:
   - Script translation (preserving tone and intent)
   - TTS audio generation in the target language
   - Lip-sync adjustment to match the new audio

### Inpainting (Magic Fixer)

Fix visual glitches or unwanted elements in generated video:

1. Select a video frame on the timeline
2. Click **Inpaint** (or Magic Wand → Fix)
3. Use the brush tool to mask the area that needs fixing
4. Describe the fix: "Clean background" or "Remove artifact" or "Add a window"
5. Click **Generate** — AI replaces the masked area

### Generative Canvas (Outpainting)

Change aspect ratios without cropping — AI fills in new areas:

1. Select a video clip on the timeline
2. Click **Canvas → Expand**
3. Choose the new aspect ratio (e.g., 16:9 → 9:16)
4. AI generates content for the newly exposed frame areas, maintaining visual consistency

### Chroma Key (Green Screen)

Real-time green screen removal using WebGL shaders:

1. Import or generate a clip with a green/blue background
2. Apply **Chroma Key** effect
3. Adjust the key color, tolerance, and edge softness
4. Composite over another video track

### Color Grading

Apply cinematic looks to your footage:

- **Preset LUTs** — Film Noir, Vintage, Teal & Orange, Desaturated, Warm Summer
- **Color Wheels** — Lift (shadows), Gamma (midtones), Gain (highlights)
- **Scopes** — Waveform, Vectorscope, Histogram for precise adjustments
- **Save custom grades** — Share your looks across projects

### AI Upscaling

Enhance resolution of generated video frames:

1. Select a clip on the timeline
2. Right-click → **Upscale**
3. Choose target resolution (e.g., 720p → 1080p, or 1080p → 4K)
4. AI enhances sharpness and detail while preserving the visual style

### Motion Brush

Paint motion onto specific regions of a video frame:

1. Open **Motion Brush** in the studios
2. Paint the region you want to animate
3. Define motion direction and intensity with motion vectors
4. Preview the motion effect in real-time

### Object Segmentation

Isolate objects from backgrounds using AI:

1. Select a clip and open **Segmentation**
2. AI automatically detects and outlines objects
3. Choose which objects to isolate, remove, or replace
4. Supports rotoscoping (frame-by-frame) and depth mapping for parallax effects

---

## 🤝 Collaboration & Teamwork

Veo Studio supports real-time multiplayer editing so teams can work on the same project simultaneously.

### Setting Up Collaboration

1. Open **Collaborate** from the sidebar
2. If this is your first time, complete **Profile Setup**:
   - Enter a **display name**
   - Choose an **avatar color**
3. Click **Create Room** to start a new session
4. Share the **6-character room code** or **shareable link** with your team
5. Team members open **Collaborate** and enter the room code to join

### Presence Indicators

When collaborating, the header shows colored dots for each active user. You can see:

- Who is currently online
- Which area of the project they are editing
- Their cursor position in real-time

### Comment System

Add contextual discussion threads tied to specific parts of your project:

1. Open **Comments** from the sidebar
2. Click **+ New Comment** and type your feedback
3. Comments support:
   - **Thread replies** — Every comment can have a reply chain
   - **@mentions** — Tag specific collaborators
   - **Reactions** — Quick emoji reactions
   - **Resolve/Unresolve** — Mark comments as addressed
   - **Timecode attachment** — Link comments to specific timeline positions

### Team Roles

Control who can do what with role-based permissions:

| Role       | Permissions                                                              |
| ---------- | ------------------------------------------------------------------------ |
| **Viewer** | Read-only access. Can view project and add comments                      |
| **Editor** | Full editing access. Can modify prompts, timeline, and settings          |
| **Admin**  | Full access plus role management, sharing controls, and project deletion |

### Conflict Resolution

When two editors change the same data simultaneously, Veo Studio uses **Yjs CRDTs** (Conflict-free Replicated Data Types) for automatic conflict-free merging. When automatic resolution isn't possible:

1. A **Conflict Resolution** panel appears in the sidebar
2. Review each conflict showing "Your version" vs. "Their version"
3. Choose which version to keep, or merge manually
4. Resolve all conflicts before exporting

### Technology

- **Yjs CRDTs** — Conflict-free replicated data types for concurrent state management
- **WebRTC** — Peer-to-peer data channels for low-latency synchronization
- **Incremental sync** — Only changed data is transmitted, not the full state
- **Offline support** — Changes are queued while offline and synced when reconnected
- **Cross-tab sync** — Multiple browser tabs stay in sync via Broadcast Channel API

---

## 📦 Export & Delivery

### Quick Export

1. Click the **Export** button in the header or timeline
2. Choose quality tier:

| Quality      | Resolution | Speed    | Use Case                               |
| ------------ | ---------- | -------- | -------------------------------------- |
| **Draft**    | 720p       | Fast     | Internal review, placeholder edits     |
| **Standard** | 1080p      | Balanced | Social media, presentations, most uses |
| **High**     | 4K         | Slow     | Final delivery, professional output    |

3. Click **Render** — FFmpeg.wasm processes the video entirely on your device
4. Download the `.mp4` file when complete

### Platform-Optimized Export Profiles

Pre-configured export settings for popular platforms:

| Platform            | Resolution | Aspect Ratio | Format       | Notes                           |
| ------------------- | ---------- | ------------ | ------------ | ------------------------------- |
| **YouTube**         | 1080p / 4K | 16:9         | MP4 (H.264)  | Optimized bitrate for streaming |
| **TikTok**          | 1080x1920  | 9:16         | MP4 (H.264)  | Vertical, short-form optimized  |
| **Instagram Reels** | 1080x1920  | 9:16         | MP4 (H.264)  | Under 90 seconds                |
| **Instagram Feed**  | 1080x1080  | 1:1          | MP4 (H.264)  | Square format                   |
| **Twitter/X**       | 1280x720   | 16:9         | MP4 (H.264)  | Compressed for fast upload      |
| **Custom**          | Any        | Any          | MP4/WebM/GIF | Define your own profile         |

### Smart Social Crop

Reframe wide videos for vertical platforms automatically:

1. Select your 16:9 export
2. Click **Social Crop**
3. AI tracks the main subject and creates:
   - **9:16 version** (TikTok, Reels, YouTube Shorts) — subject kept centered
   - **1:1 version** (Instagram Feed) — intelligently cropped

### Professional Export (NLE Interchange)

Export your timeline for import into external editing software:

1. Click **Export → Professional**
2. Choose the target NLE format:
   - **DaVinci Resolve** (FCPXML)
   - **Adobe Premiere Pro** (XML)
   - **Final Cut Pro** (FCPXML)
3. Download a ZIP containing:
   - All source clips (video, audio)
   - Timeline metadata (edit points, transitions)
   - Edit Decision List (EDL)

### Additional Export Formats

| Format                   | Use Case                                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| **JSON**                 | Full prompt data with metadata (import into other tools or scripts)        |
| **CSV**                  | Spreadsheet-compatible (shot lists, prompt catalogs)                       |
| **PDF**                  | Formatted document with previews (client presentations, storyboard review) |
| **Markdown**             | Structured text (documentation, wikis)                                     |
| **XML**                  | Structured data exchange                                                   |
| **ZIP**                  | Bundled project with all assets                                            |
| **cURL / Code Snippets** | Generate API calls in Python, JavaScript, or TypeScript                    |

### Batch Export

Export multiple clips with different settings simultaneously:

1. Select clips to export (or choose "Export All")
2. Assign export profiles to each clip (or use a single profile for all)
3. Click **Batch Export** — all renders run in a background queue
4. Monitor progress in the **Job Queue** panel

---

## 🔌 Plugin System & Marketplace

### Installing Plugins

1. Click **Marketplace** in the sidebar
2. Browse by category: Prompts, Effects, Transitions, Exporters
3. Read ratings, reviews, and usage stats
4. Click **Install** — the plugin downloads and enables automatically
5. Some plugins may require an app restart

### Plugin Categories

| Category               | Examples                                            |
| ---------------------- | --------------------------------------------------- |
| **Prompt Plugins**     | New style presets, prompt templates, model adapters |
| **Effect Plugins**     | Custom video effects, filters, color grades         |
| **Transition Plugins** | New transition types (glitch, morph, ink bleed)     |
| **Exporter Plugins**   | Additional export formats, platform integrations    |

### Plugin Permissions and Security

Plugins run in a **sandboxed environment** with explicit permission controls:

- Each plugin declares required permissions in its manifest
- Package signatures are verified before installation
- File integrity checks prevent tampering
- You can review and revoke permissions at any time in **Settings → Plugins**

### Developing Plugins

Veo Studio provides a full TypeScript Plugin SDK:

- Hook into prompt builder, timeline, export, and UI systems
- Hot reload during development
- Enhanced debug logging
- See the [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md) and [Plugin API Reference](docs/PLUGIN_API.md)

---

## ⚡ Batch Generation & Automation

### Batch Prompt Generation

Generate multiple prompt variations from a single base concept:

1. Click **Batch Generate** in the toolbar or sidebar
2. Enter your base prompt
3. Select variation type:
   - **Camera Angles** — Generate with different camera movements
   - **Styles** — Apply different visual styles to the same scene
   - **Durations** — Create 5s and 8s versions
   - **Models** — Generate using both Veo and Sora for comparison
4. Click **Generate Batch**
5. Review all results in the batch results panel
6. Export selected results or send them all to the timeline

### Job Queue

All long-running operations are managed by the **Job Queue**:

- **Priority levels** — Reorder pending jobs by priority
- **Pause/Resume** — Pause individual jobs or the entire queue
- **Progress tracking** — Real-time progress bars with ETA for each job
- **Error recovery** — Failed jobs retry with exponential backoff
- **Cost tracking** — See estimated and actual cost per job

Access the Job Queue from the sidebar or the notification area.

### Generation Queue

For API-intensive operations, the Generation Queue manages:

- **Rate limiting** — Respects API rate limits with automatic throttling
- **Concurrent execution** — Configurable parallelism (1–4 simultaneous requests)
- **Result caching** — Avoids duplicate API calls for identical prompts
- **Budget enforcement** — Pauses the queue when daily/weekly/monthly budget limits are reached

### Circuit Breaker

When an API endpoint fails repeatedly, the circuit breaker automatically:

- Detects the failure pattern
- Temporarily disables calls to the failing endpoint
- Falls back to cached results or alternative models
- Re-enables the endpoint after a cool-down period, resuming normal operation

---

## 📜 Prompt History & Templates

### Prompt History

Every prompt you generate is automatically saved with full metadata:

- **Timestamp** and **model used**
- **All input parameters** (style, camera, scene, character settings)
- **Quality score** at generation time
- **Tags and project association**

#### Navigating History

- Open **History** from the sidebar (or press `Ctrl+H`)
- **Search** by text, tags, model, or date range with fuzzy matching
- **Filter** by favorites, project, score range
- **Diff Comparison** — Select any two prompts and view a side-by-side visual diff with syntax highlighting
- **One-click reload** — Click any history entry to reload its full configuration
- **Export history** as JSON for backup or sharing

### Template System

Templates let you save and reuse successful prompt configurations:

#### Built-In Templates

| Template           | Description                                         |
| ------------------ | --------------------------------------------------- |
| **Cinematic Film** | Wide lenses, dramatic lighting, 2.39:1 aspect ratio |
| **Music Video**    | Dynamic camera, neon palette, high energy           |
| **Documentary**    | Natural lighting, medium shots, steady camera       |
| **Anime**          | Anime art style, vibrant colors, dramatic angles    |
| **Commercial**     | Product-focused, clean lighting, professional       |
| **Social Short**   | Vertical, fast-paced, attention-grabbing            |

#### Custom Templates

1. Configure your prompt with the desired settings
2. Click **Save as Template**
3. Name it, add a category and tags
4. The template appears in your Template Library

#### Variable Placeholders

Templates support dynamic variables using `{{variable_name}}` syntax:

```
A {{character}} walks through a {{location}} at {{time_of_day}},
wearing a {{wardrobe_description}}.
```

When you apply a template with variables, Veo Studio prompts you to fill in each value with auto-fill suggestions from your Character Bank and Location Library.

#### Sharing Templates

- **Export** — Save templates as JSON files to share with others
- **Import** — Load shared templates from JSON files
- **Community** — Browse and rate shared templates from other users

---

## 🔍 Diagnostics & Project Health

### AI Project Optimization (v3.4.0+)

Run automated analysis on your project to improve quality:

| Analysis                   | What It Checks                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| **Quality Scoring**        | Prompt completeness, specificity, and coherence across all shots |
| **Cost Estimation**        | Expected API costs for generating all prompts in your project    |
| **Narrative Checks**       | Continuity errors, pacing issues, character consistency gaps     |
| **Preset Recommendations** | Suggests optimal presets based on your project's content         |

Access from **Tools → Project Optimization** or the Diagnostics panel.

### Performance Metrics

Veo Studio tracks internal performance for optimization:

- **Hydration time** — How fast the app reaches interactive state
- **Studio load latency** — How long each studio takes to open
- **Render throughput** — Frames per second during rendering
- **Memory usage** — Current and peak memory consumption

### Autosave & Crash Recovery

- **Autosave** runs at configurable intervals, saving your project automatically
- **Crash detection** — If the app terminates abnormally, it is detected on next launch
- **State recovery** — On restart after a crash, your last autosaved state is restored
- **Crash counter** — Tracks crash frequency; repeated crashes trigger Safe Mode

### Safe Mode (Desktop)

If the Electron app detects a crash loop (or is launched with `--safe-mode`):

1. Heavy studios and plugins are temporarily disabled
2. A diagnostic banner appears at the top of the app
3. You can inspect logs, disable risky modules, and test stability
4. Once stable, re-enable features one at a time

---

## 💻 CLI Mode

Veo Studio includes a command-line interface for scripting and automation:

```bash
# Run any CLI command
node --import tsx src/cli/ <command> [options]
```

### Available Commands

| Command        | Description                                              |
| -------------- | -------------------------------------------------------- |
| `generate`     | Generate a prompt from text with model and style options |
| `batch`        | Batch generate from a JSON file of prompts               |
| `score`        | Score a prompt's quality (0–100 with suggestions)        |
| `enhance`      | AI-enhance a prompt via Gemini                           |
| `template`     | List, apply, or save templates                           |
| `render`       | Render a timeline to a video file                        |
| `export-clip`  | Export a single clip                                     |
| `export-batch` | Batch export with profiles                               |
| `create`       | Create a new project from a template                     |
| `open`         | Open an existing project                                 |
| `list`         | List all saved projects                                  |
| `export`       | Export a project as a bundle                             |
| `import`       | Import a project from a bundle                           |
| `info`         | Show project and app information                         |
| `health`       | Run app health diagnostics                               |
| `config`       | View or set configuration                                |
| `version`      | Show version information                                 |

### Examples

```bash
# Generate a prompt for a specific scene
node --import tsx src/cli/ generate \
  --prompt "A drone shot over mountains at sunset" \
  --model veo3

# Batch generate from a file
node --import tsx src/cli/ batch \
  --input prompts.json \
  --output ./renders/

# Score a prompt
node --import tsx src/cli/ score \
  --prompt "A cat walking on a beach at golden hour"

# Export project as a portable bundle
node --import tsx src/cli/ export \
  --project "My Project" \
  --output ./bundle.zip

# Run health diagnostics
node --import tsx src/cli/ health --json
```

All commands support the `--json` flag for machine-readable output, making them easy to integrate with scripts and CI/CD pipelines.

---

## ⌨️ Keyboard Shortcuts

### Playback

| Shortcut | Action         |
| -------- | -------------- |
| `Space`  | Play / Pause   |
| `J`      | Play backward  |
| `K`      | Stop           |
| `L`      | Play forward   |
| `←`      | Previous frame |
| `→`      | Next frame     |
| `Home`   | Go to start    |
| `End`    | Go to end      |

### Editing

| Shortcut           | Action          |
| ------------------ | --------------- |
| `Ctrl + Z`         | Undo            |
| `Ctrl + Shift + Z` | Redo            |
| `Ctrl + C`         | Copy            |
| `Ctrl + V`         | Paste           |
| `Ctrl + X`         | Cut             |
| `Delete`           | Delete selected |
| `Ctrl + D`         | Duplicate       |
| `Ctrl + S`         | Save project    |

### Generation

| Shortcut       | Action               |
| -------------- | -------------------- |
| `Ctrl + Enter` | Generate prompt      |
| `Ctrl + G`     | Send to Video Studio |
| `Shift + N`    | New shot             |

### Navigation

| Shortcut      | Action                                                              |
| ------------- | ------------------------------------------------------------------- |
| `1` – `6`     | Switch to Style / Camera / Scene / Character / Audio / Advanced tab |
| `Tab`         | Next section                                                        |
| `Shift + Tab` | Previous section                                                    |
| `Ctrl + H`    | Open prompt history                                                 |
| `Ctrl + K`    | Command palette                                                     |
| `Ctrl + ,`    | Open settings                                                       |
| `?` or `F1`   | Open help panel                                                     |
| `Esc`         | Close panel / dialog / tutorial                                     |

### Visual Composer

| Shortcut        | Action                 |
| --------------- | ---------------------- |
| `Space + Drag`  | Pan the canvas         |
| `Ctrl + Scroll` | Zoom in/out            |
| `Ctrl + 0`      | Reset zoom             |
| `Delete`        | Delete selected blocks |
| `Ctrl + C / V`  | Copy / paste blocks    |

> 💡 Press `?` at any time to see all keyboard shortcuts in a searchable overlay.

---

## ⚙️ Settings & Configuration

Click the **⚙️ Settings** button (bottom-left corner or `Ctrl+,`) to access all configuration options.

### General Settings

| Setting      | Description                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **API Key**  | View status, enter new key, or clear stored key. Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **Theme**    | Toggle Dark / Light theme                                                                                                       |
| **Language** | Application language (i18n support)                                                                                             |
| **Autosave** | Enable/disable and configure autosave interval                                                                                  |

### Project Settings

| Setting              | Options                            | Default |
| -------------------- | ---------------------------------- | ------- |
| **Aspect Ratio**     | 16:9, 9:16, 1:1, 4:3, 21:9, 2.39:1 | 16:9    |
| **Resolution**       | 720p, 1080p, 4K                    | 1080p   |
| **Frame Rate**       | 24, 30, 60 fps                     | 24 fps  |
| **Default Duration** | 5s, 8s, 10s, 15s                   | 8s      |

### Model Profiles

Configure parameters for each AI model:

| Profile     | Parameters                                                    |
| ----------- | ------------------------------------------------------------- |
| **Veo 3.1** | Temperature, top-k, top-p, max tokens, aspect ratio, duration |
| **Veo 2**   | Same as above with different defaults                         |
| **Sora**    | OpenAI-specific parameters                                    |
| **Custom**  | Create your own profile with any parameters                   |

### Auto-Update Settings (Desktop)

| Setting             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| **Release Channel** | Stable (recommended), Beta (early access), Dev (bleeding edge) |
| **Auto-Check**      | Enable/disable automatic update checking                       |
| **Check Interval**  | How often to check (30 min to 24 hours)                        |
| **Auto-Download**   | Automatically download updates when available                  |
| **Auto-Install**    | Automatically install and restart                              |

Click **"Check for Updates Now"** to manually check. Update notifications show version number, changelog preview, and download progress.

### Cost Tracking

| Setting                | Description                                 |
| ---------------------- | ------------------------------------------- |
| **Budget Limits**      | Set daily, weekly, or monthly spending caps |
| **Per-Model Tracking** | See cost breakdown by model                 |
| **Usage Analytics**    | Visualize spending trends over time         |
| **Alerts**             | Get notified when approaching budget limits |

### Plugin Settings

| Setting                 | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| **Installed Plugins**   | View, enable, disable, or uninstall plugins                |
| **Permissions**         | Review and manage plugin permissions                       |
| **Auto-Update Plugins** | Keep plugins up to date automatically                      |
| **Development Mode**    | Enable hot reload and debug logging for plugin development |

---

## 🔧 Troubleshooting

### Common Issues

| Problem                            | Solution                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Blank screen on launch**         | Clear browser cache (web) or reinstall the AppImage (desktop). Try launching with `--safe-mode` |
| **"No API key configured"**        | Click the 🔑 button and add your Google AI Studio API key                                       |
| **Video generation fails**         | Check API quota at [Google AI Studio](https://aistudio.google.com). Try a simpler prompt first  |
| **Audio not playing**              | Check browser/system volume. Ensure microphone permissions are granted if recording             |
| **Slow performance**               | Close other browser tabs. Reduce preview quality. Enable proxy mode for large projects          |
| **Export fails**                   | Check available disk space. Try a different format. Verify prompt data is valid                 |
| **Plugins not loading**            | Verify plugin `engineVersion` compatibility. Reinstall the plugin                               |
| **Composer blocks not connecting** | Ensure block types are compatible. Check for circular dependencies                              |
| **Collaboration not syncing**      | Check internet connection. Verify all users have the correct room code                          |

### Error Messages

| Error               | Meaning                          | Solution                                                      |
| ------------------- | -------------------------------- | ------------------------------------------------------------- |
| `QUOTA_EXCEEDED`    | API rate limit reached           | Wait 1 minute or check your plan at Google AI Studio          |
| `INVALID_API_KEY`   | API key is incorrect or expired  | Re-enter or regenerate your key                               |
| `GENERATION_FAILED` | AI couldn't complete the request | Try a different prompt or simplify your request               |
| `NETWORK_ERROR`     | No internet connection           | Check your connection. Offline mode works for non-AI features |
| `STORAGE_QUOTA`     | IndexedDB storage is full        | Export and archive old projects. Clear unused assets          |
| `PLUGIN_ERROR`      | A plugin encountered an error    | Disable the plugin in Settings → Plugins. Check for updates   |

### Desktop App Troubleshooting

| Problem               | Solution                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **App won't launch**  | Check system requirements. Run as administrator (Windows). Check logs at `~/.loofi-veo-prompt-generator/logs/` |
| **Auto-update fails** | Check internet. Temporarily disable antivirus. Download update manually from GitHub                            |
| **Crash loop**        | Launch with `--safe-mode` flag. Disable heavy studios. Check crash logs                                        |
| **High memory usage** | Close unused studios. Reduce timeline zoom. Clear render cache                                                 |

### Diagnostic Tools

1. Open **Settings → Diagnostics** (or `Ctrl+,` then Diagnostics tab)
2. Click **Run System Check** — tests storage, API connectivity, performance
3. Review results and follow recommendations
4. **Export Diagnostic Logs** — attach to GitHub issues for support

### Getting Help

- **In-App Help**: Press `?` or `F1` to open the searchable help panel with categories, topics, and shortcuts
- **AI Chat Assistant**: Use the built-in Chat Bot (Help → Chat) for conversational guidance
- **GitHub Issues**: [Report bugs or request features](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/issues)
- **GitHub Discussions**: Ask questions and share tips with the community
- **Wiki**: [Community documentation](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/wiki)

---

## 🎓 Tips for Best Results

### Prompt Engineering Best Practices

1. **Be Specific**: "A red 1965 Ford Mustang convertible" > "a car"
2. **Describe Motion**: "Walking slowly with a limp" > "walking"
3. **Set the Mood**: "Ominous, low-key chiaroscuro lighting" > "dark"
4. **Layer Details**: Start with the core subject, then add action → setting → style → camera
5. **Use the Scoring System**: Aim for 80+ quality score before generating video
6. **Iterate on One Variable**: Change one thing at a time between generations to understand what works

### Character Consistency

1. **Always use the Character Bank** — never describe the same character differently between shots
2. Reference the **same character name** across all shots
3. Lock **wardrobe and hairstyle** — small changes break continuity
4. Use **similar lighting setups** across shots featuring the same character
5. Use the **Series Bible** to define world rules the AI must follow

### Camera Movement Tips

| Movement      | Mood Created                        | Best For                                 |
| ------------- | ----------------------------------- | ---------------------------------------- |
| **Static**    | Stable, observational, documentary  | Dialogue scenes, establishing shots      |
| **Pan**       | Reveals environment, follows action | Panoramic landscapes, group scenes       |
| **Dolly In**  | Builds intimacy, focus, tension     | Emotional moments, dramatic reveals      |
| **Dolly Out** | Creates distance, sadness, finality | Endings, character isolation             |
| **Tracking**  | Energy, involvement, pursuit        | Action sequences, sports, chase          |
| **Drone**     | Epic scale, freedom, wonder         | Establishing shots, nature, architecture |
| **Orbit**     | Showcases 3D space, dramatic reveal | Product showcase, character intro        |
| **Crane**     | Grandeur, cinematic sweep           | Opening shots, transitions               |
| **Handheld**  | Raw, documentary, urgency           | Found footage, combat, protests          |

### Performance Tips

1. Enable **Proxy Mode** for large projects — generates lightweight preview files
2. Use **Smart Cut** on dialogue tracks first to remove dead air
3. Generate videos in batches of 1–4 at a time for optimal API usage
4. Export at **Draft** quality for internal reviews, **High** for final delivery
5. Use the **Generation Queue** to avoid exceeding API rate limits
6. **Close unused studios** — each open studio consumes memory

---

## 📖 Glossary

| Term                 | Definition                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| **CRDT**             | Conflict-free Replicated Data Type — allows multiple users to edit simultaneously without conflicts |
| **Director's Chain** | Autonomous pipeline that generates audio, concept art, and video for each shot automatically        |
| **FFmpeg.wasm**      | WebAssembly port of FFmpeg that enables video rendering entirely in the browser                     |
| **IndexedDB**        | Browser-based database for storing project data, assets, and settings locally                       |
| **LUT**              | Look-Up Table — a file that maps input color values to output values for color grading              |
| **NLE**              | Non-Linear Editor — a video editing system that allows random access to any frame                   |
| **Outpainting**      | AI technique that generates content beyond the original frame boundaries                            |
| **Proxy**            | Low-resolution version of a clip used for smooth editing, replaced by full-res at export            |
| **Smart Cut**        | Automated silence removal from audio tracks using waveform analysis                                 |
| **Visual DNA**       | Style parameters extracted from a reference image that can be applied to prompts                    |
| **WebRTC**           | Web Real-Time Communication — peer-to-peer protocol used for collaboration                          |
| **Yjs**              | CRDT framework used for real-time collaborative state synchronization                               |
| **Zustand**          | Lightweight state management library used for all application state                                 |
| **Zundo**            | Undo/redo middleware for Zustand providing temporal state management                                |

---

<p align="center">
  <strong>🎬 Veo Studio v3.6.0 — The Future of Filmmaking 🎬</strong>
</p>

<p align="center">
  <em>For more information, visit the <a href="https://github.com/loofitheboss/Loofi-Veo-prompt-generator">GitHub repository</a></em>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/loofitheboss">Loofi</a>
</p>

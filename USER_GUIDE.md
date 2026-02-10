# 📖 Veo Studio - Complete User Guide

**Version 3.5.0** | *Last Updated: February 2026*

Welcome to **Veo Studio**, the integrated development environment (IDE) for AI Cinema. This comprehensive guide covers everything from initial setup to advanced production workflows.

---

## 📑 Table of Contents

1. [Getting Started](#-getting-started)
2. [The Interface](#-the-interface)
3. [Pre-Production Workflow](#-pre-production-workflow)
4. [Asset Management](#-asset-management)
5. [Audio Production](#-audio-production)
6. [The Director's Chain](#-the-directors-chain)
7. [Post-Production & Timeline](#-post-production--timeline)
8. [AI Magic Tools](#-ai-magic-tools)
9. [Export & Delivery](#-export--delivery)
10. [Keyboard Shortcuts](#-keyboard-shortcuts)
11. [Settings & Configuration](#-settings--configuration)
12. [Troubleshooting](#-troubleshooting)

---

## 🚀 Getting Started

### First Launch

When you first open Veo Studio, you'll be greeted by the **New Project Wizard**. This helps you configure your project for the best results.

#### Template Selection

| Template | Best For | Aspect Ratio | Duration |
|----------|----------|--------------|----------|
| **Cinematic Film** | Movies, shorts | 16:9 (2.39:1) | Long-form |
| **Music Video** | Songs, performances | 16:9 | 3-5 minutes |
| **Social Vertical** | TikTok, Reels, Shorts | 9:16 | 15-60 seconds |
| **Documentary** | Interviews, narration | 16:9 | Variable |
| **Commercial** | Ads, promos | 16:9 / 1:1 | 15-30 seconds |

#### API Key Setup

Your API key is required for AI features. The app comes with a built-in key, but you can use your own:

1. Click the **🔑 Key** button (bottom-left corner)
2. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Create a new API key
4. Paste it into the modal and click **Save**

> 💡 **Privacy**: Your API key is stored locally on your device and never sent to external servers.

---

## 🖥️ The Interface

### Main Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER: Studios | Tools | Settings | Theme              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │                  │  │                                │  │
│  │   INPUT PANEL    │  │      OUTPUT PREVIEW           │  │
│  │                  │  │                                │  │
│  │  - Core Concept  │  │  - Generated Prompt           │  │
│  │  - Style Tab     │  │  - Video Preview              │  │
│  │  - Camera Tab    │  │  - Actions                    │  │
│  │  - Scene Tab     │  │                                │  │
│  │  - Character Tab │  │                                │  │
│  │  - Audio Tab     │  │                                │  │
│  │                  │  │                                │  │
│  └──────────────────┘  └────────────────────────────────┘  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  EXAMPLES CAROUSEL (when no prompt is generated)          │
└────────────────────────────────────────────────────────────┘
```

### Header Studios

| Icon | Studio | Purpose |
|------|--------|---------|
| 🎬 | **Video Studio** | Generate and manage video clips |
| 🖼️ | **Image Studio** | Create concept art and stills |
| 🎵 | **Suno Studio** | Design music prompts for Suno.ai |
| 📊 | **Analysis Studio** | Analyze and extend existing videos |
| 📝 | **Script Studio** | Write and structure screenplays |
| 📐 | **Storyboard** | Visual shot planning |

### Input Tabs

| Tab | Controls |
|-----|----------|
| **Style** | Art style, color palette, lighting |
| **Camera** | Movement, lens, distance, composition |
| **Scene** | Environment, weather, time of day |
| **Character** | Appearance, clothing, actions, emotions |
| **Audio** | Voice-over, ambient sounds, music cues |
| **Advanced** | Resolution, model selection, fine-tuning |

---

## 🎭 Pre-Production Workflow

### Step 1: Define Your Concept

Start with the **Core Concept** section:

```
Example: A mysterious detective walks through a rain-soaked 
alley in 1940s Chicago, their trench coat collar turned up 
against the cold.
```

**Tips for Better Prompts:**

- ✅ Be specific about actions and movements
- ✅ Include sensory details (lighting, weather)
- ✅ Describe the emotional tone
- ❌ Avoid vague descriptions like "cool video"
- ❌ Don't include technical camera terms (handled by Camera tab)

### Step 2: Choose Your Model

Use the **Target Model Toggle** to select:

| Model | Best For | Speed | Quality |
|-------|----------|-------|---------|
| **Veo** | Cinematic, high-quality | Slower | ⭐⭐⭐⭐⭐ |
| **Sora** | Fast iterations, experiments | Faster | ⭐⭐⭐⭐ |

### Step 3: Configure Style

Open the **Style** tab:

1. **Art Style**: Photorealistic, Anime, Watercolor, etc.
2. **Color Palette**: Warm, Cool, Neon, Vintage, etc.
3. **Lighting**: Natural, Neon, Volumetric, Studio, etc.

> 💡 **Pro Tip**: Use the **AI Suggest** button to get style recommendations based on your concept.

### Step 4: Set Up Camera

Open the **Camera** tab:

| Control | Options |
|---------|---------|
| **Movement** | Static, Pan, Tilt, Dolly, Tracking, Drone |
| **Lens** | Wide (14mm), Normal (50mm), Telephoto (85mm+) |
| **Distance** | Extreme Close-up, Close-up, Medium, Wide, Extreme Wide |
| **Composition** | Rule of Thirds, Center, Golden Ratio |

---

## 📦 Asset Management

### Character Bank

Create consistent characters that appear the same across all shots.

#### Creating a Character

1. Open **Character Bank** from the header
2. Click **+ New Character**
3. Fill in the details:

| Field | Example |
|-------|---------|
| **Name** | Detective Morgan |
| **Age** | 45 |
| **Gender** | Female |
| **Ethnicity** | East Asian |
| **Body Type** | Athletic |
| **Hair** | Short, black, slicked back |
| **Eyes** | Dark brown, intense |
| **Wardrobe** | Tan trench coat, white shirt, loose tie |
| **Distinguishing Features** | Scar above left eyebrow |

#### Using Characters

When a character is selected in a shot, Veo Studio automatically injects their description into every prompt, ensuring consistency.

### Location Library

Save reusable environments:

1. Open **Location Library**
2. Click **+ New Location**
3. Define:
   - **Name**: "Noir Alley"
   - **Description**: "Narrow brick alley with fire escapes, puddles reflecting neon signs, steam rising from grates"
   - **Weather Default**: Rainy
   - **Time Default**: Night

### Visual DNA

Extract and mix visual styles:

1. **Extract**: Upload a reference image → AI identifies style parameters
2. **Mix**: Combine multiple DNA profiles (e.g., "Noir" + "Cyberpunk")
3. **Apply**: Use the DNA as your global style

---

## 🎵 Audio Production

### Suno Architect

Create music prompts optimized for Suno.ai:

1. Open **Suno Studio** from the header
2. Use the wizard:
   - **Genre**: Electronic, Jazz, Orchestral, etc.
   - **Vibe**: Dark, Uplifting, Mysterious, etc.
   - **Tempo**: Slow, Medium, Fast
   - **Instruments**: Piano, Synth, Strings, etc.

3. Generate **Lyrics** (if vocal)
4. **Export** the prompt to paste into Suno.ai

### Ambience Studio

Generate background audio:

```
Input: "Busy cyberpunk market at night"

Output: Loopable 30-second audio with:
- Crowd chatter (distant)
- Neon sign buzzing
- Hover vehicle passing
- Synthesized advertisements
```

### Recording Booth

Record your own voice-overs:

1. Click **Record** icon
2. Enable microphone access
3. Use the **Teleprompter** to read your script
4. Click **Stop** when finished
5. Trim and edit directly in the app

---

## 🎬 The Director's Chain

The **Director's Chain** is an autonomous agent that handles the entire production pipeline.

### How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  SHOT LIST  │ ──► │  AUDIO GEN   │ ──► │ CONCEPT ART │
│             │     │  (TTS/Music) │     │  (Imagen)   │
└─────────────┘     └──────────────┘     └──────────────┘
                                               │
                                               ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   TIMELINE   │ ◄── │  VIDEO GEN  │
                    │   (Ready!)   │     │   (Veo)     │
                    └──────────────┘     └─────────────┘
```

### Running the Chain

1. Prepare your **Storyboard** with shots
2. Ensure **Characters** and **Locations** are assigned
3. Click **"Auto-Render Movie"**
4. Watch as:
   - Step 1: Audio is generated for dialogue
   - Step 2: Concept art is created for each shot
   - Step 3: Video is generated using concept art as the first frame
5. Timeline is populated automatically

---

## 🎞️ Post-Production & Timeline

### The NLE (Non-Linear Editor)

Access by clicking **Timeline** or the Video Studio.

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
│  ▼ Zoom: [━━━●━━━━━]                                       │
└────────────────────────────────────────────────────────────┘
```

### Track Types

| Track | Purpose | Operations |
|-------|---------|------------|
| **Video** | Main footage | Trim, Split, Transition |
| **Text** | Titles, subtitles | Font, Animation, Duration |
| **Dialogue** | Speech, voice-over | Smart Cut, Fade |
| **SFX** | Sound effects | Sync, Volume, Pan |
| **Music** | Background music | Auto-Duck, Loop |

### Editing Operations

| Operation | How To |
|-----------|--------|
| **Trim** | Drag clip edges |
| **Split** | Position playhead → click ✂️ |
| **Move** | Drag clip to new position |
| **Delete** | Select → press `Delete` |
| **Duplicate** | Select → `Ctrl+D` |
| **Apply Transition** | Overlap two clips |

### Smart Cut

Remove silence from dialogue:

1. Select a dialogue clip
2. Click **Smart Cut** (or right-click → "Remove Silence")
3. Adjust threshold if needed
4. Click **Apply**

### Auto-Duck

Automatically lower music when speech is present:

1. Open the **Mixer** panel
2. Enable **Auto-Duck** toggle
3. Adjust:
   - **Threshold**: When to duck (-20dB default)
   - **Amount**: How much to reduce (-12dB default)
   - **Attack**: How fast to duck (100ms)
   - **Release**: How fast to recover (300ms)

---

## 🪄 AI Magic Tools

### Foley Wizard

Auto-generate sound effects:

1. Select a video clip
2. Click **Magic Wand** → **Auto-Foley**
3. AI analyzes the video and identifies:
   - Footsteps
   - Ambient sounds
   - Impact sounds
   - Vehicle sounds
4. SFX are automatically synced to the timeline

### Global Dub

Translate and re-voice dialogue:

1. Select a shot with dialogue
2. Click **Dubbing**
3. Choose target language (Spanish, French, German, etc.)
4. AI:
   - Translates the script
   - Generates new TTS audio
   - Syncs lips to the new audio

### Inpainting (Magic Fixer)

Fix visual glitches:

1. Select a video frame
2. Click **Inpaint**
3. Use the brush to mask the problem area
4. Describe the fix: "Clean background" or "Remove artifact"
5. Click **Generate**

### Generative Canvas (Outpainting)

Change aspect ratios without cropping:

1. Select a video clip
2. Click **Canvas** → **Expand**
3. Choose new aspect ratio (16:9 → 9:16)
4. AI fills in the new areas

---

## 📦 Export & Delivery

### Quick Export

1. Click **Export** button
2. Choose quality:
   - **Draft** (720p, fast)
   - **Standard** (1080p, balanced)
   - **High** (4K, slow)
3. Click **Render**
4. Download your `.mp4`

### Social Crop

Reframe wide videos for vertical platforms:

1. Select your 16:9 export
2. Click **Social Crop**
3. AI tracks the subject and creates:
   - 9:16 version (TikTok, Reels)
   - 1:1 version (Instagram Feed)

### Professional Export

Export for external editing software:

1. Click **Export** → **Professional**
2. Choose format:
   - **DaVinci Resolve** (FCPXML)
   - **Premiere Pro** (XML)
   - **Final Cut Pro** (FCPXML)
3. Download ZIP containing:
   - All source clips
   - Timeline metadata
   - Edit decision list

---

## ⌨️ Keyboard Shortcuts

### Playback

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `J` | Play backward |
| `K` | Stop |
| `L` | Play forward |
| `←` | Previous frame |
| `→` | Next frame |
| `Home` | Go to start |
| `End` | Go to end |

### Editing

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + C` | Copy |
| `Ctrl + V` | Paste |
| `Ctrl + X` | Cut |
| `Delete` | Delete selected |
| `Ctrl + D` | Duplicate |

### Generation

| Shortcut | Action |
|----------|--------|
| `Ctrl + Enter` | Generate Prompt |
| `Ctrl + G` | Send to Video Studio |
| `Shift + N` | New Shot |
| `Ctrl + S` | Save Project |

### Navigation

| Shortcut | Action |
|----------|--------|
| `1-6` | Switch to tab (Style, Camera, etc.) |
| `Tab` | Next section |
| `Shift + Tab` | Previous section |
| `?` | Show all shortcuts |

---

## ⚙️ Settings & Configuration

### Application Settings

Click the **⚙️ Settings** button (bottom-left corner) to access all application settings.

#### General Settings

**API Key Configuration:**

- View current key status
- Enter a new API key
- Clear stored key
- Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

> 💡 **Privacy**: Your API key is stored locally on your device and never sent to external servers.

#### Auto-Update Settings

Veo Studio includes a comprehensive auto-update system to keep you on the latest version.

**Release Channels:**

| Channel | Description | Recommended For |
|---------|-------------|-----------------|
| **Stable** | Production-ready releases | Most users |
| **Beta** | Early access to new features | Testers and enthusiasts |
| **Dev** | Latest development builds | Developers only |

**Update Configuration:**

1. Open **Settings** → **Updates** tab
2. Configure your preferences:
   - **Release Channel**: Choose Stable, Beta, or Dev
   - **Auto-Check**: Enable/disable automatic update checking
   - **Check Interval**: How often to check (30 min - 24 hours)
   - **Auto-Download**: Automatically download updates when available
   - **Auto-Install**: Automatically install updates (requires restart)

**Manual Update Check:**

Click the **"Check for Updates Now"** button in the Updates settings to manually check for available updates.

**Update Notifications:**

When an update is available, you'll see a notification in the top-right corner with:

- Version number and release type
- Changelog preview
- Download progress (if downloading)
- Options to download, install, remind later, or dismiss

**Update Troubleshooting:**

| Problem | Solution |
|---------|----------|
| **Updates not detected** | Check internet connection; verify release channel |
| **Download fails** | Ensure sufficient disk space; check firewall settings |
| **Installation issues** | Close all app instances; download manually from GitHub |

For more details, see the [Auto-Update Documentation](docs/AUTO_UPDATE.md).

### Theme

Toggle between **Dark** and **Light** themes from the header.

### Project Settings

Access from the gear icon:

- **Aspect Ratio**: 16:9, 9:16, 1:1, 4:3, 21:9
- **Resolution**: 720p, 1080p, 4K
- **Frame Rate**: 24, 30, 60 fps
- **Default Duration**: 5s, 10s, 15s

---

## 🔧 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **Blank screen on launch** | Clear browser cache or reinstall the AppImage |
| **"No API key configured"** | Click the 🔑 button and add your key |
| **Video generation fails** | Check API quota at [Google AI Studio](https://aistudio.google.com) |
| **Audio not playing** | Check browser/system volume; try reopening the app |
| **Slow performance** | Close other tabs; reduce preview quality |

### Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `QUOTA_EXCEEDED` | API limit reached | Wait 1 minute or upgrade plan |
| `INVALID_API_KEY` | Key is incorrect | Re-enter your API key |
| `GENERATION_FAILED` | AI couldn't complete | Try a different prompt |
| `NETWORK_ERROR` | No internet | Check connection |

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share tips
- **Wiki**: Community documentation

---

## 🎓 Tips for Best Results

### Prompt Engineering

1. **Be Specific**: "A red 1965 Ford Mustang" > "a car"
2. **Describe Motion**: "Walking slowly" > "walking"
3. **Set the Mood**: "Ominous, low-key lighting" > "dark"
4. **Layer Details**: Start simple, add complexity

### Character Consistency

1. Always use the **Character Bank**
2. Reference the same character name across shots
3. Lock wardrobe and hairstyle
4. Use similar lighting setups

### Performance Tips

1. Enable **Proxy Mode** for large projects
2. Use **Smart Cut** to trim silence first
3. Generate videos in batches (1-4 at a time)
4. Export at draft quality for reviews

---

<p align="center">
  <strong>🎬 Veo Studio v3.5.0 — The Future of Filmmaking 🎬</strong>
</p>

<p align="center">
  <em>For more information, visit our <a href="https://github.com/loofitheboss/Loofi-Veo-prompt-generator">GitHub repository</a></em>
</p>

# App User Guide

> **Practical, task-oriented guide for Veo Studio.**
> Use this when you need a fast path from first launch to a finished workflow.

---

## 📋 Quick Reference

| What you want to do            | Where to go                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| Build your first prompt        | [Core Daily Workflow](#2-core-daily-workflow)                       |
| Generate video from a prompt   | [Video Generation Workflow](#3-video-generation-workflow)           |
| Set up team editing            | [Collaboration Workflow](#4-collaboration-workflow)                 |
| Edit clips on a timeline       | [Timeline & Post-Production](#5-timeline--post-production-workflow) |
| Export a finished video        | [Export Workflow](#6-export-workflow)                               |
| Automate multi-shot production | [Director's Chain Workflow](#7-directors-chain-workflow)            |
| Create music for your project  | [Audio Production Workflow](#8-audio-production-workflow)           |
| Fix something broken           | [Troubleshooting Quick Map](#9-troubleshooting-quick-map)           |

---

## 1) Before You Start

### Install the App

| Method                    | Steps                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop (recommended)** | Download from [GitHub Releases](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator/releases). Linux: `chmod +x` the AppImage. Windows: run the installer. |
| **Web (development)**     | `git clone` → `npm install` → `npm run dev` → open `localhost:8080`                                                                                                   |
| **Build from source**     | `npm install` → `npm run dist` → packaged app is in `./release/`                                                                                                      |

### First-Time Setup Checklist

- [ ] Launch the app and complete the **Onboarding Tutorial** (6 interactive steps)
- [ ] Add your **API Key**: click the 🔑 button → paste key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- [ ] Create your **first project** using the New Project Wizard (pick a template or start blank)
- [ ] Explore the **sidebar** — hover over each entry to see its purpose
- [ ] Press `?` to see all **keyboard shortcuts**

> 💡 Your API key is stored locally on your device and never sent to third parties.

---

## 2) Core Daily Workflow

This is the standard flow you'll use every day to create prompts.

### Step-by-Step

1. **Write your concept** — Type a descriptive paragraph in the Core Concept field.
   - Good: _"A mysterious detective walks through a rain-soaked alley in 1940s Chicago, trench coat collar turned up, neon signs reflecting in puddles"_
   - Bad: _"cool detective scene"_

2. **Configure input tabs** — Cycle through the 6 tabs using number keys `1`–`6`:
   - **Style** (`1`): Pick art style (photorealistic, anime, watercolor…), color palette, lighting
   - **Camera** (`2`): Movement (pan, dolly, tracking, drone), lens (14mm–200mm), shot distance, composition
   - **Scene** (`3`): Environment, weather, time of day
   - **Character** (`4`): Describe or select from Character Bank for consistency
   - **Audio** (`5`): Voice-over, ambient, music cues
   - **Advanced** (`6`): Model, resolution, seed, negative prompt

3. **Select target model** — Toggle between Veo 3.1, Veo 2, Sora, or Custom

4. **Generate** — Press `Ctrl+Enter`

5. **Review output** — Check the **Quality Score** (target 80+) and read the improvement suggestions

6. **Iterate** — Change one variable at a time, regenerate, compare. Repeat until satisfied.

7. **Save** — Star the prompt as a favorite, save as template, or send to Video Studio (`Ctrl+G`)

### Power User Tips

- Use **AI Suggest** (magic wand icon) on any field for AI-powered improvements
- Use **Voice-to-Prompt** (microphone icon) to speak your concept instead of typing
- Use **Diff View** to compare two history entries side by side
- Use **Quick Presets** to apply proven configurations in one click

---

## 3) Video Generation Workflow

Turn prompts into actual AI video clips.

1. Generate and refine your prompt in the Prompt Studio (see above)
2. Click **Send to Video Studio** (`Ctrl+G`)
3. In Video Studio:
   - Click **Generate Video** to send the prompt to Veo 3.1 or Sora
   - Watch the progress indicator — generation takes 30–120 seconds depending on model and complexity
4. Preview the result in the built-in player
5. If unsatisfied:
   - Adjust the prompt and regenerate
   - Try a different model for comparison
   - Use **Batch Generation** to create multiple variations at once
6. When satisfied, click **Send to Timeline** to start editing

### Image Generation (Concept Art)

1. Switch to **Image Studio** in the header
2. Generate concept art with Imagen 3
3. Use generated images as **first-frame references** for video generation → dramatically improves consistency

---

## 4) Collaboration Workflow

Set up real-time multiplayer editing for team projects.

### Getting Started

1. Open **Collaborate** from the sidebar
2. Complete **Profile Setup** (display name + avatar color) — only needed once
3. Click **Create Room** → share the 6-character code or link with your team
4. Team members: open **Collaborate** → enter room code → join

### During a Session

| Task             | How                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------- |
| See who's online | Check colored dots in the **header presence indicator**                                 |
| Leave feedback   | Open **Comments** → create threaded discussions with @mentions and reactions            |
| Control access   | Open **Roles** → assign Viewer / Editor / Admin permissions                             |
| Handle conflicts | If two editors change the same thing, **Conflict Resolution** panel shows both versions |

### Best Practices

- Assign clear **roles** before starting
- Use **Comments** for every approval decision (creates an audit trail)
- **Resolve all conflicts** before exporting
- Keep team size small for best WebRTC performance (2–6 people)

---

## 5) Timeline & Post-Production Workflow

Edit your generated clips into a finished sequence.

### Opening the Timeline

Click **Timeline** in the sidebar or switch to the Video Studio view.

### Track Types

- **Video** — Main footage clips
- **Text** — Titles, subtitles, lower thirds
- **Dialogue** — Voice-over and speech recordings
- **SFX** — Sound effects
- **Music** — Background scores and ambient audio

### Basic Editing Operations

| Task              | How                                                   |
| ----------------- | ----------------------------------------------------- |
| Trim a clip       | Drag left/right edge                                  |
| Split at playhead | Click ✂️                                              |
| Move a clip       | Drag horizontally (snaps to edges)                    |
| Delete a clip     | Select → `Delete`                                     |
| Duplicate         | Select → `Ctrl+D`                                     |
| Add transition    | Overlap two clips → pick Cut/Fade/Dissolve/Wipe/Slide |
| Undo/Redo         | `Ctrl+Z` / `Ctrl+Shift+Z`                             |

### Playback

| Key             | Action                        |
| --------------- | ----------------------------- |
| `Space`         | Play/Pause                    |
| `J` / `K` / `L` | Rewind / Stop / Forward       |
| `←` / `→`       | Frame step backward / forward |
| `Home` / `End`  | Jump to start / end           |

### Advanced Editing

- **Smart Cut** — Auto-remove silence from dialogue tracks (select clip → Smart Cut → adjust threshold → apply)
- **Keyframe Animation** — Animate Position, Scale, Rotation, Opacity with easing curves
- **Speed Ramping** — Variable speed within a clip (right-click → Speed Ramping)
- **Montage Builder** — Place music → select clips → Auto-Montage → AI beat-matches cuts
- **Color Grading** — Preset LUTs + color wheels + scopes (Waveform, Vectorscope, Histogram)
- **Chroma Key** — Real-time green/blue screen removal

---

## 6) Export Workflow

Get your finished video out of the app.

### Quick Export (Simplest)

1. Click **Export** in header or timeline
2. Pick quality: Draft (720p) / Standard (1080p) / High (4K)
3. Click **Render** — processing happens 100% locally via FFmpeg.wasm
4. Download the `.mp4` file

### Platform-Optimized Export

Choose a platform profile for pre-configured settings:

| Platform        | Format                 |
| --------------- | ---------------------- |
| YouTube         | 16:9, 1080p/4K, H.264  |
| TikTok          | 9:16, 1080×1920, H.264 |
| Instagram Reels | 9:16, 1080×1920, H.264 |
| Instagram Feed  | 1:1, 1080×1080, H.264  |
| Twitter/X       | 16:9, 1280×720, H.264  |

### Smart Social Crop

Reframe 16:9 → 9:16 or 1:1 automatically. AI tracks the main subject and keeps it centered.

### Professional NLE Export

Export your timeline for DaVinci Resolve, Premiere Pro, or Final Cut Pro:

1. Click **Export → Professional**
2. Choose FCPXML or XML format
3. Download ZIP with all clips, timeline metadata, and EDL

### Other Formats

JSON, CSV, PDF, Markdown, XML, ZIP bundle, cURL/code snippets

---

## 7) Director's Chain Workflow

Autonomous end-to-end production from storyboard to finished timeline.

### Prerequisites

- Storyboard with shot descriptions (use Storyboard Studio)
- Characters defined in Character Bank
- Locations defined in Location Library

### Steps

1. Open the **Director's Chain** panel or click **Auto-Render Movie**
2. Review the **cost estimate** (shows expected API usage per model)
3. Click **Start** — the pipeline runs autonomously:
   - Generates dialogue audio (TTS) for each shot
   - Creates concept art (Imagen 3) for each shot
   - Generates video (Veo 3.1) using concept art as first-frame reference
   - Assembles clips on the timeline in shot order
4. Fine-tune the result in post-production (trim, add transitions, adjust audio)

> 💡 Set budget limits in **Settings → Cost Tracking** to prevent overspending.

---

## 8) Audio Production Workflow

### Create Background Music

1. Switch to **Suno Studio** in the header
2. Configure genre, vibe, tempo, instruments, BPM
3. Write lyrics (verse/chorus structure)
4. Copy the optimized prompt → paste into [Suno.ai](https://suno.com)
5. Import generated audio into your timeline Music track

### Add Sound Effects (Foley)

1. Select a video clip on the timeline
2. Click **Magic Wand → Auto-Foley**
3. AI analyzes frames and generates synchronized SFX (footsteps, impacts, ambience)
4. SFX are auto-placed on the SFX track

### Record Voice-Over

1. Click the **Record** icon (microphone) in the Audio panel
2. Use the built-in **Teleprompter** to read your script
3. Trim the recording in the waveform editor
4. Add to a Dialogue track

### Generate Ambient Backgrounds

1. Open **Ambience Studio**
2. Describe the environment: _"Busy cyberpunk market at night"_
3. Generate loopable ambient audio with layered environmental sounds

### Auto-Ducking (Music Under Dialogue)

1. Open the **Mixer** panel
2. Enable **Auto-Duck** → music volume automatically dips when dialogue plays
3. Adjust threshold, reduction, attack, release to taste

---

## 9) Troubleshooting Quick Map

### Generation Issues

| Symptom                 | Fix                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------- |
| "No API key configured" | Click 🔑 → add key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| Generation fails        | Check quota at Google AI Studio. Simplify prompt. Try different model              |
| Slow generation         | Normal — Veo 3.1 takes 30–120s. Check internet speed                               |
| `QUOTA_EXCEEDED` error  | Wait 1 minute. Check your plan limits                                              |
| `INVALID_API_KEY` error | Re-enter or regenerate your key                                                    |

### UI & Performance Issues

| Symptom           | Fix                                                                      |
| ----------------- | ------------------------------------------------------------------------ |
| Blank screen      | Clear browser cache (web) or reinstall AppImage (desktop)                |
| Slow/laggy        | Close unused studios. Reduce preview quality. Enable proxy mode          |
| Audio not playing | Check system/browser volume. Grant microphone permissions                |
| High memory       | Close studios you're not using. Reduce timeline zoom. Clear render cache |

### Plugin Issues

| Symptom            | Fix                                                   |
| ------------------ | ----------------------------------------------------- |
| Plugin not loading | Check `engineVersion` compatibility. Reinstall plugin |
| Plugin errors      | Disable in Settings → Plugins. Check for updates      |

### Desktop-Specific Issues

| Symptom          | Fix                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| App won't launch | Check system requirements. Run as admin (Windows). Check logs at `~/.loofi-veo-prompt-generator/logs/` |
| Crash loop       | Launch with `--safe-mode` flag. Disable heavy studios/plugins                                          |
| Update fails     | Check internet. Disable antivirus temporarily. Download manually                                       |

### Export Issues

| Symptom        | Fix                                                                 |
| -------------- | ------------------------------------------------------------------- |
| Export fails   | Check disk space. Try different format. Verify prompt data is valid |
| Corrupt output | Re-render at Draft quality first. Check source clips                |

### Getting More Help

1. Press `?` or `F1` → searchable in-app help panel
2. Use **Help → Chat** for AI-powered guidance
3. **Settings → Diagnostics** → Run System Check → Export Logs
4. [Open a GitHub Issue](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator/issues)

---

## 10) Keyboard Shortcuts Cheat Sheet

| Category       | Shortcut                  | Action                  |
| -------------- | ------------------------- | ----------------------- |
| **Playback**   | `Space`                   | Play / Pause            |
|                | `J` / `K` / `L`           | Rewind / Stop / Forward |
|                | `←` / `→`                 | Frame step              |
| **Editing**    | `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo             |
|                | `Ctrl+D`                  | Duplicate               |
|                | `Ctrl+S`                  | Save                    |
|                | `Delete`                  | Delete selected         |
| **Generation** | `Ctrl+Enter`              | Generate prompt         |
|                | `Ctrl+G`                  | Send to Video Studio    |
| **Navigation** | `1`–`6`                   | Switch input tabs       |
|                | `Ctrl+H`                  | History                 |
|                | `Ctrl+K`                  | Command palette         |
|                | `Ctrl+,`                  | Settings                |
|                | `?` / `F1`                | Help                    |

---

## 11) Canonical References

| Resource                  | Link                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Complete User Guide**   | [USER_GUIDE.md](../USER_GUIDE.md)                                                                                        |
| **Practical User Guide**  | [docs/USER_GUIDE.md](../docs/USER_GUIDE.md)                                                                              |
| **Getting Started**       | [Getting-Started](./Getting-Started.md)                                                                                  |
| **Feature Workflows**     | [Feature-Workflows](./Feature-Workflows.md)                                                                              |
| **Troubleshooting & FAQ** | [Troubleshooting-and-FAQ](./Troubleshooting-and-FAQ.md)                                                                  |
| **Architecture**          | [Architecture](./Architecture.md)                                                                                        |
| **Changelog**             | [CHANGELOG.md](../CHANGELOG.md)                                                                                          |
| **GitHub Repository**     | [github.com/multidraxter-bit/Loofi-Veo-prompt-generator](https://github.com/multidraxter-bit/Loofi-Veo-prompt-generator) |

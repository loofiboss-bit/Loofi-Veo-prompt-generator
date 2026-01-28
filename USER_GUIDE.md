# Veo Studio - User Guide

**Version 3.5.0**

Welcome to **Veo Studio**, the integrated development environment (IDE) for AI Cinema. This guide covers the complete workflow from raw script to final exported movie.

---

## 📚 The Studio Workflow

The app is divided into specialized "Studios" accessible from the top header.

### 1. 📝 Pre-Production: Script & Storyboard
Build your narrative structure before generating expensive video pixels.

*   **New Project Wizard**: Start here to choose a template (e.g., *Cinematic Movie*, *Music Video*, *Social Vertical*). This pre-configures aspect ratios and models.
*   **Script to Screen**: 
    1. Click the **Script** icon in the header.
    2. Paste your screenplay text (dialogue, scene headings, etc.).
    3. Click **Analyze**. The AI breaks it down into a shot list and automatically attempts to cast characters from your library.
*   **Storyboard**: This is your command center.
    *   **Visual DNA**: Use the DNA button to mix styles (e.g., *Noir* + *Cyberpunk*). Apply this global style to ensure all shots look like they belong to the same film.
    *   **Auto-Blocker**: If you don't have a script, use the Auto-Blocker to generate a standard cinematic sequence (e.g., "Hero Reveal", "Chase Scene") instantly.

### 2. 👥 Asset Creation: Consistency is King
Stop characters from "hallucinating" different clothes in every shot.

*   **Character Bank**: Define your actors here. Lock their age, ethnicity, and wardrobe. When you select a character in a shot, the AI injects these details into the prompt invisibly.
*   **Location Library**: Save your sets (e.g., "The Bridge", "Neon Alley"). Reuse them across scenes.
*   **Whiteboard**: Click the "Pencil" icon on any shot to sketch a rough composition. The AI will use this sketch as a structural guide for generation.
*   **Camera Plotter**: Click the "Video Camera" icon on a shot to draw the exact path the camera should take (e.g., a complex dolly move).

### 3. 🎵 Audio Production
Great video needs great audio. Veo Studio treats audio as a first-class citizen.

*   **Suno Architect**: Open the **Song Studio**.
    *   Use the wizard to define Genre, Vibe, and Topic.
    *   The AI generates specialized tags and lyrics optimized for Suno.ai.
    *   Use the **Lyrics Editor** to extend verses or inject meta-tags like `[Drop]` or `[Solo]`.
*   **Ambience Studio**: Need background noise? Type "Busy Cyberpunk Market" and generate a seamless, loopable audio texture to sit under your dialogue.
*   **Recording Booth**: Record your own voice lines (ADR) directly into the browser. The system provides a teleprompter for your script.

### 4. 🎬 Production: The Director's Chain
Automate the tedious parts of generation.

1.  **Set Global Context**: Ensure your master style is set in the Storyboard sidebar.
2.  **Director's Chain**: Click **"Auto-Render Movie"**.
    *   **Step 1**: Generates TTS Audio for all dialogue.
    *   **Step 2**: Generates Concept Art for every shot (using the audio duration to time the shot).
    *   **Step 3**: Generates Video using the Concept Art as the first frame (Image-to-Video) for visual consistency.
    *   **Result**: A fully populated timeline ready for editing.

### 5. 🎞️ Post-Production: The Timeline (NLE)
Click **"Timeline"** to enter the Non-Linear Editor.

*   **Multi-Track Editing**: Arrange Video, Text, Dialogue, SFX, and Music on separate tracks.
*   **Smart Cut**: Select a dialogue clip and click **"Auto-Cut"**. The AI analyzes the waveform and automatically removes silence gaps.
*   **Auto-Duck**: Enable this in the **Mixer**. Music volume will automatically lower when dialogue is present.
*   **Chroma Key**: If you generated a character against a green screen, use the **Green Screen** tool to remove the background and layer it over another video.
*   **Color Grading**: Use the **Color** panel to apply global LUT-like adjustments (Contrast, Saturation, Teal & Orange).

### 6. 🪄 AI Magic Tools
Fix and enhance your footage.

*   **Foley Wizard**: Select a video clip and click the **Magic Wand** -> **Auto-Foley**. The AI "watches" the video, identifies sounds (footsteps, rain, engines), and generates synchronized SFX.
*   **Global Dub**: Select a shot with dialogue. Click **Dubbing**. Choose a target language (e.g., Spanish). The system translates the script, generates new Spanish TTS, and lip-syncs the video to match the new audio.
*   **Inpainting**: Glitch in the frame? Use **Inpainting** to mask the bad area and type "Clean background" to fix it.
*   **Generative Canvas**: Need to turn a 16:9 video into 9:16 for TikTok without cropping? Use this to "outpaint" the top and bottom of the frame.

### 7. 📦 Export & Delivery
*   **Export Video**: Renders a single `.mp4` file of your timeline (client-side rendering).
*   **Social Crop**: Automatically tracks the subject and reframes your wide video into a vertical format.
*   **Professional Export**: Select **"DaVinci / Premiere (XML)"**. This downloads a ZIP containing your source clips and an `.fcpxml` file. Import this into professional software to continue editing with all your metadata intact.

---

## 💡 Keyboard Shortcuts

*   `Space`: Play/Pause Timeline
*   `Left/Right Arrow`: Previous/Next Clip
*   `Ctrl + Enter`: Generate Prompt (in text areas)
*   `Shift + N`: Add New Shot
*   `?`: Open Shortcuts List

---

*Veo Studio v3.5 - The Future of Filmmaking.*
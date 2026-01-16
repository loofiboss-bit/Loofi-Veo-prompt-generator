
# Veo Studio - User Guide

**Version 3.5.0**

Welcome to **Veo Studio**, the integrated development environment (IDE) for AI Cinema. This guide focuses on the end-to-end workflow: from script to final render.

---

## 📚 The Studio Workflow

### 1. 📝 Pre-Production: Script & Storyboard
Instead of writing one prompt at a time, build your narrative first.

1.  **Import Script**: Open the Storyboard and click "Import Script". Paste your screenplay. The AI will parse it into individual shots, auto-assigning characters and actions.
2.  **Table Read (Animatic)**: Before generating a single second of video, click **"Table Read"**. This plays through your storyboard using Text-to-Speech (TTS) and static concept art. Use this to check the pacing and dialogue flow.
3.  **Variables**: Use `{{VARIABLE}}` syntax (e.g., `{{HERO}}` is walking) in your prompts. Open the **Variables Panel** (Header) to define what `{{HERO}}` means (e.g., "Detective Smith"). Update the variable once, and it updates every shot in your movie.

### 2. 👥 Asset Creation: Consistency is King
To stop your characters from "hallucinating" different clothes in every shot:

1.  **Character Bank**: Create a profile for your lead actors. Define specific details like "Scar on left cheek" or "Blue tie".
2.  **Visual DNA**: Don't guess style keywords. Go to the **Visual DNA** library. Use the "Mixer" to blend two styles (e.g., *Cyberpunk* + *Western*) into a unique look for your film.
3.  **Pose Director**: In the Storyboard, click the **"Set Pose"** button on a shot. Draw a stick figure skeleton to tell the AI exactly how the character should be standing or sitting.

### 3. 🎵 Music Production: Suno Studio
Create professional soundtracks by preparing structured data for Suno.com using the **Two-Step Process**.

1.  **Style Alchemy (Step 1)**:
    *   Switch to the **Style Tab**.
    *   Select your Base Genre, Voice type, and Tempo. Add specific vibe descriptors (e.g., "Ethereal", "Aggressive").
    *   Click **Generate Tags**. The AI will optimize the prompt for Suno's token limit.
    *   **Action**: Copy the result and paste it into the **"Style of Music"** box on Suno.

2.  **Lyric Lab (Step 2)**:
    *   Switch to the **Lyric Tab**.
    *   Define your Topic and choose a Structure (e.g., *Pop Standard*, *EDM Build*).
    *   **Meta-Tag Toolbar**: Use the buttons above the text area to insert commands like `[Break]`, `[Drop]`, or `[Solo]` at your cursor position.
    *   **Action**: Copy the lyrics into the **"Lyrics"** box on Suno.

> **Pro Tip**: Inserting an `[Instrumental Break]` tag forces the AI to play a solo section without vocals, which is perfect for cinematic montages in your video.

### 4. 🎬 Production: The Director's Chain
You don't need to babysit the render bar.

1.  **Set Global Context**: In the Storyboard sidebar, define the "Master Prompt" settings (Style, Lighting) that apply to the whole scene.
2.  **Director's Chain**: Click **"Auto-Render Movie"**.
    *   The system will loop through every shot.
    *   It generates the Audio (TTS) first.
    *   It generates a Concept Image second.
    *   It uses that image to generate the Video (ensuring visual match).
    *   It moves to the next shot automatically.

### 5. 🎞️ Post-Production: The Timeline (NLE)
Once your shots are rendered, click **"Play"** or **"Timeline"** to enter the Non-Linear Editor.

*   **Trimming**: Drag the edges of clips to trim them.
*   **Audio Mixing**: Open the **Mixer**. Adjust levels for Dialogue, SFX, and Music. Enable **"Auto-Duck"** to automatically lower the music volume when characters are speaking.
*   **Lip Sync**: If a character is speaking but their lips aren't moving, select the shot in the Storyboard and click **"Sync Lips"**. This uses an AI model to animate the face based on the audio track.

### 6. 🪄 Polishing & VFX
Fix mistakes without re-generating.

*   **Inpainting (Magic Fixer)**: If there's a glitch in a frame, click the "Magic Wand" on the shot thumbnail. Paint over the glitch and type "Clean background" to fix it.
*   **Generative Canvas (Outpainting)**: Need a wider shot? Open **Generative Canvas**, zoom out, and let the AI fill in the new edges of the frame.
*   **Smart Color Match**: If Shot 2 looks different from Shot 1, use **"Match Color"**. Select Shot 1 as the reference, and the system will grade Shot 2 to match its palette.

### 7. 📦 Export & Delivery
*   **Export Movie**: Renders a single `.mp4` file of your timeline.
*   **FCPXML Export**: Downloads a `.zip` file with an XML for DaVinci Resolve or Final Cut Pro. This allows you to finish your edit in professional software with all your prompts saved as metadata notes.
*   **Social Crop**: Automatically reframes your 16:9 movie into a 9:16 vertical video for TikTok/Reels, keeping the subject centered.

---

## 💡 Pro Tips

*   **Visual Linking**: In the Storyboard, check the "Chain Link" icon between shots. This feeds the *last frame* of the previous video into the *start* of the next, creating seamless morphs or continuous takes.
*   **Auto-Foley**: After rendering a video, click "Auto-Foley". An AI agent watches the clip and generates sound effects (footsteps, wind, impacts) automatically.
*   **Keyboard Shortcuts**: Press `?` to see a list of hotkeys for rapid editing.

---

*Veo Studio v3.5 - The Future of Filmmaking.*

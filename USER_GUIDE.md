
# Veo Prompt Generator - User Guide

Welcome to the **Veo Prompt Generator (v3.3)**. This guide will help you master the advanced tools available in the application to create stunning AI-generated videos.

---

## 🧠 The Dual-Engine Philosophy

This app supports two distinct approaches to video generation. Understanding the difference is key to getting the result you want.

### 1. Veo Mode (Cinematic & Aesthetic)
*   **Focus:** Lighting, camera angles, color grading, film stock, and composition.
*   **Best For:** Movie trailers, music videos, commercials, and artistic mood pieces.
*   **AI Behavior:** The prompt architect emphasizes *how* the scene looks (e.g., "Anamorphic lens flares," "Volumetric fog").

### 2. Sora Mode (Simulation & Physics)
*   **Focus:** Cause-and-effect, object permanence, fluid dynamics, and logical consistency.
*   **Best For:** Realistic simulations, complex interactions, long-take shots, and "world-building."
*   **AI Behavior:** The prompt architect emphasizes *how* the world works (e.g., "The water displaces realistically as the boat moves," "Dust settles according to gravity").

---

## ⚙️ Interface & Personalization

### Light & Dark Mode
You can now toggle the application theme to suit your environment or preference.
*   **Dark Mode (Default)**: Best for creative work, color grading, and low-light environments.
*   **Light Mode**: High-contrast interface best for bright environments or text-heavy tasks.
*   **How to Toggle**: Click the Sun/Moon icon in the top header next to the settings. The app remembers your preference.

---

## 🎬 Narrative Tools

### 🎞️ Story Board
*Located in the Header (Film Icon)*

Create consistent multi-shot sequences for short films or commercials.

1.  **Set Global Context**: Define the *Style*, *Character*, and *Setting* that will remain constant across all shots (e.g., "Cyberpunk", "Detective Smith", "Rainy Alley").
2.  **Add Shots**: Create a list of shots. For each shot, define only the unique **Action** (e.g., "Detective looks at evidence") and **Camera** (e.g., "Close-up").
3.  **Batch Generate**: Click "Batch Generate Prompts." The AI will intelligently merge the Global Context with each specific shot instruction to create a list of complete, consistent prompts.
4.  **Copy**: Use the "Copy All" button to grab the sequence for generation.

### 🧬 Visual DNA & Mixer
*Located in the Header (Visual DNA button) or Action Bar.*

**Visual DNA** allows you to save complex style configurations (Lighting + Camera + Color Palette + Art Style) as a reusable preset.

**The DNA Mixer (New in v3.3):**
1.  Open the Visual DNA modal.
2.  Click the **Mixer** tab.
3.  Select **Parent A** and **Parent B** from your saved library.
4.  Adjust the **Influence Balance** slider (e.g., 70% A / 30% B).
5.  Click **Generate Hybrid**. The AI will create a new style that blends the best elements of both (e.g., mixing "Noir" lighting with "Anime" aesthetics).
6.  Save the result as a new DNA strand.

---

## 🛠️ Advanced Tools Deep Dive

### 🎥 Spatial Director
*Located in the "Camera" tab.*

The Spatial Director allows you to "block" your scene by assigning specific elements to specific parts of the frame.

1.  **Open the Spatial Director**: Click the button in the Camera tab.
2.  **Select a Sector**: Click any of the 9 grid squares (e.g., Top-Left, Center, Bottom-Right).
3.  **Describe Action**: Type what should happen *only* in that sector (e.g., "A drone hovering" in Top-Left, "A dog running" in Bottom-Right).
4.  **Save**: The AI will weave these spatial instructions into the final prompt, ensuring the model places objects exactly where you want them.

### 🔬 Physics Validator
*Located in the "Advanced" tab (Visible only in Sora Mode).*

When building complex simulations, it's easy to write prompts that break the laws of physics, confusing the video model.

1.  **Draft your idea**: Fill out the Scene and Action details.
2.  **Run Simulation Check**: Click the button in the Advanced tab.
3.  **Review Report**: The AI acts as a "Physics Engine Debugger." It will flag issues like:
    *   *Thermodynamics violations* (e.g., "Ice not melting in lava").
    *   *Newtonian violations* (e.g., "A heavy rock floating like a feather").
    *   *Lighting paradoxes* (e.g., "Shadows pointing towards the sun").

### ⚖️ Model Comparator
*Located in the Header (Comparison Icon).*

Not sure which style fits your idea?

1.  **Click the Compare Icon**: Found in the top action bar next to the Undo/Redo buttons.
2.  **Enter Idea**: Ensure you have a Core Idea typed in.
3.  **Analyze**: The AI will generate two versions of your prompt side-by-side:
    *   **Veo Version**: Short, punchy, focused on visuals.
    *   **Sora Version**: Long, descriptive, focused on physics.
4.  **Select**: Click "Use This Prompt" on the version that aligns with your vision.

---

## 🎨 Creative Studios

### 🖼️ Image Studio
Use this to generate "Keyframes" or "Concept Art" before committing to a video.
*   **Concept Art**: Type a prompt -> Generate.
*   **AI Editing**: Upload an existing image -> Type a change (e.g., "Make it night time") -> Generate.

### 🎵 Suno Song Studio
A complete pre-production tool for music.
1.  **Enter Concept**: e.g., "A cyber-noir jazz track about a rainy city."
2.  **Auto-Write**: The AI generates a Title, a specific Style Prompt (optimized for Suno.com), and structured Lyrics.
3.  **Copy & Paste**: Use the copy buttons to transfer the data directly to Suno.

### 📼 Video Analysis Studio
Reverse-engineer prompts from existing videos.
1.  **Upload**: Select a video file (MP4/WebM, <20MB).
2.  **Prompt**: Ask the AI what to look for (e.g., "Describe the camera movement").
3.  **Use Result**: Click "Use as Idea" to feed the analysis back into the Prompt Generator.

---

## ⚡ Pro Tips & Best Practices

1.  **The "Cameo" Feature**: If you upload a reference image in the "Core Concept" section and check **"Use as Character Cameo"**, you can tag that character (e.g., "The Hero"). The AI will add specific instructions to maintain that character's consistency throughout the prompt.
2.  **Series Generation**: In the **Advanced** tab, check **"Generate as Series"**. The AI will create a 3-part narrative sequence (Beginning, Middle, End) instead of a single scene.
3.  **Input Quality**:
    *   **Custom Art Styles**: If choosing "Custom", provide at least 3 characters of description to ensure the AI understands the style.
    *   **YouTube URLs**: Ensure you are using valid YouTube video links (watch, embed, or shorts) if adding context.
    *   **Character Details**: When describing specific clothing or nuances, be descriptive (at least 5 characters) to avoid generic generation.
4.  **Hotkeys**:
    *   `Ctrl + G`: Generate Prompt.
    *   `Ctrl + Shift + S`: Save current settings as a Preset.
    *   `Esc`: Close any open modal.

---

## ❓ Troubleshooting

*   **"Video Generation Failed"**: Ensure you have selected a valid Google Cloud Project with billing enabled in the API Key dialog.
*   **"Rate Limit Exceeded"**: The Gemini API has usage limits. Wait a minute and try again.
*   **"Physics Violations Detected"**: This is just a warning. You can still generate the prompt, but the video model might hallucinate or struggle with the logic.
*   **Red Input Fields**: The app now includes strict validation. If a field turns red with an error message:
    *   Check character limits.
    *   Ensure custom fields (like "Custom Style") aren't empty or too short.
    *   Verify URLs are correctly formatted.

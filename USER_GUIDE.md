# Veo Prompt Generator - User Guide

**Version 3.5.0**

Welcome to the **Veo Prompt Generator**, an advanced creative suite designed to give filmmakers and creators granular control over AI video generation. This guide will walk you through the application's workflow, from drafting your first idea to exporting a finished movie.

---

## 📚 Table of Contents

1.  [Getting Started: The Dual-Engine Core](#1-getting-started-the-dual-engine-core)
2.  [The Prompt Architect Interface](#2-the-prompt-architect-interface)
3.  [The Storyboard: Creating Narratives](#3-the-storyboard-creating-narratives)
4.  [Advanced Tools & Directors](#4-advanced-tools--directors)
5.  [Creative Studios](#5-creative-studios)
6.  [Asset Management](#6-asset-management)
7.  [Export & Delivery](#7-export--delivery)

---

## 1. Getting Started: The Dual-Engine Core

Before you type a single word, look at the **Target Model** toggle at the top of the "Core Concept" section. Your choice here fundamentally changes how the AI constructs your prompt.

### 🎥 Veo Mode (The Cinematographer)
*   **Philosophy**: Focuses on the *image*. It prioritizes lighting ratios, film stock texture, camera lenses, color grading, and composition.
*   **Best For**: Commercials, music videos, movie trailers, and aesthetic mood pieces.
*   **AI Behavior**: The AI will add technical camera data (e.g., "Anamorphic lens flares", "T-stop 2.0") and specific lighting terms ("Rembrandt lighting").

### 🌍 Sora Mode (The Simulator)
*   **Philosophy**: Focuses on the *physics*. It prioritizes object permanence, fluid dynamics, cause-and-effect, and material interactions.
*   **Best For**: Realistic simulations, complex physical actions, long-takes, and "world-building".
*   **AI Behavior**: The AI will describe physical properties (e.g., "The water displaces volumetrically," "The cloth folds realistically under gravity").

---

## 2. The Prompt Architect Interface

The main dashboard is divided into specific tabs to help you layer detail into your prompt.

### 💡 Core Concept (Step 1)
*   **Idea**: The seed of your video. Keep it simple (e.g., "A robot painting a canvas").
*   **Magic Wand (Auto-Fill)**: Click this to let the AI analyze your simple idea and automatically populate *all* other fields (Style, Camera, Audio, etc.) with relevant settings.
*   **Reference Image**: Upload an image here.
    *   **Cameo Feature**: Check "Use as Cameo" to tell Veo to keep the subject in this image consistent in the generated video. Give it a tag (e.g., "Hero") to reference it in your prompt.

### 🎨 Detail Tabs (Step 2)
*   **Style**: Define the art style (e.g., "Cyberpunk", "Claymation"). Use the **Visual DNA** button to load saved presets.
*   **Camera**:
    *   *Movement*: "Drone shot", "Tracking shot", "Handheld".
    *   *Spatial Director*: (See Section 4).
*   **Scene**: Define the Environment ("Rainy Tokyo"), Time of Day, and Weather. Use the "Suggest Sensory Details" button to add smells, temperatures, and textures to the prompt description.
*   **Character**: Define Age, Ethnicity, and Wardrobe.
    *   *Action Flow*: Use the AI button here to generate a coherent sequence of movements for your character.
*   **Audio**: Define the soundscape.
    *   *Audio Upload*: Upload a reference track to help the AI analyze the mood.
*   **Advanced**:
    *   *Negative Prompt*: What to exclude (e.g., "blur", "distortion").
    *   *Validators*: Run Physics or Cinematography checks here.

---

## 3. The Storyboard: Creating Narratives

The **Storyboard** (Film Icon in Header) is a powerful Non-Linear Editor (NLE) for prompt engineering. It allows you to build multi-shot sequences that look consistent.

### The Workflow:
1.  **Define Global Context**: In the left sidebar, set the *Style*, *Character*, and *Setting* that apply to the whole movie. This ensures Shot 1 looks like Shot 5.
2.  **Add Shots**: Click "Add Shot". For each shot, you only need to define the specific **Action** (what happens) and **Camera** (how we see it).
3.  **Visual Linking (The "Chain" Icon)**:
    *   Check the "Visual Link" box between shots.
    *   **What it does**: When you generate the video for Shot 2, the system automatically takes the *last frame* of Shot 1's video and feeds it to Veo as the starting image for Shot 2.
    *   **Result**: Seamless temporal continuity.
4.  **Batch Generate**: Click "Batch Generate Prompts". The AI will rewrite every shot's prompt to ensure narrative flow, referencing previous shots ("Continuing from the explosion...").
5.  **Render**: Click "Render All" (or individual buttons) to generate videos.
6.  **Auto-Critique**: Once a video is generated, an AI agent watches it and gives it a score (1-10) based on how well it matched your text prompt.
7.  **Auto-Foley**: Click "Auto-Foley" on a shot to have AI analyze the video events and generate synchronized sound effects (SFX).

---

## 4. Advanced Tools & Directors

### 🎬 Spatial Director
*Found in the Camera Tab.*
Instead of describing complex positions ("A dog on the left, a cat on the right"), draw it.
1.  Open Spatial Director.
2.  Click a grid sector (e.g., Top-Left).
3.  Type what happens *there* (e.g., "A UFO hovers").
4.  The AI compiles these into precise spatial instructions for Veo.

### 🔬 Physics Validator
*Found in Advanced Tab (Sora Mode).*
Before generating, ask the AI to simulate your scene logic. It will catch errors like:
*   "Ice cream not melting in an oven."
*   "Shadows casting towards the light source."

### 🎥 Cinematography Validator
*Found in Advanced Tab (Veo Mode).*
Ensures your technical choices make sense. It will flag errors like:
*   "Using a Macro lens for a Wide Landscape shot."
*   "High-Key lighting in a Noir film."

---

## 5. Creative Studios

### 🖼️ Image Studio
Generate "Keyframes" before committing to video.
*   **Concept Art**: Test your prompts as still images first.
*   **AI Editing**: Upload an image and type changes (e.g., "Change suit to armor").

### 🎵 Suno Song Studio
Pre-production for AI Music.
1.  Enter a song concept.
2.  Click **Auto-Write**.
3.  The AI generates a Title, Style tags (optimized for Suno.com), and structured Lyrics (Verse/Chorus).
4.  Copy/Paste directly into Suno.

### 📼 Video Analysis Studio
Reverse-engineer style.
1.  Upload a reference video (<20MB).
2.  Ask the AI: "Describe the lighting and camera movement."
3.  Click "Use as Prompt" to feed the style back into your generator.

---

## 6. Asset Management

### 👥 Character Bank
Create persistent actors.
1.  Open **Characters** in the header.
2.  Create a profile (Name, Age, Ethnicity, detailed Wardrobe).
3.  Save it.
4.  In the Storyboard or Main Prompt, select this character to instantly inject their detailed description, ensuring they look the same in every shot.

### 🧬 Visual DNA
Save your "Look".
*   **Extract**: Save your current style settings (Lighting + Art Style + Colors) as a "DNA Strand".
*   **Mixer**: Select two saved DNAs (e.g., "Wes Anderson" and "Cyberpunk"). Use the slider to blend them (e.g., 70% Anderson, 30% Cyberpunk). The AI creates a new, hybrid style for you.

### 📂 Project Manager
Save your workspace. This saves your current prompt, your entire Storyboard sequence, and your Character Bank associations into a single project file.

---

## 7. Export & Delivery

### 🎞️ Exporting from Storyboard
Once your sequence is rendered:
1.  **Play Movie**: Opens the Timeline Player. Watch your shots in sequence.
2.  **Export Movie**: Stitches all clips into a single `.mp4` file.
3.  **Export NLE Package**: Downloads a ZIP file containing:
    *   All raw video files (renamed for sequence).
    *   An **.EDL (Edit Decision List)** file. Import this into Premiere Pro, DaVinci Resolve, or Final Cut to instantly recreate your timeline with cuts.
4.  **Export PDF**: Generates a professional Shot List document for production teams.

---

*Veo Prompt Generator v3.5 - Empowering the AI Director.*

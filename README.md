# Veo Studio: The AI Video Production Suite

![Veo Studio](https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-studio-banner.png)

**Veo Studio** is a professional-grade, local-first **Non-Linear Editor (NLE)** and **Generative Orchestration Platform** designed for the AI video generation workflow. 

It bridges the gap between a director's raw vision and the complex requirements of modern generative models like **Google Veo**, **Imagen 3**, and **Gemini 1.5/2.5**, wrapping them in a familiar timeline-based interface.

---

## 🌟 Core Features

### 🎬 Production & Editing (NLE)
*   **Multi-Track Timeline**: Full-featured editor with dedicated tracks for Video, Overlay Text, Dialogue, SFX, and Music.
*   **Client-Side Rendering**: Uses **FFmpeg.wasm** to stitch, trim, composit, and render 1080p video entirely within your browser. No server uploads required for rendering.
*   **Smart Proxies**: Automatically generates lightweight proxy files for smooth 4K playback and editing.
*   **Smart Cut**: Automagically removes silence from dialogue tracks using Web Workers for audio analysis.

### 🧠 Generative AI Tools
*   **Script to Screen**: Paste a screenplay text, and the AI parses it into a shot list, auto-assigning characters, locations, and actions.
*   **Director's Chain**: An autonomous agent that handles the entire pipeline—generating Audio (TTS), Concept Art (Imagen), and Video (Veo) sequentially for every shot.
*   **Suno Architect**: A specialized prompt engineering tool for Suno.ai, designing complex musical structures and lyrics.
*   **Ambience Studio**: Generates seamless, loopable background audio textures (room tone, nature sounds) based on scene descriptions.
*   **Foley Wizard**: Analyzes video frames to suggest and generate synchronized sound effects (footsteps, impacts).
*   **Global Dub**: Translates dialogue, generates new voice tracks, and performs lip-syncing (simulated) for international localization.

### 📦 Asset & Continuity Management
*   **Character Bank**: Create persistent actors with defined attributes (ethnicity, age, wardrobe) to ensure consistency across generations.
*   **Location Library**: Save reusable sets and environment descriptions.
*   **Visual DNA**: Extract style parameters (lighting, film stock, palette) from images, mix them to create new aesthetics, and share them via the community library.
*   **Whiteboard & Camera Plotter**: Sketch visual concepts or draw camera motion paths directly on the screen to guide generation.

### 🛠️ Advanced Post-Production
*   **Chroma Key**: Real-time green screen removal in the browser using WebGL shaders.
*   **Generative Canvas (Outpainting)**: Expand the frame of any video or image to change aspect ratios using AI.
*   **Magic Fixer (Inpainting)**: Fix visual glitches by masking areas and describing corrections.
*   **Auto-Ducking**: Automatically lowers background music volume when dialogue is detected.

### ⚡ Performance & Privacy
*   **Local-First Architecture**: Utilizes **IndexedDB** to store massive video blobs locally. Your footage stays on your device until you choose to export.
*   **Background Processing**: Service Workers handle long-running generation tasks, allowing you to keep working while videos render.

### 🤝 Collaboration
*   **Real-Time Multiplayer**: Edit projects simultaneously with your team. See others' cursors and updates in real-time (powered by Yjs & WebRTC).

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **State Management**: Zustand + Yjs (CRDT for collaboration)
*   **Video Engine**: `@ffmpeg/ffmpeg` (WebAssembly) & WebGL
*   **Audio Engine**: Web Audio API (OfflineContext for fast analysis) + Web Workers
*   **AI Backend**: Google GenAI SDK (`@google/genai`)
    *   *Reasoning & Scripting*: `gemini-3-pro-preview`
    *   *Vision & Tagging*: `gemini-3-pro-preview` (Multimodal)
    *   *Image Generation*: `gemini-2.5-flash-image`
    *   *Video Generation*: `veo-3.1-generate-preview`
    *   *Speech & SFX*: `gemini-2.5-flash-native-audio-preview`
*   **Persistence**: `idb-keyval` (IndexedDB wrapper)

---

## 🚀 Installation & Setup

1.  **Environment Variables**:
    The application requires a Google Cloud Project with the Gemini API enabled.
    The API key must be available via `process.env.API_KEY`.

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm start
    ```

4.  **Build for Production**:
    ```bash
    npm run build
    ```

---

## 🤝 Contributing

**Veo Studio** is an evolving platform. We welcome contributions in:
*   **Export Formats**: Enhanced support for AAF or EDL.
*   **New Models**: Integration with upcoming multimodal endpoints.
*   **Optimization**: WebGL shader improvements for effects.

---

*Designed for the future of filmmaking.*
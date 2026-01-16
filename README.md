# Veo Studio: The AI Video Production Suite

![Veo Studio](https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-studio-banner.png)

**Veo Studio** (formerly Veo Prompt Generator) is the first professional-grade, local-first **Non-Linear Editor (NLE)** designed specifically for the AI video generation workflow. 

It bridges the gap between a director's raw vision and the complex requirements of modern generative models like **Google Veo** and **Sora**, wrapping them in a familiar timeline-based interface.

---

## 🌟 Core Features

### 🎬 Non-Linear Editing (NLE)
A fully functional **Multi-Track Timeline** allows you to edit your generated clips directly in the browser.
*   **Multi-Track Support**: Dedicated tracks for Video, Dialogue, SFX, and Music.
*   **Client-Side Rendering**: Uses **FFmpeg.wasm** to stitch, trim, and render 1080p video entirely within your browser. No server uploads required for rendering.
*   **Smart Proxies**: Automatically generates lightweight proxy files for smooth 4K playback and editing.

### 🧠 AI Director Agents
*   **Director's Chain**: An autonomous agent that handles the entire render pipeline—generating audio, creating concept art, and rendering video for every shot in your storyboard sequentially.
*   **Auto-Director**: A conversational agent that can modify your storyboard based on natural language commands (e.g., "Change scene 3 to a close-up").
*   **Smart Script Import**: Paste a screenplay, and the AI parses scenes, assigns characters, and builds a shot list automatically.

### 📦 Asset & Continuity Management
*   **Character Bank**: Create persistent actors with defined ethnicity, age, and wardrobe to ensure consistency across shots.
*   **Location Library**: Save reusable sets and environments.
*   **Visual DNA**: Extract style parameters (lighting, film stock, palette) from images and mix them to create new aesthetics.

### 🎨 Advanced Post-Production
*   **Lip Sync**: Synchronize character mouth movements to generated TTS audio (Wav2Lip interface).
*   **Smart Color Match**: Apply the color grading of one shot to another using histogram matching.
*   **Generative Canvas (Outpainting)**: Expand the frame of any shot to change aspect ratios or add scenery.
*   **Pose Director**: Draw skeleton rigs to control exact character positioning.
*   **VFX & Atmosphere**: Add film grain, vignettes, and cinematic letterboxing.

### ⚡ Performance & Privacy
*   **Local-First Architecture**: Utilizes **IndexedDB** to store massive video blobs locally. Your footage stays on your device until you choose to share it.
*   **Background Rendering**: Service Workers handle long-running generation tasks, allowing you to keep working while videos render.

### 🤝 Collaboration
*   **Real-Time Multiplayer**: Edit projects simultaneously with your team. See others' cursors and updates in real-time (powered by Yjs & WebRTC).

---

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **State Management**: Zustand + Yjs (CRDT for collaboration)
*   **Video Engine**: `@ffmpeg/ffmpeg` (WebAssembly)
*   **AI Backend**: Google GenAI SDK (`@google/genai`)
    *   *Reasoning*: `gemini-3-pro-preview`
    *   *Vision*: `gemini-2.5-flash-image`
    *   *Video*: `veo-3.1`
    *   *Audio*: `gemini-2.5-flash-native-audio`
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
*   **Validators**: Logic to check for historical accuracy or physics consistency.
*   **Export Formats**: Enhanced support for AAF or EDL.
*   **New Models**: Integration with upcoming multimodal endpoints.

---

*Designed for the future of filmmaking.*
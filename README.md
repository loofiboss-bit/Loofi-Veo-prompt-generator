# Veo Prompt Generator v3.5.0

**The Enterprise-Grade Pre-Production Suite for Generative Video.**

![Veo Prompt Generator](https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-prompt-generator-screenshot.png)

The **Veo Prompt Generator** is not just a form; it is a comprehensive **AI Cinematography Workstation**. It bridges the gap between a director's raw vision and the complex linguistic requirements of modern video generation models like **Google Veo 3** and **Sora**.

Built with React 19 and the Google GenAI SDK, this application treats prompt engineering as a multi-disciplinary workflow involving narrative structure, visual consistency, and technical validation.

---

## 🌟 Core Architecture

### 🧠 Dual-Engine Logic
The application intelligently switches context based on your target model:
*   **Veo Mode (The Cinematographer)**: Optimizes prompts for visual aesthetics, film stock emulation, lighting ratios, lens choices, and composition. Includes a **Cinematography Validator** to ensure optical consistency (e.g., preventing conflicting depth-of-field instructions).
*   **Sora Mode (The Simulator)**: Optimizes prompts for physics engines, object permanence, fluid dynamics, and causal logic. Includes a **Physics Validator** to flag logical paradoxes before generation.

### 🎬 The Storyboard (Non-Linear Editor)
A linear editing interface for generative video.
*   **Global Context Injection**: Define style, character, and setting once; the system enforces these constraints across every shot.
*   **Visual Chaining**: Automatically extracts the last frame of *Shot A* and injects it as the starting reference frame for *Shot B*, ensuring seamless temporal continuity.
*   **Multi-Take Management**: Generate and store multiple variations (takes) for every shot.
*   **Timeline Player & Export**: Preview your sequence in real-time and stitch all generated clips into a single `.mp4` movie file directly in the browser (via FFmpeg WASM).
*   **Auto-Foley**: An AI agent watches your generated video, identifies visual events (footsteps, explosions), and generates synchronized sound effects.

### 🧰 Creative Studios
Specialized modules for specific asset generation:
*   **Spatial Director**: A 3x3 grid interface allowing you to "block" scenes by assigning specific actions to specific screen sectors.
*   **Image Studio**: Create concept art, keyframes, or edit existing images using natural language.
*   **Suno Song Studio**: A music pre-production tool that generates lyrics, meta-tags, and style descriptors optimized for Suno AI.
*   **Video Analysis**: Reverse-engineer prompts from existing video files.

### 📦 Asset & Continuity Management
*   **Character Bank**: Create persistent actors with defined ethnicity, age, and wardrobe. Reuse them across different projects to maintain narrative consistency.
*   **Visual DNA**: Save complex style configurations. Use the **DNA Mixer** to algorithmically blend two styles (e.g., "Cyberpunk" + "Western") into a new aesthetic.
*   **Project Manager**: Save your entire workspace state, including storyboard shots, generated assets, and history.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19.2.0, TypeScript, Tailwind CSS
*   **AI Integration**: Google GenAI SDK (`@google/genai`)
    *   *Models*: `gemini-3-pro-preview` (Reasoning/Logic), `gemini-2.5-flash-image` (Vision), `veo-3.1` (Video), `gemini-2.5-flash-native-audio` (Sound/TTS).
*   **Video Processing**: `@ffmpeg/ffmpeg` (WASM) for client-side video stitching and transcoding.
*   **State Management**: Zustand + BroadcastChannel for multi-tab synchronization.
*   **Storage**: LocalStorage & IndexedDB for asset persistence.

---

## 🚀 Installation & Setup

1.  **Environment Variables**:
    Ensure you have a valid Google Cloud Project with the Gemini API enabled.
    The application expects the API key to be available via `process.env.API_KEY` (or injected via the AI Studio environment).

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

Contributions are welcome! Please focus on:
*   **New Validators**: Logic to check for historical accuracy or genre consistency.
*   **Export Formats**: Support for Final Cut Pro XML or AAF.
*   **New Models**: Integration with upcoming Gemini multimodal endpoints.

---

*Designed for the future of filmmaking.*

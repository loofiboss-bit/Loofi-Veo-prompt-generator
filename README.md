# Veo Prompt Generator

**Current Version:** 3.1.0

An AI-powered creative studio designed to help you craft detailed, cinematic, and effective prompts for **Google's Veo 3** video generation model. It also includes dedicated studios for image and music pre-production. Turn simple ideas into vivid, professionally structured scenes with fine-grained control over every aspect of your creative project.

![Veo Prompt Generator Screenshot](https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-prompt-generator-screenshot.png)

## ✨ Key Features

- **AI-Powered Prompt Generation**: Leverages the Gemini API to transform your core concepts into rich, detailed prompts ready for video generation, specifically optimized for **Veo 3.1**.
- **Dual-Mode Engine**:
    - **Veo Mode**: Optimized for cinematic composition, lighting, and camera aesthetics.
    - **Sora Mode**: Optimized for physics simulation, object permanence, and causal logic.
- **Advanced Direction Tools**:
    - **Spatial Director**: A 3x3 grid interface to direct specific motion or details in exact quadrants of the frame (e.g., "Birds in top-left", "Car in bottom-right").
    - **Physics Validator**: An AI agent that analyzes your prompt for logical inconsistencies or physical impossibilities (available in Sora mode).
    - **Model Comparator**: Generate and compare prompts for both Veo and Sora styles side-by-side to choose the best approach.
- **Fine-Grained Control**: Adjust dozens of parameters across multiple categories:
    - **Scene**: Define the environment, time of day, and weather.
    - **Character**: Specify actions, gender, ethnicity, clothing, archetype, age, mood, and pose.
    - **Style**: Choose from a wide array of art styles (Cinematic, Anime, Vintage, etc.).
    - **Camera & Audio**: Specify camera movements, lenses, resolution (1080p/720p), and sound design.
- **Creative Studios**:
    - **Suno Song Studio**: Generate song titles, styles, and structured lyrics for AI music creation.
    - **Image Studio**: Generate concept art or edit uploaded images with text commands.
    - **Video Analysis**: Upload a video reference to have AI analyze and reverse-engineer a prompt.
- **AI Chat Assistant**: A persistent, conversational AI companion to help brainstorm and refine ideas.
- **Full Video Generation**: Generate videos directly using **Veo 3.1** (Fast & Quality models).

---

## 🚀 Getting Started

### Prerequisites

To run this application, you need a Google Gemini API key.

1.  Visit [Google AI Studio](https://aistudio.google.com/) to create your API key.
2.  **Important**: Keep your API key secure and do not commit it to version control.

### Setup & Installation

The application is configured to use the API key from an environment variable.

1.  **Clone the repository (if applicable):**
    ```bash
    git clone https://github.com/your-repo/veo-prompt-generator.git
    cd veo-prompt-generator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment variables:**
    Create a file named `.env` in the root of your project and add your API key:
    ```
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the application:**
    ```bash
    npm start
    ```
    The application will be available at `http://localhost:3000`.

---

## 📖 Quick Guide

For a detailed walkthrough of all features, please read the [**User Guide**](./USER_GUIDE.md).

1.  **Select Target**: Choose between **Veo** (Cinematic) or **Sora** (Simulation) mode.
2.  **Input Idea**: Type your core concept.
3.  **Refine**: Use the tabs to add details, or use the **Spatial Director** to block out the scene.
4.  **Generate**: Click "Generate Prompt" to create the structured text.
5.  **Visualize**: Use the **Image Studio** for concept art or **Generate Video** to render the final result.

---
## 📜 Changelog & Version History

### **v3.1.0 (Current) - 2025-10-28**
-   **Feature**: **Spatial Director**. Added a visual 3x3 grid interface allowing users to map specific actions to specific areas of the screen.
-   **Feature**: **Physics Validator**. A dedicated analysis tool for "Sora Mode" that checks prompts for thermodynamic and Newtonian violations before generation.
-   **Feature**: **Model Comparison**. A new modal to generate and compare Veo vs. Sora style prompts for the same idea simultaneously.
-   **UX**: Global hotkeys added (Ctrl+G to Generate, Ctrl+Shift+S to Save Preset).

### **v3.0.0 - 2025-10-27**
-   **Major Update**: Rebranded and optimized specifically for **Google Veo 3** workflows.
-   **Feature**: Added a persistent **AI Chat Assistant**.
-   **Feature**: Introduced the **Pronunciation Guide**.
-   **Optimization**: Prompt generation logic fine-tuned for Veo 3.1.

### **v2.4.0 - 2025-10-12**
-   **AI**: Major enhancement to prompt engineering for both Veo and Sora target models.

### **v2.3.0 - 2025-10-11**
-   **Feature**: Integrated full support for **Veo 3.1** video generation models.
-   **Feature**: Added Resolution (1080p/720p) and Quality/Fast model toggles.

### **v2.2.0 - 2025-10-10**
-   **Feature**: Introduced the **Suno Song Studio**.

### **v2.0.0 - 2025-10-08**
-   **Major UI/UX Overhaul**: Complete redesign with "glassmorphism" aesthetic.

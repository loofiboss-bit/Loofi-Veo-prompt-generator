# Veo Prompt Generator

**Current Version:** 1.8.0

An AI-powered creative studio designed to help you craft detailed, cinematic, and effective prompts for Google's Veo video generation model. Turn simple ideas into vivid, professionally structured scenes with fine-grained control over every aspect of your video.

![Veo Prompt Generator Screenshot](https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-prompt-generator-screenshot.png)

## ✨ Key Features

- **AI-Powered Prompt Generation**: Leverages the Gemini API to transform your core concepts into rich, detailed prompts ready for video generation.
- **Fine-Grained Control**: Adjust dozens of parameters across multiple categories:
    - **Scene**: Define the environment, time of day, weather, and character actions.
    - **Style**: Choose from a wide array of art styles (Cinematic, Anime, Vintage, etc.) or define your own custom style.
    - **Camera & Audio**: Specify camera movements, distances, lens types, and a complete sound design with voice-over styles and ambient sounds.
    - **Advanced**: Use negative prompts to exclude elements, ground prompts with real-time Google Search data, and even generate multi-episode series.
- **Visual Ideation Tools**:
    - **Concept Art Generation**: Instantly create a piece of concept art from your prompt using the Imagen model.
    - **AI Art Editing**: Refine your concept art with simple text commands.
    - **Storyboard Creation**: Automatically generate a sequence of keyframe images to visualize your narrative before generating the video.
- **Full Video Generation**: Generate a complete video directly from your prompt using the Veo model, with real-time status updates.
- **Inspiration Hub**:
    - **YouTube Analyzer**: Paste a YouTube URL to have the AI extract a core concept and pre-fill the idea field.
    - **Templates**: Get started quickly with pre-built templates for common use cases like "Cinematic Trailer" or "Viral Social Clip".
    - **Examples & Trends**: Generate galleries of inspiring example prompts or see what's currently trending in AI video.
- **Audio Previews**: Generate a text-to-speech preview of your voice-over script to check the tone and pacing.
- **User-Friendly Workflow**:
    - **Prompt History**: Automatically saves your generated prompts for later use.
    - **Shareable Prompts**: Generate a unique URL to share your exact prompt and settings with others.
    - **Real-time Tab Sync**: Open multiple tabs and have your prompt settings stay perfectly in sync.
    - **Multi-language Support**: Fully available in English and Swedish.

## 🛠️ Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Models Used**:
    - **`gemini-2.5-flash`**: For prompt generation, text analysis, and creative suggestions.
    - **`imagen-4.0-generate-001`**: For concept art and storyboard generation.
    - **`gemini-2.5-flash-image`**: For AI-powered image editing.
    - **`veo-2.0-generate-001`**: For final video generation.

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

## 📖 How to Use the App

### Step 1: Start with an Idea

You have two primary ways to begin:

-   **Write a Core Idea**: In the "Core Idea" text area, describe the main concept of your video. For example, "A detective walking through a rainy, neon-lit city street at night."
-   **Analyze a YouTube URL**: Paste a link to a YouTube video and click **Analyze**. The AI will generate a cinematic scene description based on the video's likely topic and place it in the "Core Idea" field.

### Step 2: Refine the Details

Use the tabs to add layers of detail to your concept.

-   **Scene Tab**: Describe the environment, weather, time of day, and what your characters are doing. Use the collapsible "Character Details" section for more specific attributes.
-   **Style Tab**: Select an **Art Style** and **Color Palette** to define the visual look and feel.
-   **Camera & Audio Tab**: Direct your shot by choosing camera movements, distances, and lens types. Design the audio landscape by selecting ambient sounds, voice-over styles, and even writing a script.
-   **Advanced Tab**: For expert control, use the "Advanced" tab to add **Negative Prompts** (what to avoid), ground the prompt with **Google Search** for factual accuracy, or optimize for shorter clips.

### Step 3: Generate the Prompt

Once you're happy with your settings, click the main **Generate Prompt** button. The AI will synthesize all your inputs into a single, masterfully crafted paragraph in the output section below.

### Step 4: Review and Iterate

The generated prompt is now ready. You have several options:

-   **Copy**: Use the copy button to grab the prompt for use elsewhere.
-   **Edit**: Click the "Edit" button to make manual adjustments to the text. Save or cancel your changes.
-   **Share**: Click the "Share Prompt" button to generate a unique link that contains all your settings.

### Step 5: Generate Visuals & Audio

Bring your prompt to life without leaving the app.

-   **Generate Audio**: If you've written a voice-over script, click **Generate Audio** to hear a preview.
-   **Generate Art**: Click **Generate Art** to create a single piece of high-quality concept art that serves as a visual reference for your scene.
-   **Generate Storyboard**: Click **Generate Storyboard** for a sequence of images that maps out the key moments of your prompt.
-   **Generate Video**: When you are ready, click **Generate Video**. This process can take a few minutes. A status indicator will keep you updated, and the final video will appear with a player and a download link.

### Step 6: Explore & Manage

Use the utility features to streamline your workflow:

-   **History**: Click the history icon in the header to view, load, or delete your past prompts.
-   **Templates**: Click the "Templates" button to load pre-configured settings for different video styles.
-   **Examples & Trends**: Click "Show Examples" or "Show Trending" to get inspiration from AI-generated ideas.

---
## 📜 Changelog & Version History

### **v1.8.0 (Current) - 2025-10-07**
-   **Docs**: Added this detailed changelog and version history to the README.

### **v1.7.0 - 2025-10-07**
-   **Feature**: Added `gemini-2.5-pro` as a selectable model for all text generation tasks, giving users a choice between speed (Flash) and creative power (Pro).
-   **Docs**: Created the initial detailed README with project overview, features, setup instructions, and usage guide.

### **v1.6.0 - 2025-10-06**
-   **UX**: Enhanced loading states across the app. Replaced generic spinners with specific, descriptive messages (e.g., "Crafting Cinematic Prompt...").
-   **Feature**: Implemented a multi-step progress indicator for video generation to provide clear, real-time feedback on the process (Initialize, Render, Finalize).

### **v1.5.0 - 2025-10-06**
-   **Feature**: Upgraded the "Show Trending" feature to use real-time Google Search. This provides fresher, more unique, and more specific prompt ideas based on current viral video trends.
-   **AI**: Improved the system prompt to encourage more creative and less generic trending suggestions.

### **v1.4.0 - 2025-10-05**
-   **UX**: Improved the YouTube video analysis feature with better user feedback. Now shows a success notification and auto-focuses on the "Core Idea" field after a successful analysis.

### **v1.3.0 - 2025-10-05**
-   **Feature**: Integrated direct video generation using the `veo-2.0-generate-001` model.
-   **UI**: Added a "Generate Video" button to the output section.
-   **UI**: Added advanced controls for "Motion Intensity" and "Creativity Level" in the "Advanced" tab for finer control over video output.
-   **UI**: Implemented a real-time status display and an integrated video player for the video generation process.

### **v1.2.0 - 2025-10-04**
-   **UI/UX**: Complete overhaul of the application's design to a more premium "Creative Studio" feel.
-   **Style**: Replaced the gray/purple color scheme with a deep slate/cyan palette.
-   **Style**: Incorporated glassmorphism effects (background blur and transparency) for a modern, layered look on panels.
-   **UI**: Redesigned all components (buttons, inputs, headers, etc.) to match the new, cohesive design system.

### **v1.0.0 - 2025-10-03**
-   Initial release of the Veo Prompt Generator.
-   Core features included AI prompt generation, concept art creation, history management, and templates.## 📜 Changelog & Version History

### **v1.8.0 (Current) - 2025-10-07**
-   **Docs**: Added this detailed changelog and version history to the README.

### **v1.7.0 - 2025-10-07**
-   **Feature**: Added `gemini-2.5-pro` as a selectable model for all text generation tasks, giving users a choice between speed (Flash) and creative power (Pro).
-   **Docs**: Created the initial detailed README with project overview, features, setup instructions, and usage guide.

### **v1.6.0 - 2025-10-06**
-   **UX**: Enhanced loading states across the app. Replaced generic spinners with specific, descriptive messages (e.g., "Crafting Cinematic Prompt...").
-   **Feature**: Implemented a multi-step progress indicator for video generation to provide clear, real-time feedback on the process (Initialize, Render, Finalize).

### **v1.5.0 - 2025-10-06**
-   **Feature**: Upgraded the "Show Trending" feature to use real-time Google Search. This provides fresher, more unique, and more specific prompt ideas based on current viral video trends.
-   **AI**: Improved the system prompt to encourage more creative and less generic trending suggestions.

### **v1.4.0 - 2025-10-05**
-   **UX**: Improved the YouTube video analysis feature with better user feedback. Now shows a success notification and auto-focuses on the "Core Idea" field after a successful analysis.

### **v1.3.0 - 2025-10-05**
-   **Feature**: Integrated direct video generation using the `veo-2.0-generate-001` model.
-   **UI**: Added a "Generate Video" button to the output section.
-   **UI**: Added advanced controls for "Motion Intensity" and "Creativity Level" in the "Advanced" tab for finer control over video output.
-   **UI**: Implemented a real-time status display and an integrated video player for the video generation process.

### **v1.2.0 - 2025-10-04**
-   **UI/UX**: Complete overhaul of the application's design to a more premium "Creative Studio" feel.
-   **Style**: Replaced the gray/purple color scheme with a deep slate/cyan palette.
-   **Style**: Incorporated glassmorphism effects (background blur and transparency) for a modern, layered look on panels.
-   **UI**: Redesigned all components (buttons, inputs, headers, etc.) to match the new, cohesive design system.

### **v1.0.0 - 2025-10-03**
-   Initial release of the Veo Prompt Generator.
-   Core features included AI prompt generation, concept art creation, history management, and templates.

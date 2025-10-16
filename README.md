# Veo Prompt Generator

**Current Version:** 2.2.1

An AI-powered creative studio designed to help you craft detailed, cinematic, and effective prompts for Google's Veo video generation model. It also includes dedicated studios for image and music pre-production. Turn simple ideas into vivid, professionally structured scenes with fine-grained control over every aspect of your creative project.

![Veo Prompt Generator Screenshot](https://storage.googleapis.com/aistudio-ux-team-public/apps/veo-prompt-generator/veo-prompt-generator-screenshot.png)

## ✨ Key Features

- **AI-Powered Prompt Generation**: Leverages the Gemini API to transform your core concepts into rich, detailed prompts ready for video generation.
- **Fine-Grained Control**: Adjust dozens of parameters across multiple categories:
    - **Scene**: Define the environment, time of day, and weather.
    - **Character**: Specify actions, gender, ethnicity, clothing, archetype, age, mood, and pose for detailed character creation.
    - **Style**: Choose from a wide array of art styles (Cinematic, Anime, Vintage, etc.) or define your own custom style.
    - **Camera & Audio**: Specify camera movements, distances, lens types, and a complete sound design with voice-over styles and ambient sounds.
    - **Advanced**: Use negative prompts, ground prompts with real-time Google Search data, and generate multi-episode series.
- **Suno Song Studio**: A dedicated workspace to generate complete song packages for Suno AI. Input an idea and get an AI-generated song title, a detailed "Style of Music" prompt, and structured lyrics, ready to be copied and pasted into Suno.
- **Visual Ideation Tools**:
    - **Image Studio**: Generate concept art from a prompt or upload your own image and edit it with simple text commands.
    - **Storyboard Creation**: Automatically generate a sequence of keyframe images to visualize your narrative before generating the video.
- **Full Video Generation**: Generate a complete video directly from your prompt using the Veo model, with real-time status updates.
- **Inspiration Hub**:
    - **Templates**: Get started quickly with pre-built templates for common use cases like "Cinematic Trailer", "Viral Social Clip", or even emulate the style of advanced models with the "Sora 2 Emulation" template.
    - **Examples**: Get inspired by a curated gallery of high-quality example prompts.
- **User-Friendly Workflow**:
    - **Helpful Tooltips**: Get contextual guidance on what each field controls and how it impacts the final prompt.
    - **Prompt History**: Automatically saves your generated prompts for later use.
    - **Shareable Prompts**: Generate a unique URL to share your exact prompt and settings with others.
    - **Real-time Tab Sync**: Open multiple tabs and have your prompt settings stay perfectly in sync.
    - **Multi-language Support**: Fully available in English, Swedish, Spanish, French, and German.

## 🛠️ Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Models Used**:
    - **`gemini-2.5-pro`**: For prompt generation, text analysis, and creative suggestions.
    - **`gemini-2.5-flash`**: Available as a faster alternative for prompt generation.
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

## 📖 Instructions

### Main Prompt Generation Workflow

**Step 1: Start with Your Core Idea**
-   Begin by describing the main concept for your video in the **Core Idea** text area. Be descriptive but concise. For example: *"A majestic lion waking up at sunrise in the Serengeti."*
-   For a creative boost, click the **magic wand icon** (Auto-fill Modifiers). The AI will analyze your idea and suggest fitting modifiers for art style, camera movement, and color palette.

**Step 2: Refine the Details with Tabs**
-   Use the tabs (**Scene, Character, Style, Camera, Audio, Advanced**) to add layers of detail. Each field has a tooltip (the 'i' icon) to guide you.
-   **Scene**: Define the environment, weather, and time of day.
-   **Character**: Detail your characters' actions, appearance, clothing, age, and mood.
-   **Style**: Select a visual **Art Style** and **Color Palette**.
-   **Camera & Audio**: Direct the shot by choosing camera movements, distances, and lens types. Design the audio landscape with ambient sounds and voice-overs.
-   **Advanced**: For expert control, add **Negative Prompts** (what to avoid), ground the prompt with **Google Search** for factual accuracy, or generate a 3-part series.

**Step 3: Architect Your Prompt**
-   Once you're satisfied with your settings, click the main **Architect Prompt** button.
-   The AI will synthesize all your inputs into a single, masterfully crafted paragraph in the output section below.

**Step 4: Review, Iterate, and Share**
-   **Edit**: Click the "Edit" button to make manual adjustments to the generated text.
-   **Variations**: Click "Variations" to have the AI generate three alternative versions of your prompt.
-   **Share**: Click "Share" to copy a unique link that saves all your settings, allowing you to share your exact prompt with others.
-   **Save to History**: Click the "Save to History" button to store the prompt and its settings for later use.

### Generating Visuals and Video

Once you have a generated prompt, you can bring it to life:
-   **Concept Art**: Click **Concept Art** to create a single, high-quality image that serves as a visual reference for your scene. This helps you validate the aesthetic before generating a full video.
-   **Generate Video**: When you are ready, click **Generate Video**. This process can take a few minutes. A real-time progress indicator will show you the status (Initializing, Processing, Fetching). The final video will appear in a modal, ready to be viewed and downloaded.

### Using the Creative Studios

Access specialized workspaces from the icons in the header.

**Suno Song Studio (Music Icon)**
1.  Open the studio and describe your song concept (e.g., *"A sad folk song about a long journey"*).
2.  Click **Generate Song Ideas**.
3.  The AI will provide a **Title**, a detailed **Style of Music** prompt, and full **Lyrics** with structural tags like `[Verse]` and `[Chorus]`.
4.  Use the copy buttons for each section to easily transfer the content to [suno.com](https://suno.com) and create your song.

**Image Studio (Image Icon)**
1.  Describe an image you want to create in the prompt box.
2.  **To edit an image**: Upload an existing image. Your prompt should then describe the desired change (e.g., *"Add a futuristic helmet to the person"*).
3.  Click **Generate Image** to see the result. You can then download your creation.

### Managing Your Workflow

-   **Templates**: Click the **Use a Template** button to load pre-configured settings for different video styles, such as "Cinematic Trailer" or "Viral Social Clip".
-   **History**: Click the **history icon** in the header to view, reload, or delete your previously generated prompts.

---
## 📜 Changelog & Version History

### **v2.2.1 (Current) - 2025-10-10**
-   **AI**: Optimized the Suno Song Studio's prompt generation to align with best practices for Suno's latest models. The "Style of Music" prompt is now more descriptive and phrase-based, and lyrics generation is encouraged to include instrumental sections like [Guitar Solo] or [Intro] for more dynamic song structures.

### **v2.2.0 - 2025-10-10**
-   **Feature**: Introduced the **Suno Song Studio**, an integrated tool for generating song titles, detailed "Style of Music" prompts, and structured lyrics for use with Suno AI. This provides a seamless pre-production workflow for AI music creation.

### **v2.1.2 - 2025-10-09**
-   **Feature**: Expanded character customization with new options for Age, Mood, and Pose, allowing for more detailed and nuanced character descriptions.

### **v2.1.1 - 2025-10-09**
-   **UX**: Added tooltips to all complex input fields and options, providing users with contextual help and guidance on how each parameter affects the final prompt.

### **v2.1.0 - 2025-10-09**
-   **Feature**: Added a new "Sora 2 Emulation" prompt template. This template is designed to help users craft prompts aiming for hyper-realistic, narrative-driven scenes with complex physics and camera work, similar to those showcased by other advanced video generation models. It defaults to generating a 3-part series to encourage longer storytelling.
-   **Feature**: Added a "Target Model" toggle (Veo/Sora) that adjusts the underlying prompt generation logic to better suit the selected model's strengths.

### **v2.0.0 - 2025-10-08**
-   **Major UI/UX Overhaul**: The application has been completely redesigned into a more intuitive and visually appealing "Creative Canvas". This includes:
    -   **Live Prompt Summary**: A new summary panel provides real-time feedback on your creative choices before generation.
    -   **Enhanced Media Display**: Generated concept art and storyboards are now organized into a clean, tabbed interface.
    -   **Polished Aesthetics**: The entire interface has been updated with a refined "glassmorphism" design, including improved panel styling, crisper input fields, and better visual hierarchy for a more professional feel.

### **v1.9.0 - 2025-10-07**
-   **UI**: Redesigned the "Download Video" link into a more prominent button for better visibility and consistency with the app's design.

### **v1.8.0 - 2025-10-07**
-   **Docs**: Added this detailed changelog and version history to the README.

### **v1.7.0 - 2025-10-07**
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


import { PronunciationGuideData } from './types';
// This file contains all the UI strings and prompt templates for different languages.
type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';


// --- UI STRINGS ---
const appUIStringsData: any = {
    en: {
        headerTitle: "Veo Prompt Architect",
        headerSubtitle: "Craft the perfect prompt for Google's next-gen video model.",
        language: "Language",
        step1Title: "1. The Spark",
        step1Subtitle: "Start with your core idea and optional reference image.",
        step2Title: "2. The Scene",
        step2Subtitle: "Set the scene with the most impactful modifiers.",
        step3Title: "3. Fine-Tune Details",
        labelIdea: "Core Idea",
        placeholderIdea: "e.g., A majestic lion waking up at sunrise in the Serengeti, with cinematic lighting...",
        autofillButton: "Auto-fill Modifiers with AI",
        autofillSuccess: "Modifiers have been auto-filled based on your idea!",
        imageUploadLabel: "Reference Image (Optional)",
        imageUploadPlaceholder: "Click or drag & drop to upload",
        tabScene: "Scene",
        tabCharacter: "Character",
        tabStyle: "Style",
        tabCamera: "Camera",
        tabAudio: "Audio",
        tabAdvanced: "Advanced",
        sectionEnvironment: "Environment & Atmosphere",
        labelEnvironment: "Describe the setting or environment",
        placeholderEnvironment: "e.g., A futuristic cyberpunk city at night, rainy, with neon signs reflecting on wet streets.",
        labelTimeOfDay: "Time of Day",
        labelWeather: "Weather",
        sectionCharacter: "Character Details",
        labelCharacterActions: "Character Actions",
        placeholderCharacterActions: "e.g., A knight takes two steps back, draws their sword, and holds a defensive stance. For precise timing, describe actions in sequence: 'The character walks to the window (3 seconds), pauses (1 second), then looks out'.",
        labelCharacterGender: "Gender",
        labelCharacterEthnicity: "Ethnicity",
        labelCharacterClothing: "Clothing Style",
        labelCharacterArchetype: "Archetype",
        labelCharacterAge: "Age",
        labelCharacterMood: "Mood",
        labelCharacterPose: "Pose",
        labelCharacterSkinTone: "Skin Tone",
        labelCharacterSpecificClothing: "Specific Clothing Items",
        placeholderCharacterSpecificClothing: "e.g., a worn leather jacket, ripped jeans, vintage band t-shirt.",
        labelCharacterAccessories: "Accessories",
        placeholderCharacterAccessories: "e.g., silver locket, aviator sunglasses, canvas backpack.",
        sectionStyle: "Visual Style",
        labelArtStyle: "Art Style",
        labelCustomArtStyle: "Describe Custom Art Style",
        placeholderCustomArtStyle: "e.g., 'Inspired by early 20th-century expressionist paintings'",
        labelVisualEffect: "Visual Effect",
        labelColorPalette: "Color Palette",
        sectionCamera: "Camera & Framing",
        labelCameraMovement: "Camera Movement",
        labelCameraDistance: "Camera Distance",
        labelLensType: "Lens Type",
        labelAspectRatio: "Aspect Ratio",
        labelResolution: "Resolution",
        sectionAudio: "Audio Design",
        labelVoiceStyle: "Voice-over Style",
        labelVoiceOver: "Voice-over Script",
        placeholderVoiceOver: "Enter the full script for the voice-over here.",
        labelAmbientSound: "Ambient Sound",
        labelSoundEffectsIntensity: "Sound Effects Intensity",
        sectionAdvanced: "Advanced Controls",
        labelMotionIntensity: "Motion Intensity",
        labelCreativityLevel: "Creativity Level",
        labelNegativePrompt: "Negative Prompt",
        placeholderNegativePrompt: "e.g., ugly, deformed, blurry, low quality",
        labelOptimizeFor8Seconds: "Optimize for 8-second clip",
        labelIncludeOverlayText: "Include overlay text/graphics",
        labelUseGoogleSearch: "Ground with Google Search",
        labelGenerateAsSeries: "Generate as a 3-part series",
        labelThinkingMode: "Enable Thinking Mode (Pro Only)",
        sectionModel: "Model Configuration",
        labelModel: "Generation Model",
        labelVeoModel: "Video Generation Model",
        labelTargetModel: "Prompt Emulation Target",
        toggleVeoLabel: "Veo 3.1",
        toggleVeoDescription: "Optimized for cinematic, artistic, and versatile video styles.",
        toggleSoraLabel: "Sora 2 Emulation",
        toggleSoraDescription: "Emulates hyper-realistic world simulation with a focus on physics.",
        generateButton: "Architect Prompt",
        copied: "Copied!",
        editButton: "Edit",
        saveButton: "Save",
        cancelButton: "Cancel",
        undoButton: "Undo",
        redoButton: "Redo",
        saveToHistoryButton: "Save to History",
        generateArtButton: "Concept Art",
        loadingArtButton: "Generating...",
        generateVideoButton: "Generate Video",
        loadingVideoButton: "Generating...",
        generateStoryboardButton: "Storyboard",
        loadingStoryboardButton: "Generating...",
        generateVariationsButton: "Variations",
        loadingVariationsButton: "Generating...",
        shareButton: "Share",
        templatesButton: "Use a Template",
        historyButton: "History",
        imageStudioButton: "Image Studio",
        sunoStudioButton: "Suno Song Studio",
        videoAnalysisButton: "Video Analysis",
        pronunciationGuideButton: "Pronunciation Guide",
        toastPromptGenerated: "Prompt successfully generated!",
        toastPromptSaved: "Prompt updated successfully.",
        toastHistorySaved: "Prompt saved to history.",
        toastHistoryLoaded: "Loaded state from history.",
        toastTemplateApplied: "Template applied.",
        toastArtGenerated: "Concept art generated (see console).",
        toastStoryboardGenerated: "Storyboard generated successfully!",
        toastVideoGenerated: "Video generated successfully!",
        toastVideoAnalyzed: "Video analysis complete!",
        toastPromptDownloaded: "Prompt downloaded.",
        toastShareLink: "Shareable link copied to clipboard!",
        toastImageGenerated: "Image generated successfully!",
        toastAudioSuggested: "AI suggested audio design!",
        toastSoraStyleSet: "Art style set to 'Photorealistic' for optimal Sora 2 emulation.",
        errorValidation: "Please fix the errors before generating.",
        errorFieldTooLong: "{field} cannot exceed {limit} characters.",
        errorRestrictedKeywordInField: "The {field} contains restricted content. Please revise.",
        errorInvalidUrl: "Please enter a valid YouTube URL.",
        errorInvalidAspectRatioForVeo: "Veo 3.1 video generation only supports 16:9 and 9:16 aspect ratios.",
        errorCustomStyleRequired: "Please describe your custom style.",
        errorVoiceOverRequired: "Please provide a script for the voice-over.",
        errorClothingDetailsRequired: "Please describe the specific clothing items when a character has actions and a clothing style is selected.",
        errorNoPromptToSave: "There is no prompt to save.",
        errorHistorySave: "Failed to save history.",
        errorApiKeyInvalid: "API Key is invalid or the associated project may not have billing enabled. Please select a valid key for a project with billing.",
        errorRateLimit: "Rate limit exceeded. Please try again later.",
        errorSafety: "The request was blocked due to safety settings.",
        errorBadRequest: "Invalid request. Please check your prompt parameters.",
        errorServerError: "A server error occurred. Please try again.",
        errorNetwork: "A network error occurred. Please check your connection.",
        errorGeneric: "An unexpected error occurred. Please try again.",
        errorFileUpload: "Error reading the uploaded file.",
        errorVideoFileSize: "Video file is too large. Please upload a video under 20MB.",
        history: {
            title: "Prompt History",
            clear: "Clear All History",
            clearConfirm: "Are you sure you want to delete all history? This cannot be undone.",
            empty: "You have no saved prompts.",
            use: "Use",
            delete: "Delete",
            deleteConfirm: "Are you sure you want to delete this entry?",
        },
        templates: {
            title: "Prompt Templates",
            use: "Use Template",
            searchPlaceholder: "Search templates...",
            noResults: "No templates found matching your search.",
        },
        variations: {
            title: "Prompt Variations",
            use: "Use This Variation",
            loading: "Generating creative variations...",
            empty: "Could not generate variations for this prompt.",
            combine: "Combine Selected",
            combiningButton: "Combining...",
            useCombined: "Use Combined Prompt",
            combinedPromptLabel: "Combined & Refined Prompt",
        },
        summary: {
            title: "Your Prompt Blueprint",
            ideaLabel: "Core Idea",
            styleLabel: "Art Style",
            cameraLabel: "Camera",
            cta: "Click 'Architect Prompt' to generate the final masterpiece!",
            livePreviewTitle: "Live Prompt Preview",
            livePreviewPlaceholder: "Start by writing your core idea to see a live preview..."
        },
        examplesCarousel: {
            title: "Get Inspired",
            use: "Use this Example"
        },
        videoStatusInit: "Initializing video generation...",
        videoStatusProcessing: "The model is now processing your request. This can take a few minutes.",
        videoStatusPolling: "Checking on the video's progress...",
        videoStatusFetching: "Finalizing and retrieving your video now.",
        videoStatusComplete: "Video generation complete!",
        videoStatusError: "An error occurred during video generation.",
        imageStudio: {
            title: "Image Studio",
            promptLabel: "Generation or Editing Prompt",
            promptPlaceholderGenerate: "e.g., A majestic lion with a golden crown, cinematic.",
            promptPlaceholderEdit: "e.g., Change the background to a beach. / Add a hat to the character.",
            uploadLabel: "Upload an image to edit (optional)",
            uploadPlaceholder: "Drag & drop or click to upload",
            generateButton: "Generate Image",
            editButton: "Edit Image",
            generatingButton: "Generating...",
            editingButton: "Editing...",
            downloadButton: "Download Image",
            clearButton: "Clear Image",
            canvasPlaceholder: "Your generated image will appear here.",
        },
        videoAnalysisStudio: {
            title: "Video Analysis Studio",
            uploadLabel: "Upload a video to analyze",
            uploadButton: "Choose a video file",
            uploadHint: "MP4, MOV, WEBM up to 20MB",
            promptLabel: "What would you like to know about this video?",
            promptPlaceholder: "e.g., Summarize this video in detail to inspire a new prompt idea.",
            analyzeButton: "Analyze Video",
            analyzingButton: "Analyzing...",
            resultsTitle: "Analysis Result",
            resultsPlaceholder: "The analysis from Gemini Pro will appear here.",
            useResultButton: "Use Result as Core Idea",
        },
        sunoStudio: {
            title: "Suno Song Studio",
            ideaLabel: "Describe your song idea",
            ideaPlaceholder: "e.g., A heartfelt country song about a lost dog finding its way home.",
            generateButton: "Generate Song Ideas",
            generatingButton: "Generating...",
            outputTitle: "Song Title",
            outputStyle: "Style of Music",
            outputLyrics: "Lyrics",
            copyButton: "Copy",
        },
        pronunciationGuide: {
            title: "Pronunciation Guide",
        },
        suggestAudioSystemPrompt: `You are an expert film sound designer and audio director. Your task is to analyze the provided scene details (the core idea, art style, camera movement, environment, character actions, and mood) and suggest the most fitting audio design. Your response must be a valid JSON object. From the provided list of voice styles, select the one that best enhances the scene's atmosphere. Then, write a short, evocative 1-2 sentence voice-over script that complements the visuals and mood. If no voice-over is appropriate for the scene, select 'None' and provide an empty string for the script.`,
        autoFillSystemPrompt: `You are an expert creative director's assistant with a deep understanding of cinematic language and visual storytelling. Your task is to analyze the user's core video idea and suggest a coherent, contextually-aware set of creative modifiers.

**Your process:**
1.  **Deep Analysis:** Carefully read the user's idea to identify key themes, subjects, setting, mood, and genre indicators. (e.g., if the user mentions 'futuristic city', recognize themes of sci-fi, technology, and potentially dystopia).
2.  **Contextual Inference:** Based on your analysis, choose the *most fitting and evocative* options from the enums provided in the schema for scene and style. Your choices should directly reflect the core idea.
3.  **Sophisticated Interplay (Crucial):** Your suggestions must not be independent. They must inform each other to create a believable, integrated scene.
    *   **Environment -> Character:** How does the environment affect the character? If the weather is 'Heavy Rain', the character's clothing and mood should reflect this (e.g., 'Formal' clothing is unlikely, 'Melancholy' mood is plausible).
    *   **Art Style -> Cinematography:** The camera work should complement the art style. A 'Cinematic' style pairs well with a 'Tracking shot', while a 'Vlog 4K' style fits a 'First-person POV'.
    *   **Genre/Style -> Atmosphere:** A chosen art style or genre should heavily influence the atmosphere. For a 'Noir' style, suggest 'Night' time, 'Heavy Rain', and a 'Monochrome' or 'Cool, blue tones' palette. For 'Ghibli Style', suggest 'Midday' or 'Golden Hour', 'Clear Skies', and a 'Vibrant' palette. This creates a holistic visual theme.
    *   **Action -> Environment:** The character's action should make sense in the setting. 'Meditating' is unlikely in a 'Stormy' scene.
    *   **Mood -> Lighting:** The color palette and time of day must enhance the character's mood. 'Joyful' pairs well with 'Golden Hour' and a 'Vibrant' palette.
4.  **Character Deep Dive:** If a character is implied, this is your most important task. Bring them to life with specific, creative details that tell a story.
    *   **Actions:** Describe a dynamic, observable action. Instead of 'thinking', suggest 'staring out a rain-streaked window'.
    *   **Appearance:** Logically infer or creatively suggest a gender, age, and skin tone that fits the context of the idea and genre.
    *   **Clothing & Accessories (Crucial):** For the \`characterSpecificClothing\` and \`characterAccessories\` fields, you MUST provide creative, highly specific suggestions. Do not be generic. Base your suggestions on the character's archetype, their environment, and the story's mood. For example, for a 'rebel pilot' in a 'dystopian desert', suggest: \`characterSpecificClothing: "a worn leather flight jacket with custom rebellion patches, oil-stained cargo pants, and scuffed combat boots"\` and \`characterAccessories: "a pair of scratched aviator sunglasses and a greasy toolkit hanging from their belt"\`.
5.  **Cohesion:** Your final set of suggestions must form a single, unified, and powerful creative vision where every element logically supports the others.
6.  **Intelligent Audio Direction:**
    *   **Ambient Sound:** Suggest an immersive ambient sound that matches the environment and mood. Avoid 'None' unless the scene is explicitly meant to be silent.
    *   **Voice Style:** Your choice here is critical for tone. Analyze the idea's genre and mood to suggest the most fitting voice-over style.
        *   **Narration:** For historical, nature, or educational themes, strongly prefer 'Documentary Narrator'. For a standard trailer feel, use 'Standard Narrator'.
        *   **Character-driven:** If the idea describes an internal thought process or a personal story, suggest 'Character Monologue'.
        *   **High Energy:** For action, comedy, or viral-style content, 'High-Energy Announcer' is a good fit.
        *   **Calm/Relaxing:** For meditative or soothing scenes, suggest 'Calm ASMR Voice' or 'Whispered ASMR'.
        *   **Default:** Only return 'None' if a voice-over would be distracting (e.g., a purely visual, abstract piece).
    *   **Voice-over Script:** If you suggest a voice style other than 'None', you MUST also write a short (1-2 sentence), creative voice-over script. This is a critical creative element. The script must feel like it was written *after* all other modifiers were chosen. It must directly reference or emotionally resonate with the specific environment, character actions, mood, and art style you've suggested. For example, if you suggest a 'Noir' style and 'Heavy Rain', a good script might be "In this city, the rain washes away everything but the secrets." A bad, generic script would be "It was a dark and stormy night." The script should enhance the story, not just describe what is happening. If the voice style is 'None', the script MUST be an empty string.

Respond ONLY with a valid JSON object that adheres to the provided schema. The 'environment' description should be brief and cinematic. If no character is clearly implied, return 'Any' for all character-related fields and empty strings for clothing/accessory descriptions.`,
        combineSystemPrompt: `You are an expert prompt engineer specializing in text-to-video models like Google Veo. The user has selected several prompt variations they find interesting. Your task is to intelligently analyze and synthesize these variations into a single, superior, and cohesive prompt.

**Your Process:**
1.  **Identify the Core Subject & Action:** What is the central event or character in all variations?
2.  **Analyze Attributes:** Examine the descriptive elements in each variation (e.g., art style, environment details, camera movements, color palettes, mood).
3.  **Synthesize & Refine:**
    *   Merge the most compelling and detailed descriptions. If one prompt says "a forest" and another says "a misty redwood forest at dawn," use the more descriptive version.
    *   Resolve Contradictions: If variations present conflicting details (e.g., 'Cinematic' vs. 'Anime' style, or 'day' vs. 'night'), choose the option that seems most evocative or dominant among the selections. If it's a close call, lean towards realism and cinematic quality.
    *   Ensure Narrative Cohesion: The final prompt must read like a single, intentional direction from a film director. It should be a well-written, dense paragraph.

**Output Format:**
Respond ONLY with a valid JSON object containing a single key: "combinedPrompt". The value should be the final, merged prompt as a single string. Do not include any preambles, explanations, or markdown formatting in the final string.`,
        tooltips: {
            ambientSound: "The background noise of the scene. This adds a layer of realism and immersion.",
            artStyle: "This is a key visual parameter. 'Cinematic' and 'Photorealistic' are good starting points for realistic videos.",
            aspectRatio: "Sets the shape of the video frame. '16:9' is standard for YouTube, while '9:16' is for mobile/social media. Veo 3.1 video generation only supports 16:9 and 9:16.",
            cameraDistance: "Determines how close the camera is to the subject. 'Close-up' is for emotion, while 'Wide shot' shows the environment.",
            cameraMovement: "How the camera moves through the scene. 'Tracking shot' follows a subject, while 'Drone shot' provides an aerial perspective.",
            characterActions: "What is the character doing? Focus on specific, observable actions. e.g., 'sipping tea while reading a book', 'sprinting across a rooftop'.",
            characterAge: "Defines the age group of the character, influencing their appearance and actions.",
            characterArchetype: "Assigns a classic storytelling role to the character (e.g., Hero, Villain, Mentor) to guide their actions and appearance.",
            characterClothing: "Describes what the character is wearing, which can help define their role, era, or personality.",
            characterEthnicity: "Specifies the ethnic appearance of the character. 'Any' gives the model creative freedom.",
            characterGender: "Defines the gender identity of the character. 'Any' allows the model to decide.",
            characterMood: "Sets the emotional tone of the character, affecting their facial expression and body language.",
            characterPose: "Describes the character's physical stance or posture, which can convey action or emotion.",
            characterSkinTone: "Specifies the character's skin tone for more detailed visual descriptions.",
            characterSpecificClothing: "Describe specific articles of clothing, separated by commas (e.g., 'vintage band t-shirt, worn leather jacket'). AI suggestions will appear below based on the character's archetype and environment.",
            characterAccessories: "List any accessories, separated by commas (e.g., 'silver locket necklace, round wire-frame glasses'). AI suggestions will appear below based on the character's archetype and environment.",
            colorPalette: "Controls the overall mood and tone. 'Warm tones' are great for nostalgic or happy scenes, 'Cool tones' for sci-fi or suspense.",
            creativityLevel: "Controls how closely the AI adheres to realism. 'Grounded' sticks to your prompt literally, while 'Imaginative' encourages more creative and surreal interpretations.",
            customArtStyle: "If you selected 'Custom Style', describe it here. Be specific, e.g., 'in the style of a 1920s German Expressionist film' or 'like a vaporwave music video'.",
            environment: "Describe the physical space, architecture, and overall mood of the scene. Be descriptive! You can also use dynamic placeholders like `{{weather}}` which will be automatically filled from other fields.",
            generateAsSeries: "Structures the output into a short narrative with a clear beginning, middle, and end. The final prompt will be formatted as three distinct episodes, perfect for storytelling.",
            idea: "This is the most important field. Describe the central theme, subject, and action of your video. Be as descriptive as you can. You can use the Auto-fill magic wand to get suggestions for the other fields based on this idea. You can also use dynamic placeholders like `{{character_archetype}}` which will be automatically filled from other fields.",
            includeOverlayText: "Instructs the AI to generate the video with animated text or graphic overlays. The content of the text should be specified in the 'Core Idea' or other relevant fields.",
            language: "Select the language for the AI to understand your inputs and generate the final prompt. This also changes the app's interface language.",
            lensType: "Simulates different camera lenses. 'Wide-angle' captures more of the environment, while 'Telephoto' focuses on distant subjects.",
            model: "This model generates the text prompt from your inputs. It does not create the final video. 'Pro' is best for complex ideas, while 'Flash' is faster for general use. This is automatically set to 'Pro' when Thinking Mode is enabled.",
            veoModel: "This model generates the final video from your text prompt. 'Fast' provides quicker results, great for iterating. 'Quality' takes longer but may yield higher visual fidelity.",
            motionIntensity: "Controls the amount and speed of movement in the video. 'High' is good for action scenes, 'Low' for calm, static shots.",
            negativePrompt: "Specify what you want to *avoid* in the video. Helps prevent common issues like distorted hands, blurry backgrounds, or unwanted objects.",
            optimizeFor8Seconds: "Tailors the prompt to create a short, impactful clip with a clear hook, suitable for platforms like TikTok or Shorts.",
            resolution: "Set the output resolution for the generated video. 1080p offers higher quality, while 720p generates faster.",
            soundEffectsIntensity: "Controls how noticeable the sound effects are. 'Subtle' adds realism, while 'Prominent' makes them a key part of the scene.",
            targetModel: "Changes the prompt structure to better emulate the style of different video models. 'Sora 2' mode aims for hyper-realism and detailed descriptions.",
            timeOfDay: "Sets the lighting and mood of the scene. 'Golden Hour' creates warm, soft light, while 'Night' can be used for dramatic or mysterious scenes.",
            useGoogleSearch: "Allows the model to use Google Search for real-time information. Useful for prompts about recent events, specific people, or real-world locations.",
            visualEffect: "Add extra visual flair. 'Lens flare' adds cinematic realism, while 'Slow motion' can add drama.",
            voiceOver: "The script that will be spoken by the narrator. This is only used if a Voice-over Style other than 'None' is selected.",
            voiceStyle: "Determines the tone of the voice-over. 'None' is a good choice if you only want music or ambient sound.",
            weather: "Adds atmosphere and can influence the story. Rain can feel melancholic, while clear skies feel optimistic.",
            imageUpload: "Provide a starting image for the video generation. The AI will use this as a reference or the first frame. This is optional.",
            thinkingMode: "Allows the AI to perform more complex, multi-step reasoning for difficult prompts. This may take longer but can yield more creative or nuanced results. It will always use the Gemini 2.5 Pro model.",
            generateButton: "Synthesizes all your inputs into a master prompt. Requires a Core Idea to be active.",
            generateVideoButton: "Sends the final prompt to the Veo 3.1 model to generate a video. This may take several minutes.",
            conceptArtButton: "Generates a single, high-quality still image based on your prompt to serve as a visual reference.",
            storyboardButton: "Generates a 4-panel storyboard to visualize the key narrative beats of your prompt before creating a full video.",
            variationsButton: "Generates 3 creative alternative versions of your current prompt, exploring different styles or narrative angles.",
            editButton: "Allows you to manually edit the generated prompt text for fine-tuning.",
            saveButton: "Saves your manual edits and updates the current prompt.",
            cancelButton: "Discards any manual edits and reverts to the previously generated prompt.",
            undoButton: "Reverts the last change you made while editing the prompt.",
            redoButton: "Re-applies the last change you undid while editing the prompt.",
            saveToHistoryButton: "Saves the current prompt and all its settings to your local History panel for later use.",
            shareButton: "Copies a unique URL to your clipboard that contains all your current settings, allowing you to share your exact prompt with others.",
            downloadButton: "Downloads the generated prompt text as a .txt file.",
            copyButton: "Copies the generated prompt text to your clipboard.",
            themeToggle: "Switch between dark and light mode.",
            sunoStudioButton: "Open the Suno Song Studio to generate AI music ideas.",
            imageStudioButton: "Open the Image Studio to generate or edit concept art.",
            videoAnalysisButton: "Open the Video Analysis Studio to bootstrap ideas from existing videos.",
            historyButton: "View, manage, and reuse your previously generated prompts.",
            templatesButton: "Start from a pre-configured template for common video styles.",
        },
        fieldLabels: {
            idea: "Core Idea",
            environment: "Environment",
            timeOfDay: "Time of Day",
            weather: "Weather",
            characterActions: "Character Actions",
            characterGender: "Character Gender",
            characterEthnicity: "Character Ethnicity",
            characterClothing: "Character Clothing",
            characterArchetype: "Character Archetype",
            characterAge: "Character Age",
            characterMood: "Character Mood",
            characterPose: "Character Pose",
            characterSkinTone: "Character Skin Tone",
            characterSpecificClothing: "Character Clothing Details",
            characterAccessories: "Character Accessories",
            artStyle: "Art Style",
            customArtStyle: "Custom Art Style",
            colorPalette: "Color Palette",
            visualEffect: "Visual Effect",
            cameraMovement: "Camera Movement",
            cameraDistance: "Camera Distance",
            lensType: "Lens Type",
            aspectRatio: "Aspect Ratio",
            resolution: "Resolution",
            animationPreset: "Animation",
            motionIntensity: "Motion Intensity",
            voiceStyle: "Voice Style",
            voiceOver: "Voice-over Script",
            ambientSound: "Ambient Sound",
            soundEffectsIntensity: "Sound Effects Intensity",
            creativityLevel: "Creativity",
            negativePrompt: "Negative Prompt",
            optimizeFor8Seconds: "Optimization",
            includeOverlayText: "Text/Graphics Overlay",
            useGoogleSearch: "Grounded Search",
            thinkingMode: "Thinking Mode",
            youtubeUrl: "YouTube URL Analysis",
            imageStudioPrompt: "Image Studio Prompt",
            uploadedImage: "Source Image",
            veoModel: "Veo Model",
        },
    }
};

// Populate other languages by copying English strings. In a real app, these would be translated.
const languages: Language[] = ['sv', 'es', 'fr', 'de'];
languages.forEach(lang => {
    (appUIStringsData as any)[lang] = { ...appUIStringsData.en };
});

// Manual translations
appUIStringsData.sv.undoButton = "Ångra";
appUIStringsData.sv.redoButton = "Gör om";
appUIStringsData.es.undoButton = "Deshacer";
appUIStringsData.es.redoButton = "Rehacer";
appUIStringsData.fr.undoButton = "Annuler";
appUIStringsData.fr.redoButton = "Rétablir";
appUIStringsData.de.undoButton = "Rückgängig";
appUIStringsData.de.redoButton = "Wiederholen";

appUIStringsData.sv.placeholderCharacterActions = "t.ex., En riddare tar två steg bakåt, drar sitt svärd och intar en defensiv hållning. För exakt timing, beskriv handlingar i sekvens: 'Karaktären går till fönstret (3 sekunder), pausar (1 sekund), tittar sedan ut'.";
appUIStringsData.es.placeholderCharacterActions = "p. ej., Un caballero da dos pasos hacia atrás, desenvaina su espada y adopta una postura defensiva. Para una sincronización precisa, describe las acciones en secuencia: 'El personaje camina hacia la ventana (3 segundos), hace una pausa (1 segundo) y luego mira hacia afuera'.";
appUIStringsData.fr.placeholderCharacterActions = "p. ex., Un chevalier recule de deux pas, tire son épée et adopte une posture défensive. Pour un timing précis, décrivez les actions en séquence : 'Le personnage se dirige vers la fenêtre (3 secondes), s'arrête (1 seconde), puis regarde dehors'.";
appUIStringsData.de.placeholderCharacterActions = "z.B., Ein Ritter tritt zwei Schritte zurück, zieht sein Schwert und nimmt eine Verteidigungshaltung ein. Für präzises Timing, beschreiben Sie Aktionen nacheinander: 'Die Figur geht zum Fenster (3 Sekunden), hält inne (1 Sekunde), und schaut dann hinaus'.";

appUIStringsData.sv.templates = {
    title: "Promptmallar",
    use: "Använd mall",
    searchPlaceholder: "Sök bland mallar...",
    noResults: "Inga mallar hittades som matchar din sökning.",
};
appUIStringsData.es.templates = {
    title: "Plantillas de Prompt",
    use: "Usar Plantilla",
    searchPlaceholder: "Buscar plantillas...",
    noResults: "No se encontraron plantillas que coincidan con su búsqueda."
};
appUIStringsData.fr.templates = {
    title: "Modèles de Prompt",
    use: "Utiliser le Modèle",
    searchPlaceholder: "Rechercher des modèles...",
    noResults: "Aucun modèle trouvé correspondant à votre recherche."
};
appUIStringsData.de.templates = {
    title: "Prompt-Vorlagen",
    use: "Vorlage verwenden",
    searchPlaceholder: "Vorlagen suchen...",
    noResults: "Keine Vorlagen gefunden, die Ihrer Suche entsprechen."
};
appUIStringsData.sv.variations = {
    ...appUIStringsData.sv.variations,
    combine: "Kombinera Valda",
    combiningButton: "Kombinerar...",
    useCombined: "Använd Kombinerad Prompt",
    combinedPromptLabel: "Kombinerad & Förfinad Prompt",
};
appUIStringsData.es.variations = {
    ...appUIStringsData.es.variations,
    combine: "Combinar Seleccionados",
    combiningButton: "Combinando...",
    useCombined: "Usar Prompt Combinado",
    combinedPromptLabel: "Prompt Combinado y Refinado",
};
appUIStringsData.fr.variations = {
    ...appUIStringsData.fr.variations,
    combine: "Combiner la Sélection",
    combiningButton: "Combinaison...",
    useCombined: "Utiliser le Prompt Combiné",
    combinedPromptLabel: "Prompt Combiné & Affiné",
};
appUIStringsData.de.variations = {
    ...appUIStringsData.de.variations,
    combine: "Auswahl kombinieren",
    combiningButton: "Kombiniere...",
    useCombined: "Kombinierten Prompt verwenden",
    combinedPromptLabel: "Kombinierter & Verfeinerter Prompt",
};
appUIStringsData.sv.summary = {
    ...appUIStringsData.sv.summary,
    title: "Din Prompt-ritning",
    cta: "Klicka på 'Arkitektera Prompt' för att generera det slutliga mästerverket!",
    livePreviewTitle: "Live förhandsgranskning av prompt",
    livePreviewPlaceholder: "Börja skriva din grundidé för att se en live förhandsgranskning...",
};
appUIStringsData.es.summary = {
    ...appUIStringsData.es.summary,
    title: "Tu Plan de Prompt",
    cta: "¡Haz clic en 'Diseñar Prompt' para generar la obra maestra final!",
    livePreviewTitle: "Vista Previa del Prompt en Vivo",
    livePreviewPlaceholder: "Comienza a escribir tu idea central para ver una vista previa en vivo...",
};
appUIStringsData.fr.summary = {
    ...appUIStringsData.fr.summary,
    title: "Votre Plan de Prompt",
    cta: "Cliquez sur 'Architecturer le Prompt' pour générer le chef-d'œuvre final !",
    livePreviewTitle: "Aperçu du Prompt en Direct",
    livePreviewPlaceholder: "Commencez à écrire votre idée principale pour voir un aperçu en direct...",
};
appUIStringsData.de.summary = {
    ...appUIStringsData.de.summary,
    title: "Ihr Prompt-Entwurf",
    cta: "Klicken Sie auf 'Prompt entwerfen', um das endgültige Meisterwerk zu erstellen!",
    livePreviewTitle: "Live-Prompt-Vorschau",
    livePreviewPlaceholder: "Beginnen Sie mit der Eingabe Ihrer Kernidee, um eine Live-Vorschau zu sehen...",
};
appUIStringsData.sv.examplesCarousel = { title: "Bli Inspirerad", use: "Använd detta Exempel" };
appUIStringsData.es.examplesCarousel = { title: "Inspírate", use: "Usar este Ejemplo" };
appUIStringsData.fr.examplesCarousel = { title: "Trouvez l'Inspiration", use: "Utiliser cet Exemple" };
appUIStringsData.de.examplesCarousel = { title: "Lass dich inspirieren", use: "Dieses Beispiel verwenden" };
appUIStringsData.sv.pronunciationGuideButton = "Uttalsguide";
appUIStringsData.es.pronunciationGuideButton = "Guía de pronunciación";
appUIStringsData.fr.pronunciationGuideButton = "Guide de prononciation";
appUIStringsData.de.pronunciationGuideButton = "Aussprachehilfe";
appUIStringsData.sv.pronunciationGuide = { title: "Uttalsguide" };
appUIStringsData.es.pronunciationGuide = { title: "Guía de pronunciación" };
appUIStringsData.fr.pronunciationGuide = { title: "Guide de prononciation" };
appUIStringsData.de.pronunciationGuide = { title: "Aussprachehilfe" };
appUIStringsData.sv.errorClothingDetailsRequired = "Vänligen beskriv de specifika klädesplaggen när en karaktär har handlingar och en klädstil är vald.";
appUIStringsData.es.errorClothingDetailsRequired = "Por favor, describe las prendas de vestir específicas cuando un personaje tiene acciones y se selecciona un estilo de ropa.";
appUIStringsData.fr.errorClothingDetailsRequired = "Veuillez décrire les vêtements spécifiques lorsqu'un personnage a des actions et qu'un style vestimentaire est sélectionné.";
appUIStringsData.de.errorClothingDetailsRequired = "Bitte beschreiben Sie die spezifischen Kleidungsstücke, wenn ein Charakter Aktionen ausführt und ein Kleidungsstil ausgewählt ist.";

appUIStringsData.sv.errorFieldTooLong = "{field} får inte överstiga {limit} tecken.";
appUIStringsData.es.errorFieldTooLong = "{field} no puede exceder los {limit} caracteres.";
appUIStringsData.fr.errorFieldTooLong = "{field} ne peut pas dépasser {limit} caractères.";
appUIStringsData.de.errorFieldTooLong = "{field} darf {limit} Zeichen nicht überschreiten.";

appUIStringsData.sv.errorRestrictedKeywordInField = "{field} innehåller begränsat innehåll. Vänligen revidera.";
appUIStringsData.es.errorRestrictedKeywordInField = "El {field} contiene contenido restringido. Por favor, revísalo.";
appUIStringsData.fr.errorRestrictedKeywordInField = "Le {field} contient du contenu restreint. Veuillez le réviser.";
appUIStringsData.de.errorRestrictedKeywordInField = "Das {field} enthält eingeschränkte Inhalte. Bitte überarbeiten Sie es.";

appUIStringsData.sv.fieldLabels = { idea: "Grundidé", environment: "Miljö", timeOfDay: "Tid på dygnet", weather: "Väder", characterActions: "Karaktärshandlingar", characterGender: "Karaktärens kön", characterEthnicity: "Karaktärens etnicitet", characterClothing: "Karaktärens klädsel", characterArchetype: "Karaktärsarketyp", characterAge: "Karaktärens ålder", characterMood: "Karaktärens humör", characterPose: "Karaktärens pose", characterSkinTone: "Karaktärens hudton", characterSpecificClothing: "Specifika klädesplagg", characterAccessories: "Karaktärsaccessoarer", artStyle: "Konststil", customArtStyle: "Anpassad konststil", colorPalette: "Färgpalett", visualEffect: "Visuell effekt", cameraMovement: "Kamerarörelse", cameraDistance: "Kameraavstånd", lensType: "Objektivtyp", aspectRatio: "Bildförhållande", resolution: "Upplösning", animationPreset: "Animation", motionIntensity: "Rörelseintensitet", voiceStyle: "Berättarröst", voiceOver: "Manus för berättarröst", ambientSound: "Omgivningsljud", soundEffectsIntensity: "Ljudintensitet", creativityLevel: "Kreativitet", negativePrompt: "Negativ prompt", optimizeFor8Seconds: "Optimering", includeOverlayText: "Text/Grafik-överlägg", useGoogleSearch: "Grundad sökning", youtubeUrl: "YouTube URL-analys", imageStudioPrompt: "Bildstudioprompt", uploadedImage: "Källbild", veoModel: "Veo-modell", thinkingMode: "Tänkande läge" };
appUIStringsData.es.fieldLabels = { idea: "Idea Central", environment: "Entorno", timeOfDay: "Hora del Día", weather: "Clima", characterActions: "Acciones del Personaje", characterGender: "Género del Personaje", characterEthnicity: "Etnia del Personaje", characterClothing: "Vestimenta del Personaje", characterArchetype: "Arquetipo del Personaje", characterAge: "Edad del Personaje", characterMood: "Humor del Personaje", characterPose: "Pose del Personaje", characterSkinTone: "Tono de Piel del Personaje", characterSpecificClothing: "Detalles de Ropa del Personaje", characterAccessories: "Accesorios del Personaje", artStyle: "Estilo de Arte", customArtStyle: "Estilo de Arte Personalizado", colorPalette: "Paleta de Colores", visualEffect: "Efecto Visual", cameraMovement: "Movimiento de Cámara", cameraDistance: "Distancia de Cámara", lensType: "Tipo de Lente", aspectRatio: "Relación de Aspecto", resolution: "Resolución", animationPreset: "Animación", motionIntensity: "Intensidad de Movimiento", voiceStyle: "Estilo de Voz", voiceOver: "Guion de Voz en Off", ambientSound: "Sonido Ambiental", soundEffectsIntensity: "Intensidad de Efectos de Sonido", creativityLevel: "Creatividad", negativePrompt: "Prompt Negativo", optimizeFor8Seconds: "Optimización", includeOverlayText: "Superposición de Texto/Gráficos", useGoogleSearch: "Búsqueda Fundamentada", youtubeUrl: "Análisis de URL de YouTube", imageStudioPrompt: "Prompt de Estudio de Imagen", uploadedImage: "Imagen de Origen", veoModel: "Modelo Veo", thinkingMode: "Modo de Pensamiento" };
appUIStringsData.fr.fieldLabels = { idea: "Idée de base", environment: "Environnement", timeOfDay: "Moment de la journée", weather: "Météo", characterActions: "Actions du personnage", characterGender: "Genre du personnage", characterEthnicity: "Ethnicité du personnage", characterClothing: "Style vestimentaire du personnage", characterArchetype: "Archétype du personnage", characterAge: "Âge du personnage", characterMood: "Humeur du personnage", characterPose: "Pose du personnage", characterSkinTone: "Teint du personnage", characterSpecificClothing: "Détails vestimentaires du personnage", characterAccessories: "Accessoires du personnage", artStyle: "Style artistique", customArtStyle: "Style artistique personnalisé", colorPalette: "Palette de couleurs", visualEffect: "Effet visuel", cameraMovement: "Mouvement de caméra", cameraDistance: "Distance de la caméra", lensType: "Type d'objectif", aspectRatio: "Format d'image", resolution: "Résolution", animationPreset: "Animation", motionIntensity: "Intensité du mouvement", voiceStyle: "Style de voix off", voiceOver: "Script de voix off", ambientSound: "Son d'ambiance", soundEffectsIntensity: "Intensité des effets sonores", creativityLevel: "Créativité", negativePrompt: "Prompt négatif", optimizeFor8Seconds: "Optimisation", includeOverlayText: "Superposition de texte/graphiques", useGoogleSearch: "Recherche fondée", youtubeUrl: "Analyse d'URL YouTube", imageStudioPrompt: "Prompt de studio d'image", uploadedImage: "Image source", veoModel: "Modèle Veo", thinkingMode: "Mode de Réflexion" };
appUIStringsData.de.fieldLabels = { idea: "Kernidee", environment: "Umgebung", timeOfDay: "Tageszeit", weather: "Wetter", characterActions: "Charakteraktionen", characterGender: "Geschlecht des Charakters", characterEthnicity: "Ethnizität des Charakters", characterClothing: "Kleidungsstil des Charakters", characterArchetype: "Archetyp des Charakters", characterAge: "Alter des Charakters", characterMood: "Stimmung des Charakters", characterPose: "Pose des Charakters", characterSkinTone: "Hautton des Charakters", characterSpecificClothing: "Kleidungsdetails des Charakters", characterAccessories: "Accessoires des Charakters", artStyle: "Kunststil", customArtStyle: "Benutzerdefinierter Kunststil", colorPalette: "Farbpalette", visualEffect: "Visueller Effekt", cameraMovement: "Kamerabewegung", cameraDistance: "Kameraabstand", lensType: "Objektivtyp", aspectRatio: "Seitenverhältnis", resolution: "Auflösung", animationPreset: "Animation", motionIntensity: "Bewegungsintensität", voiceStyle: "Stimme des Sprechers", voiceOver: "Sprechertext", ambientSound: "Umgebungsgeräusche", soundEffectsIntensity: "Intensität der Soundeffekte", creativityLevel: "Kreativität", negativePrompt: "Negativer Prompt", optimizeFor8Seconds: "Optimierung", includeOverlayText: "Text-/Grafiküberlagerung", useGoogleSearch: "Fundierte Suche", youtubeUrl: "YouTube-URL-Analyse", imageStudioPrompt: "Bildstudio-Prompt", uploadedImage: "Quellbild", veoModel: "Veo-Modell", thinkingMode: "Denkmodus" };


export const appUIStrings: { [lang in Language]: typeof appUIStringsData['en'] } = appUIStringsData;

// --- PRONUNCIATION GUIDES ---
export const pronunciationGuides: { [lang in Language]: PronunciationGuideData } = {
    en: {
        terms: [
            { term: 'Veo', pronunciation: 'VAY-oh', description: 'Google\'s text-to-video generation model.' },
            { term: 'Cinematic', pronunciation: 'sin-uh-MAT-ick', description: 'Having the qualities of a motion picture; grand, dramatic, and high-quality.' },
            { term: 'Noir', pronunciation: 'nwahr', description: 'A French term for a film style marked by pessimism, fatalism, and menace, often with high-contrast, black-and-white visuals.' },
            { term: 'Baroque', pronunciation: 'buh-ROHK', description: 'A highly ornate and extravagant style of architecture, art, and music of the 17th and 18th centuries.' },
            { term: 'Cyberpunk', pronunciation: 'SY-ber-punk', description: 'A subgenre of science fiction in a futuristic setting that tends to focus on a "combination of low-life and high tech".' },
            { term: 'Archetype', pronunciation: 'AHR-ki-type', description: 'A very typical example of a certain person or thing; a recurrent symbol or motif in literature, art, or mythology.' },
        ]
    },
    sv: {
        terms: [
            { term: 'Veo', pronunciation: 'VAY-oh', description: 'Googles text-till-video-generationsmodell.' },
            { term: 'Filmisk', pronunciation: 'FILM-isk', description: 'Att ha kvaliteter som en spelfilm; storslagen, dramatisk och av hög kvalitet.' },
            { term: 'Noir', pronunciation: 'nwahr', description: 'En fransk term för en filmstil präglad av pessimism, fatalism och hot, ofta med högkontrast, svartvita bilder.' },
            { term: 'Barock', pronunciation: 'bah-ROCK', description: 'En mycket utsmyckad och extravagant stil inom arkitektur, konst och musik från 1600- och 1700-talen.' },
            { term: 'Cyberpunk', pronunciation: 'SY-ber-punk', description: 'En subgenre av science fiction i en futuristisk miljö som tenderar att fokusera på en "kombination av low-life och high tech".' },
            { term: 'Arketyp', pronunciation: 'ar-ke-TYP', description: 'Ett mycket typiskt exempel på en viss person eller sak; en återkommande symbol eller motiv i litteratur, konst eller mytologi.' },
        ]
    },
    es: {
        terms: [
            { term: 'Veo', pronunciation: 'VAY-oh', description: 'El modelo de generación de texto a video de Google.' },
            { term: 'Cinematográfico', pronunciation: 'see-neh-mah-toh-GRA-fee-ko', description: 'Que tiene las cualidades de una película; grandioso, dramático y de alta calidad.' },
            { term: 'Noir', pronunciation: 'nwahr', description: 'Término francés para un estilo de cine marcado por el pesimismo, el fatalismo y la amenaza, a menudo con imágenes en blanco y negro de alto contraste.' },
            { term: 'Barroco', pronunciation: 'bah-RRO-ko', description: 'Un estilo de arquitectura, arte y música muy ornamentado y extravagante de los siglos XVII y XVIII.' },
            { term: 'Cyberpunk', pronunciation: 'SY-ber-ponk', description: 'Un subgénero de ciencia ficción en un entorno futurista que tiende a centrarse en una "combinación de baja vida y alta tecnología".' },
            { term: 'Arquetipo', pronunciation: 'ar-ke-TEE-po', description: 'Un ejemplo muy típico de una determinada persona o cosa; un símbolo o motivo recurrente en la literatura, el arte o la mitología.' },
        ]
    },
    fr: {
        terms: [
            { term: 'Veo', pronunciation: 'VAY-o', description: 'Le modèle de génération de texte en vidéo de Google.' },
            { term: 'Cinématographique', pronunciation: 'see-nay-ma-to-gra-FEEK', description: 'Ayant les qualités d\'un film ; grandiose, dramatique et de haute qualité.' },
            { term: 'Noir', pronunciation: 'nwahr', description: 'Un terme français pour un style de film marqué par le pessimisme, le fatalisme et la menace, souvent avec des visuels en noir et blanc à fort contraste.' },
            { term: 'Baroque', pronunciation: 'bah-ROCK', description: 'Un style d\'architecture, d\'art et de musique très orné et extravagant des 17e et 18e siècles.' },
            { term: 'Cyberpunk', pronunciation: 'SEE-ber-punk', description: 'Un sous-genre de la science-fiction dans un cadre futuriste qui tend à se concentrer sur une "combinaison de basse vie et de haute technologie".' },
            { term: 'Archétype', pronunciation: 'ar-kay-TEEP', description: 'Un exemple très typique d\'une certaine personne ou chose ; un symbole ou un motif récurrent dans la littérature, l\'art ou la mythologie.' },
        ]
    },
    de: {
        terms: [
            { term: 'Veo', pronunciation: 'WEY-o', description: 'Googles Text-zu-Video-Generierungsmodell.' },
            { term: 'Filmisch', pronunciation: 'FIL-mish', description: 'Die Qualitäten eines Spielfilms habend; großartig, dramatisch und von hoher Qualität.' },
            { term: 'Noir', pronunciation: 'nwahr', description: 'Ein französischer Begriff für einen Filmstil, der von Pessimismus, Fatalismus und Bedrohung geprägt ist, oft mit kontrastreichen Schwarz-Weiß-Bildern.' },
            { term: 'Barock', pronunciation: 'ba-ROCK', description: 'Ein sehr kunstvoller und extravaganter Stil der Architektur, Kunst und Musik des 17. und 18. Jahrhunderts.' },
            { term: 'Cyberpunk', pronunciation: 'SY-ber-punk', description: 'Ein Subgenre der Science-Fiction in einer futuristischen Umgebung, das sich tendenziell auf eine "Kombination aus Low-Life und High-Tech" konzentriert.' },
            { term: 'Archetyp', pronunciation: 'AR-che-typ', description: 'Ein sehr typisches Beispiel für eine bestimmte Person oder Sache; ein wiederkehrendes Symbol oder Motiv in der Literatur, Kunst oder Mythologie.' },
        ]
    },
};


// --- VIDEO GENERATION STAGES ---
export const videoGenerationStages: { [lang in Language]: { [key: string]: string } } = {
    en: { init: "Initialize", render: "Render", finalize: "Finalize" },
    sv: { init: "Initiera", render: "Rendera", finalize: "Slutför" },
    es: { init: "Inicializar", render: "Renderizar", finalize: "Finalizar" },
    fr: { init: "Initialiser", render: "Rendu", finalize: "Finaliser" },
    de: { init: "Initialisieren", render: "Rendern", finalize: "Abschließen" },
};

// --- PROMPT BUILDING TEMPLATES & LABELS ---

export const promptTemplates: { [key in Language]: string } = {
    en: `You are an expert prompt engineer for Google's Veo 3.1, a state-of-the-art text-to-video model. Veo 3.1 excels at photorealism, consistent characters, and complex, dynamic camera movements. Your task is to expand a user's core idea into a rich, detailed, and cinematic prompt that leverages these strengths. Think like a film director giving precise instructions to your crew.

**Core Principles:**
1.  **Cinematic Language:** Use descriptive, evocative language. Focus on lighting (e.g., 'soft morning light filtering through blinds'), texture (e.g., 'the rough texture of weathered brick'), and mood.
2.  **Show, Don't Tell:** Instead of stating an emotion, describe the physical expression of it. For example, instead of 'she was sad', write 'a single tear traced a path down her cheek'.
3.  **World Consistency:** Ensure all described elements are coherent. If a character has been in the rain, their clothes should be visibly damp.
4.  **Narrative Pacing & Emotion:** The prompt should imply a sense of timing and emotional arc. Describe actions sequentially to build a micro-narrative.
5.  **Avoid Technical Jargon:** Do not use camera-specific terms like 'f-stop', 'ISO', or 'shutter speed'. Instead, describe the *visual effect* you want (e.g., 'a shallow depth of field with a blurry background', 'crisp, fast-moving action with no motion blur').

**Output Structure:**
- **Visual Description:** Combine the user's visual parameters into a single, vivid, and coherent paragraph. This paragraph should focus ONLY on the visual aspects of the scene. Do not use lists or bullet points.
- **Dialogue Block:** After the visual description, you MUST include a dialogue block.
    - If a "Voice-over Script" is provided by the user, use that exact script.
    - If no script is provided, you MUST creatively write a short, impactful line of dialogue or narration (1-2 sentences) that fits the scene's mood and context.
- **Formatting:** The dialogue block must be formatted exactly like this:
---
Dialogue: "[Your generated dialogue or the user's script]"
---

User's Core Idea: "{idea}"
Key Parameters to incorporate:
{parameterList}
`,
    sv: `Du är en expert på prompt-engineering för Googles Veo 3.1, en toppmodern text-till-video-modell. Veo 3.1 utmärker sig i fotorealism, konsekventa karaktärer och komplexa, dynamiska kamerarörelser. Din uppgift är att utöka en användares grundidé till en rik, detaljerad och filmisk prompt som utnyttjar dessa styrkor. Tänk som en filmregissör som ger exakta instruktioner till sitt team.

**Kärnprinciper:**
1.  **Filmiskt språk:** Använd beskrivande, suggestivt språk. Fokusera på ljussättning (t.ex. 'mjukt morgonljus som silar genom persienner'), textur (t.ex. 'den grova texturen av väderbitet tegel') och stämning.
2.  **Visa, inte berätta:** Istället för att konstatera en känsla, beskriv det fysiska uttrycket för den. Till exempel, istället för 'hon var ledsen', skriv 'en enstaka tår rann nerför hennes kind'.
3.  **Världskonsistens:** Se till att alla beskrivna element är sammanhängande. Om en karaktär har varit i regnet bör deras kläder vara synligt fuktiga.
4.  **Narrativt tempo & känsla:** Prompten ska antyda en känsla för timing och en emotionell båge. Beskriv handlingar i sekvens för att bygga en mikronarrativ.
5.  **Undvik teknisk jargong:** Använd inte kameraspecifika termer som 'f-stop', 'ISO' eller 'slutartid'. Beskriv istället den *visuella effekten* du vill ha (t.ex. 'ett kort skärpedjup med suddig bakgrund', 'skarp, snabbrörlig action utan rörelseoskärpa').

**Utdatastruktur:**
- **Visuell beskrivning:** Kombinera användarens visuella parametrar till ett enda, levande och sammanhängande stycke. Detta stycke ska ENDAST fokusera på de visuella aspekterna av scenen. Använd inte listor eller punktform.
- **Dialogblock:** Efter den visuella beskrivningen MÅSTE du inkludera ett dialogblock.
    - Om ett "Manus för berättarröst" tillhandahålls av användaren, använd det exakta manuset.
    - Om inget manus tillhandahålls, MÅSTE du kreativt skriva en kort, slagkraftig dialograd eller berättarröst (1-2 meningar) som passar scenens stämning och sammanhang.
- **Formatering:** Dialogblocket måste formateras exakt så här:
---
Dialog: "[Din genererade dialog eller användarens manus]"
---

Användarens grundidé: "{idea}"
Nyckelparametrar att införliva:
{parameterList}
`,
    es: `Eres un ingeniero de prompts experto para Veo 3.1 de Google, un modelo de texto a video de última generación. Veo 3.1 destaca en fotorrealismo, narrativas coherentes y movimientos de cámara complejos y dinámicos. Tu tarea es expandir la idea central de un usuario en un prompt rico, detallado y cinematográfico que aproveche estas fortalezas. Piensa como un director de cine dando instrucciones precisas a su equipo.

**Principios Fundamentales:**
1.  **Lenguaje Cinematográfico:** Usa un lenguaje descriptivo y evocador. Céntrate en la iluminación (p. ej., 'luz suave de la mañana filtrándose por las persianas'), la textura (p. ej., 'la textura rugosa del ladrillo desgastado') y el ambiente.
2.  **Muestra, no Cuentes:** En lugar de declarar una emoción, describe su expresión física. Por ejemplo, en vez de 'estaba triste', escribe 'una sola lágrima trazó un camino por su mejilla'.
3.  **Consistencia del Mundo:** Asegúrate de que todos los elementos descritos sean coherentes. Si un personaje ha estado bajo la lluvia, su ropa debe estar visiblemente húmeda.
4.  **Ritmo Narrativo y Emoción:** El prompt debe implicar un sentido del tiempo y un arco emocional. Describe las acciones secuencialmente para construir una micro-narrativa.
5.  **Evita la Jerga Técnica:** No uses términos específicos de cámara como 'f-stop', 'ISO' o 'velocidad de obturación'. En su lugar, describe el *efecto visual* que deseas (p. ej., 'una profundidad de campo reducida con un fondo borroso', 'acción nítida y rápida sin desenfoque de movimiento').

**Estructura de Salida:**
- **Descripción Visual:** Combina los parámetros visuais del usuario en un único párrafo vívido y coherente. Este párrafo debe centrarse ÚNICAMENTE en los aspectos visuais de la escena. No uses listas ni viñetas.
- **Bloque de Diálogo:** Después de la descripción visual, DEBES incluir un bloque de diálogo.
    - Si el usuario proporciona un "Guion de Voz en Off", utiliza ese guion exacto.
    - Si no se proporciona ningún guion, DEBES escribir creativamente una línea de diálogo o narración corta e impactante (1-2 frases) que se ajuste al ambiente y contexto de la escena.
- **Formato:** El bloque de diálogo debe formatearse exactamente así:
---
Diálogo: "[Tu diálogo generado o el guion del usuario]"
---

Idea central del usuario: "{idea}"
Parámetros clave a incorporar:
{parameterList}
`,
    fr: `Vous êtes un ingénieur de prompt expert pour Veo 3.1 de Google, un modèle de conversion de texte en vidéo de pointe. Veo 3.1 excelle dans le photoréalisme, la cohérence des personnages et les mouvements de caméra complexes et dynamiques. Votre tâche consiste à développer l'idée de base d'un utilisateur en un prompt riche, détaillé et cinématographique qui exploite ces atouts. Pensez comme un réalisateur donnant des instructions précises à son équipe.

**Principes Fondamentaux :**
1.  **Langage Cinématographique :** Utilisez un langage descriptif et évocateur. Concentrez-vous sur l'éclairage (par ex., 'douce lumière du matin filtrant à travers les stores'), la texture (par ex., 'la texture rugueuse de la brique vieillie') et l'ambiance.
2.  **Montrer, ne pas Raconter :** Au lieu d'énoncer une émotion, décrivez son expression physique. Par exemple, au lieu de 'elle était triste', écrivez 'une seule larme a tracé un chemin sur sa joue'.
3.  **Cohérence du Monde :** Assurez-vous que tous les éléments décrits sont cohérents. Si un personnage a été sous la pluie, ses vêtements doivent être visiblement humides.
4.  **Rythme Narratif et Émotion :** Le prompt doit impliquer une notion de rythme et une arche émotionnelle. Décrivez les actions de manière séquentielle pour construire un micro-récit.
5.  **Évitez le Jargon Technique :** N'utilisez pas de termes spécifiques à la caméra comme 'diaphragme', 'ISO' ou 'vitesse d'obturation'. Décrivez plutôt l'*effet visuel* que vous souhaitez (par ex., 'une faible profondeur de champ avec un arrière-plan flou', 'une action nette et rapide sans flou de mouvement').

**Structure de la Sortie :**
- **Description Visuelle :** Combinez les paramètres visuels de l'utilisateur en un seul paragraphe vivant et cohérent. Ce paragraphe doit se concentrer UNIQUEMENT sur les aspects visuels de la scène. N'utilisez pas de listes ou de puces.
- **Bloc de Dialogue :** Après la description visuelle, vous DEVEZ inclure un bloc de dialogue.
    - Si un "Script de voix off" est fourni par l'utilisateur, utilisez ce script exact.
    - Si aucun script n'est fourni, vous DEVEZ écrire de manière créative une courte ligne de dialogue ou de narration percutante (1-2 phrases) qui correspond à l'ambiance et au contexte de la scène.
- **Formatage :** Le bloc de dialogue doit être formaté exactement comme ceci :
---
Dialogue : "[Votre dialogue généré ou le script de l'utilisateur]"
---

Idée de base de l'utilisateur : "{idea}"
Paramètres clés à intégrer :
{parameterList}
`,
    de: `Sie sind ein Experte für Prompt-Engineering für Googles Veo 3.1, ein hochmodernes Text-zu-Video-Modell. Veo 3.1 zeichnet sich durch Fotorealismus, konsistente Charaktere und komplexe, dynamische Kamerabewegungen aus. Ihre Aufgabe ist es, die Kernidee eines Benutzers zu einem reichhaltigen, detaillierten und filmischen Prompt zu erweitern, der diese Stärken nutzt. Denken Sie wie ein Filmregisseur, der seiner Crew präzise Anweisungen gibt.

**Grundprinzipien:**
1.  **Filmsprache:** Verwenden Sie eine beschreibende, evokative Sprache. Konzentrieren Sie sich auf Beleuchtung (z. B. 'weiches Morgenlicht, das durch Jalousien dringt'), Textur (z. B. 'die raue Textur von verwittertem Ziegelstein') und Stimmung.
2.  **Zeigen, nicht erzählen:** Anstatt eine Emotion zu benennen, beschreiben Sie ihren physischen Ausdruck. Zum Beispiel, anstatt 'sie war traurig', schreiben Sie 'eine einzelne Träne bahnte sich einen Weg über ihre Wange'.
3.  **Weltkonsistenz:** Stellen Sie sicher, dass alle beschriebenen Elemente kohärent sind. Wenn eine Figur im Regen war, sollte ihre Kleidung sichtbar feucht sein.
4.  **Erzähltempo & Emotion:** Der Prompt sollte ein Gefühl für Timing und einen emotionalen Bogen andeuten. Beschreiben Sie Aktionen nacheinander, um eine Mikro-Erzählung zu erstellen.
5.  **Vermeiden Sie Fachjargon:** Verwenden Sie keine kameraspezifischen Begriffe wie 'Blende', 'ISO' oder 'Verschlusszeit'. Beschreiben Sie stattdessen den *visuellen Effekt*, den Sie erzielen möchten (z. B. 'eine geringe Schärfentiefe mit verschwommenem Hintergrund', 'scharfe, schnelle Action ohne Bewegungsunschärfe').

**Ausgabestruktur:**
- **Visuelle Beschreibung:** Kombinieren Sie die visuellen Parameter des Benutzers zu einem einzigen, lebendigen und kohärenten Absatz. Dieser Absatz sollte sich NUR auf die visuellen Aspekte der Szene konzentrieren. Verwenden Sie keine Listen oder Aufzählungszeichen.
- **Dialogblock:** Nach der visuellen Beschreibung MÜSSEN Sie einen Dialogblock einfügen.
    - Wenn ein "Sprechertext" vom Benutzer bereitgestellt wird, verwenden Sie genau diesen Text.
    - Wenn kein Skript bereitgestellt wird, MÜSSEN Sie kreativ eine kurze, wirkungsvolle Dialogzeile oder einen Kommentar (1-2 Sätze) verfassen, die zur Stimmung und zum Kontext der Szene passt.
- **Formatierung:** Der Dialogblock muss genau wie folgt formatiert sein:
---
Dialog: "[Ihr generierter Dialog oder das Skript des Benutzers]"
---

Kernidee des Benutzers: "{idea}"
Wichtige zu berücksichtigende Parameter:
{parameterList}
`,
};

export const soraPromptTemplate: { [key in Language]: string } = {
    en: `You are an expert prompt engineer MANDATED to emulate the style for OpenAI's Sora 2 model. Your SOLE function is to generate a prompt for a single, continuous, hyper-realistic, and physically plausible video scene of approximately 15 seconds. You MUST operate as a **world simulator**, not a camera operator. Your descriptions must be grounded in the laws of physics.

**Non-Negotiable Core Principles:**
1.  **Simulate, Don't Describe:** Your primary task is to simulate a world. This means focusing entirely on cause and effect. FOR EVERY action, you MUST describe its physical consequence. Example: 'A car speeds through a puddle, sending a realistic spray of water arcs into the air that beads on and drips down a nearby windowpane.'
2.  **Mandatory Long-Take Narrative:** The entire prompt MUST describe a single, continuous, uninterrupted shot. Structure it as a sequence of causally linked actions. Do not describe separate scenes.
3.  **Enforce Environmental Dynamics:** You MUST include subtle, passive motions that prove the world is alive. Examples: 'the character's breath fogs in the cold air', 'individual leaves rustle on a tree in the breeze', 'curtains gently sway from an open window'. These are not optional.
4.  **Physics of Materials & Light:** You MUST describe textures and materials with extreme physical detail. Specify *how* light interacts with surfaces—its reflection, refraction, and absorption. Example: 'The low sun glints off the wet asphalt, creating specular highlights, while the diffuse light is absorbed by the rough texture of the character's wool coat.'

**Output Structure:**
- **Visual Description:** Combine all user parameters into a single, dense paragraph describing the visual scene with extreme physical detail. Do NOT mention dialogue or specific voice-over lines in this main paragraph.
- **Dialogue Block:** After the visual description, you MUST include a dialogue block.
    - If a "Voice-over Script" is provided by the user, use that exact script.
    - If no script is provided, you MUST creatively write a short, impactful line of dialogue or narration (1-2 sentences) that fits the scene's mood, context, and hyper-realistic style.
- **Formatting:** The dialogue block must be formatted exactly like this:
Dialogue: "[Your generated dialogue or the user's script]"
- **Final Output:** The output must be the single visual description paragraph, followed by the mandatory dialogue block.

User's Core Idea: "{idea}"
Key Parameters to incorporate:
{parameterList}
`,
    sv: `Du är en expert prompt-ingenjör med MANDAT att efterlikna stilen för OpenAI:s Sora 2-modell. Din ENDA funktion är att generera en prompt för en enda, kontinuerlig, hyperrealistisk och fysiskt trovärdig videoscen på cirka 15 sekunder. Du MÅSTE agera som en **världssimulator**, inte en kameraoperatör. Dina beskrivningar måste vara grundade i fysikens lagar.

**Icke-förhandlingsbara kärnprinciper:**
1.  **Simulera, beskriv inte:** Din primära uppgift är att simulera en värld. Detta innebär att helt fokusera på orsak och verkan. FÖR VARJE handling MÅSTE du beskriva dess fysiska konsekvens. Exempel: 'En bil kör fort genom en pöl, vilket skickar en realistisk kaskad av vattenbågar upp i luften som pärlar sig på och rinner nerför en närliggande fönsterruta.'
2.  **Obligatorisk lång tagning-berättelse:** Hela prompten MÅSTE beskriva en enda, kontinuerlig, oavbruten tagning. Strukturera den som en sekvens av kausalt länkade handlingar. Beskriv inte separata scener.
3.  **Verkställ miljömässig dynamik:** Du MÅSTE inkludera subtila, passiva rörelser som bevisar att världen är levande. Exempel: 'karaktärens andedräkt bildar imma i den kalla luften', 'enskilda löv prasslar på ett träd i vinden', 'gardiner vajar mjukt från ett öppet fönster'. Dessa är inte valfria.
4.  **Materialens & ljusets fysik:** Du MÅSTE beskriva texturer och material med extrem fysisk detaljrikedom. Specificera *hur* ljus interagerar med ytor – dess reflektion, refraktion och absorption. Exempel: 'Den låga solen glänser på den våta asfalten och skapar speglande högdagrar, medan det diffusa ljuset absorberas av den grova texturen på karaktärens yllerock.'

**Utdatastruktur:**
- **Visuell beskrivning:** Kombinera alla användarparametrar till ett enda, tätt stycke som beskriver den visuella scenen med extrem fysisk detaljrikedom. Nämn inte dialog eller specifika repliker i detta huvudstycke.
- **Dialogblock:** Efter den visuella beskrivningen MÅSTE du inkludera ett dialogblock.
    - Om ett "Manus för berättarröst" tillhandahålls av användaren, använd det exakta manuset.
    - Om inget manus tillhandahålls, MÅSTE du kreativt skriva en kort, slagkraftig dialograd eller berättarröst (1-2 meningar) som passar scenens stämning, sammanhang och hyperrealistiska stil.
- **Formatering:** Dialogblocket måste formateras exakt så här:
Dialog: "[Din genererade dialog eller användarens manus]"
- **Slutligt resultat:** Resultatet måste vara det enda visuella beskrivningsstycket, följt av det obligatoriska dialogblocket.

Användarens grundidé: "{idea}"
Nyckelparametrar att införliva`,
    es: `Eres un ingeniero de prompts experto con el MANDATO de emular el estilo del modelo Sora 2 de OpenAI. Tu ÚNICA función es generar un prompt para una única escena de video continua, hiperrealista y físicamente plausible de aproximadamente 15 segundos. DEBES operar como un **simulador de mundos**, no como un operador de cámara. Tus descripciones deben estar basadas en las leyes de la física.

**Principios Fundamentales Innegociables:**
1.  **Simula, no Describas:** Tu tarea principal es simular un mundo. Esto significa centrarse por completo en la causa y el efecto. PARA CADA acción, DEBES describir su consecuencia física. Ejemplo: 'Un coche pasa a toda velocidad por un charco, lanzando un arco realista de agua pulverizada al aire que forma gotas y se desliza por el cristal de una ventana cercana.'
2.  **Narrativa de Toma Larga Obligatoria:** Todo el prompt DEBE describir una única toma continua e ininterrumpida. Estructúralo como una secuencia de acciones causalmente vinculadas. No describas escenas separadas.
3.  **Impón Dinámicas Ambientales:** DEBES incluir movimientos sutiles y pasivos que demuestren que el mundo está vivo. Ejemplos: 'el aliento del personaje se empaña en el aire frío', 'las hojas individuales de un árbol susurran con la brisa', 'las cortinas se mecen suavemente desde una ventana abierta'. No son opcionales.
4.  **Física de Materiales y Luz:** DEBES describir texturas y materiales con un detalle físico extremo. Especifica *cómo* interactúa la luz con las superficies: su reflexión, refracción y absorción. Ejemplo: 'El sol bajo destella en el asfalto mojado, creando reflejos especulares, mientras que la luz difusa es absorbida por la textura rugosa del abrigo de lana del personaje.'

**Estructura de Salida:**
- **Descripción Visual:** Combina todos los parámetros del usuario en un único y denso párrafo que describa la escena visual con un detalle físico extremo. NO menciones diálogos ni líneas de voz en off específicas en este párrafo principal.
- **Bloque de Diálogo:** Después de la descripción visual, DEBES incluir un bloque de diálogo.
    - Si el usuario proporciona un "Guion de Voz en Off", utiliza ese guion exacto.
    - Si no se proporciona ningún guion, DEBES escribir creativamente una línea de diálogo o narración corta e impactante (1-2 frases) que se ajuste al ambiente, contexto y estilo hiperrealista de la escena.
- **Formato:** El bloque de diálogo debe formatearse exactamente así:
Diálogo: "[Tu diálogo generado o el guion del usuario]"
- **Salida Final:** La salida debe ser el único párrafo de descripción visual, seguido del bloque de diálogo obligatorio.

Idea central del usuario: "{idea}"
Parámetros clave a incorporar:
{parameterList}
`,
    fr: `Vous êtes un ingénieur de prompt expert MANDATÉ pour émuler le style du modèle Sora 2 d'OpenAI. Votre UNIQUE fonction est de générer un prompt pour une seule scène vidéo continue, hyperréaliste et physiquement plausible d'environ 15 secondes. Vous DEVEZ opérer en tant que **simulateur de monde**, et non en tant qu'opérateur de caméra. Vos descriptions doivent être ancrées dans les lois de la physique.

**Principes Fondamentaux Non Négociables :**
1.  **Simulez, ne Décrivez Pas :** Votre tâche principale est de simuler un monde. Cela signifie se concentrer entièrement sur la cause et l'effet. POUR CHAQUE action, vous DEVEZ décrire sa conséquence physique. Exemple : 'Une voiture traverse une flaque d'eau à toute vitesse, projetant des arcs d'eau réalistes dans l'air qui perlent et s'écoulent sur une vitre voisine.'
2.  **Narration en Plan Séquence Obligatoire :** L'intégralité du prompt DOIT décrire un seul plan continu et ininterrompu. Structurez-le comme une séquence d'actions liées par une relation de cause à effet. Ne décrivez pas de scènes séparées.
3.  **Imposez une Dynamique Environnementale :** Vous DEVEZ inclure des mouvements subtils et passifs qui prouvent que le monde est vivant. Exemples : 'le souffle du personnage forme de la buée dans l'air froid', 'les feuilles d'un arbre bruissent individuellement dans la brise', 'des rideaux se balancent doucement à une fenêtre ouverte'. Ce n'est pas optionnel.
4.  **Physique des Matériaux et de la Lumière :** Vous DEVEZ décrire les textures et les matériaux avec un détail physique extrême. Spécifiez *comment* la lumière interagit avec les surfaces – sa réflexion, sa réfraction et son absorption. Exemple : 'Le soleil bas scintille sur l'asphalte mouillé, créant des reflets spéculaires, tandis que la lumière diffuse est absorbée par la texture rugueuse du manteau en laine du personnage.'

**Structure de la Sortie :**
- **Description Visuelle :** Combinez tous les paramètres de l'utilisateur en un seul paragraphe dense décrivant la scène visuelle avec un détail physique extrême. Ne mentionnez PAS de dialogue ou de lignes de voix off spécifiques dans ce paragraphe principal.
- **Bloc de Dialogue :** Après la description visuelle, vous DEVEZ inclure un bloc de dialogue.
    - Si un "Script de voix off" est fourni par l'utilisateur, utilisez ce script exact.
    - Si aucun script n'est fourni, vous DEVEZ écrire de manière créative une courte ligne de dialogue ou de narration percutante (1-2 phrases) qui correspond à l'ambiance, au contexte et au style hyperréaliste de la scène.
- **Formatage :** Le bloc de dialogue doit être formaté exactement comme ceci :
Dialogue : "[Votre dialogue généré ou le script de l'utilisateur]"
- **Sortie Finale :** La sortie doit être le seul paragraphe de description visuelle, suivi du bloc de dialogue obligatoire.

Idée de base de l'utilisateur : "{idea}"
Paramètres clés à intégrer :
{parameterList}
`,
    de: `Sie sind ein Experte für Prompt-Engineering mit dem AUFTRAG, den Stil von OpenAIs Sora 2-Modell zu emulieren. Ihre EINZIGE Funktion ist es, einen Prompt für eine einzelne, kontinuierliche, hyperrealistische und physikalisch plausible Videoszene von ungefähr 15 Sekunden zu generieren. Sie MÜSSEN als **Weltsimulator** agieren, nicht als Kameramann. Ihre Beschreibungen müssen auf den Gesetzen der Physik beruhen.

**Nicht verhandelbare Grundprinzipien:**
1.  **Simulieren, nicht beschreiben:** Ihre Hauptaufgabe ist es, eine Welt zu simulieren. Das bedeutet, sich vollständig auf Ursache und Wirkung zu konzentrieren. FÜR JEDE Aktion MÜSSEN Sie deren physikalische Konsequenz beschreiben. Beispiel: 'Ein Auto rast durch eine Pfütze und schleudert einen realistischen Sprühnebel aus Wasserbögen in die Luft, der an einer nahegelegenen Fensterscheibe perlt und herunterläuft.'
2.  **Obligatorische Long-Take-Erzählung:** Der gesamte Prompt MUSS eine einzige, kontinuierliche, ununterbrochene Aufnahme beschreiben. Strukturieren Sie ihn als eine Sequenz von kausal verknüpften Aktionen. Beschreiben Sie keine separaten Szenen.
3.  **Umweltdynamik erzwingen:** Sie MÜSSEN subtile, passive Bewegungen einbeziehen, die beweisen, dass die Welt lebendig ist. Beispiele: 'der Atem der Figur beschlägt in der kalten Luft', 'einzelne Blätter rascheln an einem Baum im Wind', 'Vorhänge wiegen sich sanft an einem offenen Fenster'. Diese sind nicht optional.
4.  **Physik von Materialien & Licht:** Sie MÜSSEN Texturen und Materialien mit extremer physikalischer Detailgenauigkeit beschreiben. Geben Sie an, *wie* Licht mit Oberflächen interagiert – seine Reflexion, Brechung und Absorption. Beispiel: 'Die tief stehende Sonne glitzert auf dem nassen Asphalt und erzeugt spiegelnde Glanzlichter, während das diffuse Licht von der rauen Textur des Wollmantels der Figur absorbiert wird.'

**Ausgabestruktur:**
- **Visuelle Beschreibung:** Kombinieren Sie alle Benutzerparameter zu einem einzigen, dichten Absatz, der die visuelle Szene mit extremer physikalischer Detailgenauigkeit beschreibt. Erwähnen Sie KEINE Dialoge oder spezifische Sprechertexte in diesem Hauptabsatz.
- **Dialogblock:** Nach der visuellen Beschreibung MÜSSEN Sie einen Dialogblock einfügen.
    - Wenn ein "Sprechertext" vom Benutzer bereitgestellt wird, verwenden Sie genau diesen Text.
    - Wenn kein Skript bereitgestellt wird, MÜSSEN Sie kreativ eine kurze, wirkungsvolle Dialogzeile oder einen Kommentar (1-2 Sätze) verfassen, die zur Stimmung, zum Kontext und zum hyperrealistischen Stil der Szene passt.
- **Formatierung:** Der Dialogblock muss genau wie folgt formatiert sein:
Dialog: "[Ihr generierter Dialog oder das Skript des Benutzers]"
- **Endgültige Ausgabe:** Die Ausgabe muss der einzige visuelle Beschreibungsabsatz sein, gefolgt von dem obligatorischen Dialogblock.

Kernidee des Benutzers: "{idea}"
Wichtige zu berücksichtigende Parameter:
{parameterList}
`,
};

// FIX: Added missing exports `seriesInstructions` and `parameterValues` to be used in the prompt builder.
export const seriesInstructions: { [lang in Language]: string } = {
    en: 'SERIES MODE: The prompt MUST be structured as a 3-part narrative series. Each part must be a distinct "episode" with a clear title (formatted as ### Title) and a description. The series should have a clear beginning, middle, and end, telling a cohesive story that evolves across the three parts.',
    sv: 'SERIELÄGE: Prompten MÅSTE struktureras som en narrativ serie i 3 delar. Varje del måste vara ett distinkt "avsnitt" med en tydlig titel (formaterad som ### Titel) och en beskrivning. Serien ska ha en tydlig början, mitt och slut, och berätta en sammanhängande historia som utvecklas över de tre delarna.',
    es: 'MODO SERIE: El prompt DEBE estructurarse como una serie narrativa de 3 partes. Cada parte debe ser un "episodio" distinto con un título claro (formateado como ### Título) y una descripción. La serie debe tener un principio, un desarrollo y un final claros, contando una historia coherente que evoluciona a lo largo de las tres partes.',
    fr: 'MODE SÉRIE : Le prompt DOIT être structuré comme une série narrative en 3 parties. Chaque partie doit être un "épisode" distinct avec un titre clair (formaté comme ### Titre) et une description. La série doit avoir un début, un milieu et une fin clairs, racontant une histoire cohérente qui évolue à travers les trois parties.',
    de: 'SERIENMODUS: Der Prompt MUSS als 3-teilige narrative Serie strukturiert sein. Jeder Teil muss eine eigenständige "Episode" mit einem klaren Titel (formatiert als ### Titel) und einer Beschreibung sein. Die Serie sollte einen klaren Anfang, eine klare Mitte und ein klares Ende haben und eine zusammenhängende Geschichte erzählen, die sich über die drei Teile entwickelt.',
};

export const parameterValues: { [lang in Language]: { optimization: string; overlay: string; } } = {
    en: {
        optimization: 'Yes, create a short, impactful clip with a clear hook, suitable for platforms like TikTok or Shorts.',
        overlay: 'Yes, include relevant text or graphic overlays to enhance the message.',
    },
    sv: {
        optimization: 'Ja, skapa ett kort, slagkraftigt klipp med en tydlig krok, lämpligt för plattformar som TikTok eller Shorts.',
        overlay: 'Ja, inkludera relevanta text- eller grafiköverlägg för att förstärka budskapet.',
    },
    es: {
        optimization: 'Sí, crear un clip corto e impactante con un gancho claro, adecuado para plataformas como TikTok o Shorts.',
        overlay: 'Sí, incluir superposiciones de texto o gráficos relevantes para realzar el mensaje.',
    },
    fr: {
        optimization: 'Oui, créer un clip court et percutant avec une accroche claire, adapté aux plateformes comme TikTok ou Shorts.',
        overlay: 'Oui, inclure des superpositions de texte ou de graphiques pertinentes pour renforcer le message.',
    },
    de: {
        optimization: 'Ja, erstelle einen kurzen, wirkungsvollen Clip mit einem klaren Haken, der für Plattformen wie TikTok oder Shorts geeignet ist.',
        overlay: 'Ja, relevante Text- oder Grafiküberlagerungen einfügen, um die Botschaft zu verstärken.',
    },
};

import { PronunciationGuideData } from './types';
// This file contains all the UI strings and prompt templates for different languages.
type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';


// --- UI STRINGS ---
export const appUIStrings: any = {
    en: {
        headerTitle: "AI Video Prompt Studio",
        headerSubtitle: "Craft the perfect prompt for Google's next-gen video model.",
        language: "Language",
        sectionCoreConcept: "1. Core Concept",
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
        sectionSceneAndCharacter: "2. Scene & Character",
        sectionEnvironment: "Environment & Atmosphere",
        labelEnvironment: "Describe the setting or environment",
        placeholderEnvironment: "e.g., A futuristic cyberpunk city at night, rainy, with neon signs reflecting on wet streets.",
        labelSensoryDetails: "Sensory Details",
        placeholderSensoryDetails: "e.g., the smell of rain on asphalt, the distant sound of a siren, the feel of cool mist on skin.",
        suggestSensoryDetailsButton: "Suggest sensory details with AI",
        labelEnvironmentDynamicEvents: "Dynamic Environmental Events",
        placeholderEnvironmentDynamicEvents: "e.g., leaves rustling and blowing, a neon sign flickers intermittently, steam rises from a manhole cover.",
        labelArchitecturalStyle: "Architectural Style",
        labelTimeOfDay: "Time of Day",
        labelWeather: "Weather",
        sectionCharacter: "Character Details",
        labelCharacterActions: "Character Actions",
        placeholderCharacterActions: "e.g., A knight takes two steps back, draws their sword, and holds a defensive stance. For precise timing, describe actions in sequence: 'The character walks to the window (3 seconds), pauses (1 second), then looks out'.",
        labelCharacterObjectInteraction: "Object Interaction",
        placeholderCharacterObjectInteraction: "e.g., nervously fidgeting with a small, worn coin; tracing a frost pattern on a cold windowpane.",
        labelCharacterNuances: "Subtle Emotional Cues & Physical Nuances",
        placeholderCharacterNuances: "e.g., their breath catches for a moment, a subtle tremor in their hand, they avoid eye contact.",
        suggestCharacterNuancesButton: "Suggest character nuances with AI",
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
        labelLightingStyle: "Lighting Style",
        labelVisualEffect: "Visual Effect",
        labelColorPalette: "Color Palette",
        sectionCamera: "Cinematography",
        labelCameraMovement: "Camera Movement",
        labelCameraDistance: "Camera Distance",
        labelLensType: "Lens Type",
        labelCompositionalGuide: "Compositional Guide",
        labelAspectRatio: "Aspect Ratio",
        labelResolution: "Resolution",
        labelAnimationPreset: "Animation Preset",
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
        sectionCreativeDirection: "3. Style, Camera, & Audio",
        sectionAdvancedAndModel: "4. Advanced Settings",
        subheadingVisualStyle: "Visual Style",
        subheadingCinematography: "Cinematography",
        subheadingAudioDesign: "Audio Design",
        subheadingAdvancedControls: "Advanced Controls",
        subheadingModelConfig: "Model Configuration",
        generateButton: "Architect Prompt",
        updateButton: "Update",
        newButton: "New Prompt",
        loadingUpdateButton: "Updating...",
        copied: "Copied!",
        editButton: "Edit",
        saveButton: "Save",
        cancelButton: "Cancel",
        undoButton: "Undo",
        redoButton: "Redo",
        saveToHistoryButton: "Save to History",
        saveAsPresetButton: "Save as Preset",
        generateArtButton: "Concept Art",
        loadingArtButton: "Generating...",
        generateVideoButton: "Generate Video",
        loadingVideoButton: "Generating...",
        generateStoryboardButton: "Storyboard",
        loadingStoryboardButton: "Generating...",
        generateVariationsButton: "Variations",
        loadingVariationsButton: "Generating...",
        refineButton: "Refine",
        loadingRefineButton: "Refining...",
        shareButton: "Share",
        templatesButton: "Use a Template",
        historyButton: "History",
        imageStudioButton: "Image Studio",
        sunoStudioButton: "Suno Song Studio",
        videoAnalysisButton: "Video Analysis",
        pronunciationGuideButton: "Pronunciation Guide",
        resetAllButton: "Reset All Fields",
        toastPromptGenerated: "Prompt successfully generated!",
        toastPromptSaved: "Prompt updated successfully.",
        toastPromptRefined: "Prompt successfully refined by AI!",
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
        toastAudioSuggested: "AI suggested a full audio design!",
        toastAudioDetailsSuggested: "AI suggested audio details!",
        toastEnvironmentSuggested: "AI enhanced the environment details!",
        toastSensoryDetailsSuggested: "AI suggested sensory details!",
        toastCharacterNuancesSuggested: "AI suggested character nuances!",
        toastEffectSuggested: "AI suggested a visual effect!",
        toastSoraStyleSet: "Art style set to 'Photorealistic' for optimal Sora 2 emulation.",
        toastPresetSaved: "Preset saved successfully!",
        toastPresetDeleted: "Preset deleted.",
        toastSongSaved: "Song saved to history!",
        toastSongLoaded: "Loaded song from history.",
        toastSongDeleted: "Song deleted from history.",
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
        errorPresetNameRequired: "Please enter a name for your preset.",
        resetAllConfirm: "Are you sure you want to reset all fields to their default values? This action cannot be undone.",
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
            builtInTitle: "Built-in Templates",
            yourPresetsTitle: "Your Presets",
            use: "Use Template",
            searchPlaceholder: "Search templates...",
            noResults: "No templates found matching your search.",
            deletePreset: "Delete Preset",
            deletePresetConfirm: "Are you sure you want to delete this preset?",
        },
        savePresetModal: {
            title: "Save Custom Preset",
            label: "Preset Name",
            placeholder: "e.g., My Cinematic Style",
            save: "Save",
            cancel: "Cancel"
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
            promptPlaceholderEdit: "e.g., Change the background to a beach",
            uploadLabel: "Base Image for Editing (Optional)",
            canvasPlaceholder: "Your generated image will appear here",
            editButton: "Edit Image",
            editingButton: "Editing...",
            generatingButton: "Generating...",
            downloadButton: "Download",
            clearButton: "Clear Image",
        },
        sunoStudio: {
            title: "Suno Song Studio",
            ideaLabel: "Song Idea",
            ideaPlaceholder: "e.g., A ballad about a lonely robot searching for a friend in a post-apocalyptic city.",
            autoWriteButton: "Auto-write Song",
            autoWritingButton: "Writing...",
            outputTitle: "Title",
            outputStyle: "Style of Music",
            outputLyrics: "Lyrics",
            suggestTitlesButton: "Suggest titles with AI",
            suggestStylesButton: "Suggest styles with AI",
            historyTitle: "Saved Songs",
            historyEmpty: "Your saved songs will appear here.",
            saveSongButton: "Save Song",
            useButton: "Use",
            deleteButton: "Delete",
            deleteConfirm: "Are you sure you want to delete this song?",
            clearHistoryButton: "Clear History",
            clearConfirm: "Are you sure you want to clear all song history?",
        },
        videoAnalysisStudio: {
            title: "Video Analysis Studio",
            uploadLabel: "Video to Analyze",
            uploadButton: "Upload a video",
            uploadHint: "MP4, MOV, WEBM, etc. Max 20MB.",
            promptLabel: "What do you want to know about this video?",
            promptPlaceholder: "e.g., 'Summarize this video in detail.' or 'Generate a Veo prompt based on this video.'",
            analyzeButton: "Analyze Video",
            analyzingButton: "Analyzing...",
            resultsTitle: "Analysis Results",
            resultsPlaceholder: "Analysis results will appear here.",
            useResultButton: "Use as Core Idea",
        },
        pronunciationGuide: {
            title: "Pronunciation Guide",
        },
        tooltips: {
            idea: "The core concept of your video. Be descriptive! The more detail you provide, the better the AI can understand your vision.",
            environment: "Describe the world or setting. Is it a futuristic city, a fantasy forest, a minimalist room? This sets the stage.",
            sensoryDetails: "What does it feel like to be there? Mention sights, sounds, smells, and textures to make the environment more immersive.",
            environmentDynamicEvents: "What is happening in the background? Subtle movements and events make the scene feel alive.",

            characterActions: "What is the character doing? Be specific about their movements and actions. You can even suggest timings in seconds, e.g., 'walks to the door (2s), pauses (1s)'",
            characterObjectInteraction: "How does the character interact with small objects? This can reveal their personality or mood, e.g., 'taps fingers impatiently on a desk'.",
            characterNuances: "Focus on micro-expressions and subtle body language. A slight smile, a trembling hand, or avoiding eye contact can add deep emotional layers.",
            
            artStyle: "The overall visual aesthetic. Choose a preset or select 'Custom' to describe your own unique style.",
            customArtStyle: "Describe your custom style here. You can reference artists, art movements, or use descriptive adjectives (e.g., 'a gritty, hand-drawn sketch style with heavy ink lines').",
            lightingStyle: "How is the scene lit? This has a huge impact on the mood. 'High-key' is bright and optimistic, while 'Low-key' is dark and dramatic.",
            colorPalette: "The dominant colors of the scene. A 'vibrant' palette is energetic, while a 'muted' palette can feel more serious or somber.",
            visualEffect: "Special effects to add flair. 'Lens flare' can make a scene feel epic, while 'film grain' can add a vintage look.",

            cameraMovement: "How the camera moves through the scene. A 'static shot' is stable, while a 'drone shot' can provide a sweeping, aerial view.",
            cameraDistance: "How close the camera is to the subject. An 'extreme close-up' is intimate, while a 'wide shot' shows the full environment.",
            lensType: "The type of camera lens used, which affects the field of view and perspective. A 'wide-angle' lens captures more of the scene, while a 'telephoto' lens focuses on distant subjects.",
            compositionalGuide: "Classic rules of visual composition. 'Rule of Thirds' is a balanced and natural look, while 'Centered Subject' is more direct and formal.",

            aspectRatio: "The shape of the video frame. 16:9 is standard for widescreen (like YouTube), while 9:16 is for vertical videos (like TikTok or Instagram Reels).",
            resolution: "The quality and detail of the video. 1080p is high quality, while 720p may generate faster.",
            animationPreset: "Pre-defined animation effects for transitions or movements within the scene.",

            voiceStyle: "The style of the voice-over, if any. 'Documentary Narrator' is serious and informative, while 'High-Energy Announcer' is exciting.",
            voiceOver: "The script for the voice-over. This will be spoken by the selected voice style.",
            ambientSound: "The background noise of the environment. This adds a lot of realism to the scene.",
            soundEffectsIntensity: "How loud and noticeable the sound effects are. 'Subtle' is more realistic, while 'Prominent' is more dramatic.",

            negativePrompt: "Tell the AI what you DON'T want to see. This helps avoid common issues like 'blurry' or 'deformed' results.",
            optimizeFor8Seconds: "Tells the AI to create a concise, impactful scene that works well as a short, 8-second clip.",
            includeOverlayText: "Indicates that the final video should be designed to accommodate text or graphics overlays, often by leaving some empty space.",
            useGoogleSearch: "Allows the AI to use Google Search to find up-to-date information or specific details related to your prompt, improving accuracy for real-world topics.",
            generateAsSeries: "Instructs the AI to generate a 3-part narrative, with each part being a separate but connected scene. Great for storytelling.",
            thinkingMode: "Allows the model to use more processing power to 'think' before generating the prompt, which can lead to more creative and complex results. Only available on Pro models.",
            model: "Choose the underlying Gemini model for prompt generation. 'Pro' is better for complex reasoning, while 'Flash' is faster.",
            veoModel: "Choose the Veo model for video generation. 'Fast' is quicker, while 'Quality' may produce more detailed results but takes longer.",
            targetModel: "Emulate the prompting style of different video generation models to get a result tailored to their strengths.",
            imageUpload: "Upload a starting image. The AI will use this as a reference. This is optional.",

            generateButton: "Generate the final video prompt based on your settings.",
            updateButtonTooltip: "Re-generate the prompt with your current settings.",
            newButtonTooltip: "Start over with a fresh, empty prompt.",
            copyButton: "Copy the generated prompt to your clipboard.",
            editButton: "Manually edit the generated prompt.",
            saveButton: "Save your manual edits to the prompt.",
            cancelButton: "Discard your manual edits.",
            undoButton: "Undo the last edit.",
            redoButton: "Redo the last undone edit.",

            conceptArtButton: "Generate a still image based on the prompt to visualize the concept.",
            storyboardButton: "Generate a 4-panel storyboard to visualize the scene's progression.",
            variationsButton: "Generate several creative variations of the current prompt.",
            refineButton: "Use AI to refine and improve the current prompt.",
            
            saveToHistoryButton: "Save the current prompt and its settings to your history for later use.",
            shareButton: "Copy a shareable link with the current prompt and settings.",
            downloadButton: "Download the prompt as a text file.",
            saveAsPresetButton: "Save the current settings as a reusable template.",
            templatesButton: "Load a pre-made template or one of your saved presets.",
            historyButton: "View your saved prompt history.",
            imageStudioButton: "Open the Image Studio to generate or edit images.",
            sunoStudioButton: "Open the Suno Song Studio to generate music and lyrics.",
            videoAnalysisButton: "Open the Video Analysis Studio to get inspiration from existing videos.",
            resetAllButton: "Clear all fields and reset the form to its default state.",
            themeToggle: "Toggle between light and dark themes.",
            suggestAudio: "Use AI to suggest a complete audio design (voice style, script, ambient sound, and SFX intensity) based on your scene and mood.",
            suggestAudioDetailsButton: "Use AI to suggest ambient sound and SFX intensity based on your environment and mood.",
            suggestEnvironmentButton: "Use AI to add sensory details and dynamic events to your environment description.",
            suggestEffectButton: "Use AI to suggest a visual effect based on your art style and mood.",
            tutorialButton: "Start the introductory tutorial.",
        },
        tutorial: {
            startButton: "Start Tutorial",
            nextButton: "Next",
            prevButton: "Previous",
            finishButton: "Finish",
            steps: [
                {
                    targetId: "app-title",
                    position: "bottom",
                    title: "Welcome to the AI Video Prompt Studio!",
                    text: "This quick tour will guide you through the main features. Let's get started!"
                },
                {
                    targetId: "core-concept",
                    position: "bottom",
                    title: "1. Start with Your Core Idea",
                    text: "Everything begins here. Write down the main concept for your video. The more descriptive you are, the better the AI can understand your vision."
                },
                {
                    targetId: "autofill-button",
                    position: "right",
                    title: "Get AI Assistance",
                    text: "Feeling stuck? Click the magic wand icon! The AI will analyze your Core Idea and suggest settings for style, camera, and more to get you started."
                },
                {
                    targetId: "environment-ai-button",
                    position: "right",
                    title: "Refine with AI Helpers",
                    text: "Look for the magic wand icon throughout the form. These are contextual AI assistants that can help you flesh out specific details like environmental descriptions."
                },
                {
                    targetId: "details-tabs",
                    position: "bottom",
                    title: "2. Add a Layer of Detail",
                    text: "Use these tabs to fine-tune every aspect of your scene, from the character's mood and clothing to the specific camera lens and lighting."
                },
                {
                    targetId: "generate-prompt-button",
                    position: "top",
                    title: "3. Architect Your Prompt",
                    text: "When you're ready, click '{GENERATE_BUTTON}'. The AI will synthesize all your settings into a single, masterfully crafted prompt."
                },
                {
                    targetId: "output-section",
                    position: "top",
                    title: "Your Generated Prompt",
                    text: "Your final prompt appears here. It's a detailed, cinematic paragraph ready for a video generation model."
                },
                {
                    targetId: "creative-tools",
                    position: "top",
                    title: "Creative Tools",
                    text: "Use these tools to iterate. Generate 'Concept Art' to visualize your scene, create a 'Storyboard', or explore different 'Variations' of your prompt."
                }
            ]
        },
        fieldLabels: {
            idea: "Core Idea",
            environment: "Environment",
            environmentSensoryDetails: "Sensory Details",
            environmentDynamicEvents: "Dynamic Events",
            architecturalStyle: "Architectural Style",
            characterActions: "Character Actions",
            characterNuances: "Character Nuances",
            characterObjectInteraction: "Object Interaction",
            characterGender: "Character Gender",
            characterEthnicity: "Character Ethnicity",
            characterClothing: "Character Clothing",
            characterArchetype: "Character Archetype",
            characterAge: "Character Age",
            characterMood: "Character Mood",
            characterPose: "Character Pose",
            characterSkinTone: "Character Skin Tone",
            characterSpecificClothing: "Specific Clothing",

            timeOfDay: "Time of Day",
            weather: "Weather",
            voiceOver: "Voice-over Script",
            voiceStyle: "Voice Style",
            ambientSound: "Ambient Sound",
            soundEffectsIntensity: "Sound Effects",
            negativePrompt: "Negative Prompt",
            artStyle: "Art Style",
            customArtStyle: "Custom Art Style",
            lightingStyle: "Lighting Style",
            cameraMovement: "Camera Movement",
            cameraDistance: "Camera Distance",
            lensType: "Lens Type",
            compositionalGuide: "Composition",
            visualEffect: "Visual Effect",
            colorPalette: "Color Palette",
            aspectRatio: "Aspect Ratio",
            resolution: "Resolution",
            animationPreset: "Animation",
            motionIntensity: "Motion Intensity",
            creativityLevel: "Creativity",
        },
        // System prompts...
        autoFillSystemPrompt: {
            base: `You are an expert creative director for a video production studio. Your task is to analyze the user's core idea and suggest a complete set of creative and technical modifiers to bring it to life as a short video.
Your suggestions should be coherent and work together to create a compelling and unified vision. Be opinionated and creative in your choices.
For every field, you must select one of the provided enum options or generate a short, descriptive string. Do not invent new enum options.

**Key Principles:**
- **Mood Cohesion:** Ensure the art style, color palette, lighting, weather, and audio all contribute to the same emotional tone.
- **Cinematic Vision:** Choose camera movements, distances, and compositions that would be used by a professional filmmaker to tell a story.
- **Character Depth:** If a character is implied, suggest details (mood, pose, clothing) that reveal their personality and fit the scene.
- **Environmental Storytelling:** The environment, time of day, and weather should not just be a backdrop, but an active part of the story.
- **Be Decisive:** Avoid neutral options like 'Any' or 'Medium' unless the user's idea is extremely vague. Make strong, creative choices.
- **JSON Only:** Your entire response must be a single, valid JSON object that adheres to the provided schema. Do not include any text before or after the JSON object.`,
            sora: `**Sora Emulation Mode:** The user is targeting a Sora-like model. Prioritize hyper-realism and complex world simulation. Your suggestions should lean towards photorealistic styles, dynamic camera work that simulates real physics, and detailed descriptions of material properties and environmental interactions. Suggest longer, more descriptive text for fields like 'environment' and 'characterActions' to give the model more to work with.`,
            veo: `**Veo Mode:** The user is targeting Google's Veo model. Prioritize cinematic quality, artistic expression, and versatility. Your suggestions can be more stylized. Focus on strong art direction (e.g., 'Cinematic', 'Anime', 'Noir'), creative color palettes, and dramatic lighting. Camera work should be intentional and serve the artistic vision.`
        },
        suggestFullAudioSystemPrompt: `You are a sound designer and audio director for film. Based on the provided scene context, your task is to design the entire soundscape. You must suggest a voice-over style, write a short script, choose an ambient sound, and set the sound effect intensity.
**Rules:**
1.  Choose the most fitting options from the enums provided for each respective field.
2.  If the scene feels more powerful without a voice-over (e.g., it's a quiet, atmospheric moment or a fast-paced action sequence), you MUST choose 'None' for 'suggestedVoiceStyle' and the 'suggestedVoiceOverScript' MUST be an empty string.
3.  The script should be concise and enhance the mood and narrative, rather than just describing the visuals.
4.  Your entire response must be a single, valid JSON object.`,
        suggestSensoryDetailsSystemPrompt: `You are a descriptive writer. Based on the user's environment description, generate a comma-separated list of 3-4 rich sensory details (sights, sounds, smells, textures) that would make the scene more immersive. Focus on evocative and specific details. Respond ONLY with a valid JSON object.`,
        suggestCharacterNuancesSystemPrompt: `You are a character actor and director. Based on the character's actions and mood, describe the subtle physical nuances and micro-expressions that would convey their internal state. What is their breathing like? What are their hands doing? What is their posture? Keep it brief and evocative. Respond ONLY with a valid JSON object.`,
        suggestVisualEffectSystemPrompt: `You are a visual effects supervisor. Based on the art style and mood, suggest the single most appropriate visual effect from the provided list. Consider how the effect will enhance the mood. For example, 'Lens flare' for an epic, sunny scene, or '8mm film grain' for a nostalgic, vintage look. Respond ONLY with a valid JSON object. Do not select 'None' unless no other option is remotely suitable.`,
        suggestSunoTitlesSystemPrompt: `You are a music marketing expert. The user will provide a song idea. Your task is to generate 5 catchy, evocative, and creative song titles that would work well for Suno. Respond ONLY with a valid JSON object.`,
        suggestSunoStylesSystemPrompt: `You are a music producer and historian. The user will provide a song idea. Your task is to generate 5 descriptive 'Style of Music' prompts for Suno AI. These should be creative combinations of genres, moods, instruments, and artist influences. Each prompt must be under 180 characters. You have a vast list of genres to pull from: {MUSIC_GENRES}. Be creative! Combine genres (e.g., 'Dark synth-pop with a trap beat'), mention specific instruments ('heavy 808 bass, ethereal synth pads'), and reference eras or artists ('90s alternative rock in the style of Nirvana'). Respond ONLY with a valid JSON object.`,
        suggestEnvironmentSystemPrompt: `You are a world-building author and concept artist. The user has provided a basic environment description. Your task is to enhance it by adding rich sensory details and dynamic background events.
**Rules:**
- For 'environmentSensoryDetails', provide a comma-separated list of sights, sounds, smells, and textures.
- For 'environmentDynamicEvents', provide a comma-separated list of subtle background actions that make the scene feel alive.
- Your suggestions should be creative and evocative, adding depth to the user's original idea.
- Respond ONLY with a valid JSON object.`,
        suggestCreativeDetailsSystemPrompt: {
            base: `You are an acclaimed film director and cinematographer. The user has provided a core idea. Your task is to expand upon it, transforming it into a detailed, cinematic scene description. You must fill in the 'environment', 'characterActions', 'lightingStyle', and 'compositionalGuide' fields with rich, evocative text and selections.

**Your process:**
1.  **Environment:** Reimagine the user's environment with extreme detail. Incorporate sensory information (the smell of the air, the texture of the ground, the ambient sounds) and dynamic background events (steam rising from a grate, a flag flapping in the wind). This should be a single, detailed paragraph.
2.  **Character Actions:** Describe a continuous, physically grounded sequence of actions for the character. Detail their interaction with objects and the environment. Most importantly, embed their emotional state into their movements—show, don't just tell, their mood through subtle physical nuances. This should be a single, detailed paragraph.
3.  **Lighting & Composition:** Based on the mood and action, select the most powerful lighting style and compositional guide from the provided enums to frame the scene with professional intentionality.

**Rules:**
- Your entire response must be a single, valid JSON object adhering to the schema.
- Do not just echo the user's input; creatively expand upon it.`,
            sora: `**Sora Emulation Focus:** Pay extreme attention to physics and realism. Describe how light interacts with different materials. Detail the cause-and-effect of character actions on their surroundings. Your descriptions should provide enough information for a world-simulation model to generate a believable, cohesive reality.`
        },
        refineSystemPrompt: `You are an expert prompt engineer specializing in text-to-video generation. Your task is to refine the user's current prompt to be more cinematic, detailed, and evocative.
**Rules:**
1.  **Synthesize, Don't Add:** Do not introduce new core concepts. Instead, enhance what is already there.
2.  **Cinematic Language:** Use strong, descriptive verbs and sensory language.
3.  **Combine into One Paragraph:** The final output must be a single, flowing paragraph.
4.  **Incorporate Parameters:** Weave the provided key parameters (Art Style, Camera, Mood, etc.) seamlessly into the narrative of the paragraph. For example, instead of saying "Art Style: Noir," describe "deep shadows and high-contrast lighting."
5.  **Target Model:** The user is targeting the '{targetModel}' model. Tailor your language to its strengths (Veo for cinematic/artistic, Sora for hyper-realism).
6.  **JSON Only:** Respond ONLY with a valid JSON object containing the refined prompt.`,
        variationsSystemPrompt: `You are a creative director brainstorming alternative takes for a scene. Your task is to generate 3 distinct variations of the provided video prompt.
For each variation, change at least one key element, such as:
- The **time of day** or **weather**.
- The **character's mood** or a specific **action**.
- The **art style** or **color palette**.
- The **camera angle** or **movement**.

The variations should offer genuinely different creative directions while staying true to the core idea of the original prompt. Respond ONLY with a valid JSON object containing an array of 3 strings. Respond in language: {language}.`,
        combineSystemPrompt: `You are an expert prompt engineer. Your task is to analyze multiple prompt variations provided by the user and synthesize them into a single, superior prompt. Identify the best elements from each, discard weaker parts, and combine them into a cohesive, cinematic, and highly detailed paragraph. The final prompt should be a clear instruction for a text-to-video AI model. Respond ONLY with a valid JSON object containing a single key "combinedPrompt".`,
    }
};

// --- PRONUNCIATION GUIDES ---
export const pronunciationGuides: { [lang in Language]: PronunciationGuideData } = {
    en: {
        terms: [
            { term: "Veo", pronunciation: "VAY-oh", description: "Google's next-generation video model, focused on high-quality, cinematic output." },
            { term: "Sora", pronunciation: "SOH-rah", description: "OpenAI's video model, known for its world simulation capabilities and photorealism." },
            { term: "Gemini", pronunciation: "JEM-in-eye", description: "Google's family of multimodal AI models that power this application." },
            { term: "Bokeh", pronunciation: "BOH-keh", description: "The aesthetic quality of the blur produced in the out-of-focus parts of an image produced by a lens." },
            { term: "Gaffer", pronunciation: "GAFF-er", description: "The head of the electrical department in film production, responsible for the lighting plan." },
        ]
    },
    sv: {
        terms: [
            { term: "Veo", pronunciation: "VAY-oh", description: "Googles nästa generations videomodell, fokuserad på högkvalitativ, filmisk output." },
            { term: "Sora", pronunciation: "SOH-rah", description: "OpenAI:s videomodell, känd för sina världssimuleringsförmågor och fotorealism." },
            { term: "Gemini", pronunciation: "JEM-in-aj", description: "Googles familj av multimodala AI-modeller som driver denna applikation." },
            { term: "Bokeh", pronunciation: "BOH-keh", description: "Den estetiska kvaliteten på oskärpan som produceras i de oskarpa delarna av en bild." },
            { term: "Gaffer", pronunciation: "GAFF-er", description: "Chefen för elavdelningen inom filmproduktion, ansvarig för ljusplanen." },
        ]
    },
    es: {
        terms: [
            { term: "Veo", pronunciation: "VEO", description: "El modelo de video de próxima generación de Google, enfocado en resultados cinematográficos de alta calidad." },
            { term: "Sora", pronunciation: "SOH-rah", description: "El modelo de video de OpenAI, conocido por sus capacidades de simulación del mundo y fotorrealismo." },
            { term: "Gemini", pronunciation: "YÉ-mi-ni", description: "La familia de modelos de IA multimodales de Google que impulsan esta aplicación." },
            { term: "Bokeh", pronunciation: "BO-qué", description: "La calidad estética del desenfoque en las partes fuera de foco de una imagen producida por una lente." },
            { term: "Gaffer", pronunciation: "GAF-er", description: "El jefe del departamento eléctrico en la producción de cine, responsable del plan de iluminación." },
        ]
    },
    fr: {
        terms: [
            { term: "Veo", pronunciation: "VÉ-o", description: "Le modèle vidéo de nouvelle génération de Google, axé sur une sortie cinématographique de haute qualité." },
            { term: "Sora", pronunciation: "SO-ra", description: "Le modèle vidéo d'OpenAI, connu pour ses capacidades de simulation du monde et son photoréalisme." },
            { term: "Gemini", pronunciation: "JÉ-mi-ni", description: "La famille de modèles d'IA multimodaux de Google qui alimente cette application." },
            { term: "Bokeh", pronunciation: "BO-ké", description: "La qualité esthétique du flou produit dans les parties floues d'une image." },
            { term: "Gaffer", pronunciation: "GAFF-eur", description: "Le chef du département électrique en production cinématographique, responsable du plan d'éclairage." },
        ]
    },
    de: {
        terms: [
            { term: "Veo", pronunciation: "WEE-o", description: "Googles Videomodell der nächsten Generation, ausgerichtet auf hochwertige, filmische Ergebnisse." },
            { term: "Sora", pronunciation: "SO-rah", description: "Das Videomodell von OpenAI, bekannt für seine Weltsimulationsfähigkeiten und Fotorealismus." },
            { term: "Gemini", pronunciation: "DSCHE-mi-ni", description: "Googles Familie multimodaler KI-Modelle, die diese Anwendung antreiben." },
            { term: "Bokeh", pronunciation: "BO-keh", description: "Die ästhetische Qualität der Unschärfe in den unscharfen Teilen eines Bildes." },
            { term: "Gaffer", pronunciation: "GAFF-er", description: "Der Leiter der Elektroabteilung in der Filmproduktion, verantwortlich für den Beleuchtungsplan." },
        ]
    }
};

// --- PROMPT TEMPLATES ---
export const promptTemplates: { [lang in Language]: string } = {
    en: `You are an expert prompt engineer for Google's Veo, a generative video model. Your task is to synthesize the user's creative parameters into a single, cohesive, and highly descriptive paragraph. Think like a director.

**Core Idea:**
"{idea}"

**Creative & Technical Parameters:**
{parameterList}

**Your Output:**
- A single, detailed paragraph.
- Weave the parameters into a natural, narrative description.
- Use vivid, cinematic language.
- Do not list the parameters.
- Be specific about the visual details, mood, and action.`,
    sv: `Du är en expert på promptteknik för Googles Veo, en generativ videomodell. Din uppgift är att syntetisera användarens kreativa parametrar till ett enda, sammanhängande och mycket beskrivande stycke. Tänk som en regissör.

**Grundidé:**
"{idea}"

**Kreativa och tekniska parametrar:**
{parameterList}

**Ditt resultat:**
- Ett enda, detaljerat stycke.
- Väv in parametrarna i en naturlig, berättande beskrivning.
- Använd levande, filmiskt språk.
- Lista inte parametrarna.
- Var specifik med visuella detaljer, stämning och handling.`,
    es: `Eres un ingeniero experto en prompts para Veo de Google, un modelo de video generativo. Tu tarea es sintetizar los parámetros creativos del usuario en un único párrafo cohesivo y muy descriptivo. Piensa como un director.

**Idea Principal:**
"{idea}"

**Parámetros Creativos y Técnicos:**
{parameterList}

**Tu Resultado:**
- Un único párrafo detallado.
- Entrelaza los parámetros en una descripción natural y narrativa.
- Usa un lenguaje vívido y cinematográfico.
- No enumeres los parámetros.
- Sé específico sobre los detalles visuales, el ambiente y la acción.`,
    fr: `Vous êtes un ingénieur expert en prompts pour Veo de Google, un modèle vidéo génératif. Votre tâche est de synthétiser les paramètres créatifs de l'utilisateur en un seul paragraphe cohérent et très descriptif. Pensez comme un réalisateur.

**Idée Principale :**
"{idea}"

**Paramètres Créatifs et Techniques :**
{parameterList}

**Votre Résultat :**
- Un seul paragraphe détaillé.
- Intégrez les paramètres dans une description narrative et naturelle.
- Utilisez un langage vif et cinématographique.
- Ne listez pas les paramètres.
- Soyez spécifique sur les détails visuels, l'ambiance et l'action.`,
    de: `Sie sind ein Experte für Prompt-Engineering für Googles Veo, ein generatives Videomodell. Ihre Aufgabe ist es, die kreativen Parameter des Benutzers in einem einzigen, zusammenhängenden und sehr beschreibenden Absatz zu synthetisieren. Denken Sie wie ein Regisseur.

**Kernidee:**
"{idea}"

**Kreative & Technische Parameter:**
{parameterList}

**Ihr Ergebnis:**
- Ein einziger, detaillierter Absatz.
- Verweben Sie die Parameter in eine natürliche, erzählerische Beschreibung.
- Verwenden Sie eine lebendige, filmische Sprache.
- Listen Sie die Parameter nicht auf.
- Seien Sie spezifisch bei den visuellen Details, der Stimmung und der Handlung.`
};

export const soraPromptTemplate: { [lang in Language]: string } = {
    en: `A highly detailed, photorealistic video. The scene is "{idea}".

{parameterList}

The video should be indistinguishable from a real-life camera recording, with meticulous attention to physics, lighting, and textures.`,
    sv: `En mycket detaljerad, fotorealistisk video. Scenen är "{idea}".

{parameterList}

Videon ska inte kunna skiljas från en verklig kamerainspelning, med noggrann uppmärksamhet på fysik, ljussättning och texturer.`,
    es: `Un vídeo muy detallado y fotorrealista. La escena es "{idea}".

{parameterList}

El vídeo debe ser indistinguible de una grabación con una cámara real, con una atención meticulosa a la física, la iluminación y las texturas.`,
    fr: `Une vidéo très détaillée et photoréaliste. La scène est "{idea}".

{parameterList}

La vidéo doit être indiscernable d'un enregistrement par une vraie caméra, avec une attention méticuleuse à la physique, à l'éclairage et aux textures.`,
    de: `Ein hochdetailliertes, fotorealistisches Video. Die Szene ist "{idea}".

{parameterList}

Das Video sollte von einer echten Kameraaufnahme nicht zu unterscheiden sein, mit akribischer Beachtung von Physik, Beleuchtung und Texturen.`
};

// --- PARAMETER VALUE TRANSLATIONS ---
export const parameterValues: { [lang in Language]: { [key: string]: string } } = {
    en: {
        optimization: "The scene is paced for a short, impactful 8-second clip.",
        overlay: "The composition is designed to accommodate text or graphic overlays.",
    },
    sv: {
        optimization: "Scenen är anpassad för ett kort, effektfullt 8-sekundersklipp.",
        overlay: "Kompositionen är utformad för att rymma text- eller grafiska överlagringar.",
    },
    es: {
        optimization: "La escena está pensada para un clip corto e impactante de 8 segundos.",
        overlay: "La composición está diseñada para admitir superposiciones de texto o gráficos.",
    },
    fr: {
        optimization: "La scène est rythmée pour un clip court et percutant de 8 secondes.",
        overlay: "La composition est conçue pour accueillir des superpositions de texte ou de graphiques.",
    },
    de: {
        optimization: "Die Szene ist auf einen kurzen, wirkungsvollen 8-Sekunden-Clip ausgelegt.",
        overlay: "Die Komposition ist so gestaltet, dass sie Text- oder Grafikeinblendungen aufnehmen kann.",
    }
};

// --- SERIES INSTRUCTIONS ---
export const seriesInstructions: { [lang in Language]: string } = {
    en: `**SERIES INSTRUCTION:** Your output MUST be structured as a 3-part series. Use Markdown H3 headings (###) for each episode title (e.g., "### Episode 1: The Awakening"). Each episode should be a distinct paragraph describing a sequential part of the story, building on the previous one.`,
    sv: `**SERIEINSTRUKTION:** Ditt resultat MÅSTE struktureras som en serie i 3 delar. Använd Markdown H3-rubriker (###) för varje avsnittstitel (t.ex. "### Avsnitt 1: Uppvaknandet"). Varje avsnitt ska vara ett distinkt stycke som beskriver en sekventiell del av berättelsen och bygger vidare på den föregående.`,
    es: `**INSTRUCCIÓN DE SERIE:** Tu resultado DEBE estar estructurado como una serie de 3 partes. Usa encabezados Markdown H3 (###) para cada título de episodio (p. ej., "### Episodio 1: El Despertar"). Cada episodio debe ser un párrafo distinto que describa una parte secuencial de la historia, construyendo sobre el anterior.`,
    fr: `**INSTRUCTION DE SÉRIE :** Votre résultat DOIT être structuré comme une série en 3 parties. Utilisez les en-têtes Markdown H3 (###) pour chaque titre d'épisode (par ex., "### Épisode 1 : Le Réveil"). Chaque épisode doit être un paragraphe distinct décrivant une partie séquentielle de l'histoire, en s'appuyant sur le précédent.`,
    de: `**SERIENANWEISUNG:** Ihre Ausgabe MUSS als 3-teilige Serie strukturiert sein. Verwenden Sie Markdown-H3-Überschriften (###) für jeden Episodentitel (z. B. "### Episode 1: Das Erwachen"). Jede Episode sollte ein eigener Absatz sein, der einen sequentiellen Teil der Geschichte beschreibt und auf dem vorherigen aufbaut.`
};

// --- VIDEO GENERATION STAGES ---
export const videoGenerationStages: { [lang in Language]: { [key: string]: string } } = {
    en: {
        init: "Initialize",
        render: "Render",
        finalize: "Finalize"
    },
    sv: {
        init: "Initiera",
        render: "Rendera",
        finalize: "Slutför"
    },
    es: {
        init: "Inicializar",
        render: "Renderizar",
        finalize: "Finalizar"
    },
    fr: {
        init: "Initialiser",
        render: "Rendu",
        finalize: "Finaliser"
    },
    de: {
        init: "Initialisieren",
        render: "Rendern",
        finalize: "Abschließen"
    }
};

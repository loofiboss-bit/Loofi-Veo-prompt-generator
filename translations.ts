
import { PronunciationGuideData, PronunciationTerm } from './types';

// This file contains all the UI strings and prompt templates for different languages.
type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

const enStrings = {
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
    labelUseImageAsCameo: "Use as Character Cameo (Sora 2)",
    labelCharacterCameoTag: "Character Cameo Tag",
    placeholderCharacterCameoTag: "e.g., @my_character or a unique name",
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
    labelAudioMix: "Audio Mix Balance",
    labelVoiceVolume: "Voice",
    labelAmbientVolume: "Ambience",
    labelSfxVolume: "SFX",
    labelCustomAudio: "Custom Ambient Audio",
    placeholderCustomAudio: "Upload an audio file for analysis",
    analyzeAudioButton: "Analyze with AI",
    sectionAdvanced: "Advanced Controls",
    labelMotionIntensity: "Motion Intensity",
    labelCreativityLevel: "Creativity Level",
    labelNegativePrompt: "Negative Prompt",
    placeholderNegativePrompt: "e.g., ugly, deformed, blurry, low quality",
    labelOptimizeFor8Seconds: "Optimize for 8-second clip",
    labelOptimizeFor15Seconds: "Optimize for 15-second clip",
    labelIncludeOverlayText: "Include overlay text/graphics",
    labelUseGoogleSearch: "Ground with Google Search",
    labelGenerateAsSeries: "Generate as a 3-part series",
    labelThinkingMode: "Enable Thinking Mode (Pro Only)",
    labelYoutubeUrl: "YouTube URL (Optional)",
    placeholderYoutubeUrl: "e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ",
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
    loadingGenerateButton: "Architecting...",
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
    suggestAdvancedButton: "Suggest Settings",
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
    toastAudioAnalyzed: "Audio analysis complete! Ambient Sound updated.",
    toastPromptDownloaded: "Prompt downloaded.",
    toastShareLink: "Shareable link copied to clipboard!",
    toastImageGenerated: "Image generated successfully!",
    toastAudioSuggested: "AI suggested a full audio design!",
    toastAudioDetailsSuggested: "AI suggested audio details!",
    toastEnvironmentSuggested: "AI enhanced the environment details!",
    toastSensoryDetailsSuggested: "AI suggested sensory details!",
    toastCharacterNuancesSuggested: "AI suggested character nuances!",
    toastEffectSuggested: "AI suggested a visual effect!",
    toastAdvancedSuggested: "AI suggested advanced settings!",
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
        lyricalThemeLabel: "Lyrical Themes / Mood (Optional)",
        lyricalThemePlaceholder: "e.g., Hopeful nostalgia, a story of betrayal and redemption, themes of loss and acceptance.",
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
        characterGender: "Specify the character's gender identity. 'Any' allows the AI to choose, which can be useful for creating diverse scenes.",
        characterEthnicity: "Define the character's ethnic background to create more specific and representative characters. 'Any' leaves it to the AI's discretion.",
        characterAge: "Select an age range for your character. This influences their appearance, actions, and the overall context of the scene.",
        characterMood: "The character's dominant emotion. This will influence their facial expressions, body language, and the overall atmosphere of the video.",
        characterPose: "The character's physical stance or posture. This can help convey their mood or intention (e.g., 'Fighting Stance' for action, 'Meditating' for peace).",
        characterSkinTone: "Specify the character's skin tone. This adds another layer of visual detail to your character. 'Any' allows the AI to decide.",
        characterArchetype: "The character's role in the story (e.g., Hero, Villain, Mentor). This influences their suggested clothing, actions, and overall demeanor.",
        characterSpecificClothing: "Describe specific clothing items in detail. The AI suggestion button (magic wand) can help populate this field based on the character's archetype and environment.",
        characterAccessories: "List any accessories the character has, like jewelry, glasses, or bags. These small details add personality. The AI suggestion button can help provide ideas.",
        artStyle: "The overall visual aesthetic. Choose a preset or select 'Custom' to describe your own unique style.",
        customArtStyle: "Describe your custom style here. You can reference artists, art movements, or use descriptive adjectives (e.g., 'a gritty, hand-drawn sketch style with heavy ink lines').",
        architecturalStyle: "Define the architectural style of buildings in your scene. This adds significant visual flavor, from 'Brutalist' concrete structures to ornate 'Baroque' designs.",
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
        audioMixVoice: "Adjust the relative volume of the voice-over in the mix.",
        audioMixAmbient: "Adjust the relative volume of the ambient sounds and background noise.",
        audioMixSfx: "Adjust the relative volume of specific sound effects.",
        customAudio: "Upload an audio file to use as a reference. Click 'Analyze' to have the AI describe the sound for your prompt.",
        negativePrompt: "Tell the AI what you DON'T want to see. This helps avoid common issues like 'blurry' or 'deformed' results.",
        motionIntensity: "Controls the amount of camera movement and on-screen action. 'High' for action scenes, 'Low' for calm, static shots.",
        creativityLevel: "'Grounded in Reality' sticks closely to realistic physics and scenarios. 'Highly Imaginative' allows the AI to be more creative and surreal.",
        optimizeFor8Seconds: "Tells the AI to create a concise, impactful scene that works well as a short, 8-second clip.",
        optimizeFor15Seconds: "Tells the AI to create a concise, impactful scene that works well as a short, 15-second clip for Sora emulation.",
        includeOverlayText: "Indicates that the final video should be designed to accommodate text or graphics overlays, often by leaving some empty space.",
        useGoogleSearch: "Allows the AI to use Google Search to find up-to-date information or specific details related to your prompt, improving accuracy for real-world topics.",
        generateAsSeries: "Instructs the AI to generate a 3-part narrative, with each part being a separate but connected scene. Great for storytelling.",
        thinkingMode: "Allows the model to use more processing power to 'think' before generating the prompt, which can lead to more creative and complex results. Only available on Pro models.",
        useImageAsCameo: "Use a consistent character across scenes. If an image is uploaded, the AI will match its likeness. If not, use the tag below to establish a consistent character or reference a known entity.",
        characterCameoTag: "A unique tag (e.g., @my_character) or a known name (e.g., a celebrity) to identify the character. The AI will attempt to maintain this character's likeness when the tag is used in the prompt.",
        model: "Choose the underlying Gemini model for prompt generation. 'Pro' is better for complex reasoning, while 'Flash' is faster.",
        veoModel: "Choose the Veo model for video generation. 'Fast' is quicker, while 'Quality' may produce more detailed results but takes longer.",
        targetModel: "Emulate the prompting style of different video generation models to get a result tailored to their strengths.",
        imageUpload: "Upload a starting image. The AI will use this as a reference. This is optional.",
        youtubeUrl: "Provide a YouTube video URL as additional context or inspiration for the AI. The model will not watch the video, but may use its title, description, and other metadata to understand the concept.",
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
        suggestAdvancedButton: "Use AI to suggest settings for this section based on your prompt's context.",
        tutorialButton: "Start the introductory tutorial.",
        imageStudioPrompt: "Describe the image you want to generate. If you've uploaded a base image, describe the edits you want to make (e.g., 'add a hat to the person', 'change the background to a snowy forest').",
        imageStudioAspectRatio: "Choose the aspect ratio for the generated image. This is disabled when editing an existing image.",
        sunoStudioIdea: "Describe the core concept or story for your song. The AI will use this to generate a title, style, and lyrics.",
        sunoStudioTitle: "The title of your song. You can write your own or use the AI suggestions.",
        sunoStudioStyle: "A detailed description of the music style for Suno AI (e.g., 'Upbeat 80s synth-pop with a driving beat'). Use the AI suggestions for inspiration.",
        sunoStudioLyrics: "The full lyrics for your song. Use metatags like [Verse], [Chorus], and [Instrumental] to structure it.",
        sunoStudioLyricalTheme: "Provide specific themes, a mood, or a narrative arc (e.g., 'starts sad, becomes hopeful') to guide the lyric generation.",
        videoAnalysisPrompt: "Ask a question about the uploaded video. You can ask for a summary, a description of the style, or even ask it to generate a new Veo prompt based on the video.",
        videoAnalysisUpload: "Upload a video file (MP4, MOV, etc., under 20MB). The AI will analyze its content based on your prompt.",
    },
    tutorial: {
        startButton: "Start Tutorial",
        nextButton: "Next",
        prevButton: "Back",
        finishButton: "Finish",
        steps: [
            {
                targetId: "app-title",
                title: "Welcome to Veo Prompt Generator",
                text: "This tool helps you craft detailed, cinematic prompts for Google's Veo video generation model. Let's take a quick tour.",
                position: "bottom"
            },
            {
                targetId: "core-concept",
                title: "1. Core Concept",
                text: "Start here. Describe your main idea simply. For example: 'A cyberpunk detective walking in the rain'.",
                position: "right"
            },
            {
                targetId: "autofill-button",
                title: "AI Auto-Fill",
                text: "Stuck? Click this magic wand. The AI will analyze your idea and automatically fill in the best art style, camera angles, and details for you.",
                position: "bottom"
            },
            {
                targetId: "details-tabs",
                title: "2. Fine-Tune Details",
                text: "Use these tabs to dive deep. Control the lighting, camera lens, character emotions, and audio soundscape.",
                position: "top"
            },
            {
                targetId: "environment-ai-button",
                title: "AI Suggestions",
                text: "Look for these magic wands inside input fields. They can suggest sensory details, specific clothing, or audio scripts based on your context.",
                position: "right"
            },
            {
                targetId: "action-bar",
                title: "3. Action Bar",
                text: "When you're ready, generate your prompt, create concept art, or even generate the video directly.",
                position: "top"
            },
            {
                targetId: "creative-studios-header-group",
                title: "Creative Studios",
                text: "Access specialized tools here: Image Studio for visuals, Suno Studio for music generation, and Video Analysis.",
                position: "bottom"
            },
             {
                targetId: "generate-prompt-button",
                title: "Architect Prompt",
                text: "Click here to assemble everything into a single, professionally engineered prompt ready for Veo.",
                position: "top"
            }
        ]
    },
    suggestAdvancedSystemPrompt: `You are a post-production supervisor and expert prompt engineer. Your task is to analyze the user's core creative choices and suggest optimal advanced settings to refine the final video output.
- **negativePrompt**: Suggest terms to AVOID. If the style is 'Photorealistic', suggest avoiding 'animation, cartoon, drawing'. If it's 'Anime', suggest avoiding 'photorealism, 3D render'. For dynamic camera movement, suggest 'static, still image'.
- **motionIntensity**: Based on the camera movement and actions. A 'Drone shot' implies 'High' intensity. A 'Static shot' implies 'Low'.
- **creativityLevel**: Based on the art style. 'Photorealistic' or 'Cinematic' styles suggest 'Grounded in Reality'. Fantasy or abstract styles like 'Anime' or 'Surrealism' suggest 'Highly Imaginative'.
Your suggestions should be a strategic enhancement of the user's existing vision. Respond ONLY with a valid JSON object.`,
    autoFillSystemPrompt: {
        base: `You are an expert creative director for a video production studio. Your task is to analyze the user's core idea and suggest a complete set of creative and technical modifiers to bring it to life as a short video.
Your suggestions should be coherent and work together to create a compelling and unified vision. Be opinionated and creative in your choices.
For every field, you must select one of the provided enum options or generate a short, descriptive string. Do not invent new enum options.

**Key Principles:**
- **Mood Cohesion:** Ensure the art style, color palette, lighting, weather, and audio all contribute to the same emotional tone.
- **Cinematic Vision:** Choose camera movements, distances, and compositions that would be used by a professional filmmaker to tell a story.
- **Camera Distance Strategy:** Analyze the subject's importance versus the environment. Select 'Extreme close-up' if the subject's detail or emotion is paramount. Select 'Wide shot' or 'Establishing shot' if the environment context is critical.
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
The user is targeting the '{targetModel}' video generation model.
- **Veo**: Emphasize cinematic lighting, visual flair, and artistic style.
- **Sora**: Emphasize physical realism, cause-and-effect, and world simulation details.

For each variation, change at least one key element, such as:
- The **time of day** or **weather**.
- The **character's mood** or a specific **action**.
- The **art style** or **color palette**.
- The **camera angle** or **movement**.

The variations should offer genuinely different creative directions while staying true to the core idea of the original prompt. Respond ONLY with a valid JSON object containing an array of 3 strings. Respond in language: {language}.`,
    combineSystemPrompt: `You are an expert prompt engineer. Your task is to analyze multiple prompt variations provided by the user and synthesize them into a single, superior prompt.
Target Model: {targetModel} (Veo = Cinematic/Artistic, Sora = Realistic/Physics-based).
The combined prompt should take the best elements from each variation to create a richer, more detailed, and emotionally resonant scene description.
Ensure the final prompt flows naturally as a single coherent paragraph.
Respond ONLY with a valid JSON object containing the combined prompt.`,
};

export const appUIStrings: any = {
    en: enStrings,
    sv: enStrings, // Fallback to English
    es: enStrings, // Fallback to English
    fr: enStrings, // Fallback to English
    de: enStrings  // Fallback to English
};

export const pronunciationGuides: { [key in Language]: PronunciationGuideData } = {
    en: { terms: [] },
    sv: { terms: [] },
    es: { terms: [] },
    fr: { terms: [] },
    de: { terms: [] }
};

export const promptTemplates = {
    en: "Imagine a video with the following details:\n{parameterList}\n\nCore Idea: \"{idea}\"",
    sv: "Föreställ dig en video med följande detaljer:\n{parameterList}\n\nKärnidé: \"{idea}\"",
    es: "Imagina un video con los siguientes detalles:\n{parameterList}\n\nIdea Principal: \"{idea}\"",
    fr: "Imaginez une vidéo avec les détails suivants :\n{parameterList}\n\nIdée Centrale : \"{idea}\"",
    de: "Stellen Sie sich ein Video mit folgenden Details vor:\n{parameterList}\n\nKernidee: \"{idea}\""
};

export const soraPromptTemplate = {
     en: "Generate a hyper-realistic video based on the following details:\n{parameterList}\n\nCore Idea: \"{idea}\". \nThe video should be indistinguishable from reality.",
     sv: "Generera en hyperrealistisk video baserad på följande detaljer:\n{parameterList}\n\nKärnidé: \"{idea}\". \nVideon ska vara omöjlig att skilja från verkligheten.",
     es: "Genera un video hiperrealista basado en los siguientes detalles:\n{parameterList}\n\nIdea Principal: \"{idea}\". \nEl video debe ser indistinguible de la realidad.",
     fr: "Générez une vidéo hyperréaliste basée sur les détails suivants :\n{parameterList}\n\nIdée Centrale : \"{idea}\". \nLa vidéo doit être indiscernable de la réalité.",
     de: "Generieren Sie ein hyperrealistisches Video basierend auf den folgenden Details:\n{parameterList}\n\nKernidee: \"{idea}\". \nDas Video sollte von der Realität nicht zu unterscheiden sein."
};

export const parameterValues = {
    en: { optimization: "Optimize for 8-second clip", optimization_sora: "Optimize for 15-second clip", overlay: "Include overlay text" },
    sv: { optimization: "Optimera för 8-sekunders klipp", optimization_sora: "Optimera för 15-sekunders klipp", overlay: "Inkludera textöverlagring" },
    es: { optimization: "Optimizar para clip de 8 segundos", optimization_sora: "Optimizar para clip de 15 segundos", overlay: "Incluir texto superpuesto" },
    fr: { optimization: "Optimiser pour un clip de 8 secondes", optimization_sora: "Optimiser pour un clip de 15 secondes", overlay: "Inclure du texte superposé" },
    de: { optimization: "Optimieren für 8-Sekunden-Clip", optimization_sora: "Optimieren für 15-Sekunden-Clip", overlay: "Überlagerungstext einfügen" }
};

export const seriesInstructions = {
    en: "Generate a 3-part series connected by a narrative arc.",
    sv: "Generera en 3-delad serie sammanknuten av en berättelsebåge.",
    es: "Genera una serie de 3 partes conectadas por un arco narrativo.",
    fr: "Générez une série en 3 parties reliées par un arc narratif.",
    de: "Generieren Sie eine 3-teilige Serie, die durch einen Erzählbogen verbunden ist."
};

export const videoGenerationStages: any = {
    en: { init: "Initializing", render: "Rendering", finalize: "Finalizing" },
    sv: { init: "Initierar", render: "Renderar", finalize: "Slutför" },
    es: { init: "Iniciando", render: "Renderizando", finalize: "Finalizando" },
    fr: { init: "Initialisation", render: "Rendu", finalize: "Finalisation" },
    de: { init: "Initialisierung", render: "Rendern", finalize: "Abschließen" }
};

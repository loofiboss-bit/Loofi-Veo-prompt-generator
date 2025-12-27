
export const appUIStrings: any = {
  en: {
    headerTitle: "Veo Prompt Architect",
    headerSubtitle: "Craft cinematic prompts for Gemini & Veo",
    generateButton: "Generate Prompt",
    loadingGenerateButton: "Architecting...",
    updateButton: "Update Prompt",
    loadingUpdateButton: "Updating...",
    newButton: "New",
    saveButton: "Save",
    cancelButton: "Cancel",
    undoButton: "Undo",
    redoButton: "Redo",
    editButton: "Edit",
    templatesButton: "Templates",
    saveToHistoryButton: "Save to History",
    saveAsPresetButton: "Save Preset",
    generateVideoButton: "Open Video Studio",
    loadingVideoButton: "Opening...",
    generateArtButton: "Concept Art",
    loadingArtButton: "Painting...",
    generateStoryboardButton: "Storyboard",
    loadingStoryboardButton: "Sketching...",
    generateVariationsButton: "Variations",
    loadingVariationsButton: "Dreaming...",
    refineButton: "Refine",
    loadingRefineButton: "Polishing...",
    imageStudioButton: "Image Studio",
    sunoStudioButton: "Song Studio",
    videoStudioButton: "Video Studio",
    videoAnalysisButton: "Video Analysis",
    resetAllButton: "Reset All",
    compareModelsButton: "Compare Veo vs. Sora",
    spatialDirectorButton: "Spatial Director",
    
    sectionCoreConcept: "1. Core Concept",
    labelIdea: "Core Idea",
    placeholderIdea: "e.g., A cyberpunk detective walking in the rain...",
    imageUploadLabel: "Reference Image",
    imageUploadPlaceholder: "Upload an image for inspiration or cameo",
    labelUseImageAsCameo: "Use as Character Cameo",
    labelCharacterCameoTag: "Cameo Tag",
    placeholderCharacterCameoTag: "e.g., 'Detective Smith'",
    
    tabScene: "Scene",
    tabCharacter: "Character",
    tabStyle: "Style",
    tabCamera: "Camera",
    tabAudio: "Audio",
    tabAdvanced: "Advanced",

    subheadingAdvancedControls: "Advanced Controls",
    subheadingModelConfig: "Model Configuration",

    labelEnvironment: "Environment",
    placeholderEnvironment: "e.g., Neon-lit alleyway",
    labelSensoryDetails: "Sensory Details",
    placeholderSensoryDetails: "e.g., Smell of ozone, hum of neon",
    labelEnvironmentDynamicEvents: "Dynamic Events",
    placeholderEnvironmentDynamicEvents: "e.g., Steam rising from vents",
    labelArchitecturalStyle: "Architectural Style",
    labelTimeOfDay: "Time of Day",
    labelWeather: "Weather",
    
    labelCharacterActions: "Actions",
    placeholderCharacterActions: "e.g., Walking slowly, looking over shoulder",
    labelCharacterObjectInteraction: "Object Interaction",
    placeholderCharacterObjectInteraction: "e.g., Holding a glowing datapad",
    labelCharacterNuances: "Nuances",
    placeholderCharacterNuances: "e.g., Nervous twitch, heavy breathing",
    labelCharacterGender: "Gender",
    labelCharacterEthnicity: "Ethnicity",
    labelCharacterAge: "Age",
    labelCharacterMood: "Mood",
    labelCharacterPose: "Pose",
    labelCharacterSkinTone: "Skin Tone",
    labelCharacterArchetype: "Archetype",
    labelCharacterSpecificClothing: "Clothing Details",
    placeholderCharacterSpecificClothing: "e.g., Trench coat with LED collar",
    labelCharacterAccessories: "Accessories",
    placeholderCharacterAccessories: "e.g., Silver ring, cybernetic eye",

    labelArtStyle: "Art Style",
    labelCustomArtStyle: "Custom Style",
    placeholderCustomArtStyle: "e.g., 80s Anime style",
    labelLightingStyle: "Lighting",
    labelColorPalette: "Color Palette",
    labelVisualEffect: "Visual Effect",
    labelAnimationPreset: "Animation",
    
    labelCameraMovement: "Camera Movement",
    labelCameraDistance: "Camera Distance",
    labelLensType: "Lens Type",
    labelCompositionalGuide: "Composition",
    labelAspectRatio: "Aspect Ratio",
    labelResolution: "Resolution",
    
    labelVoiceStyle: "Voice Style",
    labelVoiceOver: "Voice Over Script",
    placeholderVoiceOver: "e.g., 'The city never sleeps...'",
    labelAmbientSound: "Ambient Sound",
    labelSoundEffectsIntensity: "SFX Intensity",
    labelAudioMix: "Audio Mix Levels",
    labelVoiceVolume: "Voice",
    labelAmbientVolume: "Ambient",
    labelSfxVolume: "SFX",
    labelCustomAudio: "Custom Audio Track",
    placeholderCustomAudio: "Upload audio for analysis or background",
    analyzeAudioButton: "Analyze Audio",

    labelNegativePrompt: "Negative Prompt",
    placeholderNegativePrompt: "e.g., blurry, distorted, low quality",
    labelMotionIntensity: "Motion Intensity",
    labelCreativityLevel: "Creativity",
    labelOptimizeFor8Seconds: "Optimize for 8s",
    labelOptimizeFor15Seconds: "Optimize for 15s",
    labelIncludeOverlayText: "Include Overlay Text",
    labelUseGoogleSearch: "Use Google Search",
    labelGenerateAsSeries: "Generate as Series",
    labelThinkingMode: "Thinking Mode",
    labelYoutubeUrl: "YouTube Context",
    placeholderYoutubeUrl: "Paste a YouTube URL for context...",
    labelModel: "Gemini Model",
    labelVeoModel: "Veo Model",
    labelTargetModel: "Target Video Model",
    toggleVeoLabel: "Veo 3.1",
    toggleVeoDescription: "Native video generation",
    toggleSoraLabel: "Sora (Prompt Only)",
    toggleSoraDescription: "Optimized prompt structure for Sora",

    suggestSensoryDetailsButton: "Suggest Sensory Details",
    suggestCharacterNuancesButton: "Suggest Nuances",
    suggestAdvancedButton: "Suggest Advanced Settings",
    autofillButton: "Auto-fill Modifiers",
    brainstormButton: "Brainstorm Ideas",

    physicsCheck: {
        runButton: "Run Simulation Check",
        validTitle: "Simulation Stable",
        invalidTitle: "Physics Violations Detected",
        validMessage: "The prompt logic adheres to standard physical models.",
    },

    compareModels: {
        title: "Model Comparison: Veo vs. Sora",
        veoHeader: "Veo 3.1 (Aesthetics)",
        soraHeader: "Sora 2 (Simulation)",
        veoDescription: "Veo excels at artistic composition, lighting, and cinematic feel.",
        soraDescription: "Sora simulates real-world physics, causality, and intricate motion.",
        useButton: "Use This Prompt",
        loading: "Generating comparison...",
    },

    spatialDirector: {
        title: "Spatial Director",
        instruction: "Select a grid sector to direct specific motion or details in that area.",
        placeholder: "e.g. A flock of birds flying away",
        clearAll: "Clear All",
        save: "Save Directions",
        sectors: {
            '0-0': 'Top Left',
            '0-1': 'Top Center',
            '0-2': 'Top Right',
            '1-0': 'Mid Left',
            '1-1': 'Center',
            '1-2': 'Mid Right',
            '2-0': 'Bottom Left',
            '2-1': 'Bottom Center',
            '2-2': 'Bottom Right'
        }
    },

    tooltips: {
        idea: "The core concept of your video.",
        imageUpload: "Upload an image to guide the generation.",
        useImageAsCameo: "Use this image to maintain character consistency.",
        characterCameoTag: "A unique name to refer to this character.",
        environment: "The setting of the scene.",
        sensoryDetails: "Sights, sounds, and smells.",
        environmentDynamicEvents: "Things happening in the background.",
        architecturalStyle: "Style of buildings.",
        timeOfDay: "Lighting condition based on time.",
        weather: "Atmospheric conditions.",
        characterActions: "What the character is doing.",
        characterObjectInteraction: "How they interact with items.",
        characterNuances: "Subtle behaviors.",
        characterGender: "Character's gender identity.",
        characterEthnicity: "Ethnic background.",
        characterAge: "Approximate age group.",
        characterMood: "Emotional state.",
        characterPose: "Body position.",
        characterSkinTone: "Complexion.",
        characterArchetype: "Role in the story.",
        characterSpecificClothing: "Detailed clothing description.",
        characterAccessories: "Items worn or carried.",
        artStyle: "Visual style of the video.",
        customArtStyle: "Define your own art style.",
        lightingStyle: "Lighting setup.",
        colorPalette: "Color scheme.",
        visualEffect: "Post-processing effects.",
        animationPreset: "Camera or object motion preset.",
        cameraMovement: "How the camera moves.",
        cameraDistance: "Distance from subject.",
        lensType: "Type of camera lens.",
        compositionalGuide: "Framing rule.",
        aspectRatio: "Video dimensions.",
        resolution: "Video quality.",
        voiceStyle: "Tone of the narrator.",
        voiceOver: "Script for the voice over.",
        ambientSound: "Background noise.",
        soundEffectsIntensity: "Volume of SFX.",
        audioMixVoice: "Voice volume level.",
        audioMixAmbient: "Ambient volume level.",
        audioMixSfx: "SFX volume level.",
        customAudio: "Upload your own audio file.",
        suggestAudio: "Suggest audio settings based on scene.",
        suggestEnvironmentButton: "Suggest environment details.",
        suggestEffectButton: "Suggest a visual effect.",
        suggestAdvancedButton: "Suggest negative prompt and settings.",
        negativePrompt: "Elements to avoid.",
        motionIntensity: "Amount of movement.",
        creativityLevel: "Adherence to prompt.",
        optimizeFor8Seconds: "Optimize prompt for short clips.",
        optimizeFor15Seconds: "Optimize prompt for longer clips.",
        includeOverlayText: "Ask for text on screen.",
        useGoogleSearch: "Ground generation in real-world data.",
        generateAsSeries: "Create a sequence of prompts.",
        thinkingMode: "Enable advanced reasoning.",
        youtubeUrl: "Context from a YouTube video.",
        model: "Select the Gemini model.",
        veoModel: "Select the video generation model.",
        targetModel: "Choose between Veo and Sora prompting styles.",
        generateButton: "Generate the prompt.",
        updateButtonTooltip: "Regenerate the prompt.",
        newButtonTooltip: "Clear all fields.",
        saveButton: "Save edits.",
        cancelButton: "Discard edits.",
        undoButton: "Undo last edit.",
        redoButton: "Redo last edit.",
        editButton: "Edit the generated prompt manually.",
        templatesButton: "Load a template.",
        saveToHistoryButton: "Save prompt to local history.",
        saveAsPresetButton: "Save current settings as a preset.",
        shareButton: "Share prompt configuration.",
        downloadButton: "Download prompt as text.",
        copyButton: "Copy prompt to clipboard.",
        generateVideoButton: "Open Video Studio.",
        conceptArtButton: "Generate a preview image.",
        storyboardButton: "Generate storyboard frames.",
        variationsButton: "Generate prompt variations.",
        refineButton: "Improve the current prompt.",
        videoAnalysisPrompt: "Prompt for video analysis.",
        videoAnalysisUpload: "Upload video to analyze.",
        imageStudioPrompt: "Prompt for image generation.",
        imageStudioAspectRatio: "Aspect ratio for image.",
        videoStudioPrompt: "The final prompt to send to Veo.",
        videoStudioModel: "Choose between speed and higher quality.",
        sunoStudioIdea: "Idea for a song.",
        sunoStudioLyricalTheme: "Theme of lyrics.",
        sunoStudioTitle: "Song title.",
        sunoStudioStyle: "Musical style.",
        sunoStudioLyrics: "Song lyrics.",
        tutorialButton: "Start Tutorial.",
        resetAllButton: "Reset everything.",
        themeToggle: "Toggle dark/light mode.",
        videoAnalysisButton: "Open Video Analysis Studio.",
        sunoStudioButton: "Open Suno Song Studio.",
        imageStudioButton: "Open Image Studio.",
        videoStudioButton: "Open Video Generation Studio.",
        historyButton: "Open History.",
        searchButton: "Search history and templates.",
        brainstormButton: "Generate creative prompt ideas based on your input.",
        compareModelsButton: "Compare how prompts differ for Veo vs. Sora based on your current idea.",
        spatialDirectorButton: "Direct specific motion for 9 distinct sectors of the frame.",
    },

    search: {
        placeholder: "Search prompts, presets, templates...",
        title: "Global Search",
        historySection: "History",
        presetsSection: "Presets",
        templatesSection: "Templates",
        noResults: "No matches found.",
        recentHistory: "Recent History",
    },

    toastPromptGenerated: "Prompt generated successfully!",
    toastPromptSaved: "Prompt saved!",
    toastHistorySaved: "Saved to history.",
    toastHistoryLoaded: "Loaded from history.",
    toastTemplateApplied: "Template applied.",
    toastPresetSaved: "Preset saved.",
    toastPresetDeleted: "Preset deleted.",
    toastArtGenerated: "Concept art generated.",
    toastStoryboardGenerated: "Storyboard generated.",
    toastVideoGenerated: "Video generated successfully!",
    toastShareLink: "Link copied to clipboard.",
    toastPromptDownloaded: "Prompt downloaded.",
    toastAudioAnalyzed: "Audio analyzed and applied.",
    toastVideoAnalyzed: "Video analyzed.",
    toastImageGenerated: "Image generated.",
    toastSongSaved: "Song saved.",
    toastSongLoaded: "Song loaded.",
    toastSongDeleted: "Song deleted.",
    toastEnvironmentSuggested: "Environment details updated.",
    toastSensoryDetailsSuggested: "Sensory details updated.",
    toastCharacterNuancesSuggested: "Character nuances updated.",
    toastEffectSuggested: "Visual effect updated.",
    toastAudioSuggested: "Audio design updated.",
    toastAdvancedSuggested: "Advanced settings updated.",
    toastPromptRefined: "Prompt refined.",
    toastLocationAcquired: "Location acquired.",
    toastLocationError: "Could not get location.",
    toastSoraStyleSet: "Art style set to Photorealistic for Sora.",
    
    // --- Error Messages & Solutions ---
    errorGeneric: "Something went wrong.",
    solutionGeneric: "Please try again. If the issue persists, refresh the page.",
    
    errorValidation: "Please check your inputs.",
    solutionValidation: "Ensure all required fields are filled and character limits are met.",
    
    errorApiKeyInvalid: "Authentication failed. Invalid or missing API Key.",
    solutionApiKeyInvalid: "Please select a valid API key in the settings or via the prompt.",
    
    errorRateLimit: "Rate limit exceeded.",
    solutionRateLimit: "The model is currently busy. Please wait a moment before trying again.",
    
    errorQuotaExceeded: "API Usage Quota Exceeded.",
    solutionQuotaExceeded: "You have reached your usage limit. Please check your billing dashboard or wait for the quota to reset.",
    
    errorSafety: "Content generation blocked by safety filters.",
    solutionSafety: "Try modifying your prompt to be less explicit or avoid restricted topics.",
    
    errorBadRequest: "The request was invalid.",
    solutionBadRequest: "Please check your prompt for empty or conflicting information.",
    
    errorServerError: "Server error. The AI service is experiencing issues.",
    solutionServerError: "This is a temporary issue with the AI provider. Please try again later.",
    
    errorServiceUnavailable: "The AI service is currently overloaded.",
    solutionServiceUnavailable: "Please wait a few seconds and try again.",
    
    errorNetwork: "Network error.",
    solutionNetwork: "Please check your internet connection and try again.",
    
    errorLocationNotSupported: "This model is not supported in your current region.",
    solutionLocationNotSupported: "Try using a VPN or selecting a different model if available.",
    
    errorFieldTooLong: "{field} is too long (max {limit} chars).",
    errorRestrictedKeywordInField: "Restricted keyword in {field}.",
    errorClothingDetailsRequired: "Please specify clothing details.",
    errorInvalidUrl: "Invalid URL.",
    errorCustomStyleRequired: "Custom style is required.",
    errorVoiceOverRequired: "Voice over script is required.",
    errorNoPromptToSave: "No prompt to save.",
    errorHistorySave: "Failed to save history.",
    errorPresetNameRequired: "Preset name is required.",
    errorVideoFileSize: "Video file too large (max 20MB).",
    errorFileUpload: "Failed to upload file.",
    errorInvalidAspectRatioForVeo: "Veo supports 16:9 or 9:16 only.",
    
    summary: {
        title: "Prompt Blueprint",
        ideaLabel: "Core Idea",
        styleLabel: "Visual Style",
        cameraLabel: "Camera Work",
        livePreviewTitle: "Live Preview",
        livePreviewPlaceholder: "Your prompt preview will appear here...",
        cta: "Ready to build? Click Generate.",
    },
    
    tutorial: {
        startButton: "Start Tutorial",
        nextButton: "Next",
        prevButton: "Previous",
        finishButton: "Finish",
        steps: [
            { targetId: 'core-concept', title: 'Start Here', text: 'Enter your main idea here. This is the foundation of your prompt.' },
            { targetId: 'autofill-button', title: 'AI Assist', text: 'Click the magic wand to automatically fill in details based on your idea.' },
            { targetId: 'details-tabs', title: 'Refine Details', text: 'Use these tabs to tweak specific aspects like Scene, Character, and Camera.' },
            { targetId: 'environment-ai-button', title: 'Smart Suggestions', text: 'Look for magic wands in other fields to get AI-powered suggestions.' },
            { targetId: 'generate-prompt-button', title: 'Generate', text: 'Click {GENERATE_BUTTON} to assemble your structured prompt.' },
            { targetId: 'output-section', title: 'Output', text: 'Your generated prompt will appear here, ready to be copied or sent to Veo.' },
            { targetId: 'creative-studios-header-group', title: 'Creative Studios', text: 'Explore specialized tools for Image, Music, and Video Analysis here.' },
        ]
    },

    history: {
        title: "History",
        clear: "Clear History",
        clearConfirm: "Are you sure you want to clear history?",
        empty: "No history yet.",
        use: "Use",
        delete: "Delete",
        deleteConfirm: "Delete this entry?",
        searchPlaceholder: "Search history...",
    },

    templates: {
        title: "Templates & Presets",
        use: "Use",
        searchPlaceholder: "Search templates...",
        noResults: "No templates found.",
        yourPresetsTitle: "Your Presets",
        builtInTitle: "Built-in Templates",
        deletePreset: "Delete",
        deletePresetConfirm: "Delete preset",
        edit: "Edit",
        save: "Save",
        cancel: "Cancel",
        updateSettings: "Update with Current Settings",
        updateSettingsConfirm: "This will overwrite the preset's settings with your current configuration. Continue?",
        renamePlaceholder: "Preset Name",
    },

    variations: {
        title: "Prompt Variations",
        use: "Use",
        loading: "Generating variations...",
        empty: "No variations generated.",
        combine: "Combine Selected",
        combiningButton: "Combining...",
        useCombined: "Use Combined Prompt",
        combinedPromptLabel: "Combined Prompt",
    },
    
    promptIdeas: {
        title: "Brainstorming Results",
        loading: "Brainstorming creative ideas...",
    },

    imageStudio: {
        title: "Image Studio",
        promptLabel: "Image Prompt",
        uploadLabel: "Reference Image",
        editButton: "Edit Image",
        editingButton: "Editing...",
        downloadButton: "Download",
        clearButton: "Clear",
        canvasPlaceholder: "Generated image will appear here",
        advancedSettings: "Advanced Settings",
        negativePromptLabel: "Negative Prompt",
        negativePromptPlaceholder: "Elements to exclude (e.g. blur, text, distortion)",
        styleLabel: "Artistic Style",
        styleStrengthLabel: "Style Strength",
        aspectRatioLabel: "Aspect Ratio",
    },
    
    sunoStudio: {
        title: "Suno Song Studio",
        ideaLabel: "Song Idea",
        ideaPlaceholder: "A song about...",
        lyricalThemeLabel: "Lyrical Theme",
        lyricalThemePlaceholder: "e.g., Hope, Loss, Victory",
        autoWriteButton: "Auto-Write Song",
        autoWritingButton: "Writing...",
        outputTitle: "Title",
        outputStyle: "Style",
        outputLyrics: "Lyrics",
        suggestTitlesButton: "Suggest Titles",
        suggestStylesButton: "Suggest Styles",
        historyTitle: "Song History",
        clearHistoryButton: "Clear",
        historyEmpty: "No saved songs.",
        useButton: "Use",
        deleteButton: "Delete",
        saveSongButton: "Save Song",
        deleteConfirm: "Delete this song?",
        clearConfirm: "Clear all saved songs?",
    },

    videoStudio: {
        title: "Video Generation Studio",
        promptLabel: "Video Prompt",
        promptPlaceholder: "Describe your video in detail...",
        generateButton: "Generate Video",
        generatingButton: "Starting...",
        placeholderText: "Your generated video will appear here.",
        downloadButton: "Download Video",
        statusInit: "Initializing...",
        statusProcessing: "Veo is rendering your vision...",
        statusPolling: "Polishing pixels...",
        statusFetching: "Finalizing download...",
        statusComplete: "Generation Complete!",
    },

    videoAnalysisStudio: {
        title: "Video Analysis Studio",
        uploadLabel: "Upload Video",
        uploadButton: "Choose Video",
        uploadHint: "MP4, WebM (Max 20MB)",
        promptLabel: "Analysis Prompt",
        promptPlaceholder: "What should I look for?",
        analyzeButton: "Analyze Video",
        analyzingButton: "Analyzing...",
        resultsTitle: "Analysis Results",
        resultsPlaceholder: "Analysis will appear here...",
        useResultButton: "Use as Idea",
    },
    
    pronunciationGuide: {
        title: "Pronunciation Guide",
    },

    savePresetModal: {
        title: "Save Preset",
        label: "Preset Name",
        placeholder: "e.g., My Sci-Fi Style",
        cancel: "Cancel",
        save: "Save",
    },
    
    examplesCarousel: {
        title: "Inspiration",
        use: "Use this Example",
    },

    videoStatusInit: "Initializing...",
    videoStatusProcessing: "Veo is dreaming up your video...",
    videoStatusPolling: "Still working on it...",
    videoStatusFetching: "Almost there, downloading...",
    videoStatusComplete: "Done!",
    videoStatusError: "Video generation failed.",
  }
};

export const pronunciationGuides: any = {
  en: {
    terms: [
      { term: "Bokeh", pronunciation: "boh-keh", description: "The aesthetic quality of the blur produced in the out-of-focus parts of an image." },
      { term: "Chiaroscuro", pronunciation: "kee-ahr-uh-skyoor-oh", description: "The use of strong contrasts between light and dark." },
      { term: "Diegetic Sound", pronunciation: "die-uh-jet-ik", description: "Sound whose source is visible on the screen or whose source is implied to be present by the action of the film." },
      { term: "Mise-en-scène", pronunciation: "meez-ahn-sen", description: "The arrangement of scenery and stage properties in a play or film." },
      { term: "Dolly Zoom", pronunciation: "doll-ee zoom", description: "An unsettling in-camera effect that appears to undermine normal visual perception." },
      { term: "Rack Focus", pronunciation: "rak foh-kuhs", description: "Changing the focus of the lens during a shot." }
    ]
  },
  sv: { terms: [] },
  es: { terms: [] },
  fr: { terms: [] },
  de: { terms: [] },
};

export const parameterValues: any = {
  en: { optimization: "Optimize for 8 seconds", optimization_sora: "Optimize for 15 seconds", overlay: "Include Overlay Text" },
  sv: { optimization: "Optimera för 8 sekunder", optimization_sora: "Optimera för 15 sekunder", overlay: "Inkludera överläggstext" },
  es: { optimization: "Optimizar para 8 segundos", optimization_sora: "Optimizar para 15 segundos", overlay: "Incluir texto superpuesto" },
  fr: { optimization: "Optimiser pour 8 secondes", optimization_sora: "Optimiser pour 15 secondes", overlay: "Inclure le texte superposé" },
  de: { optimization: "Für 8 Sekunden optimieren", optimization_sora: "Für 15 Sekunden optimieren", overlay: "Overlay-Text einschließen" },
};

export const seriesInstructions: any = {
  en: "\n\nThis is part of a series. Please maintain continuity with previous prompts if applicable. Output format: ### Episode [Number]: [Title] \n [Description]",
  sv: "\n\nDetta är en del av en serie. Behåll kontinuiteten. Utdataformat: ### Avsnitt [Nummer]: [Titel] \n [Beskrivning]",
  es: "\n\nEsto es parte de una serie. Mantén la continuidad. Formato de salida: ### Episodio [Número]: [Título] \n [Descripción]",
  fr: "\n\nCeci fait partie d'une série. Maintenez la continuité. Format de sortie : ### Épisode [Numéro] : [Titre] \n [Description]",
  de: "\n\nDies ist Teil einer Serie. Kontinuität wahren. Ausgabeformat: ### Episode [Nummer]: [Titel] \n [Beschreibung]",
};

export const soraPromptTemplate: any = {
  en: `Create a detailed video generation prompt for OpenAI Sora based on the following parameters.
  
**Core Idea:** "{idea}"

**Parameters:**
{parameterList}

**Instructions:**
Describe the video in extreme detail, focusing on physics, lighting, and camera movement. The goal is photorealism.`,
  sv: `Skapa en detaljerad videogenereringsprompt för OpenAI Sora baserat på följande parametrar.
  
**Kärnidè:** "{idea}"

**Parametrar:**
{parameterList}

**Instruktioner:**
Beskriv videon i extrem detalj, med fokus på fysik, ljussättning och kamerarörelser. Målet är fotorealism.`,
  es: `Crea un prompt detallado de generación de video para OpenAI Sora basado en los siguientes parámetros.
  
**Idea Central:** "{idea}"

**Parámetros:**
{parameterList}

**Instrucciones:**
Describe el video con extremo detalle, enfocándote en la física, la iluminación y el movimiento de la cámara. El objetivo es el fotorrealismo.`,
  fr: `Créez une invite de génération de vidéo détaillée pour OpenAI Sora basée sur les paramètres suivants.
  
**Idée Centrale:** "{idea}"

**Paramètres:**
{parameterList}

**Instructions:**
Décrivez la vidéo avec une extrême précision, en vous concentrant sur la physique, l'éclairage et les mouvements de caméra. L'objectif est le photoréalisme.`,
  de: `Erstellen Sie einen detaillierten Videogenerierungs-Prompt für OpenAI Sora basierend auf den folgenden Parametern.
  
**Kernidee:** "{idea}"

**Parameter:**
{parameterList}

**Anweisungen:**
Beschreiben Sie das Video extrem detailliert und konzentrieren Sie sich auf Physik, Beleuchtung und Kamerabewegung. Das Ziel ist Fotorealismus.`,
};

export const videoGenerationStages: any = {
  en: { init: "Initializing", render: "Rendering", finalize: "Finalizing" },
  sv: { init: "Initierar", render: "Renderar", finalize: "Slutför" },
  es: { init: "Inicializando", render: "Renderizando", finalize: "Finalizando" },
  fr: { init: "Initialisation", render: "Rendu", finalize: "Finalisation" },
  de: { init: "Initialisierung", render: "Rendern", finalize: "Abschließen" },
};


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
    restructureButton: "Reorganize",
    loadingRestructureButton: "Structuring...",
    imageStudioButton: "Image Studio",
    sunoStudioButton: "Song Studio",
    videoStudioButton: "Video Studio",
    videoAnalysisButton: "Video Analysis",
    resetAllButton: "Reset All",
    compareModelsButton: "Compare Veo vs. Sora",
    spatialDirectorButton: "Spatial Director",
    wizardButton: "Wizard Mode",
    storyBoardButton: "Story Board",
    
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
    labelOverlayTextContent: "Overlay Text Content",
    placeholderOverlayTextContent: "e.g., 'New York City, 2050'",
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

    cinematographyCheck: {
        runButton: "Check Cinematography",
        validTitle: "Aesthetics Consistent",
        invalidTitle: "Technical Conflicts Detected",
        validMessage: "Lighting, optics, and camera choices are harmonious.",
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

    wizard: {
        title: "Quick Start Wizard",
        step1Title: "What is your core subject?",
        step1Placeholder: "e.g., A robot waiter dropping a tray",
        step2Title: "What is the mood?",
        step3Title: "What is the visual style?",
        step4Title: "Where does it take place?",
        step4Placeholder: "e.g., A busy cyberpunk diner",
        next: "Next",
        back: "Back",
        magicGenerate: "Magic Generate",
        generating: "Brewing...",
        moods: {
            dark: "Dark / Gritty",
            happy: "Happy / Upbeat",
            tense: "Tense / Thriller",
            peaceful: "Peaceful / Calm"
        },
        styles: {
            realistic: "Realistic",
            anime: "Anime",
            cinematic: "Cinematic",
            '3d': "3D Animation"
        }
    },

    storyBoard: {
        title: "Story Board",
        description: "Create a consistent multi-shot sequence by defining a global context and individual shot actions.",
        globalContext: "Global Context",
        globalContextDesc: "These settings apply to every shot to ensure consistency.",
        shotList: "Shot List",
        addShot: "Add Shot",
        batchGenerate: "Batch Generate Prompts",
        generating: "Generating...",
        shot: "Shot",
        actionLabel: "Action",
        actionPlaceholder: "What happens in this specific shot?",
        cameraLabel: "Camera",
        cameraPlaceholder: "e.g., Close-up, Pan right",
        styleLabel: "Visual Style",
        stylePlaceholder: "e.g., Cinematic, Film Noir, 35mm",
        characterLabel: "Character",
        characterPlaceholder: "e.g., A weary detective in a trench coat",
        settingLabel: "Setting",
        settingPlaceholder: "e.g., A rainy neon-lit alleyway",
        resultsTitle: "Generated Sequence",
        copyAll: "Copy All"
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
        suggestCamera: "Suggest optimal camera settings based on concept.",
        suggestActions: "Generate narrative action flow based on archetype.",
        negativePrompt: "Elements to avoid.",
        motionIntensity: "Amount of movement.",
        creativityLevel: "Adherence to prompt.",
        optimizeFor8Seconds: "Optimize prompt for short clips.",
        optimizeFor15Seconds: "Optimize prompt for longer clips.",
        includeOverlayText: "Ask for text on screen.",
        overlayTextContent: "The specific text you want to appear on screen.",
        useGoogleSearch: "Ground generation in real-world data.",
        generateAsSeries: "Create a sequence of prompts.",
        thinkingMode: "Enable advanced reasoning.",
        youtubeUrl: "Context from a YouTube video.",
        model: "Select the Gemini model.",
        veoModel: "Select the video generation model.",
        targetModel: "Choose between Veo and Sora prompting styles.",
        generateButton: "Generate the prompt. (Ctrl+G)",
        updateButtonTooltip: "Regenerate the prompt. (Ctrl+G)",
        newButtonTooltip: "Clear all fields.",
        saveButton: "Save edits.",
        cancelButton: "Discard edits.",
        undoButton: "Undo last edit.",
        redoButton: "Redo last edit.",
        editButton: "Edit the generated prompt manually.",
        templatesButton: "Load a template.",
        saveToHistoryButton: "Save prompt to local history.",
        saveAsPresetButton: "Save current settings as a preset. (Ctrl+Shift+S)",
        shareButton: "Share prompt configuration.",
        downloadButton: "Download prompt as text.",
        copyButton: "Copy prompt to clipboard.",
        generateVideoButton: "Open Video Studio.",
        conceptArtButton: "Generate a preview image.",
        storyboardButton: "Generate storyboard frames.",
        variationsButton: "Generate prompt variations.",
        refineButton: "Improve the current prompt.",
        restructureButton: "Reorganize and rephrase for better flow.",
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
        wizardButton: "Launch Wizard Mode",
        storyBoardButton: "Open Story Board for sequential shots",
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
    toastPromptRestructured: "Prompt rephrased and organized.",
    toastLocationAcquired: "Location acquired.",
    toastLocationError: "Could not get location.",
    toastSoraStyleSet: "Art style set to Photorealistic for Sora.",
    toastCameraSuggested: "Camera settings optimized for concept.",
    toastActionsSuggested: "Character actions generated.",
    
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

    errorResourceNotFound: "Resource not found.",
    solutionResourceNotFound: "The requested model or resource could not be found. Please check your settings or try a different model.",
    
    errorFieldTooLong: "{field} is too long (max {limit} chars).",
    errorRestrictedKeywordInField: "Restricted keyword in {field}.",
    errorClothingDetailsRequired: "Please describe the specific clothing items for the chosen style.",
    errorClothingDetailsTooShort: "Please provide more detail for the clothing description (min 5 chars).",
    errorInvalidUrl: "Invalid YouTube URL format.",
    errorCustomStyleRequired: "Custom style description is required.",
    errorCustomStyleTooShort: "Style description is too short (min 3 chars).",
    errorVoiceOverRequired: "Voice over script is required when a voice style is selected.",
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
        visualizerTitle: "Mood Board",
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
            { term: "Bokeh", pronunciation: "boh-kay", description: "Blur produced in out-of-focus parts of an image." },
            { term: "Chiaroscuro", pronunciation: "kee-ahr-uh-skyoor-oh", description: "Strong contrasts between light and dark." },
            { term: "Cyberpunk", pronunciation: "sigh-ber-punk", description: "High-tech, low-life sci-fi genre." },
            { term: "Noir", pronunciation: "nwahr", description: "Cinematic style with cynical attitudes and sexual motivations." },
            { term: "Saturated", pronunciation: "sach-uh-rey-tid", description: "Intensity of color in an image." }
        ]
    }
};

export const parameterValues: any = {
    en: {
        optimization: "Optimized for 8-second generation.",
        optimization_sora: "Optimized for 15-second simulation.",
        overlay: "Include overlay text."
    },
    sv: {
        optimization: "Optimera för kort 8s generering.",
        optimization_sora: "Optimera för utökad 15s simulering.",
        overlay: "Inkludera överlagringstext."
    },
    es: {
        optimization: "Optimizar para generación corta de 8s.",
        optimization_sora: "Optimizar para simulación extendida de 15s.",
        overlay: "Incluir texto superpuesto."
    },
    fr: {
        optimization: "Optimiser pour une génération courte de 8s.",
        optimization_sora: "Optimiser pour une simulation étendue de 15s.",
        overlay: "Inclure du texte superposé."
    },
    de: {
        optimization: "Optimieren für kurze 8s-Generierung.",
        optimization_sora: "Optimieren für erweiterte 15s-Simulation.",
        overlay: "Overlay-Text einschließen."
    }
};

export const seriesInstructions: any = {
    en: "Generate a series of 3 sequential prompts that tell a cohesive story based on the concept above. Label them Part 1, Part 2, and Part 3.",
    sv: "Generera en serie med 3 sekventiella prompter som berättar en sammanhängande historia baserat på konceptet ovan. Märk dem Del 1, Del 2 och Del 3.",
    es: "Genera una serie de 3 indicaciones secuenciales que cuenten una historia cohesiva basada en el concepto anterior. Etiquétalas Parte 1, Parte 2 y Parte 3.",
    fr: "Générez une série de 3 invites séquentielles qui racontent une histoire cohérente basée sur le concept ci-dessus. Étiquetez-les Partie 1, Partie 2 et Partie 3.",
    de: "Generieren Sie eine Reihe von 3 aufeinanderfolgenden Eingabeaufforderungen, die eine zusammenhängende Geschichte basierend auf dem obigen Konzept erzählen. Kennzeichnen Sie sie mit Teil 1, Teil 2 und Teil 3."
};

export const soraPromptTemplate: any = {
    en: `Write a highly detailed, physics-aware video generation prompt for Sora based on the inputs below.
    
**Core Simulation Parameters:**
"{idea}"

**World State & Physics Engine Config:**
{parameterList}

**Simulation Directive:**
Describe the scene as a continuous, causal simulation. Focus on object permanence, fluid dynamics, light transport, and the specific material properties of every surface. Ensure temporal consistency over a longer duration.`,
    sv: `Skriv en mycket detaljerad, fysikmedveten videogenereringsprompt för Sora baserat på indata nedan.
    
**Kärnsimuleringsparametrar:**
"{idea}"

**Världstillstånd & Fysikmotorkonfiguration:**
{parameterList}

**Simuleringsdirektiv:**
Beskriv scenen som en kontinuerlig, kausal simulering. Fokusera på objektpermanens, vätskedynamik, ljustransport och de specifika materialegenskaperna för varje yta. Säkerställ tidskonsistens över en längre varaktighet.`,
    es: `Escribe una indicación de generación de video altamente detallada y consciente de la física para Sora basada en las entradas a continuación.
    
**Parámetros de Simulación Central:**
"{idea}"

**Estado del Mundo & Configuración del Motor de Física:**
{parameterList}

**Directiva de Simulación:**
Describe la escena como una simulación continua y causal. Céntrate en la permanencia del objeto, la dinámica de fluidos, el transporte de luz y las propiedades materiales específicas de cada superficie. Asegura la consistencia temporal durante una duración más larga.`,
    fr: `Rédigez une invite de génération vidéo hautement détaillée et tenant compte de la physique pour Sora en fonction des entrées ci-dessous.
    
**Paramètres de Simulation Principaux:**
"{idea}"

**État du Monde & Configuration du Moteur Physique:**
{parameterList}

**Directive de Simulation:**
Décrivez la scène comme une simulation continue et causale. Concentrez-vous sur la permanence des objets, la dynamique des fluides, le transport de la lumière et les propriétés matérielles spécifiques de chaque surface. Assurez la cohérence temporelle sur une durée plus longue.`,
    de: `Schreiben Sie eine hochdetaillierte, physikbewusste Videogenerierungsaufforderung für Sora basierend auf den unten stehenden Eingaben.
    
**Kernsimulationsparameter:**
"{idea}"

**Weltzustand & Physik-Engine-Konfiguration:**
{parameterList}

**Simulationsrichtlinie:**
Beschreiben Sie die Szene als eine kontinuierliche, kausale Simulation. Konzentrieren Sie sich auf Objektpermanenz, Fluiddynamik, Lichttransport und die spezifischen Materialeigenschaften jeder Oberfläche. Stellen Sie zeitliche Konsistenz über eine längere Dauer sicher.`
};

export const videoGenerationStages: any = {
    en: { init: "Initializing", render: "Rendering", finalize: "Finalizing" },
    sv: { init: "Initierar", render: "Renderar", finalize: "Slutför" },
    es: { init: "Iniciando", render: "Renderizando", finalize: "Finalizando" },
    fr: { init: "Initialisation", render: "Rendu", finalize: "Finalisation" },
    de: { init: "Initialisierung", render: "Rendering", finalize: "Abschluss" }
};

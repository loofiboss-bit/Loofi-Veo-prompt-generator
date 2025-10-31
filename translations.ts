import { PronunciationGuideData } from './types';
// This file contains all the UI strings and prompt templates for different languages.
type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';


// --- UI STRINGS ---
const appUIStringsData: any = {
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
        toastAudioSuggested: "AI suggested audio design!",
        toastEnvironmentSuggested: "AI enhanced the environment details!",
        toastSensoryDetailsSuggested: "AI suggested sensory details!",
        toastCharacterNuancesSuggested: "AI suggested character nuances!",
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
            autoWriteButton: "Auto-write Song",
            autoWritingButton: "Auto-writing...",
            outputTitle: "Song Title",
            outputStyle: "Style of Music",
            outputLyrics: "Lyrics",
            copyButton: "Copy",
            suggestTitlesButton: "Suggest titles with AI",
            suggestStylesButton: "Suggest styles with AI",
            saveSongButton: "Save Song",
            historyTitle: "Saved Songs",
            historyEmpty: "You have no saved songs.",
            useButton: "Use",
            deleteButton: "Delete",
            clearHistoryButton: "Clear All History",
            deleteConfirm: "Are you sure you want to delete this song?",
            clearConfirm: "Are you sure you want to clear all saved songs?",
        },
        pronunciationGuide: {
            title: "Pronunciation Guide",
        },
        suggestAudioSystemPrompt: `You are an expert film sound designer and audio director with a keen sense for narrative subtext. Your task is to analyze the provided scene details (the core idea, art style, camera movement, environment, character actions, and mood) and suggest the most fitting audio design. Your response must be a valid JSON object.

1.  **Voice Style Selection:** From the provided list of voice styles, select the one that best enhances the scene's atmosphere and thematic depth. For example, a 'Documentary Narrator' might be good for a realistic scene, while a 'Character Monologue' could provide deep emotional insight. Your choice should be implicitly justified by the script you write.

2.  **Script Generation:** Write a short, powerful, and evocative 1-2 sentence voice-over script. **Crucially, do not simply describe the action on screen.** Instead, your script should provide subtext, hint at a deeper story, or amplify the underlying emotion of the scene. For example, if the scene is 'a detective looking at rain on a window', a weak script is 'The detective watched the rain fall.' A strong, evocative script would be 'Every drop that slid down the glass felt like another unanswered question.'

3.  **When to be Silent:** If no voice-over is appropriate for the scene (e.g., a quiet, atmospheric moment), you MUST select 'None' for the voice style and provide an empty string for the script. Silence is a powerful tool; use it wisely.`,
        suggestEnvironmentSystemPrompt: `You are a world-class novelist and environmental designer. Your task is to take a core idea and a basic environment description and expand it into a rich, cinematic scene. Enhance the original environment description, and then generate vivid sensory details (what can be seen, heard, smelled) and dynamic background events (subtle movements or occurrences that make the world feel alive). Respond ONLY with a valid JSON object.`,
        suggestSensoryDetailsSystemPrompt: `You are a world-class novelist and poet, a master of creating immersive, atmospheric scenes. Your task is to analyze a given environment and generate a rich, evocative list of sensory details that bring the scene to life. Go beyond the obvious. Think about all five senses: sight, sound, smell, taste, and touch. Use strong verbs and specific, concrete nouns. For example, for 'a rainy city street,' instead of just 'rain,' you might suggest "the percussive rhythm of heavy raindrops on a metal awning, the hiss of tires on wet asphalt, the sharp, clean scent of ozone after a lightning strike, the bitter taste of coffee from a street vendor's cart, the slick, cold feel of a wrought-iron railing." Your response should be a string of these literary, comma-separated phrases. Respond ONLY with a valid JSON object containing a single key 'sensoryDetails'. Respond in the language with this ISO 639-1 code: {language}.`,
        suggestCharacterNuancesSystemPrompt: `You are an expert screenwriter and character animator. The user will provide a character's main action and their general mood. Your task is to generate a short, evocative description of the subtle physical nuances and micro-expressions that reveal their inner emotional state. Focus on 'showing' not 'telling'. For example, instead of 'they were nervous', suggest 'a subtle tremor in their hand as they reach for the glass'. Respond ONLY with a valid JSON object containing a single key 'nuances' which is a string. Respond in the language with this ISO 639-1 code: {language}.`,
        suggestSunoTitlesSystemPrompt: `You are a creative director and songwriter. Based on the user's song idea, generate 4 catchy, evocative, and distinct song titles. Respond ONLY with a valid JSON object containing a single key "titles" which is an array of 4 strings. Respond in the language with this ISO 639-1 code: {language}.`,
        suggestSunoStylesSystemPrompt: `You are an expert musicologist and creative director for the Suno AI music generator. Your task is to take a user's song idea and generate 4 distinct, descriptive "Style of Music" prompts for Suno. Each prompt MUST be a rich phrase or sentence that paints a picture of the song's sound, combining genre, mood, instrumentation, and production quality. For example: "An epic cinematic rock anthem with powerful female vocals, soaring electric guitars, and a massive drum sound." Use the provided list for genre inspiration: {MUSIC_GENRES}. Each style prompt must be under 180 characters. Respond ONLY with a valid JSON object containing a single key "styles" which is an array of 4 strings. Respond in the language with this ISO 639-1 code: {language}.`,
        autoFillSystemPrompt: {
            base: `You are an expert creative director's assistant with a deep understanding of cinematic language and visual storytelling. Your task is to analyze the user's core video idea and suggest a coherent, contextually-aware set of creative modifiers. You will operate in one of two modes: 'Veo' or 'Sora', which will be specified.

**Your process:**
1.  **Deep Analysis:** Carefully read the user's idea to identify key themes, subjects, setting, mood, and genre indicators.
2.  **Contextual Inference:** Based on your analysis and the specified target model mode, choose the *most fitting and evocative* options from the enums provided in the schema.
3.  **Character Deep Dive:** If a character is implied, bring them to life with specific, creative details that tell a story. Provide highly specific suggestions for \`characterSpecificClothing\` and \`characterAccessories\` based on their archetype and environment.
4.  **Intelligent Audio Direction:** Suggest immersive ambient sound and an appropriate voice style. If a voice style other than 'None' is chosen, you MUST write a short, creative script that emotionally resonates with all other suggested modifiers.

Respond ONLY with a valid JSON object that adheres to the provided schema. If no character is clearly implied, return 'Any' for all character-related fields and empty strings for clothing/accessory descriptions.`,
            veo: `**VEO MODE:** Your goal is to create suggestions that are cinematic, artistic, and visually striking.
- **Sophisticated Interplay:** Your suggestions must be integrated. The environment should affect the character; the art style should inform the cinematography; the mood should influence the lighting.
- **Cinematic Deep Dive:**
    - **Lighting:** Based on the mood, time of day, and style, suggest a specific 'Lighting Style' (e.g., 'Low-key' for Noir, 'Soft, diffused light' for a Ghibli-style scene).
    - **Composition:** Suggest a 'Compositional Guide' that would enhance the shot (e.g., 'Leading Lines' for a journey, 'Centered Subject' for a powerful portrait).
- **Lively World:**
    - **Dynamic Events:** For the 'environmentDynamicEvents' field, suggest 1-2 subtle background actions that make the world feel alive. Examples: 'a plastic bag drifts by in the wind', 'distant city lights twinkle out of focus'.
    - **Object Interaction:** For the 'characterObjectInteraction' field, suggest a small, telling physical interaction that reveals personality. Example: for an anxious character, 'nervously twisting a ring on their finger'.
- The 'environment' description should be brief and cinematic.`,
            sora: `**SORA 2 EMULATION MODE: PRIME DIRECTIVE - HYPER-REALISM.**
The user is targeting a Sora-like model, which is a world simulator. Your primary goal is to generate suggestions that create a physically plausible, hyper-realistic, and continuous scene. Every suggestion, from the art style to the smallest environmental detail, must serve this directive.

- **Art Style Mandate:**
    - **Your default and heavily preferred choice for 'artStyle' MUST BE 'Photorealistic'.** Only deviate if the user's core idea explicitly and unmistakably demands an animated style (e.g., "an anime character," "a claymation world").
    - For fantasy or sci-fi subjects that need to appear real (e.g., "a dragon flying over New York"), **'Photorealistic' is still the correct choice** to ground the fantastical element in a real-world simulation.

- **World Simulation & Consistency:**
    - **Lived-in Environments:** The world should feel persistent and real. Suggest details that imply history, like 'faded posters peeling from a brick wall' or 'a well-worn wooden handle on a heavy door'.
    - **Cause and Effect:** Explicitly describe the physical consequences of actions. For example, if it's raining, suggest 'a character's hair is matted and dripping, their coat darkened with moisture'. A fast-moving car should 'kick up a spray of water from puddles on the asphalt'.
    - **Subtle Dynamics:** Include secondary motion that enhances realism. Suggest details like 'a character's breath fogging in the cold air', 'curtains gently swaying from an open window', or 'individual leaves rustling on a tree in the breeze'.
    - **Object Permanence & Interaction:** The world's objects should feel solid and interact realistically. If a character places a cup on a table, it should rest there with convincing weight. If they brush past a plant, its leaves should sway and then settle.

- **Hyper-Realistic Detail:**
    - **Textures & Materials:** Go beyond simple adjectives. Instead of 'old wall', suggest 'a crumbling brick wall with patches of moss growing in the damp crevices'. Describe how light interacts with these surfaces.
    - **Atmospheric Physics:** Suggest details like 'mist clinging to the ground in the early morning air' or 'heat haze shimmering above the asphalt on a summer day'.

- **Nuanced Character & Action:**
    - **Grounded Physicality:** Actions must be grounded in physical reality. Describe the effort or consequence of movement. 'A lone hiker trudges through deep snow, each step a visible effort, leaving a trail of deep footprints behind'.
    - **Object Interaction:** Instead of 'a person holds a cup', suggest 'a character's fingers gently wrap around a warm ceramic mug, steam rising to curl around their face'.
    - **Expressive Detail:** Instead of 'a person is surprised', suggest 'a character's eyes widen slightly, their hand instinctively rising to cover their mouth'.

- **Realistic Cinematography:**
    - **Plausible Camera Work:** Camera movements must feel physically plausible, as if operated by a real person or drone. Prioritize dynamic, professional movements like a 'smooth tracking shot', a 'slow, deliberate drone shot flying over a landscape', or a 'handheld shot with subtle, natural sway'. Describe the shot as if you are a director giving instructions on set.`
        },
        suggestCreativeDetailsSystemPrompt: {
            base: `You are a world-class creative director and prompt engineer. Your task is to analyze a user's simple core idea and expand it into a more compelling and cinematic prompt. You will suggest a rich environment, detailed character actions, and fitting visual styles. Your suggestions should be creative, specific, and help the user visualize a much more dynamic scene. For the environment, think about sensory details - what can be seen, heard, or felt? For the actions, think about the motivation and the emotion behind them.`,
            sora: `SORA MODE: Your suggestions must emphasize hyper-realism and physical plausibility. Describe how light interacts with materials, how actions have physical consequences, and add subtle details that make the world feel like a real simulation.`
        },
        refineSystemPrompt: `You are an expert prompt engineer and film director, specializing in refining prompts for generative video models like Google Veo and Sora. Your task is to take a user's existing prompt and a set of key creative parameters, then rewrite the prompt to be more cinematic, detailed, and evocative.

**Your Process:**
1.  **Analyze the Core:** Identify the fundamental subject, action, and setting from the user's current prompt. **Do not change this core concept.**
2.  **Incorporate Parameters:** Weave the provided creative parameters (art style, camera movement, etc.) seamlessly into the narrative.
3.  **Enhance and Elevate:**
    *   **"Plus" the Language:** Replace generic words with more specific and powerful verbs and adjectives.
    *   **Add Sensory Details:** Introduce details related to sight, sound, and texture to make the scene more immersive.
    *   **Improve Narrative Flow:** Structure the sentence(s) to have a better rhythm and a more compelling narrative arc, even if it's just a single shot.
    *   **Ensure Cohesion:** The final refined prompt must feel like a single, unified creative vision.
4.  **Target Model Awareness:** Pay attention to the 'Target Model' parameter. If it's 'sora', lean into hyper-realistic details and physics. If it's 'veo', focus on cinematic composition and artistic flair.

**Output Format:**
Respond ONLY with a valid JSON object containing a single key: "refinedPrompt". The value should be the final, single-paragraph prompt.`,
        variationsSystemPrompt: `You are an expert creative director specializing in narrative and visual storytelling. The user will provide a master prompt for a video. Your task is to generate exactly 3 distinct and creative variations of this prompt.

Each variation must maintain the core subject and action of the original but must explore a completely different stylistic interpretation, narrative angle, or genre.

For example, if the original prompt is about a "knight fighting a dragon", your variations could be:
1.  **Genre Shift (Noir):** A gritty, rain-soaked, black-and-white scene focusing on the detective-like knight hunting the beast in a corrupt, shadowy kingdom.
2.  **Style Shift (Anime):** A vibrant, high-energy interpretation with dynamic camera angles, speed lines, and exaggerated, emotional character expressions.
3.  **Perspective Shift (Dragon's POV):** A quiet, contemplative version from the ancient dragon's perspective, portraying the knight as a fleeting, misguided intruder in its timeless domain.

Be bold in your reinterpretations. The goal is to provide genuinely different creative pathways from the same starting point. Respond in the language with this ISO 639-1 code: {language}.`,
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
            artStyle: "Choose the overall visual aesthetic. 'Cinematic' is great for a realistic, film-like quality. Experiment with artistic styles like 'Anime' or 'Watercolor' for different moods.",
            architecturalStyle: "Specify the architectural style for any buildings in the scene. This gives the AI a strong visual language to work with.",
            cameraMovement: "The way the camera moves during the shot. This can dramatically alter the scene's energy and focus.",
            cameraDistance: "How far the camera is from the subject. This controls how much of the scene is visible.",
            lensType: "The type of camera lens used. This affects the field of view and depth perception.",
            compositionalGuide: "Hint at classic film composition rules to create a more visually interesting shot. The AI will interpret this as a stylistic suggestion.",
            visualEffect: "Special effects to add a stylistic flair to the video.",
            colorPalette: "The overall color scheme of the video. This is crucial for setting the mood.",
            aspectRatio: "The width-to-height ratio of the video. 16:9 is standard for widescreen, while 9:16 is for vertical/mobile video.",
            resolution: "The quality of the generated video. 1080p is higher quality, while 720p may generate faster.",
            animationPreset: "Pre-defined animation effects for transitions or motion graphics.",
            voiceStyle: "The style of the narrator or voice-over. Choose 'None' for purely instrumental or ambient audio.",
            voiceOver: "Write the exact script for the voice-over. This will only be used if you've selected a voice style other than 'None'.",
            timeOfDay: "The time of day affects the natural lighting and mood of the scene.",
            weather: "Weather conditions add atmosphere and can influence the narrative.",
            motionIntensity: "Controls the amount of movement and action in the video. Higher intensity can lead to more dynamic scenes.",
            creativityLevel: "Determines how much the AI should deviate from the prompt. 'Grounded' is more literal, while 'Imaginative' allows for more creative freedom.",
            negativePrompt: "Specify what you DON'T want to see in the video to help the AI avoid unwanted elements.",
            optimizeFor8Seconds: "Tailors the prompt for a short, impactful clip, perfect for social media.",
            includeOverlayText: "Indicates that the video should be suitable for adding text or graphics on top.",
            useGoogleSearch: "Allows the model to use Google Search for up-to-date or factual information, improving accuracy for prompts about recent events or specific entities.",
            model: "Choose the Gemini model for prompt generation. 'Pro' is better for complex reasoning, while 'Flash' is faster.",
            veoModel: "Choose the Veo model for video generation. 'Fast' is recommended for quicker results, while 'Quality' may produce higher fidelity.",
            targetModel: "Adjusts the prompt architect's style to better emulate the strengths of the target model, such as Veo's cinematic quality or Sora's physics simulation.",
            idea: "This is the heart of your prompt. Describe the main subject, action, and setting here.",
            environment: "Elaborate on the location. What does it look, feel, or sound like?",
            suggestEnvironmentButton: "Use AI to enhance the environment description, adding cinematic details, sensory information, and dynamic background events.",
            sensoryDetails: "Add details that appeal to the senses (smell, sound, touch) to make the scene more immersive.",
            environmentDynamicEvents: "Describe background movements or events to make the environment feel alive and dynamic, e.g., 'leaves rustling', 'a neon sign flickering'.",
            characterActions: "Describe what the character is doing. Be specific and use action verbs.",
            characterObjectInteraction: "Describe how a character interacts with small objects. This is a powerful way to show their personality or emotional state without telling.",
            characterNuances: "Describe the small, subtle physical actions or micro-expressions that reveal a character's true feelings.",
            suggestCharacterNuancesButton: "Suggest subtle emotional cues and physical nuances based on the character's actions and mood.",
            characterGender: "Specify the character's gender identity.",
            characterEthnicity: "Specify the character's ethnicity to ensure accurate and respectful representation.",
            characterClothing: "Choose a general style of clothing for the character.",
            characterArchetype: "Select a classic storytelling archetype to give the AI a better sense of the character's role and personality.",
            characterAge: "Define the age range of the character.",
            characterMood: "What is the character's dominant emotion in the scene?",
            characterPose: "Describe the character's body language or physical stance.",
            characterSkinTone: "Specify the character's skin tone.",
            characterSpecificClothing: "Describe specific items of clothing to add detail and personality.",
            characterAccessories: "Add accessories to further define the character's style and story.",
            soundEffectsIntensity: "How prominent should the sound effects be? 'Subtle' adds realism, while 'Prominent' can be used for dramatic effect.",
            generateAsSeries: "Tells the AI to structure the output as a three-part narrative series, perfect for creating short, connected stories.",
            thinkingMode: "Allows the Gemini Pro model more 'thinking' time to generate a higher quality, more creative prompt. May take slightly longer.",
            imageUpload: "Upload a starting image for your video. The video will animate from this image.",
            copyButton: "Copy the generated prompt to your clipboard.",
            editButton: "Manually edit the generated prompt text.",
            saveButton: "Save your manual edits.",
            cancelButton: "Discard your manual edits.",
            undoButton: "Undo the last text change.",
            redoButton: "Redo the last undone text change.",
            saveToHistoryButton: "Save the current prompt and all its settings to your history for later use.",
            saveAsPresetButton: "Save the current combination of all settings as a reusable preset.",
            conceptArtButton: "Generate a single, high-quality concept image based on your prompt to visualize the style.",
            generateVideoButton: "Generate the final video based on the current prompt. This may take a few minutes.",
            storyboardButton: "Generate a 4-panel storyboard to visualize the key moments of your scene.",
            variationsButton: "Generate three creative variations of your current prompt to explore different ideas.",
            refineButton: "Refine the current prompt with AI to add more cinematic detail and improve flow.",
            shareButton: "Copy a unique link to your clipboard that saves all your current settings.",
            templatesButton: "Start with a pre-made template to quickly set up a specific style of video.",
            historyButton: "View, load, or delete your previously saved prompts.",
            imageStudioButton: "Open the Image Studio to generate or edit standalone images.",
            sunoStudioButton: "Open the Suno Song Studio to generate music and lyrics.",
            videoAnalysisButton: "Open the Video Analysis Studio to extract ideas from existing videos.",
            themeToggle: "Toggle between light and dark mode.",
            downloadButton: "Download the prompt text as a .txt file.",
            suggestAudio: "Use AI to suggest a voice-over style and generate a script based on your prompt's context.",
        },
        fieldLabels: {
            idea: "Core Idea",
            environment: "Environment",
            environmentSensoryDetails: "Sensory Details",
            environmentDynamicEvents: "Dynamic Environmental Events",
            architecturalStyle: "Architectural Style",
            characterActions: "Character Actions",
            characterNuances: "Subtle Emotional Cues & Physical Nuances",
            characterObjectInteraction: "Object Interaction",
            characterGender: "Gender",
            characterEthnicity: "Ethnicity",
            characterClothing: "Clothing Style",
            characterArchetype: "Archetype",
            characterAge: "Age",
            characterMood: "Mood",
            characterPose: "Pose",
            characterSkinTone: "Skin Tone",
            characterSpecificClothing: "Specific Clothing Items",
            characterAccessories: "Accessories",
            timeOfDay: "Time of Day",
            weather: "Weather",
            voiceOver: "Voice-over Script",
            voiceStyle: "Voice-over Style",
            ambientSound: "Ambient Sound",
            soundEffectsIntensity: "Sound Effects Intensity",
            negativePrompt: "Negative Prompt",
            artStyle: "Art Style",
            customArtStyle: "Custom Art Style",
            lightingStyle: "Lighting Style",
            cameraMovement: "Camera Movement",
            cameraDistance: "Camera Distance",
            lensType: "Lens Type",
            compositionalGuide: "Compositional Guide",
            visualEffect: "Visual Effect",
            colorPalette: "Color Palette",
            aspectRatio: "Aspect Ratio",
            resolution: "Resolution",
            animationPreset: "Animation Preset",
            motionIntensity: "Motion Intensity",
            creativityLevel: "Creativity Level",
        },
    }
};

// --- This section is auto-generated or needs to be filled in ---
// For this example, we will add dummy data for other languages.
// A real app would have full translations.
const otherLanguages = ['sv', 'es', 'fr', 'de'];
otherLanguages.forEach(lang => {
    appUIStringsData[lang] = JSON.parse(JSON.stringify(appUIStringsData.en)); // Deep copy from English
    // Here you would replace the English strings with the target language
    // For example: appUIStringsData.sv.headerTitle = "AI Video Prompt Studio";
});

// Update the specific placeholder with the more evocative text for all languages
appUIStringsData.sv.placeholderCharacterObjectInteraction = "t.ex., nervöst pillar med ett litet, slitet mynt; ritar ett frostmönster på en kall fönsterruta.";
appUIStringsData.es.placeholderCharacterObjectInteraction = "p. ej., jugueteando nerviosamente con una moneda pequeña y gastada; trazando un patrón de escarcha en el cristal frío de una ventana.";
appUIStringsData.fr.placeholderCharacterObjectInteraction = "par ex., tripoter nerveusement une petite pièce usée ; tracer un motif de givre sur une vitre froide.";
appUIStringsData.de.placeholderCharacterObjectInteraction = "z.B., nervös mit einer kleinen, abgenutzten Münze spielen; ein Frostmuster auf eine kalte Fensterscheibe zeichnen.";
// Add translations for the enhanced base prompt
appUIStringsData.sv.suggestCreativeDetailsSystemPrompt.base = `Du är en kreativ chef och prompt-ingenjör i världsklass. Din uppgift är att analysera en användares enkla grundidé och utöka den till en mer övertygande och filmisk prompt. Du kommer att föreslå en rik miljö, detaljerade karaktärshandlingar och passande visuella stilar. Dina förslag ska vara kreativa, specifika och hjälpa användaren att visualisera en mycket mer dynamisk scen. För miljön, tänk på sensoriska detaljer - vad kan man se, höra eller känna? För handlingar, tänk på motivationen och känslan bakom dem.`;
appUIStringsData.es.suggestCreativeDetailsSystemPrompt.base = `Eres un director creativo e ingeniero de prompts de talla mundial. Tu tarea es analizar la idea central simple de un usuario y expandirla en un prompt más convincente y cinematográfico. Sugerirás un entorno rico, acciones de personajes detalladas y estilos visuales adecuados. Tus sugerencias deben ser creativas, específicas y ayudar al usuario a visualizar una escena mucho más dinámica. Para el entorno, piensa en detalles sensoriales: ¿qué se puede ver, oír o sentir? Para las acciones, piensa en la motivación y la emoción que hay detrás de ellas.`;
appUIStringsData.fr.suggestCreativeDetailsSystemPrompt.base = `Vous êtes un directeur de création et un ingénieur de prompt de classe mondiale. Votre tâche est d'analyser l'idée de base simple d'un utilisateur et de la développer en un prompt plus convaincant et cinématographique. Vous suggérerez un environnement riche, des actions de personnages détaillées et des styles visuels appropriés. Vos suggestions doivent être créatives, spécifiques et aider l'utilisateur à visualiser une scène beaucoup plus dynamique. Pour l'environnement, pensez aux détails sensoriels - que peut-on voir, entendre ou sentir ? Pour les actions, pensez à la motivation et à l'émotion qui les sous-tendent.`;
appUIStringsData.de.suggestCreativeDetailsSystemPrompt.base = `Sie sind ein erstklassiger Kreativdirektor und Prompt-Ingenieur. Ihre Aufgabe ist es, die einfache Kernidee eines Benutzers zu analysieren und sie zu einem überzeugenderen und filmischeren Prompt zu erweitern. Sie werden eine reiche Umgebung, detaillierte Charakterhandlungen und passende visuelle Stile vorschlagen. Ihre Vorschläge sollten kreativ, spezifisch sein und dem Benutzer helfen, eine viel dynamischere Szene zu visualisieren. Denken Sie bei der Umgebung an sensorische Details – was kann man sehen, hören oder fühlen? Denken Sie bei den Handlungen an die Motivation und die Emotion dahinter.`;
// Add translations for new script suggestion feature
appUIStringsData.sv.suggestAudioSystemPrompt = `Du är en expert ljuddesigner och ljudregissör med en skarp känsla för narrativ subtext. Din uppgift är att analysera de angivna scendetaljerna (grundidén, konststilen, kamerarörelsen, miljön, karaktärshandlingar och stämning) och föreslå den mest passande ljuddesignen. Ditt svar måste vara ett giltigt JSON-objekt.

1.  **Val av röststil:** Från den angivna listan med röststilar, välj den som bäst förstärker scenens atmosfär och tematiska djup. Till exempel kan en 'Dokumentärberättare' passa bra för en realistisk scen, medan en 'Karaktärsmonolog' kan ge djup känslomässig insikt. Ditt val ska implicit motiveras av manuset du skriver.

2.  **Manusgenerering:** Skriv ett kort, kraftfullt och suggestivt röstmanus på 1-2 meningar. **Viktigt, beskriv inte bara handlingen på skärmen.** Istället ska ditt manus ge subtext, antyda en djupare berättelse eller förstärka den underliggande känslan i scenen. Till exempel, om scenen är 'en detektiv som tittar på regn på ett fönster', är ett svagt manus 'Detektiven såg regnet falla.' Ett starkt, suggestivt manus skulle vara 'Varje droppe som gled nerför glaset kändes som ännu en obesvarad fråga.'

3.  **När man ska vara tyst:** Om ingen röst är lämplig för scenen (t.ex. ett tyst, atmosfäriskt ögonblick), MÅSTE du välja 'Ingen' för röststilen och ange en tom sträng för manuset. Tystnad är ett kraftfullt verktyg; använd det klokt.`;
appUIStringsData.sv.tooltips.suggestAudio = "Använd AI för att föreslå en röststil och generera ett manus baserat på din prompts kontext.";
appUIStringsData.sv.toastCharacterNuancesSuggested = "AI föreslog karaktärsnyanser!";
appUIStringsData.sv.tooltips.suggestCharacterNuancesButton = "Föreslå subtila känslomässiga ledtrådar och fysiska nyanser baserat på karaktärens handlingar och humör.";

appUIStringsData.es.suggestAudioSystemPrompt = `Eres un experto diseñador de sonido y director de audio de cine con un agudo sentido para el subtexto narrativo. Tu tarea es analizar los detalles de la escena proporcionados (la idea central, el estilo de arte, el movimiento de la cámara, el entorno, las acciones del personaje y el estado de ánimo) y sugerir el diseño de audio más adecuado. Tu respuesta debe ser un objeto JSON válido.

1.  **Selección de estilo de voz:** De la lista de estilos de voz proporcionada, selecciona el que mejor realce la atmósfera y la profundidad temática de la escena. Por ejemplo, un 'Narrador de Documental' podría ser bueno para una escena realista, mientras que un 'Monólogo de Personaje' podría proporcionar una profunda visión emocional. Tu elección debe estar implícitamente justificada por el guion que escribas.

2.  **Generación de guion:** Escribe un guion de voz en off corto, potente y evocador de 1 a 2 frases. **Crucialmente, no te limites a describir la acción en pantalla.** En cambio, tu guion debe proporcionar subtexto, insinuar una historia más profunda o amplificar la emoción subyacente de la escena. Por ejemplo, si la escena es 'un detective mirando la lluvia en una ventana', un guion débil es 'El detective observaba caer la lluvia.' Un guion fuerte y evocador sería 'Cada gota que se deslizaba por el cristal se sentía como otra pregunta sin respuesta.'

3.  **Cuándo guardar silencio:** Si ninguna voz en off es apropiada para la escena (por ejemplo, un momento tranquilo y atmosférico), DEBES seleccionar 'Ninguna' para el estilo de voz y proporcionar una cadena vacía para el guion. El silencio es una herramienta poderosa; úsala sabiamente.`;
appUIStringsData.es.tooltips.suggestAudio = "Usa IA para sugerir un estilo de voz en off y generar un guion basado en el contexto de tu prompt.";
appUIStringsData.es.toastCharacterNuancesSuggested = "¡La IA sugirió matices del personaje!";
appUIStringsData.es.tooltips.suggestCharacterNuancesButton = "Sugerir sutiles pistas emocionales y matices físicos basados en las acciones y el estado de ánimo del personaje.";

appUIStringsData.fr.suggestAudioSystemPrompt = `Vous êtes un concepteur sonore et un directeur audio de cinéma expert, doté d'un sens aigu du sous-texte narratif. Votre tâche est d'analyser les détails de la scène fournis (l'idée principale, le style artistique, le mouvement de la caméra, l'environnement, les actions du personnage et l'ambiance) et de suggérer la conception audio la plus appropriée. Votre réponse doit être un objet JSON valide.

1.  **Sélection du style de voix :** Dans la liste des styles de voix fournie, sélectionnez celui qui met le mieux en valeur l'atmosphère et la profondeur thématique de la scène. Par exemple, un 'Narrateur de Documentaire' pourrait convenir à une scène réaliste, tandis qu'un 'Monologue de Personnage' pourrait fournir un aperçu émotionnel profond. Votre choix doit être implicitement justifié par le script que vous écrivez.

2.  **Génération de script :** Rédigez un script de voix off court, puissant et évocateur de 1 à 2 phrases. **Surtout, ne vous contentez pas de décrire l'action à l'écran.** Votre script doit plutôt fournir un sous-texte, faire allusion à une histoire plus profonde ou amplifier l'émotion sous-jacente de la scène. Par exemple, si la scène est 'un détective regardant la pluie sur une fenêtre', un script faible serait 'Le détective regardait la pluie tomber.' Un script fort et évocateur serait 'Chaque goutte qui glissait sur la vitre ressemblait à une autre question sans réponse.'

3.  **Quand se taire :** Si aucune voix off n'est appropriée pour la scène (par exemple, un moment calme et atmosphérique), vous DEVEZ sélectionner 'Aucune' pour le style de voix et fournir une chaîne vide pour le script. Le silence est un outil puissant ; utilisez-le à bon escient.`;
appUIStringsData.fr.tooltips.suggestAudio = "Utilisez l'IA pour suggérer un style de voix off et générer un script en fonction du contexte de votre invite.";
appUIStringsData.fr.toastCharacterNuancesSuggested = "L'IA a suggéré des nuances de personnage !";
appUIStringsData.fr.tooltips.suggestCharacterNuancesButton = "Suggérer des indices émotionnels subtils et des nuances physiques en fonction des actions et de l'humeur du personnage.";

appUIStringsData.de.suggestAudioSystemPrompt = `Sie sind ein Experte für Film-Sounddesign und Audio-Regie mit einem ausgeprägten Gespür für narrativen Subtext. Ihre Aufgabe ist es, die bereitgestellten Szenendetails (die Kernidee, den Kunststil, die Kamerabewegung, die Umgebung, die Charakterhandlungen und die Stimmung) zu analysieren und das passendste Audiodesign vorzuschlagen. Ihre Antwort muss ein gültiges JSON-Objekt sein.

1.  **Auswahl des Sprecherstils:** Wählen Sie aus der bereitgestellten Liste von Sprecherstilen denjenigen aus, der die Atmosphäre und die thematische Tiefe der Szene am besten unterstreicht. Zum Beispiel könnte ein 'Dokumentar-Erzähler' für eine realistische Szene gut sein, während ein 'Charakter-Monolog' tiefe emotionale Einblicke gewähren könnte. Ihre Wahl sollte durch das von Ihnen geschriebene Skript implizit gerechtfertigt sein.

2.  **Skripterstellung:** Schreiben Sie ein kurzes, kraftvolles und evokatives Voice-over-Skript mit 1-2 Sätzen. **Entscheidend ist, dass Sie nicht einfach die Handlung auf dem Bildschirm beschreiben.** Stattdessen sollte Ihr Skript Subtext liefern, auf eine tiefere Geschichte hinweisen oder die zugrunde liegende Emotion der Szene verstärken. Wenn die Szene beispielsweise 'ein Detektiv, der den Regen an einem Fenster betrachtet' ist, wäre ein schwaches Skript 'Der Detektiv beobachtete den Regen.' Ein starkes, evokatives Skript wäre 'Jeder Tropfen, der am Glas herunterlief, fühlte sich wie eine weitere unbeantwortete Frage an.'

3.  **Wann man schweigen sollte:** Wenn kein Voice-over für die Szene geeignet ist (z. B. ein ruhiger, atmosphärischer Moment), MÜSSEN Sie 'Keine' für den Sprecherstil auswählen und eine leere Zeichenfolge für das Skript angeben. Stille ist ein mächtiges Werkzeug; setzen Sie es weise ein.`;
appUIStringsData.de.tooltips.suggestAudio = "Verwenden Sie KI, um einen Voice-Over-Stil vorzuschlagen und ein Skript basierend auf dem Kontext Ihres Prompts zu erstellen.";
appUIStringsData.de.toastCharacterNuancesSuggested = "KI hat Charakternuancen vorgeschlagen!";
appUIStringsData.de.tooltips.suggestCharacterNuancesButton = "Schlagen Sie subtile emotionale Hinweise und körperliche Nuancen basierend auf den Handlungen und der Stimmung des Charakters vor.";

appUIStringsData.sv.resetAllButton = "Återställ alla fält";
appUIStringsData.sv.tooltips.resetAllButton = "Återställ alla fält till sina standardvärden. Denna åtgärd kan inte ångras.";
appUIStringsData.sv.resetAllConfirm = "Är du säker på att du vill återställa alla fält till sina standardvärden? Denna åtgärd kan inte ångras.";
appUIStringsData.es.resetAllButton = "Restablecer todos los campos";
appUIStringsData.es.tooltips.resetAllButton = "Restablecer todos los campos a sus valores predeterminados. Esta acción no se puede deshacer.";
appUIStringsData.es.resetAllConfirm = "Estás seguro de que quieres restablecer todos los campos a sus valores predeterminados? Esta acción no se puede deshacer.";
appUIStringsData.fr.resetAllButton = "Réinitialiser tous les champs";
appUIStringsData.fr.tooltips.resetAllButton = "Réinitialiser tous les champs à leurs valeurs par défaut. Cette action est irréversible.";
appUIStringsData.fr.resetAllConfirm = "Êtes-vous sûr de vouloir réinitialiser tous les champs à leurs valeurs par défaut ? Cette action est irréversible.";
appUIStringsData.de.resetAllButton = "Alle Felder zurücksetzen";
appUIStringsData.de.tooltips.resetAllButton = "Setzt alle Felder auf ihre Standardwerte zurück. Diese Aktion kann nicht rückgängig gemacht werden.";
appUIStringsData.de.resetAllConfirm = "Sind Sie sicher, dass Sie alle Felder auf ihre Standardwerte zurücksetzen möchten? Diese Aktion kann nicht rückgängig gemacht werden.";

export const appUIStrings = appUIStringsData;

export const pronunciationGuides: { [lang in Language]: PronunciationGuideData } = {
    en: {
        terms: [
            { term: 'Veo', pronunciation: 'Vee-oh', description: 'Google\'s text-to-video generation model.' },
            { term: 'Sora', pronunciation: 'Soh-ra', description: 'OpenAI\'s text-to-video generation model.' },
            { term: 'Bokeh', pronunciation: 'boh-kay', description: 'The aesthetic quality of the blur produced in the out-of-focus parts of an image produced by a lens.' },
            { term: 'Giclée', pronunciation: 'zhee-clay', description: 'A high-quality fine-art printing process.' },
            { term: 'Film Grain', pronunciation: 'film greyn', description: 'The random optical texture of processed photographic film due to the presence of small particles of a metallic silver.' },
        ]
    },
    sv: {
        terms: [
            { term: 'Veo', pronunciation: 'Vee-oh', description: 'Googles text-till-videogenereringsmodell.' },
            { term: 'Bokeh', pronunciation: 'boh-keh', description: 'Den estetiska kvaliteten på oskärpan i de delar av en bild som är ur fokus.' },
        ]
    },
    es: {
        terms: [
            { term: 'Veo', pronunciation: 'Vee-oh', description: 'Modelo de generación de texto a video de Google.' },
            { term: 'Bokeh', pronunciation: 'boh-keh', description: 'La calidad estética del desenfoque en las partes de una imagen que están fuera de foco.' },
        ]
    },
    fr: {
        terms: [
            { term: 'Veo', pronunciation: 'Vee-oh', description: 'Modèle de génération de texte en vidéo de Google.' },
            { term: 'Bokeh', pronunciation: 'boh-ké', description: 'La qualité esthétique du flou dans les parties d\'une image qui ne sont pas nettes.' },
        ]
    },
    de: {
        terms: [
            { term: 'Veo', pronunciation: 'Vee-oh', description: 'Googles Text-zu-Video-Generierungsmodell.' },
            { term: 'Bokeh', pronunciation: 'boh-keh', description: 'Die ästhetische Qualität der Unschärfe in den unscharfen Teilen eines Bildes.' },
        ]
    },
};

export const promptTemplates = {
    en: `You are a world-class film director and an expert prompt engineer for Google Veo, a generative video model that excels at creating cinematic, high-fidelity, and emotionally resonant video clips. Your task is to transform a user's creative brief into a dense, single-paragraph prompt that instructs the AI with cinematic precision.

**Core Directive:**
Translate the user's parameters into a rich, descriptive, and cohesive paragraph. Your writing should be evocative, focusing on visual storytelling. Think like a director. You are giving instructions to a very talented but very literal cinematographer, visual effects artist, and sound designer all at once. Be specific.

**Creative Brief:**
"{idea}"

**Key Parameters:**
{parameterList}

**Your Output (Single Paragraph Prompt):**
`,
    sv: `Du är en filmregissör i världsklass och en expert på prompter för Google Veo, en generativ videomodell som utmärker sig i att skapa filmiska, högkvalitativa och känslomässigt engagerande videoklipp. Din uppgift är att omvandla en användares kreativa brief till en tät, enstyckes-prompt som instruerar AI:n med filmisk precision.

**Huvud direktiv:**
Översätt användarens parametrar till ett rikt, beskrivande och sammanhängande stycke. Ditt skrivande ska vara suggestivt och fokusera på visuellt berättande. Tänk som en regissör. Du ger instruktioner till en mycket talangfull men mycket bokstavlig filmfotograf, VFX-artist och ljuddesigner på en och samma gång. Var specifik.

**Kreativ Brief:**
"{idea}"

**Huvudparametrar:**
{parameterList}

**Ditt Svar (Enstyckes-Prompt):**
`,
    es: `Eres un director de cine de clase mundial y un ingeniero de prompts experto para Google Veo, un modelo de video generativo que se destaca en la creación de videoclips cinematográficos, de alta fidelidad y emocionalmente resonantes. Tu tarea es transformar el brief creativo de un usuario en un prompt denso de un solo párrafo que instruya a la IA con precisión cinematográfica.

**Directiva Principal:**
Traduce los parámetros del usuario en un párrafo rico, descriptivo y cohesivo. Tu escritura debe ser evocadora, centrándose en la narración visual. Piensa como un director. Estás dando instrucciones a un director de fotografía, artista de efectos visuales y diseñador de sonido muy talentosos pero muy literales, todo a la vez. Sé específico.

**Brief Creativo:**
"{idea}"

**Parámetros Clave:**
{parameterList}

**Tu Salida (Prompt de un solo párrafo):**
`,
    fr: `Vous êtes un réalisateur de classe mondiale et un ingénieur de prompt expert pour Google Veo, un modèle de vidéo générative qui excelle dans la création de clips vidéo cinématographiques, haute-fidélité et émotionnellement résonnants. Votre tâche est de transformer le brief créatif d'un utilisateur en un prompt dense d'un seul paragraphe qui instruit l'IA avec une précision cinématographique.

**Directive Principale :**
Traduisez les paramètres de l'utilisateur en un paragraphe riche, descriptif et cohérent. Votre écriture doit être évocatrice, en vous concentrant sur la narration visuelle. Pensez comme un réalisateur. Vous donnez des instructions à un directeur de la photographie, un artiste d'effets visuels et un concepteur sonore très talentueux mais très littéraux, tout en même temps. Soyez spécifique.

**Brief Créatif :**
"{idea}"

**Paramètres Clés :**
{parameterList}

**Votre Sortie (Prompt en un seul paragraphe) :**
`,
    de: `Sie sind ein Weltklasse-Filmregisseur und ein erfahrener Prompt-Ingenieur für Google Veo, ein generatives Videomodell, das sich durch die Erstellung von filmischen, hochauflösenden und emotional resonanten Videoclips auszeichnet. Ihre Aufgabe ist es, das kreative Briefing eines Benutzers in einen dichten, ein-Absatz-Prompt umzuwandeln, der die KI mit filmischer Präzision anweist.

**Hauptrichtlinie:**
Übersetzen Sie die Parameter des Benutzers in einen reichhaltigen, beschreibenden und zusammenhängenden Absatz. Ihr Schreiben sollte evokativ sein und sich auf das visuelle Geschichtenerzählen konzentrieren. Denken Sie wie ein Regisseur. Sie geben Anweisungen an einen sehr talentierten, aber sehr wörtlichen Kameramann, VFX-Künstler und Sounddesigner gleichzeitig. Seien Sie spezifisch.

**Kreatives Briefing:**
"{idea}"

**Schlüsselparameter:**
{parameterList}

**Ihre Ausgabe (Ein-Absatz-Prompt):**
`
};
export const parameterValues = {
    en: { optimization: "Optimized for 8 seconds", overlay: "Includes overlay text" },
    sv: { optimization: "Optimerad för 8 sekunder", overlay: "Inkluderar överlagrad text" },
    es: { optimization: "Optimizado para 8 segundos", overlay: "Incluye texto superpuesto" },
    fr: { optimization: "Optimisé pour 8 secondes", overlay: "Inclut du texte en superposition" },
    de: { optimization: "Optimiert für 8 Sekunden", overlay: "Enthält Überlagerungstext" }
};
export const seriesInstructions = {
    en: "SERIES INSTRUCTIONS: Generate the prompt as a 3-part series. Each part should be a separate, complete paragraph, clearly titled with a markdown h3 header (e.g., '### Episode 1: The Awakening'). The series must tell a coherent story with a clear beginning, middle, and end, building on the previous part.",
    sv: "SERIEINSTRUKTIONER: Generera prompten som en 3-delad serie. Varje del ska vara ett separat, komplett stycke, tydligt betitlat med en markdown h3-rubrik (t.ex. '### Avsnitt 1: Uppvaknandet'). Serien måste berätta en sammanhängande historia med en tydlig början, mitt och slut, som bygger på föregående del.",
    es: "INSTRUCCIONES DE SERIE: Genera el prompt como una serie de 3 partes. Cada parte debe ser un párrafo separado y completo, claramente titulado con un encabezado markdown h3 (p. ej., '### Episodio 1: El Despertar'). La serie debe contar una historia coherente con un principio, un desarrollo y un final claros, basándose en la parte anterior.",
    fr: "INSTRUCTIONS DE SÉRIE : Générez le prompt sous forme de série en 3 parties. Chaque partie doit être un paragraphe distinct et complet, clairement intitulé avec un en-tête markdown h3 (par ex., '### Épisode 1 : L'Éveil'). La série doit raconter une histoire cohérente avec un début, un milieu et une fin clairs, en s'appuyant sur la partie précédente.",
    de: "SERIENANWEISUNGEN: Erstellen Sie die Eingabeaufforderung als 3-teilige Serie. Jeder Teil sollte ein separater, vollständiger Absatz sein, der deutlich mit einer Markdown-H3-Überschrift überschrieben ist (z. B. '### Episode 1: Das Erwachen'). Die Serie muss eine zusammenhängende Geschichte mit einem klaren Anfang, einer Mitte und einem Ende erzählen, die auf dem vorherigen Teil aufbaut."
};
export const soraPromptTemplate = {
    en: `You are a world-class director of photography and a prompt engineer for Sora 2, a generative video model that excels at creating hyper-realistic, physically-grounded world simulations. Your task is to transform a user's creative brief into a dense, single-paragraph prompt that instructs the AI with cinematic precision and a deep understanding of physical reality.

**Creative Brief:**
"{idea}"

**Key Parameters:**
{parameterList}

**Your Output (Single Paragraph Prompt):**
`,
    sv: `Du är en världsklassig filmfotograf och en prompt-ingenjör för Sora 2, en generativ videomodell som utmärker sig på att skapa hyperrealistiska, fysiskt grundade världssimuleringar. Din uppgift är att omvandla en användares kreativa brief till en tät, enstyckes-prompt som instruerar AI:n med filmisk precision och en djup förståelse för fysisk verklighet.

**Kreativ Brief:**
"{idea}"

**Huvudparametrar:**
{parameterList}

**Ditt Svar (Enstyckes-Prompt):**
`,
    es: `Eres un director de fotografía de clase mundial y un ingeniero de prompts para Sora 2, un modelo de video generativo que se destaca en la creación de simulaciones de mundos hiperrealistas y físicamente fundamentadas. Tu tarea es transformar el brief creativo de un usuario en un prompt denso de un solo párrafo que instruya a la IA con precisión cinematográfica y una profunda comprensión de la realidad física.

**Brief Creativo:**
"{idea}"

**Parámetros Clave:**
{parameterList}

**Tu Salida (Prompt de un solo párrafo):**
`,
    fr: `Vous êtes un directeur de la photographie de classe mondiale et un ingénieur de prompt pour Sora 2, un modèle de vidéo générative qui excelle dans la création de simulations de mondes hyperréalistes et physiquement fondées. Votre tâche est de transformer le brief créatif d'un utilisateur en un prompt dense d'un seul paragraphe qui instruit l'IA avec une précision cinématographique et une compréhension profonde de la réalité physique.

**Brief Créatif :**
"{idea}"

**Paramètres Clés :**
{parameterList}

**Votre Sortie (Prompt en un seul paragraphe) :**
`,
    de: `Sie sind ein Weltklasse-Kameramann und ein Prompt-Ingenieur für Sora 2, ein generatives Videomodell, das sich durch die Erstellung hyperrealistischer, physikalisch fundierter Weltsimulationen auszeichnet. Ihre Aufgabe ist es, das kreative Briefing eines Benutzers in einen dichten, ein-Absatz-Prompt umzuwandeln, der die KI mit filmischer Präzision und einem tiefen Verständnis der physikalischen Realität anweist.

**Kreatives Briefing:**
"{idea}"

**Schlüsselparameter:**
{parameterList}

**Ihre Ausgabe (Ein-Absatz-Prompt):**
`
};

// Placeholder data to satisfy imports. In a real app, these would be populated.
// export const promptTemplates = {};
export const videoGenerationStages = {
    en: { init: 'Initialize', render: 'Render', finalize: 'Finalize' },
    sv: { init: 'Initiera', render: 'Rendera', finalize: 'Slutför' },
    es: { init: 'Inicializar', render: 'Renderizar', finalize: 'Finalizar' },
    fr: { init: 'Initialiser', render: 'Rendu', finalize: 'Finaliser' },
    de: { init: 'Initialisieren', render: 'Rendern', finalize: 'Abschließen' },
};
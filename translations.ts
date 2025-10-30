

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
        suggestDetailsButton: "Suggest Creative Details with AI",
        autofillSuccess: "Modifiers have been auto-filled based on your idea!",
        suggestDetailsSuccess: "AI has enhanced your prompt with creative details!",
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
        toastScriptSuggested: "AI suggested a script!",
        toastSensoryDetailsSuggested: "AI suggested sensory details!",
        toastCharacterNuancesSuggested: "AI suggested character nuances!",
        toastSoraStyleSet: "Art style set to 'Photorealistic' for optimal Sora 2 emulation.",
        toastPresetSaved: "Preset saved successfully!",
        toastPresetDeleted: "Preset deleted.",
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
        suggestScriptSystemPrompt: `You are an expert screenwriter. Your task is to analyze the provided scene details (the core idea, environment, character actions, and mood) and write a single, short, evocative voice-over script (1-2 sentences). The script should complement the visuals and the mood, not just describe them. Respond ONLY with a valid JSON object containing a single key 'suggestedScript'.`,
        suggestSensoryDetailsSystemPrompt: `You are a professional screenwriter and novelist with a talent for immersive descriptions. Your task is to analyze a given environment and generate a concise list of vivid sensory details. Focus on what one might see, hear, smell, and feel. For example, for "a rainy city street", you might suggest "the glisten of wet asphalt under streetlights, the distant wail of a siren, the smell of damp concrete and car exhaust, the feel of cool mist on the skin". Respond ONLY with a valid JSON object containing a single key 'sensoryDetails' which is a string of comma-separated phrases. Respond in the language with this ISO 639-1 code: {language}.`,
        suggestCharacterNuancesSystemPrompt: `You are an expert screenwriter and character animator. The user will provide a character's main action and their general mood. Your task is to generate a short, evocative description of the subtle physical nuances and micro-expressions that reveal their inner emotional state. Focus on 'showing' not 'telling'. For example, instead of 'they were nervous', suggest 'a subtle tremor in their hand as they reach for the glass'. Respond ONLY with a valid JSON object containing a single key 'nuances' which is a string. Respond in the language with this ISO 639-1 code: {language}.`,
        suggestCreativeDetailsSystemPrompt: {
            base: `You are a world-class creative director and prompt engineer. Your task is to analyze a user's simple core idea and expand it into a more compelling and cinematic prompt. You will suggest a rich environment, detailed character actions, and fitting visual styles. Your suggestions should be creative, specific, and help the user visualize a much more dynamic scene. For the environment, think about sensory details - what can be seen, heard, or felt? For actions, think about the motivation and emotion behind them.`,
            sora: `**SORA EMULATION MODE:** The target is a hyper-realistic world simulation model. Your suggestions MUST reflect this.
- **Environment & Physics:** Describe the environment with an obsessive level of physical detail, as if building a world simulation.
    - **Textures & Materials:** Be hyper-specific. Instead of 'brick wall,' describe 'a crumbling brick wall with patches of damp, dark green moss growing in the crevices, individual mortar lines showing wear.'
    - **Atmospheric Physics:** Describe how the atmosphere affects the scene. For example, 'a visible heat haze shimmering above the hot asphalt,' 'fine dust particles catching the afternoon sunbeams filtering through a window,' or 'the way sound is muffled by a heavy snowfall.'
    - **Light Interaction:** Detail how light physically interacts with different materials. 'Sunlight glinting off the polished chrome of a car bumper,' 'the soft, diffuse glow of light filtering through a dense forest canopy,' or 'the sharp, specular highlights on wet pavement.'
- **Character Actions:** Describe actions as a sequence of physical interactions with the world. Emphasize cause and effect (e.g., 'trudging through deep snow, each step a visible effort, leaving a trail of deep footprints'). Detail subtle nuances and object interactions.
- **Visual Style:** Aggressively prefer photorealistic styles. The lighting and composition should feel physically plausible, as if captured by a real camera.`
        },
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
            voiceOverScriptButton: "Suggest a voice-over script with AI based on the current scene details.",
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
            sensoryDetails: "Add details that appeal to the senses (smell, sound, touch) to make the scene more immersive.",
            environmentDynamicEvents: "Describe background movements or events to make the environment feel alive and dynamic, e.g., 'leaves rustling', 'a neon sign flickering'.",
            characterActions: "Describe what the character is doing. Be specific and use action verbs.",
            characterObjectInteraction: "Describe how a character interacts with small objects. This is a powerful way to show their personality or emotional state without telling.",
            characterNuances: "Describe the small, subtle physical actions or micro-expressions that reveal a character's true feelings.",
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
appUIStringsData.sv.toastScriptSuggested = "AI föreslog ett manus!";
appUIStringsData.sv.tooltips.voiceOverScriptButton = "Föreslå ett röstmanus med AI baserat på de aktuella scendetaljerna.";
appUIStringsData.sv.suggestScriptSystemPrompt = `Du är en expertmanusförfattare. Din uppgift är att analysera de angivna scendetaljerna (grundidén, miljön, karaktärshandlingar och stämning) och skriva ett enda, kort, suggestivt röstmanus (1-2 meningar). Manuset ska komplettera det visuella och stämningen, inte bara beskriva dem. Svara ENDAST med ett giltigt JSON-objekt som innehåller en enda nyckel 'suggestedScript'.`;
appUIStringsData.sv.tooltips.suggestAudio = "Använd AI för att föreslå en röststil och generera ett manus baserat på din prompts kontext.";

appUIStringsData.es.toastScriptSuggested = "¡La IA sugirió un guion!";
appUIStringsData.es.tooltips.voiceOverScriptButton = "Sugerir un guion de voz en off con IA basado en los detalles de la escena actual.";
appUIStringsData.es.suggestScriptSystemPrompt = `Eres un guionista experto. Tu tarea es analizar los detalles de la escena proporcionados (la idea central, el entorno, las acciones del personaje y el estado de ánimo) y escribir un guion de voz en off único, corto y evocador (1-2 frases). El guion debe complementar lo visual y el estado de ánimo, no solo describirlos. Responde ÚNICAMENTE con un objeto JSON válido que contenga una única clave 'suggestedScript'.`;
appUIStringsData.es.tooltips.suggestAudio = "Usa IA para sugerir un estilo de voz en off y generar un guion basado en el contexto de tu prompt.";

appUIStringsData.fr.toastScriptSuggested = "L'IA a suggéré un script !";
appUIStringsData.fr.tooltips.voiceOverScriptButton = "Suggérer un script de voix off avec l'IA en fonction des détails de la scène actuelle.";
appUIStringsData.fr.suggestScriptSystemPrompt = `Vous êtes un scénariste expert. Votre tâche est d'analyser les détails de la scène fournis (l'idée de base, l'environnement, les actions du personnage et l'ambiance) et d'écrire un script de voix off unique, court et évocateur (1-2 phrases). Le script doit compléter les visuels et l'ambiance, et non simplement les décrire. Répondez UNIQUEMENT avec un objet JSON valide contenant une seule clé 'suggestedScript'.`;
appUIStringsData.fr.tooltips.suggestAudio = "Utilisez l'IA pour suggérer un style de voix off et générer un script en fonction du contexte de votre invite.";

appUIStringsData.de.toastScriptSuggested = "KI hat ein Skript vorgeschlagen!";
appUIStringsData.de.tooltips.voiceOverScriptButton = "Schlagen Sie ein Voice-over-Skript mit KI basierend auf den aktuellen Szenendetails vor.";
appUIStringsData.de.suggestScriptSystemPrompt = `Sie sind ein erfahrener Drehbuchautor. Ihre Aufgabe ist es, die bereitgestellten Szenendetails (die Kernidee, die Umgebung, die Charakterhandlungen und die Stimmung) zu analysieren und ein einziges, kurzes, evokatives Voice-over-Skript (1-2 Sätze) zu schreiben. Das Skript sollte die Bilder und die Stimmung ergänzen, nicht nur beschreiben. Antworten Sie NUR mit einem gültigen JSON-Objekt, das einen einzigen Schlüssel 'suggestedScript' enthält.`;
appUIStringsData.de.tooltips.suggestAudio = "Verwenden Sie KI, um einen Voice-Over-Stil vorzuschlagen und ein Skript basierend auf dem Kontext Ihres Prompts zu erstellen.";


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
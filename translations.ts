// This file contains all the UI strings and prompt templates for different languages.
type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';
import { PronunciationGuideData } from './types';


// --- UI STRINGS ---
const appUIStringsData: any = {
    en: {
        headerTitle: "Veo Prompt Architect",
        headerSubtitle: "Craft the perfect prompt for Google's next-gen video model.",
        language: "Language",
        labelIdea: "Core Idea",
        placeholderIdea: "e.g., A majestic lion waking up at sunrise in the Serengeti, with cinematic lighting...",
        autofillButton: "Auto-fill Modifiers with AI",
        autofillSuccess: "Modifiers have been auto-filled based on your idea!",
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
        sectionModel: "Model Configuration",
        labelModel: "Generation Model",
        labelVeoModel: "Video Generation Model",
        labelTargetModel: "Emulate Target Model",
        generateButton: "Architect Prompt",
        copied: "Copied!",
        editButton: "Edit",
        saveButton: "Save",
        cancelButton: "Cancel",
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
        pronunciationGuideButton: "Pronunciation Guide",
        toastPromptGenerated: "Prompt successfully generated!",
        toastPromptSaved: "Prompt updated successfully.",
        toastHistorySaved: "Prompt saved to history.",
        toastHistoryLoaded: "Loaded state from history.",
        toastTemplateApplied: "Template applied.",
        toastArtGenerated: "Concept art generated (see console).",
        toastVideoGenerated: "Video generated successfully!",
        toastPromptDownloaded: "Prompt downloaded.",
        toastShareLink: "Shareable link copied to clipboard!",
        toastImageGenerated: "Image generated successfully!",
        errorValidation: "Please fix the errors before generating.",
        errorTooLong: "Input is too long.",
        errorRestricted: "Input contains restricted keywords.",
        errorInvalidUrl: "Please enter a valid YouTube URL.",
        errorInvalidAspectRatioForVeo: "Veo 3.1 video generation only supports 16:9 and 9:16 aspect ratios.",
        errorCustomStyleRequired: "Please describe your custom style.",
        errorVoiceOverRequired: "Please provide a script for the voice-over.",
        errorNoPromptToSave: "There is no prompt to save.",
        errorHistorySave: "Failed to save history.",
        errorApiKeyInvalid: "API Key is invalid. Please check your configuration.",
        errorRateLimit: "Rate limit exceeded. Please try again later.",
        errorSafety: "The request was blocked due to safety settings.",
        errorBadRequest: "Invalid request. Please check your prompt parameters.",
        errorServerError: "A server error occurred. Please try again.",
        errorNetwork: "A network error occurred. Please check your connection.",
        errorGeneric: "An unexpected error occurred. Please try again.",
        errorFileUpload: "Error reading the uploaded file.",
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
            promptLabel: "Describe what to generate or edit",
            promptPlaceholder: "e.g., A majestic lion, add a golden crown.",
            uploadLabel: "Upload an image to edit (optional)",
            uploadPlaceholder: "Drag & drop or click to upload",
            generateButton: "Generate Image",
            generatingButton: "Generating...",
            downloadButton: "Download Image",
            clearButton: "Clear Image",
            canvasPlaceholder: "Your generated image will appear here.",
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
        autoFillSystemPrompt: `You are an expert creative director's assistant with a deep understanding of cinematic language and visual storytelling. Your task is to analyze the user's core video idea and suggest a coherent, contextually-aware set of creative modifiers.

**Your process:**
1.  **Deep Analysis:** Carefully read the user's idea to identify key themes, subjects, setting, mood, and genre indicators. (e.g., if the user mentions 'futuristic city', recognize themes of sci-fi, technology, and potentially dystopia).
2.  **Contextual Inference:** Based on your analysis, choose the *most fitting and evocative* options from the enums provided in the schema for scene and style. Your choices should directly reflect the core idea.
3.  **Character Deep Dive:** If a character is implied, this is your most important task. Bring them to life with specific, creative details that tell a story.
    *   **Actions:** Describe a dynamic, observable action. Instead of 'thinking', suggest 'staring out a rain-streaked window'.
    *   **Appearance:** Logically infer or creatively suggest a gender, age, and skin tone that fits the context of the idea and genre.
    *   **Clothing & Accessories (Crucial):** For the \`characterSpecificClothing\` and \`characterAccessories\` fields, you MUST provide creative, highly specific suggestions. Do not be generic. Base your suggestions on the character's archetype, their environment, and the story's mood. For example, for a 'rebel pilot' in a 'dystopian desert', suggest: \`characterSpecificClothing: "a worn leather flight jacket with custom rebellion patches, oil-stained cargo pants, and scuffed combat boots"\` and \`characterAccessories: "a pair of scratched aviator sunglasses and a greasy toolkit hanging from their belt"\`.
4.  **Cohesion:** Ensure all your suggestions work together to create a unified and powerful creative vision. The art style should complement the color palette, and the character's details must fit the environment.

Respond ONLY with a valid JSON object that adheres to the provided schema. The 'environment' description should be brief and cinematic. If no character is clearly implied, return 'Any' for all character-related fields and empty strings for clothing/accessory descriptions. Suggest an immersive ambient sound. For 'voiceStyle', suggest a style only if it's highly appropriate; otherwise, return 'None'.`,
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
            characterSpecificClothing: "Describe specific articles of clothing beyond the general style. e.g., 'a vintage band t-shirt, worn leather jacket, and black skinny jeans'.",
            characterAccessories: "List any accessories the character has. e.g., 'a silver locket necklace, round wire-frame glasses, and a canvas messenger bag'.",
            colorPalette: "Controls the overall mood and tone. 'Warm tones' are great for nostalgic or happy scenes, 'Cool tones' for sci-fi or suspense.",
            creativityLevel: "Controls how closely the AI adheres to realism. 'Grounded' sticks to your prompt literally, while 'Imaginative' encourages more creative and surreal interpretations.",
            customArtStyle: "If you selected 'Custom Style', describe it here. Be specific, e.g., 'in the style of a 1920s German Expressionist film' or 'like a vaporwave music video'.",
            environment: "Describe the physical space, architecture, and overall mood of the scene. Be descriptive! You can also use dynamic placeholders like `{{weather}}` which will be automatically filled from other fields.",
            generateAsSeries: "Structures the output into a short narrative with a clear beginning, middle, and end. The final prompt will be formatted as three distinct episodes, perfect for storytelling.",
            idea: "This is the most important field. Describe the central theme, subject, and action of your video. Be as descriptive as you can. You can use the Auto-fill magic wand to get suggestions for the other fields based on this idea. You can also use dynamic placeholders like `{{character_archetype}}` which will be automatically filled from other fields.",
            includeOverlayText: "Instructs the AI to generate the video with animated text or graphic overlays. The content of the text should be specified in the 'Core Idea' or other relevant fields.",
            language: "Select the language for the AI to understand your inputs and generate the final prompt. This also changes the app's interface language.",
            lensType: "Simulates different camera lenses. 'Wide-angle' captures more of the environment, while 'Telephoto' focuses on distant subjects.",
            model: "Choose the underlying AI model for generating the prompt. 'Flash' is fast and efficient for most tasks.",
            veoModel: "Select the Veo 3.1 model for video generation. 'Fast' provides quicker results, while 'Quality' may yield higher fidelity at the cost of speed.",
            motionIntensity: "Controls the amount and speed of movement in the video. 'High' is good for action scenes, 'Low' for calm, static shots.",
            negativePrompt: "Specify what you want to *avoid* in the video. Helps prevent common issues like distorted hands, blurry backgrounds, or unwanted objects.",
            optimizeFor8Seconds: "Tailors the prompt to create a short, impactful clip with a clear hook, suitable for platforms like TikTok or Shorts.",
            resolution: "Set the output resolution for the generated video. 1080p offers higher quality, while 720p generates faster.",
            soundEffectsIntensity: "Controls how noticeable the sound effects are. 'Subtle' adds realism, while 'Prominent' makes them a key part of the scene.",
            targetModel: "Changes the prompt structure to better emulate the style of different video models. 'Sora' mode aims for hyper-realism and detailed descriptions.",
            timeOfDay: "Sets the lighting and mood of the scene. 'Golden Hour' creates warm, soft light, while 'Night' can be used for dramatic or mysterious scenes.",
            useGoogleSearch: "Allows the model to use Google Search for real-time information. Useful for prompts about recent events, specific people, or real-world locations.",
            visualEffect: "Add extra visual flair. 'Lens flare' adds cinematic realism, while 'Slow motion' can add drama.",
            voiceOver: "The script that will be spoken by the narrator. This is only used if a Voice-over Style other than 'None' is selected.",
            voiceStyle: "Determines the tone of the voice-over. 'None' is a good choice if you only want music or ambient sound.",
            weather: "Adds atmosphere and can influence the story. Rain can feel melancholic, while clear skies feel optimistic.",
        },
    }
};

// Populate other languages by copying English strings. In a real app, these would be translated.
const languages: Language[] = ['sv', 'es', 'fr', 'de'];
languages.forEach(lang => {
    (appUIStringsData as any)[lang] = { ...appUIStringsData.en };
});

// Manual translations
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
    en: `You are an expert prompt engineer for Google's Veo 3.1, a state-of-the-art text-to-video model. Veo 3.1 excels at photorealism, coherent narratives, and complex, dynamic camera movements. Your task is to expand a user's core idea into a rich, detailed, and cinematic prompt that leverages these strengths. Think like a director.

**Output Structure:**
- **Primary Goal:** Combine the user's visual parameters into a vivid, coherent, and evocative paragraph. This paragraph should focus ONLY on the visual aspects of the scene.
- **Dialogue Handling:** If a "Voice-over Script" is provided by the user, you MUST append it at the end of the prompt in a distinct block, formatted exactly like this:
---
Dialogue: "[The full voice-over script provided by the user]"
---
- **Final Output:** The final output should be the visual description paragraph, optionally followed by the dialogue block if a script was provided. Do not use lists or bullet points in the main visual description.

User's Core Idea: "{idea}"
Key Parameters to incorporate:
{parameterList}
`,
    sv: `Du är en expert på prompt-engineering för Googles Veo 3.1, en toppmodern text-till-video-modell. Veo 3.1 utmärker sig i fotorealism, sammanhängande berättelser och komplexa, dynamiska kamerarörelser. Din uppgift är att utöka en användares grundidé till en rik, detaljerad och filmisk prompt som utnyttjar dessa styrkor. Tänk som en regissör.

**Utdatastruktur:**
- **Huvudmål:** Kombinera användarens visuella parametrar till ett levande, sammanhängande och suggestivt stycke. Detta stycke ska ENDAST fokusera på de visuella aspekterna av scenen.
- **Dialoghantering:** Om ett "Manus för berättarröst" tillhandahålls av användaren, MÅSTE du lägga till det i slutet av prompten i ett separat block, formaterat exakt så här:
---
Dialog: "[Hela manuskriptet för berättarrösten som användaren angett]"
---
- **Slutligt resultat:** Det slutliga resultatet ska vara det visuella beskrivningsstycket, eventuellt följt av dialogblocket om ett manus har angetts. Använd inte listor eller punktform i den huvudsakliga visuella beskrivningen.

Användarens grundidé: "{idea}"
Nyckelparametrar att införliva:
{parameterList}
`,
    es: `Eres un ingeniero de prompts experto para Veo 3.1 de Google, un modelo de texto a video de última generación. Veo 3.1 destaca en fotorrealismo, narrativas coherentes y movimientos de cámara complejos y dinámicos. Tu tarea es expandir la idea central de un usuario en un prompt rico, detallado y cinematográfico que aproveche estas fortalezas. Piensa como un director.

**Estructura de Salida:**
- **Objetivo Principal:** Combina los parámetros visuales del usuario en un párrafo vívido, coherente y evocador. Este párrafo debe centrarse ÚNICAMENTE en los aspectos visuales de la escena.
- **Manejo de Diálogos:** Si el usuario proporciona un "Guion de Voz en Off", DEBES adjuntarlo al final del prompt en un bloque distinto, formateado exactamente así:
---
Diálogo: "[El guion completo de voz en off proporcionado por el usuario]"
---
- **Salida Final:** La salida final debe ser el párrafo de descripción visual, opcionalmente seguido por el bloque de diálogo si se proporcionó un guion. No uses listas ni viñetas en la descripción visual principal.

Idea central del usuario: "{idea}"
Parámetros clave a incorporar:
{parameterList}
`,
    fr: `Vous êtes un ingénieur de prompt expert pour Veo 3.1 de Google, un modèle de conversion de texte en vidéo de pointe. Veo 3.1 excelle dans le photoréalisme, les récits cohérents et les mouvements de caméra complexes et dynamiques. Votre tâche consiste à développer l'idée de base d'un utilisateur en un prompt riche, détaillé et cinématographique qui exploite ces atouts. Pensez comme un réalisateur.

**Structure de la Sortie :**
- **Objectif Principal :** Combinez les paramètres visuels de l'utilisateur en un paragraphe vivant, cohérent et évocateur. Ce paragraphe doit se concentrer UNIQUEMENT sur les aspects visuels de la scène.
- **Gestion des Dialogues :** Si un "Script de voix off" est fourni par l'utilisateur, vous DEVEZ l'ajouter à la fin du prompt dans un bloc distinct, formaté exactement comme ceci :
---
Dialogue : "[Le script complet de la voix off fourni par l'utilisateur]"
---
- **Sortie Finale :** La sortie finale doit être le paragraphe de description visuelle, éventuellement suivi du bloc de dialogue si un script a été fourni. N'utilisez pas de listes ou de puces dans la description visuelle principale.

Idée de base de l'utilisateur : "{idea}"
Paramètres clés à intégrer :
{parameterList}
`,
    de: `Sie sind ein Experte für Prompt-Engineering für Googles Veo 3.1, ein hochmodernes Text-zu-Video-Modell. Veo 3.1 zeichnet sich durch Fotorealismus, kohärente Erzählungen und komplexe, dynamische Kamerabewegungen aus. Ihre Aufgabe ist es, die Kernidee eines Benutzers zu einem reichhaltigen, detaillierten und filmischen Prompt zu erweitern, der diese Stärken nutzt. Denken Sie wie ein Regisseur.

**Ausgabestruktur:**
- **Hauptziel:** Kombinieren Sie die visuellen Parameter des Benutzers zu einem lebendigen, kohärenten und evokativen Absatz. Dieser Absatz sollte sich NUR auf die visuellen Aspekte der Szene konzentrieren.
- **Dialoghandhabung:** Wenn ein "Sprechertext" vom Benutzer bereitgestellt wird, MÜSSEN Sie diesen am Ende des Prompts in einem separaten Block anhängen, der genau wie folgt formatiert ist:
---
Dialog: "[Der vollständige vom Benutzer bereitgestellte Sprechertext]"
---
- **Endgültige Ausgabe:** Die endgültige Ausgabe sollte der Absatz mit der visuellen Beschreibung sein, optional gefolgt vom Dialogblock, wenn ein Skript bereitgestellt wurde. Verwenden Sie keine Listen oder Aufzählungszeichen in der visuellen Hauptbeschreibung.

Kernidee des Benutzers: "{idea}"
Wichtige zu berücksichtigende Parameter:
{parameterList}
`,
};

export const soraPromptTemplate: { [key in Language]: string } = {
    en: `You are an expert prompt engineer designed to emulate the style of prompts for OpenAI's Sora model. Your task is to expand a user's core idea into a hyper-realistic and highly descriptive prompt. Focus on intricate details, object interactions, complex camera movements, and emotional tone.

**Output Structure:**
- **Visual Description:** Combine all user parameters into a single, dense paragraph describing the visual scene with extreme detail. Do not mention dialogue or specific voice-over lines in this main paragraph.
- **Dialogue Block:** If a "Voice-over Script" is provided by the user, you MUST append it at the very end of the prompt in a separate block, formatted exactly like this:
Dialogue: "[The full voice-over script provided by the user]"
- **Final Output:** The output must be the single visual description paragraph, followed by the dialogue block ONLY if a script was provided.

User's Core Idea: "{idea}"
Key Parameters to incorporate:
{parameterList}
`,
    sv: `Du är en expert prompt-ingenjör utformad för att efterlikna stilen på prompter för OpenAI:s Sora-modell. Din uppgift är att utöka en användares kärnidé till en hyperrealistisk och mycket beskrivande prompt. Fokusera på invecklade detaljer, objektinteraktioner, komplexa kamerarörelser och emotionell ton.

**Utdatastruktur:**
- **Visuell beskrivning:** Kombinera alla användarparametrar till ett enda, tätt stycke som beskriver den visuella scenen med extrem detaljrikedom. Nämn inte dialog eller specifika repliker i detta huvudstycke.
- **Dialogblock:** Om ett "Manus för berättarröst" tillhandahålls av användaren, MÅSTE du lägga till det allra sist i prompten i ett separat block, formaterat exakt så här:
Dialog: "[Hela manuskriptet för berättarrösten som användaren angett]"
- **Slutligt resultat:** Resultatet måste vara det enda visuella beskrivningsstycket, följt av dialogblocket ENDAST om ett manus har angetts.

Användarens grundidé: "{idea}"
Nyckelparametrar att införliva:
{parameterList}
`,
    es: `Eres un ingeniero de prompts experto diseñado para emular el estilo de los prompts del modelo Sora de OpenAI. Tu tarea es expandir la idea central de un usuario en un prompt hiperrealista y altamente descriptivo. Céntrate en detalles intrincados, interacciones de objetos, movimientos de cámara complejos y tono emocional.

**Estructura de Salida:**
- **Descripción Visual:** Combina todos los parámetros del usuario en un único y denso párrafo que describa la escena visual con extremo detalle. No menciones diálogos ni líneas de voz en off específicas en este párrafo principal.
- **Bloque de Diálogo:** Si el usuario proporciona un "Guion de Voz en Off", DEBES adjuntarlo al final del prompt en un bloque separado, formateado exactamente así:
Diálogo: "[El guion completo de voz en off proporcionado por el usuario]"
- **Salida Final:** La salida debe ser el único párrafo de descripción visual, seguido por el bloque de diálogo ÚNICAMENTE si se proporcionó un guion.

Idea central del usuario: "{idea}"
Parámetros clave a incorporar:
{parameterList}
`,
    fr: `Vous êtes un ingénieur de prompt expert conçu pour émuler le style des prompts du modèle Sora d'OpenAI. Votre tâche est de développer l'idée de base d'un utilisateur en un prompt hyperréaliste et très descriptif. Concentrez-vous sur les détails complexes, les interactions d'objets, les mouvements de caméra complexes et le ton émotionnel.

**Structure de la Sortie :**
- **Description Visuelle :** Combinez tous les paramètres de l'utilisateur en un seul paragraphe dense décrivant la scène visuelle avec des détails extrêmes. Ne mentionnez pas de dialogue ou de lignes de voix off spécifiques dans ce paragraphe principal.
- **Bloc de Dialogue :** Si un "Script de voix off" est fourni par l'utilisateur, vous DEVEZ l'ajouter à la toute fin du prompt dans un bloc séparé, formaté exactement comme ceci :
Dialogue : "[Le script complet de la voix off fourni par l'utilisateur]"
- **Sortie Finale :** La sortie doit être le seul paragraphe de description visuelle, suivi du bloc de dialogue UNIQUEMENT si un script a été fourni.

Idée de base de l'utilisateur : "{idea}"
Paramètres clés à intégrer :
{parameterList}
`,
    de: `Sie sind ein Experte für Prompt-Engineering, der den Stil von Prompts für das Sora-Modell von OpenAI emulieren soll. Ihre Aufgabe ist es, die Kernidee eines Benutzers zu einem hyperrealistischen und sehr beschreibenden Prompt zu erweitern. Konzentrieren Sie sich auf komplizierte Details, Objektinteraktionen, komplexe Kamerabewegungen und den emotionalen Ton.

**Ausgabestruktur:**
- **Visuelle Beschreibung:** Kombinieren Sie alle Benutzerparameter in einem einzigen, dichten Absatz, der die visuelle Szene mit extremer Detailgenauigkeit beschreibt. Erwähnen Sie in diesem Hauptabsatz keine Dialoge oder spezifische Sprechertexte.
- **Dialogblock:** Wenn ein "Sprechertext" vom Benutzer bereitgestellt wird, MÜSSEN Sie diesen ganz am Ende des Prompts in einem separaten Block anhängen, der genau wie folgt formatiert ist:
Dialog: "[Der vollständige vom Benutzer bereitgestellte Sprechertext]"
- **Endgültige Ausgabe:** Die Ausgabe muss der einzige Absatz mit der visuellen Beschreibung sein, gefolgt vom Dialogblock NUR, wenn ein Skript bereitgestellt wurde.

Kernidee des Benutzers: "{idea}"
Wichtige zu berücksichtigende Parameter:
{parameterList}
`,
};


export const seriesInstructions: { [key in Language]: string } = {
    en: "The final output must be a script for a 3-part mini-series. Each part must start with '### Episode [Number]: [Title]' followed by the detailed scene description. Ensure a clear narrative progression. **Crucially, to maintain continuity, explicitly reference consistent character details (like clothing or appearance) or objects across episodes.** For example: 'Episode 2: The detective, still wearing the rain-soaked trench coat, enters the dimly lit office.'",
    sv: "Det slutliga resultatet måste vara ett manus för en 3-delad miniserie. Varje del måste börja med '### Avsnitt [Nummer]: [Titel]' följt av den detaljerade scenbeskrivningen. Säkerställ en tydlig narrativ utveckling. **För att bibehålla kontinuitet är det avgörande att explicit referera till konsekventa karaktärsdetaljer (som kläder eller utseende) eller objekt över avsnitten.** Till exempel: 'Avsnitt 2: Detektiven, fortfarande iklädd den regnblöta trenchcoaten, går in på det svagt upplysta kontoret.'",
    es: "El resultado final debe ser un guion para una miniserie de 3 partes. Cada parte debe comenzar con '### Episodio [Número]: [Título]' seguido de la descripción detallada de la escena. Asegure una progresión narrativa clara. **Para mantener la continuidad, es crucial hacer referencia explícita a detalles consistentes del personaje (como ropa o apariencia) u objetos a lo largo de los episodios.** Por ejemplo: 'Episodio 2: El detective, todavía con la gabardina empapada por la lluvia, entra en la oficina tenuemente iluminada.'",
    fr: "Le résultat final doit être un script pour une mini-série en 3 parties. Chaque partie doit commencer par '### Épisode [Nummer] : [Titre]' suivi de la description détaillée de la scène. Assurez une progression narrative claire. **Pour maintenir la continuité, il est crucial de référencer explicitement des détails de personnage cohérents (comme les vêtements ou l'apparence) ou des objets à travers les épisodes.** Par exemple : 'Épisode 2 : Le détective, portant toujours son trench-coat trempé par la pluie, entre dans le bureau faiblement éclairé.'",
    de: "Das Endergebnis muss ein Skript für eine 3-teilige Miniserie sein. Jeder Teil muss mit '### Episode [Nummer]: [Titel]' beginnen, gefolgt von der detaillierten Szenenbeschreibung. Stellen Sie eine klare narrative Entwicklung sicher. **Entscheidend für die Kontinuität ist es, explizit auf konsistente Charakterdetails (wie Kleidung oder Aussehen) oder Objekte über die Episoden hinweg zu verweisen.** Zum Beispiel: 'Episode 2: Der Detektiv, der immer noch den regennassen Trenchcoat trägt, betritt das schwach beleuchtete Büro.'",
};

export const parameterLabels: { [key in Language]: { [key in keyof Omit<import('./types').PromptGenerationParams, 'language' | 'model' | 'targetModel' | 'generateAsSeries'>]: string } } = {
    en: {
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
        youtubeUrl: "YouTube URL Analysis",
        imageStudioPrompt: "Image Studio Prompt",
        uploadedImage: "Source Image",
        veoModel: "Veo Model",
    },
    sv: {
        idea: "Grundidé",
        environment: "Miljö",
        timeOfDay: "Tid på dygnet",
        weather: "Väder",
        characterActions: "Karaktärshandlingar",
        characterGender: "Karaktärens kön",
        characterEthnicity: "Karaktärens etnicitet",
        characterClothing: "Karaktärens klädsel",
        characterArchetype: "Karaktärsarketyp",
        characterAge: "Karaktärens ålder",
        characterMood: "Karaktärens humör",
        characterPose: "Karaktärens pose",
        characterSkinTone: "Karaktärens hudton",
        characterSpecificClothing: "Specifika klädesplagg",
        characterAccessories: "Karaktärsaccessoarer",
        artStyle: "Konststil",
        customArtStyle: "Anpassad konststil",
        colorPalette: "Färgpalett",
        visualEffect: "Visuell effekt",
        cameraMovement: "Kamerarörelse",
        cameraDistance: "Kameraavstånd",
        lensType: "Objektivtyp",
        aspectRatio: "Bildförhållande",
        resolution: "Upplösning",
        animationPreset: "Animation",
        motionIntensity: "Rörelseintensitet",
        voiceStyle: "Berättarröst",
        voiceOver: "Manus för berättarröst",
        ambientSound: "Omgivningsljud",
        soundEffectsIntensity: "Ljudintensitet",
        creativityLevel: "Kreativitet",
        negativePrompt: "Negativ prompt",
        optimizeFor8Seconds: "Optimering",
        includeOverlayText: "Text/Grafik-överlägg",
        useGoogleSearch: "Grundad sökning",
        youtubeUrl: "YouTube URL-analys",
        imageStudioPrompt: "Bildstudioprompt",
        uploadedImage: "Källbild",
        veoModel: "Veo-modell",
    },
    // Other languages would be translated similarly
    es: { idea: "Idea Central", environment: "Entorno", timeOfDay: "Hora del Día", weather: "Clima", characterActions: "Acciones del Personaje", characterGender: "Género del Personaje", characterEthnicity: "Etnia del Personaje", characterClothing: "Vestimenta del Personaje", characterArchetype: "Arquetipo del Personaje", characterAge: "Edad del Personaje", characterMood: "Humor del Personaje", characterPose: "Pose del Personaje", characterSkinTone: "Tono de Piel del Personaje", characterSpecificClothing: "Detalles de Ropa del Personaje", characterAccessories: "Accesorios del Personaje", artStyle: "Estilo de Arte", customArtStyle: "Estilo de Arte Personalizado", colorPalette: "Paleta de Colores", visualEffect: "Efecto Visual", cameraMovement: "Movimiento de Cámara", cameraDistance: "Distancia de Cámara", lensType: "Tipo de Lente", aspectRatio: "Relación de Aspecto", resolution: "Resolución", animationPreset: "Animación", motionIntensity: "Intensidad de Movimiento", voiceStyle: "Estilo de Voz", voiceOver: "Guion de Voz en Off", ambientSound: "Sonido Ambiental", soundEffectsIntensity: "Intensidad de Efectos de Sonido", creativityLevel: "Creatividad", negativePrompt: "Prompt Negativo", optimizeFor8Seconds: "Optimización", includeOverlayText: "Superposición de Texto/Gráficos", useGoogleSearch: "Búsqueda Fundamentada", youtubeUrl: "Análisis de URL de YouTube", imageStudioPrompt: "Prompt de Estudio de Imagen", uploadedImage: "Imagen de Origen", veoModel: "Modelo Veo" },
    fr: { idea: "Idée de base", environment: "Environnement", timeOfDay: "Moment de la journée", weather: "Météo", characterActions: "Actions du personnage", characterGender: "Genre du personnage", characterEthnicity: "Ethnicité du personnage", characterClothing: "Style vestimentaire du personnage", characterArchetype: "Archétype du personnage", characterAge: "Âge du personnage", characterMood: "Humeur du personnage", characterPose: "Pose du personnage", characterSkinTone: "Teint du personnage", characterSpecificClothing: "Détails vestimentaires du personnage", characterAccessories: "Accessoires du personnage", artStyle: "Style artistique", customArtStyle: "Style artistique personnalisé", colorPalette: "Palette de couleurs", visualEffect: "Effet visuel", cameraMovement: "Mouvement de caméra", cameraDistance: "Distance de la caméra", lensType: "Type d'objectif", aspectRatio: "Format d'image", resolution: "Résolution", animationPreset: "Animation", motionIntensity: "Intensité du mouvement", voiceStyle: "Style de voix off", voiceOver: "Script de voix off", ambientSound: "Son d'ambiance", soundEffectsIntensity: "Intensité des effets sonores", creativityLevel: "Créativité", negativePrompt: "Prompt négatif", optimizeFor8Seconds: "Optimisation", includeOverlayText: "Superposition de texte/graphiques", useGoogleSearch: "Recherche fondée", youtubeUrl: "Analyse d'URL YouTube", imageStudioPrompt: "Prompt de studio d'image", uploadedImage: "Image source", veoModel: "Modèle Veo" },
    de: { idea: "Kernidee", environment: "Umgebung", timeOfDay: "Tageszeit", weather: "Wetter", characterActions: "Charakteraktionen", characterGender: "Geschlecht des Charakters", characterEthnicity: "Ethnizität des Charakters", characterClothing: "Kleidungsstil des Charakters", characterArchetype: "Archetyp des Charakters", characterAge: "Alter des Charakters", characterMood: "Stimmung des Charakters", characterPose: "Pose des Charakters", characterSkinTone: "Hautton des Charakters", characterSpecificClothing: "Kleidungsdetails des Charakters", characterAccessories: "Accessoires des Charakters", artStyle: "Kunststil", customArtStyle: "Benutzerdefinierter Kunststil", colorPalette: "Farbpalette", visualEffect: "Visueller Effekt", cameraMovement: "Kamerabewegung", cameraDistance: "Kameraabstand", lensType: "Objektivtyp", aspectRatio: "Seitenverhältnis", resolution: "Auflösung", animationPreset: "Animation", motionIntensity: "Bewegungsintensität", voiceStyle: "Stimme des Sprechers", voiceOver: "Sprechertext", ambientSound: "Umgebungsgeräusche", soundEffectsIntensity: "Intensität der Soundeffekte", creativityLevel: "Kreativität", negativePrompt: "Negativer Prompt", optimizeFor8Seconds: "Optimierung", includeOverlayText: "Text-/Grafiküberlagerung", useGoogleSearch: "Fundierte Suche", youtubeUrl: "YouTube-URL-Analyse", imageStudioPrompt: "Bildstudio-Prompt", uploadedImage: "Quellbild", veoModel: "Veo-Modell" },
};

export const parameterValues: { [key in Language]: { [key: string]: string } } = {
    en: {
        optimization: "The final clip should be a fast-paced, highly engaging 8-second video, perfect for social media.",
        overlay: "The video should incorporate stylish, animated text overlays and simple graphic elements to highlight key points.",
    },
    sv: {
        optimization: "Det slutliga klippet ska vara en snabb, mycket engagerande 8-sekunders video, perfekt för sociala medier.",
        overlay: "Videon ska innehålla stiliga, animerade textöverlägg och enkla grafiska element för att belysa nyckelpunkter.",
    },
    es: {
        optimization: "El clip final debe ser un video de 8 segundos, de ritmo rápido y muy atractivo, perfecto para redes sociales.",
        overlay: "El video debe incorporar superposiciones de texto animadas y elegantes y elementos gráficos simples para resaltar los puntos clave.",
    },
    fr: {
        optimization: "Le clip final doit être une vidéo de 8 secondes, au rythme rapide et très engageante, parfaite pour les médias sociaux.",
        overlay: "La vidéo doit intégrer des superpositions de texte animées et stylées ainsi que des éléments graphiques simples pour mettre en évidence les points clés.",
    },
    de: {
        optimization: "Der endgültige Clip sollte ein schnelles, sehr ansprechendes 8-Sekunden-Video sein, perfekt für soziale Medien.",
        overlay: "Das Video sollte stilvolle, animierte Textüberlagerungen und einfache grafische Elemente enthalten, um wichtige Punkte hervorzuheben.",
    },
};
// This file contains all the UI strings and prompt templates for different languages.
type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

// --- UI STRINGS ---
// FIX: Cast to 'any' to allow dynamic population of languages without initial declaration errors.
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
        placeholderCharacterActions: "e.g., A knight drawing their sword defensively; a chef carefully plating a delicate dessert.",
        labelCharacterGender: "Gender",
        labelCharacterEthnicity: "Ethnicity",
        labelCharacterClothing: "Clothing Style",
        labelCharacterArchetype: "Archetype",
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
        },
        variations: {
            title: "Prompt Variations",
            use: "Use This Variation",
            loading: "Generating creative variations...",
            empty: "Could not generate variations for this prompt.",
        },
        summary: {
            title: "Your Prompt Blueprint",
            ideaLabel: "Core Idea",
            styleLabel: "Art Style",
            cameraLabel: "Camera",
            cta: "Click 'Architect Prompt' to generate the final masterpiece!",
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
        autoFillSystemPrompt: "You are an expert creative director's assistant. Your task is to analyze the user's core video idea and suggest a coherent set of creative modifiers. Respond ONLY with a valid JSON object that adheres to the provided schema. Choose the most fitting and evocative options from the enums provided. The 'environment' description should be brief and cinematic.",
    }
};

// Populate other languages by copying English strings. In a real app, these would be translated.
const languages: Language[] = ['sv', 'es', 'fr', 'de'];
languages.forEach(lang => {
    (appUIStringsData as any)[lang] = { ...appUIStringsData.en };
});

export const appUIStrings: { [lang in Language]: typeof appUIStringsData['en'] } = appUIStringsData;

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
    en: `You are an expert prompt engineer for Google's Veo, a state-of-the-art text-to-video model. Your task is to expand a user's core idea into a rich, detailed, and cinematic prompt. Think like a director. Combine the user's parameters into a vivid, coherent, and evocative paragraph. Avoid lists or bullet points. The final output must be a single, well-written paragraph.

User's Core Idea: "{idea}"
Key Parameters to incorporate:
{parameterList}
`,
    // Other languages can have their own templates
    sv: `Du är en expert på prompt-engineering för Googles Veo, en toppmodern text-till-video-modell. Din uppgift är att utöka en användares grundidé till en rik, detaljerad och filmisk prompt. Tänk som en regissör. Kombinera användarens parametrar till ett levande, sammanhängande och suggestivt stycke. Undvik listor eller punktform. Det slutliga resultatet måste vara ett enda, välskrivet stycke.

Användarens grundidé: "{idea}"
Nyckelparametrar att införliva:
{parameterList}
`,
    es: `Eres un ingeniero de prompts experto para Veo de Google, un modelo de texto a video de última generación. Tu tarea es expandir la idea central de un usuario en un prompt rico, detallado y cinematográfico. Piensa como un director. Combina los parámetros del usuario en un párrafo vívido, coherente y evocador. Evita listas o viñetas. El resultado final debe ser un único párrafo bien escrito.

Idea central del usuario: "{idea}"
Parámetros clave a incorporar:
{parameterList}
`,
    fr: `Vous êtes un ingénieur de prompt expert pour Veo de Google, un modèle de conversion de texte en vidéo de pointe. Votre tâche consiste à développer l'idée de base d'un utilisateur en un prompt riche, détaillé et cinématographique. Pensez comme un réalisateur. Combinez les paramètres de l'utilisateur en un paragraphe vivant, cohérent et évocateur. Évitez les listes ou les puces. Le résultat final doit être un seul paragraphe bien rédigé.

Idée de base de l'utilisateur : "{idea}"
Paramètres clés à intégrer :
{parameterList}
`,
    de: `Sie sind ein Experte für Prompt-Engineering für Googles Veo, ein hochmodernes Text-zu-Video-Modell. Ihre Aufgabe ist es, die Kernidee eines Benutzers zu einem reichhaltigen, detaillierten und filmischen Prompt zu erweitern. Denken Sie wie ein Regisseur. Kombinieren Sie die Parameter des Benutzers zu einem lebendigen, kohärenten und evokativen Absatz. Vermeiden Sie Listen oder Aufzählungszeichen. Das Endergebnis muss ein einziger, gut geschriebener Absatz sein.

Kernidee des Benutzers: "{idea}"
Wichtige zu berücksichtigende Parameter:
{parameterList}
`,
};

export const soraPromptTemplate: { [key in Language]: string } = {
    en: `You are an expert prompt engineer designed to emulate the style of prompts for OpenAI's Sora model. Your task is to expand a user's core idea into a hyper-realistic and highly descriptive prompt. Focus on intricate details, object interactions, complex camera movements, and emotional tone. The output should be a single, dense paragraph.

User's Core Idea: "{idea}"
Key Parameters to incorporate:
{parameterList}
`,
    sv: `Du är en expert prompt-ingenjör utformad för att efterlikna stilen på prompter för OpenAI:s Sora-modell. Din uppgift är att utöka en användares kärnidé till en hyperrealistisk och mycket beskrivande prompt. Fokusera på invecklade detaljer, objektinteraktioner, komplexa kamerarörelser och emotionell ton. Resultatet ska vara ett enda, tätt stycke.

Användarens grundidé: "{idea}"
Nyckelparametrar att införliva:
{parameterList}
`,
    es: `Eres un ingeniero de prompts experto diseñado para emular el estilo de los prompts del modelo Sora de OpenAI. Tu tarea es expandir la idea central de un usuario en un prompt hiperrealista y altamente descriptivo. Céntrate en detalles intrincados, interacciones de objetos, movimientos de cámara complejos y tono emocional. El resultado debe ser un único y denso párrafo.

Idea central del usuario: "{idea}"
Parámetros clave a incorporar:
{parameterList}
`,
    fr: `Vous êtes un ingénieur de prompt expert conçu pour émuler le style des prompts du modèle Sora d'OpenAI. Votre tâche est de développer l'idée de base d'un utilisateur en un prompt hyperréaliste et très descriptif. Concentrez-vous sur les détails complexes, les interactions d'objets, les mouvements de caméra complexes et le ton émotionnel. Le résultat doit être un seul paragraphe dense.

Idée de base de l'utilisateur : "{idea}"
Paramètres clés à intégrer :
{parameterList}
`,
    de: `Sie sind ein Experte für Prompt-Engineering, der den Stil von Prompts für das Sora-Modell von OpenAI emulieren soll. Ihre Aufgabe ist es, die Kernidee eines Benutzers zu einem hyperrealistischen und sehr beschreibenden Prompt zu erweitern. Konzentrieren Sie sich auf komplizierte Details, Objektinteraktionen, komplexe Kamerabewegungen und den emotionalen Ton. Die Ausgabe sollte ein einziger, dichter Absatz sein.

Kernidee des Benutzers: "{idea}"
Wichtige zu berücksichtigende Parameter:
{parameterList}
`,
};


export const seriesInstructions: { [key in Language]: string } = {
    en: "The final output must be a script for a 3-part mini-series. Each part must start with '### Episode [Number]: [Title]' followed by the detailed scene description. Ensure a clear narrative progression across the three episodes.",
    sv: "Det slutliga resultatet måste vara ett manus för en 3-delad miniserie. Varje del måste börja med '### Avsnitt [Nummer]: [Titel]' följt av den detaljerade scenbeskrivningen. Säkerställ en tydlig narrativ utveckling över de tre avsnitten.",
    es: "El resultado final debe ser un guion para una miniserie de 3 partes. Cada parte debe comenzar con '### Episodio [Número]: [Título]' seguido de la descripción detallada de la escena. Asegure una progresión narrativa clara a lo largo de los tres episodios.",
    fr: "Le résultat final doit être un script pour une mini-série en 3 parties. Chaque partie doit commencer par '### Épisode [Numéro] : [Titre]' suivi de la description détaillée de la scène. Assurez une progression narrative claire à travers les trois épisodes.",
    de: "Das Endergebnis muss ein Skript für eine 3-teilige Miniserie sein. Jeder Teil muss mit '### Episode [Nummer]: [Titel]' beginnen, gefolgt von der detaillierten Szenenbeschreibung. Stellen Sie eine klare narrative Entwicklung über die drei Episoden sicher.",
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
        artStyle: "Art Style",
        customArtStyle: "Custom Art Style",
        colorPalette: "Color Palette",
        visualEffect: "Visual Effect",
        cameraMovement: "Camera Movement",
        cameraDistance: "Camera Distance",
        lensType: "Lens Type",
        aspectRatio: "Aspect Ratio",
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
        artStyle: "Konststil",
        customArtStyle: "Anpassad konststil",
        colorPalette: "Färgpalett",
        visualEffect: "Visuell effekt",
        cameraMovement: "Kamerarörelse",
        cameraDistance: "Kameraavstånd",
        lensType: "Objektivtyp",
        aspectRatio: "Bildförhållande",
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
    },
    // Other languages would be translated similarly
    es: { idea: "Idea Central", environment: "Entorno", timeOfDay: "Hora del Día", weather: "Clima", characterActions: "Acciones del Personaje", characterGender: "Género del Personaje", characterEthnicity: "Etnia del Personaje", characterClothing: "Vestimenta del Personaje", characterArchetype: "Arquetipo del Personaje", artStyle: "Estilo de Arte", customArtStyle: "Estilo de Arte Personalizado", colorPalette: "Paleta de Colores", visualEffect: "Efecto Visual", cameraMovement: "Movimiento de Cámara", cameraDistance: "Distancia de Cámara", lensType: "Tipo de Lente", aspectRatio: "Relación de Aspecto", animationPreset: "Animación", motionIntensity: "Intensidad de Movimiento", voiceStyle: "Estilo de Voz", voiceOver: "Guion de Voz en Off", ambientSound: "Sonido Ambiental", soundEffectsIntensity: "Intensidad de Efectos de Sonido", creativityLevel: "Creatividad", negativePrompt: "Prompt Negativo", optimizeFor8Seconds: "Optimización", includeOverlayText: "Superposición de Texto/Gráficos", useGoogleSearch: "Búsqueda Fundamentada", youtubeUrl: "Análisis de URL de YouTube", imageStudioPrompt: "Prompt de Estudio de Imagen", uploadedImage: "Imagen de Origen" },
    fr: { idea: "Idée de base", environment: "Environnement", timeOfDay: "Moment de la journée", weather: "Météo", characterActions: "Actions du personnage", characterGender: "Genre du personnage", characterEthnicity: "Ethnicité du personnage", characterClothing: "Style vestimentaire du personnage", characterArchetype: "Archétype du personnage", artStyle: "Style artistique", customArtStyle: "Style artistique personnalisé", colorPalette: "Palette de couleurs", visualEffect: "Effet visuel", cameraMovement: "Mouvement de caméra", cameraDistance: "Distance de la caméra", lensType: "Type d'objectif", aspectRatio: "Format d'image", animationPreset: "Animation", motionIntensity: "Intensité du mouvement", voiceStyle: "Style de voix off", voiceOver: "Script de voix off", ambientSound: "Son d'ambiance", soundEffectsIntensity: "Intensité des effets sonores", creativityLevel: "Créativité", negativePrompt: "Prompt négatif", optimizeFor8Seconds: "Optimisation", includeOverlayText: "Superposition de texte/graphiques", useGoogleSearch: "Recherche fondée", youtubeUrl: "Analyse d'URL YouTube", imageStudioPrompt: "Prompt de studio d'image", uploadedImage: "Image source" },
    // FIX: Corrected typos in keys for the German translation.
    de: { idea: "Kernidee", environment: "Umgebung", timeOfDay: "Tageszeit", weather: "Wetter", characterActions: "Charakteraktionen", characterGender: "Geschlecht des Charakters", characterEthnicity: "Ethnizität des Charakters", characterClothing: "Kleidungsstil des Charakters", characterArchetype: "Archetyp des Charakters", artStyle: "Kunststil", customArtStyle: "Benutzerdefinierter Kunststil", colorPalette: "Farbpalette", visualEffect: "Visueller Effekt", cameraMovement: "Kamerabewegung", cameraDistance: "Kameraabstand", lensType: "Objektivtyp", aspectRatio: "Seitenverhältnis", animationPreset: "Animation", motionIntensity: "Bewegungsintensität", voiceStyle: "Stimme des Sprechers", voiceOver: "Sprechertext", ambientSound: "Umgebungsgeräusche", soundEffectsIntensity: "Intensität der Soundeffekte", creativityLevel: "Kreativität", negativePrompt: "Negativer Prompt", optimizeFor8Seconds: "Optimierung", includeOverlayText: "Text-/Grafiküberlagerung", useGoogleSearch: "Fundierte Suche", youtubeUrl: "YouTube-URL-Analyse", imageStudioPrompt: "Bildstudio-Prompt", uploadedImage: "Quellbild" },
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



type Language = 'en' | 'sv';

export const appUIStrings: { [lang in Language]: { [key: string]: string } } = {
  en: {
    // Header
    headerTitle: "Veo Prompt Studio",
    headerSubtitle: "Craft the perfect prompt for Google's most capable video generation model.",
    historyButton: "Show History",
    // Main Form
    youtubeLabel: "Start with a YouTube video for inspiration",
    youtubePlaceholder: "https://www.youtube.com/watch?v=...",
    analyze: "Analyze",
    coreIdeaLabel: "Or write your core idea",
    coreIdeaPlaceholder: "A cat detective in a rainy, 1940s film noir city...",
    promptModifiers: "Prompt Modifiers",
    generatePrompt: "Generate Veo Prompt",
    useTemplate: "Use a Template",
    getInspiration: "Get Inspiration",
    getTrending: "See What's Trending",
    // Loading States
    loadingPrompt: "Crafting cinematic prompt...",
    loadingArt: "Painting concept art...",
    loadingVideo: "Warming up the cameras...",
    loadingStoryboard: "Sketching keyframes...",
    loadingAnalysis: "Analyzing video content...",
    loadingAudio: "Synthesizing audio...",
    loadingEdit: "Applying creative edits...",
    loadingExamples: "Gathering inspiration...",
    loadingTrending: "Scanning the zeitgeist...",
    // Examples Carousel
    useThisExample: "Use this Example",
    inspirationalPrompts: "Inspirational Prompts",
    trendingPrompts: "Trending Prompts",
    // Output Section
    generatedPromptTitle: "Generated Prompt",
    copied: "Copied!",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    generateArt: "Generate Art",
    generateVideo: "Generate Video",
    generateStoryboard: "Storyboard",
    share: "Share",
    // Creative Outputs
    creativeOutputTitle: "Creative Outputs",
    conceptArtTab: "Concept Art",
    storyboardTab: "Storyboard",
    videoTab: "Video",
    generatingArt: "Generating Concept Art...",
    refineArtLabel: "Refine art with a prompt",
    refineArtPlaceholder: "e.g., make the sky purple",
    refine: "Refine",
    artPlaceholder: "Generate concept art from your prompt to see it here.",
    generatingStoryboard: "Generating Storyboard...",
    storyboardPlaceholder: "Generate a storyboard to visualize key moments.",
    downloadVideo: "Download Video",
    videoPlaceholder: "Generate a video to see the final result.",
    // History Panel
    historyTitle: "History",
    clearHistory: "Clear History",
    clearHistoryConfirm: "Are you sure?",
    emptyHistory: "No history yet.",
    useHistory: "Use",
    deleteHistory: "Delete",
    deleteHistoryConfirm: "Delete this entry?",
    // Templates Panel
    templatesTitle: "Prompt Templates",
    useTemplateButton: "Use Template",
    // Tabs
    sceneTab: "Scene",
    characterTab: "Character",
    styleTab: "Style",
    cameraTab: "Camera",
    animationTab: "Animation",
    audioTab: "Audio",
    advancedTab: "Advanced",
    // Audio Section
    generateAudioPreview: "Generate Audio Preview",
    voiceTitle: "Voice & Narration",
    soundscapeTitle: "Soundscape Design",
    // Video Status
    videoStatusInit: "Initializing video generation...",
    videoStatusProcessing: "Generating video, this may take a few minutes...",
    videoStatusPolling: "Checking on video progress...",
    videoStatusFetching: "Video generated. Fetching data...",
    videoStatusComplete: "Video generation complete.",
    // Toast messages
    promptLoadedFromLink: "Loaded prompt from shared link!",
    promptLoadError: "Could not load shared prompt. The link may be invalid.",
    youtubeAnalyzed: "YouTube video analyzed successfully!",
    youtubeAnalyzeError: "Failed to analyze YouTube URL.",
    artRefined: "Art refined successfully!",
    artRefineError: "Failed to edit concept art.",
    audioError: "Failed to generate audio preview.",
    shareLinkCopied: "Shareable link copied to clipboard!",
    shareLinkError: "Could not create share link.",
    historyLoaded: "Loaded state from history.",
    templateApplied: "Applied \"{templateName}\" template.",
    examplesFetchError: "Failed to fetch example prompts.",
    exampleLoaded: "Loaded \"{title}\" example.",
    unknownError: "An unknown error occurred.",
    artError: "Failed to generate concept art.",
    videoError: "Failed to generate video.",
    storyboardError: "Failed to generate storyboard.",
    invalidUrlError: "Please enter a valid URL format.",
  },
  sv: {
    // Header
    headerTitle: "Veo Prompt Studio",
    headerSubtitle: "Skapa den perfekta prompten för Googles mest kapabla videogenereringsmodell.",
    historyButton: "Visa historik",
    // Main Form
    youtubeLabel: "Börja med en YouTube-video för inspiration",
    youtubePlaceholder: "https://www.youtube.com/watch?v=...",
    analyze: "Analysera",
    coreIdeaLabel: "Eller skriv din grundidé",
    coreIdeaPlaceholder: "En kattdetektiv i en regnig 1940-tals film noir-stad...",
    promptModifiers: "Prompt-modifierare",
    generatePrompt: "Generera Veo-prompt",
    useTemplate: "Använd en mall",
    getInspiration: "Få inspiration",
    getTrending: "Se vad som trendar",
    // Loading States
    loadingPrompt: "Skapar filmisk prompt...",
    loadingArt: "Målar konceptkonst...",
    loadingVideo: "Värmer upp kamerorna...",
    loadingStoryboard: "Skissar nyckelbilder...",
    loadingAnalysis: "Analyserar videoinnehåll...",
    loadingAudio: "Syntetiserar ljud...",
    loadingEdit: "Tillämpar kreativa ändringar...",
    loadingExamples: "Samlar inspiration...",
    loadingTrending: "Skannar tidsandan...",
    // Examples Carousel
    useThisExample: "Använd detta exempel",
    inspirationalPrompts: "Inspirerande prompter",
    trendingPrompts: "Trendande prompter",
    // Output Section
    generatedPromptTitle: "Genererad prompt",
    copied: "Kopierad!",
    edit: "Redigera",
    save: "Spara",
    cancel: "Avbryt",
    generateArt: "Generera konst",
    generateVideo: "Generera video",
    generateStoryboard: "Storyboard",
    share: "Dela",
    // Creative Outputs
    creativeOutputTitle: "Kreativa resultat",
    conceptArtTab: "Konceptkonst",
    storyboardTab: "Storyboard",
    videoTab: "Video",
    generatingArt: "Genererar konceptkonst...",
    refineArtLabel: "Förfina konsten med en prompt",
    refineArtPlaceholder: "t.ex. gör himlen lila",
    refine: "Förfina",
    artPlaceholder: "Generera konceptkonst från din prompt för att se den här.",
    generatingStoryboard: "Genererar storyboard...",
    storyboardPlaceholder: "Generera en storyboard för att visualisera nyckelögonblick.",
    downloadVideo: "Ladda ner video",
    videoPlaceholder: "Generera en video för att se slutresultatet.",
    // History Panel
    historyTitle: "Historik",
    clearHistory: "Rensa historik",
    clearHistoryConfirm: "Är du säker?",
    emptyHistory: "Ingen historik än.",
    useHistory: "Använd",
    deleteHistory: "Ta bort",
    deleteHistoryConfirm: "Ta bort den här posten?",
    // Templates Panel
    templatesTitle: "Prompt-mallar",
    useTemplateButton: "Använd mall",
    // Tabs
    sceneTab: "Scen",
    characterTab: "Karaktär",
    styleTab: "Stil",
    cameraTab: "Kamera",
    animationTab: "Animation",
    audioTab: "Ljud",
    advancedTab: "Avancerat",
    // Audio Section
    generateAudioPreview: "Generera ljudförhandsvisning",
    voiceTitle: "Röst & Berättande",
    soundscapeTitle: "Ljuddesign",
    // Video Status
    videoStatusInit: "Påbörjar videogenerering...",
    videoStatusProcessing: "Genererar video, detta kan ta några minuter...",
    videoStatusPolling: "Kontrollerar videoframsteg...",
    videoStatusFetching: "Video genererad. Hämtar data...",
    videoStatusComplete: "Videogenerering slutförd.",
    // Toast messages
    promptLoadedFromLink: "Prompt laddad från delad länk!",
    promptLoadError: "Kunde inte ladda delad prompt. Länken kan vara ogiltig.",
    youtubeAnalyzed: "YouTube-video analyserad!",
    youtubeAnalyzeError: "Misslyckades med att analysera YouTube-URL.",
    artRefined: "Konst förfinad!",
    artRefineError: "Misslyckades med att redigera konceptkonst.",
    audioError: "Misslyckades med att generera ljudförhandsvisning.",
    shareLinkCopied: "Delningsbar länk kopierad till urklipp!",
    shareLinkError: "Kunde inte skapa delningslänk.",
    historyLoaded: "Läste in tillstånd från historiken.",
    templateApplied: "Använde mallen \"{templateName}\".",
    examplesFetchError: "Misslyckades med att hämta exempelprompter.",
    exampleLoaded: "Laddade exemplet \"{title}\".",
    unknownError: "Ett okänt fel inträffade.",
    artError: "Misslyckades med att generera konceptkonst.",
    videoError: "Misslyckades med att generera video.",
    storyboardError: "Misslyckades med att generera storyboard.",
    invalidUrlError: "Ange ett giltigt URL-format.",
  }
};


export const videoGenerationStages: { [lang in Language]: { [key: string]: string } } = {
  en: {
    init: 'Initialize',
    render: 'Render',
    finalize: 'Finalize',
  },
  sv: {
    init: 'Initiera',
    render: 'Rendera',
    finalize: 'Slutför',
  },
};

export const suggestionSystemPrompts: { [lang in Language]: string } = {
  en: `You are an AI assistant that helps users refine their video ideas. Based on the user's input, provide 3 concise and creative alternative ideas. Focus on making them more visually interesting and specific. Respond only with a JSON array of strings.`,
  sv: `Du är en AI-assistent som hjälper användare att förfina sina video-idéer. Baserat på användarens input, ge 3 korta och kreativa alternativa idéer. Fokusera på att göra dem mer visuellt intressanta och specifika. Svara endast med en JSON-array av strängar.`,
};

export const trendingSystemPrompts: { [lang in Language]: string } = {
  en: `You are a creative director who is an expert on current social media and video trends. Your task is to generate 4 diverse and inspiring example prompts for the Veo video generation model that reflect what's currently trending online. Use Google Search to find out what's popular right now. Each example must include a title, a core idea, a fully fleshed-out prompt, and the exact parameters used to create it. The parameters must be chosen from the provided lists. You can also set artStyle to 'Custom' and provide a detailed description in the customArtStyle field. Respond only with a JSON array matching the specified schema. Do not wrap the JSON in markdown.`,
  sv: `Du är en kreativ chef som är expert på aktuella trender inom sociala medier och video. Din uppgift är att skapa 4 olika och inspirerande exempel-prompter för Veo-videogenereringsmodellen som speglar vad som är trendigt online just nu. Använd Google Search för att ta reda på vad som är populärt. Varje exempel måste innehålla en titel, en grundidé, en fullständigt utarbetad prompt och de exakta parametrarna som användes för att skapa den. Parametrarna måste väljas från de angivna listorna. Du kan även sätta artStyle till 'Custom' och ge en detaljerad beskrivning i fältet customArtStyle. Svara endast med en JSON-array som följer det specificerade schemat. Inkludera inte JSON i markdown.`,
};

export const storyboardSystemPrompt: { [lang in Language]: string } = {
    en: `You are an AI storyboard artist. Based on the provided video prompt, break it down into 4 key visual moments. For each moment, create a concise and descriptive image generation prompt that captures the scene. The prompts should be distinct and show a progression. Respond only with a JSON array of 4 strings.`,
    sv: `Du är en AI-storyboard-artist. Baserat på den angivna videoprompten, bryt ner den i 4 visuella nyckelögonblick. För varje ögonblick, skapa en koncis och beskrivande bildgenereringsprompt som fångar scenen. Prompterna ska vara distinkta och visa en progression. Svara endast med en JSON-array med 4 strängar.`,
};

export const videoAnalysisSystemPrompt: { [lang in Language]: string } = {
    en: `You are an AI video analyst. The user will provide a YouTube URL. Your task is to analyze the video's content, style, and structure, and then suggest how to create a similar video using the Veo prompt generator. Identify the key visual elements, camera work, art style, and overall mood. Then, provide a concise summary of your findings and suggest specific parameters (like art style, camera movement, color palette, etc.) that the user could select in the prompt generator to achieve a similar result. Format your response clearly.`,
    sv: `Du är en AI-videoanalytiker. Användaren kommer att ange en YouTube-URL. Din uppgift är att analysera videons innehåll, stil och struktur, och sedan föreslå hur man kan skapa en liknande video med Veo-promptgeneratorn. Identifiera de viktigaste visuella elementen, kameraarbetet, konststilen och den övergripande stämningen. Ge sedan en koncis sammanfattning av dina resultat och föreslå specifika parametrar (som konststil, kamerarörelse, färgpalett, etc.) som användaren kan välja i promptgeneratorn för att uppnå ett liknande resultat. Formatera ditt svar tydligt.`,
};


export const promptTemplates: { [lang in Language]: string } = {
  en: `Generate a detailed, high-quality, and coherent prompt for the Veo video generation model based on the following parameters. The prompt should be a single, continuous paragraph, weaving the parameters together into a natural and descriptive narrative. Think like a director.

The final prompt should be a creative interpretation of these elements, not just a list.

{parameterList}
`,
  sv: `Generera en detaljerad, högkvalitativ och sammanhängande prompt för videogenereringsmodellen Veo baserat på följande parametrar. Prompten ska vara ett enda, kontinuerligt stycke som väver samman parametrarna till en naturlig och beskrivande berättelse. Tänk som en regissör.

Den slutliga prompten ska vara en kreativ tolkning av dessa element, inte bara en lista.

{parameterList}
`,
};


export const seriesInstructions: { [lang in Language]: string } = {
  en: `The user wants a series of videos. Structure the output as a mini-series with 3 short, connected episodes. Each episode should have a title (using markdown H3, e.g., ### Episode 1: The Discovery) followed by its own detailed prompt paragraph. Ensure there's a clear narrative progression across the episodes.`,
  sv: `Användaren vill ha en serie videor. Strukturera resultatet som en miniserie med 3 korta, sammanhängande avsnitt. Varje avsnitt ska ha en titel (med markdown H3, t.ex. ### Avsnitt 1: Upptäckten) följt av sitt eget detaljerade prompt-stycke. Se till att det finns en tydlig narrativ utveckling mellan avsnitten.`,
};


export const parameterLabels: { [lang in Language]: { [key: string]: string } } = {
  en: {
    idea: 'Core Idea',
    environment: 'Environment',
    characterActions: 'Character & Actions',
    characterGender: 'Character Gender',
    characterEthnicity: 'Character Ethnicity',
    characterClothing: 'Character Clothing',
    timeOfDay: 'Time of Day',
    weather: 'Weather',
    voiceOver: 'Voice-over Script',
    voiceStyle: 'Voice Style',
    ambientSound: 'Ambient Sound',
    soundEffectsIntensity: 'Sound Effects Intensity',
    negativePrompt: 'Negative Prompt',
    optimizeFor8Seconds: 'Optimization',
    artStyle: 'Art Style',
    cameraMovement: 'Camera Movement',
    cameraDistance: 'Camera Distance',
    lensType: 'Lens Type',
    visualEffect: 'Visual Effect',
    colorPalette: 'Color Palette',
    aspectRatio: 'Aspect Ratio',
    animationPreset: 'Animation Preset',
    motionIntensity: 'Motion Intensity',
    creativityLevel: 'Creativity Level',
    overlayText: 'Overlay Text',
  },
  sv: {
    idea: 'Grundidé',
    environment: 'Miljö',
    characterActions: 'Karaktär & Handlingar',
    characterGender: 'Karaktärs kön',
    characterEthnicity: 'Karaktärs etnicitet',
    characterClothing: 'Karaktärs klädsel',
    timeOfDay: 'Tid på dygnet',
    weather: 'Väder',
    voiceOver: 'Berättarröst-manus',
    voiceStyle: 'Röststil',
    ambientSound: 'Omgivningsljud',
    soundEffectsIntensity: 'Ljudintensitet',
    negativePrompt: 'Negativ Prompt',
    optimizeFor8Seconds: 'Optimering',
    artStyle: 'Konststil',
    cameraMovement: 'Kamerarörelse',
    cameraDistance: 'Kameraavstånd',
    lensType: 'Objektivtyp',
    visualEffect: 'Visuell Effekt',
    colorPalette: 'Färgpalett',
    aspectRatio: 'Bildförhållande',
    animationPreset: 'Animationsförinställning',
    motionIntensity: 'Rörelseintensitet',
    creativityLevel: 'Kreativitetsnivå',
    overlayText: 'Textöverlägg',
  },
};

export const parameterValues: { [lang in Language]: {
    none: {
        visualEffect: string;
        animationPreset: string;
        voiceStyle: string;
        ambientSound: string;
        soundEffectsIntensity: string;
    };
    optimization: string;
    overlay: string;
} } = {
    en: {
        none: {
            visualEffect: 'no specific visual effect',
            animationPreset: 'no specific animation preset',
            voiceStyle: 'silent, with ambient sounds or music only',
            ambientSound: 'no specific ambient sound',
            soundEffectsIntensity: 'no sound effects',
        },
        optimization: 'The final video must be exactly 8 seconds long.',
        overlay: 'The video should include stylized, animated text overlays that complement the content.',
    },
    sv: {
        none: {
            visualEffect: 'ingen specifik visuell effekt',
            animationPreset: 'ingen specifik animationsförinställning',
            voiceStyle: 'tyst, endast med omgivningsljud eller musik',
            ambientSound: 'inget specifikt omgivningsljud',
            soundEffectsIntensity: 'inga ljudeffekter',
        },
        optimization: 'Den slutliga videon måste vara exakt 8 sekunder lång.',
        overlay: 'Videon ska innehålla stiliserade, animerade textöverlägg som kompletterar innehållet.',
    },
};

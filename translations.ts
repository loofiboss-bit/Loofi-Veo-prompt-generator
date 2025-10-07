type Language = 'en' | 'sv';

export const uiStrings: { [key: string]: { [lang in Language]: string } } = {
  headerTitle: {
    en: 'Veo Prompt Generator',
    sv: 'Veo Promptgenerator'
  },
  headerSubtitle: {
    en: 'Craft cinematic video prompts from your ideas with the power of AI.',
    sv: 'Skapa filmiska videoprompter från dina idéer med hjälp av AI.'
  },
  coreIdeaLabel: {
    en: 'Core Idea',
    sv: 'Grundidé'
  },
  coreIdeaPlaceholder: {
    en: 'e.g., A robot exploring an ancient, overgrown temple',
    sv: 't.ex., En robot som utforskar ett gammalt, övervuxet tempel'
  },
  youtubeUrlLabel: {
    en: '...or get inspiration from a video',
    sv: '...eller få inspiration från en video'
  },
  youtubeUrlPlaceholder: {
    en: 'Paste a YouTube link here...',
    sv: 'Klistra in en YouTube-länk här...'
  },
  analyzeVideoButton: {
    en: 'Analyze',
    sv: 'Analysera'
  },
  analyzingVideoButton: {
    en: 'Analyzing...',
    sv: 'Analyserar...'
  },
  environmentLabel: {
    en: 'Environment / Setting',
    sv: 'Miljö / Omgivning'
  },
  environmentPlaceholder: {
    en: 'e.g., A dense jungle with towering, vine-covered ruins. Sunbeams pierce the canopy.',
    sv: 't.ex., En tät djungel med höga, klätterväxttäckta ruiner. Solstrålar tränger igenom lövverket.'
  },
  timeOfDayLabel: {
    en: 'Time of Day',
    sv: 'Tid på dygnet'
  },
  weatherLabel: {
    en: 'Weather',
    sv: 'Väder'
  },
  characterActionsLabel: {
    en: 'Character Actions',
    sv: 'Karaktärshandlingar'
  },
  characterActionsPlaceholder: {
    en: 'e.g., The robot cautiously steps over ancient roots, its metallic hand brushing away thick cobwebs. Its glowing blue optic sensor scans the area.',
    sv: 't.ex., Roboten kliver försiktigt över uråldriga rötter, dess metallhand borstar bort tjocka spindelnät. Dess lysande blå optiska sensor skannar området.'
  },
  characterDetailsTitle: {
    en: 'Character Details',
    sv: 'Karaktärsdetaljer'
  },
  characterGenderLabel: {
    en: 'Gender',
    sv: 'Kön'
  },
  characterEthnicityLabel: {
    en: 'Ethnicity',
    sv: 'Etnicitet'
  },
  characterClothingLabel: {
    en: 'Clothing Style',
    sv: 'Klädstil'
  },
  voiceOverLabel: {
    en: 'Voice Over Script (optional)',
    sv: 'Berättarröst (valfritt)'
  },
  voiceOverPlaceholder: {
    en: `e.g., 'In a world where shadows dance...'`,
    sv: `t.ex., 'I en värld där skuggor dansar...'`
  },
  voiceStyleLabel: { en: 'Voice Style', sv: 'Röststil' },
  soundDesignTitle: { en: 'Sound Design', sv: 'Ljuddesign' },
  ambientSoundLabel: { en: 'Ambient Sounds', sv: 'Omgivningsljud' },
  soundEffectsIntensityLabel: { en: 'Sound Effects Intensity', sv: 'Ljudeffektsintensitet' },
  artStyleLabel: { en: 'Art Style', sv: 'Konststil' },
  customArtStyleLabel: {
    en: 'Custom Art Style Description',
    sv: 'Beskrivning av Anpassad Konststil'
  },
  customArtStylePlaceholder: {
    en: 'e.g., Psychedelic vaporwave album cover art, heavily saturated with neon pinks and blues',
    sv: 't.ex., Omslag till ett psykedeliskt vaporwave-album, kraftigt mättad med neonrosa och blått'
  },
  cameraMovementLabel: { en: 'Camera Movement', sv: 'Kamerarörelse' },
  cameraDistanceLabel: { en: 'Camera Distance', sv: 'Kameraavstånd' },
  lensTypeLabel: { en: 'Lens Type', sv: 'Objektivtyp' },
  cameraControlsTitle: { en: 'Camera Controls', sv: 'Kamerakontroller' },
  visualEffectLabel: { en: 'Visual Effect', sv: 'Visuell Effekt' },
  colorPaletteLabel: { en: 'Color Palette', sv: 'Färgpalett' },
  aspectRatioLabel: { en: 'Aspect Ratio', sv: 'Bildförhållande'},
  animationPresetLabel: { en: 'Animation Preset', sv: 'Animationsförinställning' },
  motionIntensityLabel: { en: 'Motion Intensity', sv: 'Rörelseintensitet' },
  motionIntensityTooltip: { 
    en: 'Controls the amount and speed of camera and subject movement in the video.', 
    sv: 'Styr mängden och hastigheten på kamera- och objektrörelser i videon.' 
  },
  creativityLevelLabel: { en: 'Creativity Level', sv: 'Kreativitetsnivå' },
  creativityLevelTooltip: { 
    en: 'How much the model should adhere to the prompt vs. taking creative liberties. "Grounded" is more literal, "Imaginative" is more surreal.', 
    sv: 'Hur mycket modellen ska följa prompten kontra att ta kreativa friheter. "Verklighetsförankrad" är mer bokstavlig, "Mycket Fantasifull" är mer surrealistisk.' 
  },
  negativePromptLabel: {
    en: 'Negative Prompts (Optional)',
    sv: 'Negativa Prompter (Valfritt)'
  },
  negativePromptPlaceholder: {
    en: 'e.g., blurry, text, watermark, humans, oversaturated',
    sv: 't.ex., suddigt, text, vattenstämpel, människor, övermättad'
  },
  negativePromptTooltip: {
    en: 'Specify elements, styles, or concepts to exclude from the video. Helps refine the output by telling the AI what to avoid.',
    sv: 'Ange element, stilar eller koncept som ska uteslutas från videon. Hjälper till att förfina resultatet genom att tala om för AI:n vad den ska undvika.'
  },
  tabScene: { en: 'Scene', sv: 'Scen' },
  tabStyle: { en: 'Style', sv: 'Stil' },
  tabCameraAudio: { en: 'Camera & Audio', sv: 'Kamera & Ljud' },
  tabAdvanced: { en: 'Advanced', sv: 'Avancerat' },
  optimizeLabel: {
    en: 'Optimize for Veo 3 Fast (8 seconds)',
    sv: 'Optimera för Veo 3 Fast (8 sekunder)'
  },
  optimizeTooltip: {
    en: 'Generates a more concise prompt suitable for Veo\'s faster 8-second generation mode. Focuses on a single, high-impact action.',
    sv: 'Genererar en mer koncis prompt anpassad för Veos snabbare 8-sekundersgenereringsläge. Fokuserar på en enskild, slagkraftig handling.'
  },
  overlayLabel: {
    en: 'Include stylish overlay text',
    sv: 'Inkludera snygg överlagd text'
  },
  overlayTooltip: {
    en: 'Instructs the AI to include and describe integrated text overlays within the scene, matching the overall aesthetic.',
    sv: 'Instruerar AI:n att inkludera och beskriva integrerad textöverlagring i scenen, som matchar den övergripande estetiken.'
  },
  googleSearchLabel: {
    en: 'Ground with Google Search',
    sv: 'Grunda med Google Sökning'
  },
  googleSearchTooltip: {
    en: 'Allows the AI to use Google Search for up-to-date information. Ideal for prompts about recent events or specific topics.',
    sv: 'Tillåter AI:n att använda Google Sökning för aktuell information. Perfekt för prompter om nyliga händelser eller specifika ämnen.'
  },
  generateAsSeriesLabel: {
    en: 'Generate as a Series (3-5 episodes)',
    sv: 'Generera som en Serie (3-5 avsnitt)'
  },
  generateAsSeriesTooltip: {
    en: 'When combined with Google Search, this generates a series of connected prompts. Great for tutorials or episodic content.',
    sv: 'I kombination med Google Sökning genereras en serie sammanhängande prompter. Perfekt för guider eller avsnittsbaserat innehåll.'
  },
  generateButton: { en: 'Generate Prompt', sv: 'Generera Prompt' },
  generatingButton: { en: 'Crafting Prompt...', sv: 'Skapar Prompt...' },
  showExamplesButton: { en: 'Show Examples', sv: 'Visa Exempel' },
  showingExamplesButton: { en: 'Getting Examples...', sv: 'Hämtar Exempel...' },
  hideExamplesButton: { en: 'Hide Examples', sv: 'Dölj Exempel' },
  showTrendingButton: { en: 'Show Trending', sv: 'Visa Trender' },
  showingTrendingButton: { en: 'Loading Trending...', sv: 'Laddar Trender...' },
  hideTrendingButton: { en: 'Hide Trending', sv: 'Dölj Trender' },
  templatesButtonLabel: { en: 'Templates', sv: 'Mallar' },
  shareButtonLabel: {
    en: 'Share Prompt',
    sv: 'Dela Prompt'
  },
  shareConfirmation: {
    en: 'Link copied to clipboard!',
    sv: 'Länk kopierad till urklipp!'
  },
  shareError: {
    en: 'Could not create share link. Please try again.',
    sv: 'Kunde inte skapa delningslänk. Vänligen försök igen.'
  },
  templatesPanelTitle: { en: 'Prompt Templates', sv: 'Promptmallar' },
  templateUseButton: { en: 'Use Template', sv: 'Använd Mall' },
  examplesTitle: { en: 'Inspiration Gallery', sv: 'Inspirationsgalleri' },
  trendingTitle: { en: 'Trending on Veo', sv: 'Populärt på Veo' },
  useExampleButton: { en: 'Use this Example', sv: 'Använd detta Exempel' },
  suggestRefinementsButton: { en: 'Suggest Refinements', sv: 'Föreslå Förfiningar' },
  suggestingRefinementsButton: { en: 'Suggesting...', sv: 'Föreslår...' },
  suggestionsTitle: { en: 'Suggestions', sv: 'Förslag' },
  useSuggestionButton: { en: 'Use', sv: 'Använd' },
  generateAudioButton: { en: 'Generate Audio', sv: 'Generera Ljud' },
  generatingAudioButton: { en: 'Generating...', sv: 'Genererar...' },
  audioOutputTitle: { en: 'Generated Audio', sv: 'Genererat Ljud' },
  downloadAudio: { en: 'Download Audio', sv: 'Ladda ner Ljud' },
  audioUnsupported: { en: 'Your browser does not support the audio element.', sv: 'Din webbläsare stöder inte ljudelementet.' },
  videoOutputTitle: { en: 'Generated Video', sv: 'Genererad Video' },
  generateVideoButton: { en: 'Generate Video', sv: 'Generera Video' },
  generatingVideoButton: { en: 'Generating...', sv: 'Genererar...' },
  downloadVideo: { en: 'Download Video', sv: 'Ladda ner Video' },
  videoUnsupported: { en: 'Your browser does not support the video tag.', sv: 'Din webbläsare stöder inte videotaggen.' },
  generateStoryboardButton: { en: 'Generate Storyboard', sv: 'Generera Storyboard' },
  generatingStoryboardButton: { en: 'Generating Storyboard...', sv: 'Genererar Storyboard...' },
  storyboardTitle: { en: 'Storyboard Keyframes', sv: 'Storyboard Nyckelbilder' },
  errorStoryboard: { en: 'Could not generate the storyboard. Please try again.', sv: 'Kunde inte generera storyboard. Vänligen försök igen.'},
  errorMissingIdea: {
    en: 'Please enter a core idea for your video.',
    sv: 'Vänligen ange en grundidé för din video.'
  },
  errorAudioGeneration: {
    en: 'Could not generate audio. Please ensure the script is not empty.',
    sv: 'Kunde inte generera ljud. Vänligen se till att manuset inte är tomt.'
  },
  errorVideoGeneration: {
    en: 'Video generation failed. Please try again.',
    sv: 'Videogenerering misslyckades. Vänligen försök igen.'
  },
  errorSuggestions: {
    en: 'Could not generate suggestions. Please try again.',
    sv: 'Kunde inte generera förslag. Vänligen försök igen.'
  },
  errorTrending: { 
    en: 'Could not fetch trending prompts. Please try again.', 
    sv: 'Kunde inte hämta trendande prompter. Vänligen försök igen.'
  },
  errorGeneric: {
    en: 'An unexpected error occurred. Please try again.',
    sv: 'Ett oväntat fel inträffade. Vänligen försök igen.'
  },
  errorApiKey: {
    en: 'Invalid API Key. Please ensure it is configured correctly.',
    sv: 'Ogiltig API-nyckel. Vänligen se till att den är korrekt konfigurerad.'
  },
  errorRateLimit: {
    en: 'You have made too many requests. Please wait a moment and try again.',
    sv: 'Du har gjort för många förfrågningar. Vänta en stund och försök igen.'
  },
  errorSafety: {
    en: 'The response was blocked due to safety settings. Please adjust your prompt.',
    sv: 'Svaret blockerades på grund av säkerhetsinställningar. Vänligen justera din prompt.'
  },
  errorNetwork: {
    en: 'A network error occurred. Please check your connection and try again.',
    sv: 'Ett nätverksfel inträffade. Kontrollera din anslutning och försök igen.'
  },
  errorValidation: {
    en: 'Please fix the errors before generating.',
    sv: 'Vänligen åtgärda felen innan du genererar.'
  },
  errorInvalidUrl: {
    en: 'Please enter a valid YouTube URL.',
    sv: 'Vänligen ange en giltig YouTube-URL.'
  },
  validationRequired: {
    en: 'This field is required.',
    sv: 'Detta fält är obligatoriskt.'
  },
  validationMinLength: {
    en: 'Please enter at least {min} characters.',
    sv: 'Vänligen ange minst {min} tecken.'
  },
  validationMaxLength: {
    en: 'Cannot exceed {max} characters.',
    sv: 'Får inte överstiga {max} tecken.'
  },
  validationNegativePromptLongWord: {
    en: 'Negative prompt contains a very long word. Try using separate, concise keywords.',
    sv: 'Negativ prompt innehåller ett mycket långt ord. Försök använda separata, korta nyckelord.'
  },
  validationNegativePromptUnhelpful: {
    en: "Terms like 'bad' or 'ugly' are often ineffective. The AI already aims for high quality. Try being more specific about what to avoid (e.g., 'oversaturated', 'blurry').",
    sv: "Termer som 'dålig' eller 'ful' är ofta ineffektiva. AI:n siktar redan på hög kvalitet. Försök vara mer specifik med vad som ska undvikas (t.ex. 'övermättad', 'suddig')."
  },
  promptOutputTitle: { en: 'Your Veo Prompt:', sv: 'Din Veo-prompt:' },
  sourcesTitle: {
    en: 'Sources from Google Search',
    sv: 'Källor från Google Sökning'
  },
  promptOutputCopied: { en: 'Copied!', sv: 'Kopierad!' },
  promptOutputEdit: { en: 'Edit', sv: 'Redigera' },
  promptOutputSave: { en: 'Save', sv: 'Spara' },
  promptOutputCancel: { en: 'Cancel', sv: 'Avbryt' },
  promptOutputVoiceOverTitle: { en: 'Voice Over Script', sv: 'Manus för Berättarröst' },
  promptOutputCopyAll: { en: 'Copy All', sv: 'Kopiera Allt' },
  promptOutputCopyPrompt: { en: 'Copy Prompt', sv: 'Kopiera Prompt' },
  promptOutputGenerateArt: { en: 'Generate Art', sv: 'Generera Bild' },
  conceptArtTitle: { en: 'Concept Art', sv: 'Konceptbild' },
  generatingArt: { en: 'Generating Art...', sv: 'Genererar Bild...' },
  editArtLabel: {
    en: 'Edit Your Art',
    sv: 'Redigera Din Bild'
  },
  editArtPlaceholder: {
    en: 'e.g., make the sky night time, add a second moon',
    sv: 't.ex., gör himlen till natt, lägg till en andra måne'
  },
  editArtButton: {
    en: 'Edit with AI',
    sv: 'Redigera med AI'
  },
  editingArtButton: {
    en: 'Editing...',
    sv: 'Redigerar...'
  },
  historyButtonLabel: {
    en: 'History',
    sv: 'Historik'
  },
  historyPanelTitle: {
    en: 'Prompt History',
    sv: 'Prompthistorik'
  },
  historyClearButton: {
    en: 'Clear History',
    sv: 'Rensa Historik'
  },
  historyClearConfirm: {
    en: 'Are you sure you want to clear all prompt history? This action cannot be undone.',
    sv: 'Är du säker på att du vill rensa all prompthistorik? Denna åtgärd kan inte ångras.'
  },
  historyEmpty: {
    en: 'Your generated prompts will appear here.',
    sv: 'Dina genererade prompter kommer att visas här.'
  },
  historyUseButton: {
    en: 'Use Prompt',
    sv: 'Använd Prompt'
  },
  historyDeleteButtonLabel: {
    en: 'Delete prompt',
    sv: 'Ta bort prompt'
  },
  historyDeleteConfirm: {
    en: 'Are you sure you want to delete this prompt?',
    sv: 'Är du säker på att du vill ta bort den här prompten?'
  },
  footerText: {
    en: 'Powered by Gemini. Designed for Veo.',
    sv: 'Drivs av Gemini. Designad för Veo.'
  }
};

export const suggestionSystemPrompts: { [lang in Language]: string } = {
  en: "You are an AI creative assistant specializing in viral video concepts for Google's Veo. Your task is to analyze a user's core idea and provide 1 or 2 concise, creative refinements. These refinements should make the idea more visually interesting, trendy, or emotionally impactful for a short video format. Focus on adding a unique twist, a compelling visual element, or a surprising narrative turn. Respond ONLY with a JSON array of strings, where each string is a suggested idea.",
  sv: "Du är en kreativ AI-assistent som specialiserat sig på virala videokoncept för Googles Veo. Din uppgift är att analysera en användares grundidé och ge 1 eller 2 koncisa, kreativa förfiningar. Dessa förfiningar ska göra idén mer visuellt intressant, trendig eller känslomässigt slagkraftig för ett kort videoformat. Fokusera på att lägga till en unik twist, ett fängslande visuellt element eller en överraskande narrativ vändning. Svara ENDAST med en JSON-array av strängar, där varje sträng är en föreslagen idé."
};

export const trendingSystemPrompts: { [lang in Language]: string } = {
  en: `You are an AI trend analyst for a video generation platform like Google's Veo. Your task is to generate 4 diverse example prompts that reflect the most popular and viral trends in AI-generated video content. Each example must include a title, a core idea, a fully fleshed-out prompt, and parameters chosen from the provided lists. The trends to cover are: 1) "Satisfying" ASMR-style animations (e.g., kinetic sand, soap cutting, machines), 2) Lo-fi / Chillhop aesthetic loops (e.g., studying girl, rainy window), 3) AI Influencer / Vlog content, 4) Miniature world content (e.g., tiny cooking, small dioramas). Respond only with a JSON array matching the specified schema.`,
  sv: `Du är en AI-trendanalytiker för en videogenereringsplattform som Googles Veo. Din uppgift är att generera 4 olika exempelprompter som återspeglar de mest populära och virala trenderna inom AI-genererat videoinnehåll. Varje exempel måste innehålla en titel, en grundidé, en fullständigt utarbetad prompt och parametrar valda från de angivna listorna. Trenderna som ska täckas är: 1) "Tillfredsställande" ASMR-stil-animationer (t.ex. kinetisk sand, tvålklippning, maskiner), 2) Lo-fi / Chillhop-estetik-loopar (t.ex. studerande tjej, regnigt fönster), 3) AI-influencer / Vlogg-innehåll, 4) Miniatyrvärldsinnehåll (t.ex. pytteliten matlagning, små dioramor). Svara endast med en JSON-array som följer det specificerade schemat.`
};

export const videoAnalysisSystemPrompt: { [lang in Language]: string } = {
    en: `You are an AI creative director acting as a "scene scout." You will be given a YouTube URL. You cannot watch the video. Based on the URL and any information you can infer from it (like a potential title or topic), your task is to imagine and describe a single, visually compelling, and cinematic scene that could plausibly be from such a video.

Your output must be a single, detailed paragraph. Do not mention the URL or the fact that you are guessing. Just describe the scene.

Focus on:
- **Environment:** What does the setting look and feel like? Use sensory details.
- **Subjects/Characters:** Who or what is in the scene?
- **Actions:** What is happening? Describe the key movement or event.
- **Mood:** What is the overall tone (e.g., mysterious, epic, serene, chaotic)?

The description you write will be used as the "Core Idea" for a new video prompt. It needs to be rich enough to inspire a full scene.`,
    sv: `Du är en kreativ AI-regissör som agerar som en "scen-scout". Du kommer att få en YouTube-URL. Du kan inte se videon. Baserat på URL:en och all information du kan härleda från den (som en potentiell titel eller ämne), är din uppgift är att föreställa dig och beskriva en enda, visuellt fängslande och filmisk scen som troligtvis skulle kunna komma från en sådan video.

Ditt svar måste vara ett enda, detaljerat stycke. Nämn inte URL:en eller det faktum att du gissar. Beskriv bara scenen.

Fokusera på:
- **Miljö:** Hur ser och känns omgivningen? Använd sensoriska detaljer.
- **Subjekt/Karaktärer:** Vem eller vad finns i scenen?
- **Handlingar:** Vad händer? Beskriv den centrala rörelsen eller händelsen.
- **Stämning:** Vad är den övergripande tonen (t.ex. mystisk, episk, fridfull, kaotisk)?

Beskrivningen du skriver kommer att användas som "Grundidé" för en ny videoprompt. Den måste vara tillräckligt innehållsrik för att inspirera en hel scen.`
};

export const storyboardSystemPrompt: { [lang in Language]: string } = {
    en: `You are an AI storyboard artist. Your task is to analyze a detailed video prompt and break it down into 3-5 distinct, chronological keyframes. For each keyframe, write a concise, descriptive prompt suitable for an image generation model. Focus on capturing the most important visual moments: establishing shots, character actions, and climactic events. Respond ONLY with a JSON array of strings, where each string is an image prompt for a single keyframe.`,
    sv: `Du är en AI-storyboardartist. Din uppgift är att analysera en detaljerad videoprompt och dela upp den i 3-5 distinkta, kronologiska nyckelbilder. För varje nyckelbild, skriv en koncis, beskrivande prompt som är lämplig för en bildgenereringsmodell. Fokusera på att fånga de viktigaste visuella ögonblicken: etableringsbilder, karaktärshandlingar och klimatiska händelser. Svara ENDAST med en JSON-array av strängar, där varje sträng är en bildprompt för en enskild nyckelbild.`
};


export const promptTemplates = {
  sv: `
    Du är en hyllad AI-filmregissör och filmfotograf, en expert på att översätta enkla koncept till visuellt slående och känslomässigt laddade videosekvenser för Veo. Din uppgift är att ta en användares idé och stilistiska val och skriva ett enda, mästerligt och mycket detaljerat stycke som fungerar som en direkt prompt för videogenereringsmodellen.

    Tänk som en regissör. Rada inte bara upp element; bygg en värld. Prompten måste vara en rik narrativ väv som flätar samman karaktär, handling, miljö och stämning. Den ska vara så levande att man kan se den färdiga tagningen innan den ens har skapats.

    Inkorporera följande element sömlöst:
    {parameterList}

    Om "Element att undvika" specificeras, se till att ABSOLUT UNDVIKA att inkludera dessa koncept, objekt eller stilar i den genererade videon. Detta är en strikt begränsning.
    
    Din kreativa process:
    1.  **Analysera Idén:** Vad är den centrala känslan eller berättelsen?
    2.  **Förkroppsliga Stilen:** Använd nyckelordsassociationerna nedan inte som en checklista, utan som en palett. Hur *känns* en "Cyberpunk"-scen? Vad *gör* "Impressionistiskt" ljus?
    3.  **Regissera Scenen:** Beskriv miljön med sensoriska detaljer – luftens textur, ljusets kvalitet, de subtila ljuden. Regissera karaktärens handlingar och motivationer.
    4.  **Komponera Bilden:** Kameraarbetet är också en karaktär. Beskriv inte bara vinkeln, utan *syftet* med rörelsen. Kompositionen måste strikt följa det angivna bildförhållandet.
    5.  **Orkestrera Ljud & Bild: DETTA ÄR DET VIKTIGASTE STEGET.**
        *   **Röststil:** Denna parameter dikterar *tonen och personligheten* för all antydd eller explicit berättarröst. En 'Dokumentärberättare' antyder ett stadigt, informativt tempo, medan en 'Högenergi-utropare' föreslår snabba klipp och dynamisk action. Videons övergripande stämning – dess tempo, redigering och känslomässiga känsla – måste direkt påverkas av detta val, även om inget manus tillhandahålls. Om den är inställd på 'Ingen' drivs scenens ljud av omgivningsljud och musik.
        *   **Manus för berättarröst:** Om ett manus tillhandahålls är det den absoluta **MÄSTAR-GUIDEN**. Ditt primära direktiv är att genomföra en djup analys av manuset och skapa visuella element som är perfekt synkroniserade med dess timing, tempo och känslomässiga ton.
            *   **Nyckelordsanalys:** Identifiera centrala substantiv, verb och adjektiv (t.ex. "svävande," "ödslig," "glädjefylld") och översätt dem till direkta visuella representationer. Ett ord som "svävande" bör utlösa en episk drönarvy eller en stigande kamerarörelse. "Ödslig" bör påverka kompositionen att inkludera stora tomma ytor.
            *   **Analys av Känslomässiga Ledtrudar:** Upptäck den känslomässiga bågen i manuset. När tonen skiftar från hoppfull till spänd, till exempel, översätt detta till en påtaglig förändring i det visuella. Detta kan vara en förändring i färggraderingen från varma, gyllene nyanser till kalla, avmättade blå toner, eller en förändring i ljussättningen från mjuk till hård och dramatisk.
            *   **Tempo och Rytm:** Matcha kameraarbetet och klipptempot med manusets rytm. En snabb, energisk berättarröst kräver snabba klipp, dynamiska kamerarörelser (som whip pans eller åkningar), medan ett långsamt, kontemplativt manus kräver långa, stadiga tagningar och mjuka panoreringar.
            De visuella beskrivningarna av handlingar, kamerarörelser och scenkomposition måste exakt sammanfalla med dessa analyserade element för att skapa en kraftfull, enhetlig audiovisuell upplevelse. Varje bildruta ska tjäna berättarrösten.

    **Nyckelordspalett (Inspiration, inte en checklista):**
    - Filmisk: anamorfa linser, kort skärpedjup, motiverad ljussättning, filmkorn, mästerlig komposition, fokusdragning, medvetna kamerarörelser, hög kontrast, negativt utrymme, filmisk halation, kompositionsledande linjer.
    - Fotorealistisk: hyperdetaljerade PBR-texturer, korrekt strålspårad (ray-traced) ljussättning och skuggor, högt dynamiskt omgång (HDR), subsurface scattering, kaustik, subtila verkliga ofullkomligheter som kromatisk aberration och linsdamm.
    - Vlogg 4K: skarp 4K-upplösning, professionell LUT-färggradering, gimbal-stabiliserad känsla, motivföljande autofokus, vänligt direkt-mot-kameran-perspektiv, naturligt ljus, snabba klipp, engagerande B-roll med dynamiskt omfång.
    - Gorilla Viral-stil: autentiskt UGC, skakig kamera, vertikal video, opolerad, rå, omedelbar, digitala zoomartefakter, utfrätta högdagrar, oplanerade panoreringar, skev inramning, antydan till klippande ljud, rolling shutter.
    - Anime: sakuga-stil med flytande animation, dynamiska actionlinjer, överdrivna uttryck, Ghibli-liknande detaljerade bakgrunder, livfulla cel-shadade paletter, dramatisk inramning, impact frames.
    - Leranimation: stop-motion med subtil "boiling"-effekt, påtagliga texturer, handgjord känsla, tumavtrycksofullkomligheter, nyckfulla rörelser, praktisk ljussättning på miniatyrset, kort skärpedjup.
    - Surrealism: drömlogik, Dali-liknande landskap, Escher-liknande omöjlig arkitektur, bisarra juxtapositioner, symboliska bilder, smältande objekt, icke-linjärt berättande, metaforiska visuella element.
    - Impressionistisk: måleriska penseldrag, mjukt fokus, skimrande bokeh, abstraherade detaljer, fokus på stämning över realism, synliga penseldrag, fläckigt ljus ('en plein air'), brutna färger, fångandet av ett flyktigt ögonblick.
    - Vintage 1950-talsfilm: tre-strips Technicolor-mättnad, djupt fokus-cinematografi, klassiska bilar och mode, tungt filmkorn, formella kompositioner, dramatiska noir-skuggor, "gate weave", estetik från mitten av århundradet.
    - Cyberpunk: Blade Runner-inspirerad estetik, neondränkt, dystopisk, high-tech low-life, regnblanka gator med anamorfa linsöverstrålningar, skyhöga megastrukturer, holografiska annonser, volymetrisk dimma, cybernetiska förbättringar.
    - Akvarell: vått-i-vått-teknik, blödande färger på en texturerad pappersyta, genomskinliga lager, mjuka kanter, finkänsliga laveringar, granulerande pigment, kontrollerade "blooms".
    - Gotisk Skräck: Tysk expressionism-influens, Chiaroscuro-ljussättning, långa, förvrängda skuggor, Dutch angles, krypande dimma, förtryckande, hotfull arkitektur, en påtaglig känsla av fasa och förfall.

    **Slutgiltig output:** Ett enda, tätt, målande stycke. Inga listor, inga inledningar. Endast prompten.

    Generera nu en prompt för användarens förfrågan.`,
  en: `
    You are an acclaimed AI film director and cinematographer, an expert in translating simple concepts into visually stunning and emotionally resonant video sequences for Veo. Your task is to take a user's idea and stylistic choices and write a single, masterful, and highly detailed paragraph that serves as a direct prompt for the video generation model.

    Think like a director. Don't just list elements; build a world. The prompt must be a rich narrative tapestry, weaving together character, action, environment, and mood. It should be so vivid that one can see the final shot before it's even created.

    Incorporate the following elements seamlessly:
    {parameterList}

    If "Elements to Avoid" is specified, you must STRICTLY AVOID including those concepts, objects, or styles in the generated video. This is a hard constraint.

    Your creative process:
    1.  **Deconstruct the Idea:** What is the core emotion or story beat?
    2.  **Embody the Style:** Use the keyword associations below not as a checklist, but as a palette. How does a "Cyberpunk" scene *feel*? What does "Impressionistic" light *do*?
    3.  **Direct the Scene:** Describe the setting with sensory details—the texture of the air, the quality of the light, the subtle sounds. Direct the character's actions and motivations.
    4.  **Frame the Shot:** The camera work is a character too. Describe not just the angle, but the *purpose* of the movement. The composition must strictly adhere to the specified Aspect Ratio.
    5.  **Orchestrate Audio & Visuals: THIS IS THE MOST CRITICAL STEP.**
        *   **Voice Style:** This parameter dictates the *tone and personality* of any implied or explicit narration. A 'Documentary Narrator' implies a steady, informative pace, while a 'High-Energy Announcer' suggests rapid cuts and dynamic action. The overall mood of the video—its pacing, editing, and emotional feel—must be directly influenced by this choice, even if no script is provided. If set to 'None', the scene's audio is driven by ambient sounds and a musical score.
        *   **Voice-Over Script:** If a script is provided, it is the absolute **MASTER GUIDE**. Your primary directive is to perform a deep analysis of the script and create visuals that are perfectly synchronized with its timing, pacing, and emotional tone.
            *   **Keyword Analysis:** Identify key nouns, verbs, and adjectives (e.g., "soaring," "desolate," "joyful") and translate them into direct visual representations. A word like "soaring" should trigger an epic drone shot or a rising camera movement. "Desolate" should influence the composition to include vast empty spaces.
            *   **Emotional Cue Analysis:** Detect the emotional arc of the script. As the tone shifts from hopeful to tense, for instance, translate this into a tangible change in the visuals. This could be a shift in color grading from warm, golden hues to cool, desaturated blues, or a change in lighting from soft to harsh and dramatic.
            *   **Pacing and Rhythm:** Match the camera work and editing pace to the script's rhythm. A fast-paced, energetic narration demands quick cuts, dynamic camera movements (like whip pans or tracking shots), whereas a slow, contemplative script requires long, steady shots, and gentle pans.
            The visual descriptions of actions, camera movements, and scene composition must align precisely with these analyzed elements to create a powerful, unified audio-visual experience. Every frame must serve the narration.

    **Keyword Palette (Inspiration, not a checklist):**
    - Cinematic: anamorphic lenses, shallow depth of field, motivated lighting, film grain, masterful composition, rack focus, deliberate camera movement, high contrast, negative space, filmic halation, compositional leading lines.
    - Photorealistic: hyper-detailed PBR textures, accurate ray-traced lighting and shadows, high dynamic range (HDR), subsurface scattering, caustics, subtle real-world imperfections like chromatic aberration and lens dust.
    - Vlog 4K: crisp 4K resolution, professional LUT color grading, gimbal-stabilized feel, subject tracking focus, friendly direct-to-camera perspective, natural lighting, fast cuts, engaging B-roll with dynamic range.
    - Gorilla Viral Style: authentic UGC, shaky cam, vertical video, unpolished, raw, immediate, digital zoom artifacts, blown-out highlights, unplanned pans, off-kilter framing, clipping audio hints, rolling shutter.
    - Anime: sakuga-style fluid animation, dynamic action lines, exaggerated expressions, Ghibli-esque detailed backgrounds, vibrant cel-shaded palettes, dramatic framing, impact frames.
    - Claymation: stop-motion with subtle boiling, tangible textures, handcrafted feel, thumbprint imperfections, whimsical movement, practical lighting on miniature sets, shallow depth of field.
    - Surrealism: dream logic, Dali-esque landscapes, Escher-like impossible architecture, bizarre juxtapositions, symbolic imagery, melting objects, non-linear narrative, metaphorical visuals.
    - Impressionistic: painterly strokes, soft focus, shimmering bokeh, abstracted details, focus on mood over realism, visible brushstrokes, dappled light ('en plein air'), broken color, capturing a fleeting moment.
    - Vintage 1950s Film: three-strip Technicolor saturation, deep focus cinematography, classic cars and fashion, heavy film grain, formal compositions, dramatic noir shadows, gate weave, mid-century modern aesthetics.
    - Cyberpunk: Blade Runner-inspired visuals, neon-drenched, dystopian, high-tech low-life, rain-slicked streets with anamorphic flares, towering megastructures, holographic ads, volumetric fog, cybernetic enhancements.
    - Watercolor: wet-on-wet technique, bleeding colors on a textured paper surface, translucent layers, soft edges, delicate washes of color, granulating pigments, controlled blooms.
    - Gothic Horror: German Expressionism influence, Chiaroscuro lighting, long, distorted shadows, Dutch angles, creeping fog, oppressive, looming architecture, a palpable sense of dread and decay.

    **Final Output:** A single, dense, evocative paragraph. No lists, no preambles. Only the prompt.
    
    Now, generate a prompt for the user's request.
  `
};

export const parameterLabels = {
    sv: {
        idea: "Användarens grundidé",
        environment: "Miljö / Omgivning",
        timeOfDay: "Tid på dygnet",
        weather: "Väder",
        characterActions: "Karaktärshandlingar",
        characterGender: "Karaktärens kön",
        characterEthnicity: "Karaktärens etnicitet",
        characterClothing: "Karaktärens klädstil",
        artStyle: "Konststil / Cinematografi",
        cameraMovement: "Kamerarörelse",
        cameraDistance: "Kameraavstånd",
        lensType: "Objektivtyp",
        visualEffect: "Visuell effekt",
        animationPreset: "Animation / Övergång",
        colorPalette: "Färg- & Ljuspalett",
        aspectRatio: "Bildförhållande",
        motionIntensity: "Rörelseintensitet",
        creativityLevel: "Kreativitetsnivå",
        voiceStyle: "Röststil",
        ambientSound: "Omgivningsljud",
        soundEffectsIntensity: "Ljudeffektsintensitet",
        voiceOver: "Berättarröst att synkronisera med",
        negativePrompt: "Element att undvika",
        optimizeFor8Seconds: "Särskild instruktion för Veo 3 Snabbläge",
        overlayText: "Överlagd text",
        useGoogleSearch: "Använd Google Sökning för aktuell information"
    },
    en: {
        idea: "User's Core Idea",
        environment: "Environment / Setting",
        timeOfDay: "Time of Day",
        weather: "Weather",
        characterActions: "Character Actions",
        characterGender: "Character Gender",
        characterEthnicity: "Character Ethnicity",
        characterClothing: "Character Clothing Style",
        artStyle: "Art Style / Cinematography",
        cameraMovement: "Camera Movement",
        cameraDistance: "Camera Distance",
        lensType: "Lens Type",
        visualEffect: "Visual Effect",
        animationPreset: "Animation / Transition",
        colorPalette: "Color & Light Palette",
        aspectRatio: "Aspect Ratio",
        motionIntensity: "Motion Intensity",
        creativityLevel: "Creativity Level",
        voiceStyle: "Voice Style",
        ambientSound: "Ambient Sound",
        soundEffectsIntensity: "Sound Effects Intensity",
        voiceOver: "Voice Over Script to sync with",
        negativePrompt: "Elements to Avoid",
        optimizeFor8Seconds: "Special Instruction for Veo 3 Fast Mode",
        overlayText: "Overlay Text",
        useGoogleSearch: "Use Google Search for up-to-date information"
    }
};

export const parameterValues = {
    en: {
        none: {
            visualEffect: 'No specific visual effect.',
            animationPreset: 'No specific animation or transition.',
            voiceStyle: 'No specific voice style is defined; the video should rely on music and ambient sounds for its audio landscape.',
            ambientSound: 'No specific ambient sound is defined.',
            soundEffectsIntensity: 'No sound effects are included.',
        },
        optimization: "The video must be optimized for Veo 3's fast generation mode (approx. 8 seconds). The prompt should describe a scene with a clear, singular focus and a dynamic, high-energy action. Avoid overly complex backgrounds, heavy particle effects, or subtle, slow-burning narratives. Prioritize visual clarity and an immediate 'wow' factor suitable for a punchy social media clip. The pacing is paramount: think rapid movement, impactful moments, and a quick, satisfying resolution.",
        overlay: `The scene should incorporate stylish, integrated overlay text. The text's appearance (e.g., glitchy neon, elegant serif, handwritten) should complement the overall art style. The text should be short, punchy, and thematically relevant to the scene. Example: 'A title card with the text "CYBER-NIGHTS" in a glitchy, neon-blue font flickers over the cityscape.'`
    },
    sv: {
        none: {
            visualEffect: 'Ingen specifik visuell effekt.',
            animationPreset: 'Ingen specifik animation eller övergång.',
            voiceStyle: 'Ingen specifik röststil har definierats; videon bör förlita sig på musik och omgivningsljud för sitt ljudlandskap.',
            ambientSound: 'Inget specifikt omgivningsljud har definierats.',
            soundEffectsIntensity: 'Inga ljudeffekter inkluderas.',
        },
        optimization: "Videon måste optimeras för Veo 3:s snabba genereringsläge (ca 8 sekunder). Prompten ska beskriva en scen med ett tydligt, singulärt fokus och en dynamisk, energirik handling. Undvik överdrivet komplexa bakgrunder, tunga partikeleffekter eller subtila, långsamma berättelser. Prioritera visuell tydlighet och en omedelbar 'wow'-faktor som passar för ett slagkraftigt klipp på sociala medier. Tempot är avgörande: tänk snabba rörelser, slagkraftiga ögonblick och en snabb, tillfredsställande upplösning.",
        overlay: `Scenen ska innehålla snygg, integrerad överlagd text. Textens utseende (t.ex. glitchig neon, elegant serif, handskriven) ska komplettera den övergripande konststilen. Texten ska vara kort, slagkraftig och tematiskt relevant för scenen. Exempel: 'En titelskylt med texten "CYBER-NIGHTS" i ett glitchigt, neonblått typsnitt flimrar över stadsbilden.'`
    }
};

export const seriesInstructions = {
    en: `
    **SERIES GENERATION MODE ACTIVATED:**
    Your primary task is now to act as a series producer. The user wants a 3-5 episode series based on their idea.
    1.  **Research Phase:** Use Google Search grounding to deeply understand the core idea. Extract key stages, steps, or narrative beats that can form a coherent series arc.
    2.  **Structure the Series:** Outline a logical sequence of 3-5 distinct episodes. Each episode should build upon the last or explore a different facet of the main topic.
    3.  **Write Episode Prompts:** For EACH episode, generate a complete, detailed, and unique Veo prompt. Each episode prompt must be a self-contained, single-paragraph masterpiece, following all the directorial instructions from your core persona. Ensure there's a clear narrative progression: each prompt should logically follow the previous one and build towards a cohesive series arc.
    4.  **Formatting is CRITICAL:** Structure your entire output in Markdown. Use a heading for each episode (e.g., "### Episode 1: The Gathering Storm"). Follow each heading with the full, single-paragraph prompt for that episode. Do not add any other text, preambles, or summaries. The output must be ONLY the formatted series of prompts.`,
    sv: `
    **SERIEGENERERINGSLÄGE AKTIVERAT:**
    Din primära uppgift är nu att agera som en serieproducent. Användaren vill ha en serie med 3-5 avsnitt baserad på sin idé.
    1.  **Recherchefas:** Använd Google Sökning-grundning för att få en djup förståelse för grundidén. Extrahera nyckelsteg, etapper eller narrativa punkter som kan bilda en sammanhängande seriebåge.
    2.  **Strukturera Serien:** Skissa upp en logisk sekvens av 3-5 distinkta avsnitt. Varje avsnitt ska bygga på det föregående eller utforska en annan aspekt av huvudämnet.
    3.  **Skriv Avsnittsprompter:** För VARJE avsnitt, generera en komplett, detaljerad och unik Veo-prompt. Varje avsnittsprompt måste vara ett fristående, enskilt-stycke-mästerverk som följer alla regianvisningar från din kärnpersonlighet. Säkerställ en tydlig narrativ progression: varje prompt ska logiskt följa den föregående och bygga mot en sammanhängande seriebåge.
    4.  **Formateringen är KRITISK:** Strukturera hela din output i Markdown. Använd en rubrik för varje avsnitt (t.ex. "### Avsnitt 1: Stormen hopar sig"). Efter varje rubrik följer den fullständiga, enskilda paragrafprompten för det avsnittet. Lägg inte till någon annan text, inledningar eller sammanfattningar. Outputen måste ENDAST bestå av den formaterade serien av prompter.`
};
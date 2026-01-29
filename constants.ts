
import { SelectOption, ExamplePrompt, PromptState, Language } from './types';

export const CHARACTER_LIMITS = {
  idea: 3000,
  environment: 250,
  environmentSensoryDetails: 200,
  environmentDynamicEvents: 200,
  architecturalStyle: 100,
  characterActions: 250,
  characterNuances: 200,
  characterObjectInteraction: 200,
  characterCameoTag: 50,
  voiceOver: 1000,
  negativePrompt: 200,
  characterNegativePrompt: 200,
  customArtStyle: 150,
  characterSpecificClothing: 200,
  characterAccessories: 200,
  characterVisualDNA: 500, // Generous limit for Visual DNA
  youtubeUrl: 500,
  imageStudioPrompt: 300,
  sunoIdea: 300,
  spatialMotion: 100, // Limit for individual grid sector motion
  overlayTextContent: 100,
};

export const INITIAL_STATE: PromptState = {
  idea: '',
  environment: '',
  environmentSensoryDetails: '',
  environmentDynamicEvents: '',
  architecturalStyle: 'Any',
  characterActions: '',
  characterNuances: '',
  characterObjectInteraction: '',
  characterGender: 'Any',
  characterEthnicity: 'Any',
  characterClothing: 'Any',
  characterArchetype: 'Any',
  characterAge: 'Any',
  characterMood: 'Any',
  characterPose: 'Any',
  characterSkinTone: 'Any',
  characterSpecificClothing: '',
  characterAccessories: '',
  characterCameoTag: '',
  
  // New Identity Lock Defaults
  characterVisualDNA: '',
  characterFixedSeed: null,
  characterNegativePrompt: '',

  timeOfDay: 'Any',
  weather: 'Any',
  voiceOver: '',
  voiceStyle: 'None',
  ambientSound: 'None',
  soundEffectsIntensity: 'Subtle',
  negativePrompt: '',
  optimizeFor8Seconds: false,
  artStyle: 'Cinematic',
  customArtStyle: '',
  lightingStyle: 'Any',
  cameraMovement: 'Static shot',
  cameraDistance: 'Medium shot',
  lensType: 'Standard prime lens',
  compositionalGuide: 'Any',
  visualEffect: 'None',
  colorPalette: 'Vibrant and saturated',
  aspectRatio: '16:9',
  resolution: '1080p',
  animationPreset: 'None',
  motionIntensity: 'Medium',
  creativityLevel: 'Balanced',
  includeOverlayText: false,
  overlayTextContent: '',
  useGoogleSearch: false,
  useGoogleMaps: false,
  generateAsSeries: false,
  thinkingMode: false,
  thinkingBudget: 0,
  youtubeUrl: '',
  imageStudioPrompt: '',
  uploadedImage: null,
  uploadedAudio: null,
  audioMix: { voice: 75, ambient: 50, sfx: 50 },
  useImageAsCameo: false,
  language: 'en',
  model: 'gemini-3-pro-preview',
  targetModel: 'veo',
  veoModel: 'fast',
  spatialMotions: {},
};

// This is a basic example list for demonstration.
// A real-world application would use a more sophisticated, managed service.
export const RESTRICTED_KEYWORDS = [
  'gore', 'violence', 'nsfw', 'hate speech'
];

export const getLanguageOptions = (): SelectOption[] => [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
];

export const getModelOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { [lang in Language]: string } } = {
    'gemini-3-pro-preview': { en: 'Gemini 3 Pro (Reasoning Expert)', sv: 'Gemini 3 Pro (Resonemang)', es: 'Gemini 3 Pro (Experto)', fr: 'Gemini 3 Pro (Expert)', de: 'Gemini 3 Pro (Experte)' },
    'gemini-3-flash-preview': { en: 'Gemini 3 Flash (High Speed)', sv: 'Gemini 3 Flash (Snabb)', es: 'Gemini 3 Flash (Velocidad)', fr: 'Gemini 3 Flash (Vitesse)', de: 'Gemini 3 Flash (Schnell)' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getVeoModelOptions = (lang: Language): SelectOption[] => {
    const options: { [key: string]: { [lang in Language]: string } } = {
        'fast': { en: 'Veo 3.1 Fast (Preview)', sv: 'Veo 3.1 Snabb (Förhandsvisning)', es: 'Veo 3.1 Rápido (Vista previa)', fr: 'Veo 3.1 Rapide (Aperçu)', de: 'Veo 3.1 Schnell (Vorschau)' },
        'quality': { en: 'Veo 3.1 Quality (Cinema)', sv: 'Veo 3.1 Kvalitet (Bio)', es: 'Veo 3.1 Calidad (Cine)', fr: 'Veo 3.1 Qualité (Cinéma)', de: 'Veo 3.1 Qualität (Kino)' },
    };
    return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getArtStyles = (lang: Language): SelectOption[] => {
  const styles: { [key: string]: { [lang in Language]: string } } = {
    // Realistic / Modern
    'Cinematic': { en: 'Cinematic', sv: 'Filmisk', es: 'Cinematográfico', fr: 'Cinématographique', de: 'Filmisch' },
    'Photorealistic': { en: 'Photorealistic', sv: 'Fotorealistisk', es: 'Fotorrealista', fr: 'Photoréaliste', de: 'Fotorealistisch' },
    'Vlog 4K': { en: 'Vlog 4K', sv: 'Vlogg 4K', es: 'Vlog 4K', fr: 'Vlog 4K', de: 'Vlog 4K' },
    'Gorilla Viral Style': { en: 'Gorilla Viral Style', sv: 'Gorilla Viral-stil', es: 'Estilo Viral Gorila', fr: 'Style Viral Gorille', de: 'Gorilla Viral-Stil' },
    'Documentary Style': { en: 'Documentary Style', sv: 'Dokumentärstil', es: 'Estilo Documental', fr: 'Style Documentaire', de: 'Dokumentarstil' },
    'Found Footage': { en: 'Found Footage', sv: 'Hittat material', es: 'Metraje Encontrado', fr: 'Found Footage', de: 'Found Footage' },
    
    // Animated
    'Anime': { en: 'Anime', sv: 'Anime', es: 'Anime', fr: 'Anime', de: 'Anime' },
    'Ghibli Style': { en: 'Ghibli Style', sv: 'Ghibli-stil', es: 'Estilo Ghibli', fr: 'Style Ghibli', de: 'Ghibli-Stil' },
    'Claymation': { en: 'Claymation', sv: 'Leranimation', es: 'Plastimación', fr: 'Pâte à modeler', de: 'Knetanimation' },
    'Stop Motion': { en: 'Stop Motion', sv: 'Stop Motion', es: 'Stop Motion', fr: 'Stop Motion', de: 'Stop Motion' },
    '2D Cel Animation': { en: '2D Cel Animation', sv: '2D Cel-animation', es: 'Animación Cel 2D', fr: 'Animation 2D (Cellulo)', de: '2D-Cel-Animation' },
    '3D Rendered (Pixar-like)': { en: '3D Rendered (Pixar-like)', sv: '3D-renderad (Pixar-liknande)', es: 'Renderizado 3D (tipo Pixar)', fr: 'Rendu 3D (style Pixar)', de: '3D-gerendert (Pixar-ähnlich)' },
    'Vector Animation': { en: 'Vector Animation', sv: 'Vektoranimation', es: 'Animación Vectorial', fr: 'Animation Vectorielle', de: 'Vektoranimation' },

    // Painterly / Artistic
    'Impressionistic': { en: 'Impressionistic', sv: 'Impressionistisk', es: 'Impresionista', fr: 'Impressionniste', de: 'Impressionistisch' },
    'Expressionism': { en: 'Expressionism', sv: 'Expressionism', es: 'Expresionismo', fr: 'Expressionnisme', de: 'Expressionismus' },
    'Watercolor': { en: 'Watercolor', sv: 'Akvarell', es: 'Acuarela', fr: 'Aquarelle', de: 'Aquarell' },
    'Sketch': { en: 'Sketch', sv: 'Skiss', es: 'Boceto', fr: 'Croquis', de: 'Skizze' },
    'Surrealism': { en: 'Surrealism', sv: 'Surrealism', es: 'Surrealismo', fr: 'Surréalisme', de: 'Surrealismus' },
    'Baroque': { en: 'Baroque', sv: 'Barock', es: 'Barroco', fr: 'Baroque', de: 'Barock' },
    'Abstract': { en: 'Abstract', sv: 'Abstrakt', es: 'Abstracto', fr: 'Abstrait', de: 'Abstrakt' },
    'Pop Art': { en: 'Pop Art', sv: 'Popkonst', es: 'Pop Art', fr: 'Pop Art', de: 'Pop Art' },

    // Genre / Thematic
    'Noir': { en: 'Noir', sv: 'Noir', es: 'Noir', fr: 'Noir', de: 'Noir' },
    'Gothic Horror': { en: 'Gothic Horror', sv: 'Gotisk Skräck', es: 'Horror Gótico', fr: 'Horreur Gothique', de: 'Gothic Horror' },
    'Cyberpunk': { en: 'Cyberpunk', sv: 'Cyberpunk', es: 'Cyberpunk', fr: 'Cyberpunk', de: 'Cyberpunk' },
    'Solarpunk': { en: 'Solarpunk', sv: 'Solarpunk', es: 'Solarpunk', fr: 'Solarpunk', de: 'Solarpunk' },
    'Steampunk': { en: 'Steampunk', sv: 'Steampunk', es: 'Steampunk', fr: 'Steampunk', de: 'Steampunk' },
    'Fantasy Epic': { en: 'Fantasy Epic', sv: 'Fantasy-epos', es: 'Épica de Fantasía', fr: 'Épopée Fantastique', de: 'Fantasy-Epos' },
    'Western': { en: 'Western', sv: 'Västern', es: 'Western', fr: 'Western', de: 'Western' },
    'Retro-futurism': { en: 'Retro-futurism', sv: 'Retro-futurism', es: 'Retro-futurismo', fr: 'Rétrofuturisme', de: 'Retro-Futurismus' },
    'Vintage 1950s film': { en: 'Vintage 1950s Film', sv: 'Vintage 1950-talsfilm', es: 'Película Vintage 1950s', fr: 'Film Vintage des années 50', de: 'Vintage 1950er Film' },
    'Minimalist': { en: 'Minimalist', sv: 'Minimalistisk', es: 'Minimalista', fr: 'Minimaliste', de: 'Minimalistisch' },

    // Other
    'Custom': { en: 'Custom Style...', sv: 'Anpassad stil...', es: 'Estilo Personalizado...', fr: 'Style Personnalisé...', de: 'Benutzerdefinierter Stil...' },
  };
  return Object.keys(styles).map(key => ({ value: key, label: styles[key][lang] }));
};

export const getCameraMovements = (lang: Language): SelectOption[] => {
  const angles: { [key: string]: { [lang in Language]: string } } = {
    'Static shot': { en: 'Static Shot', sv: 'Statisk Bild', es: 'Plano Estático', fr: 'Plan Statique', de: 'Statische Aufnahme' },
    'Panning shot': { en: 'Panning Shot', sv: 'Panorering', es: 'Paneo', fr: 'Panoramique', de: 'Schwenk' },
    'Tilting shot': { en: 'Tilting Shot', sv: 'Tiltning', es: 'Inclinación', fr: 'Inclinaison', de: 'Neigen' },
    'Drone shot, flying over': { en: 'Drone Shot', sv: 'Drönarvy', es: 'Toma de Dron', fr: 'Plan de Drone', de: 'Drohnenaufnahme' },
    'First-person POV': { en: 'First Person POV', sv: 'Förstapersonsvy', es: 'Punto de Vista (POV)', fr: 'Vue Subjective (POV)', de: 'Ich-Perspektive (POV)' },
    'Dutch angle': { en: 'Dutch Angle', sv: 'Dutch Angle', es: 'Plano Holandés', fr: 'Angle Hollandais', de: 'Schräge Kameraperspektive' },
    'Tracking shot': { en: 'Tracking Shot', sv: 'Åkning', es: 'Plano de Seguimiento', fr: 'Travelling', de: 'Kamerafahrt' },
  };
  return Object.keys(angles).map(key => ({ value: key, label: angles[key][lang] }));
};

export const getCameraDistances = (lang: Language): SelectOption[] => {
  const distances: { [key: string]: { [lang in Language]: string } } = {
    'Extreme close-up': { en: 'Extreme Close-up', sv: 'Extrem Närbild', es: 'Primerísimo Primer Plano', fr: 'Très Gros Plan', de: 'Extreme Nahaufnahme' },
    'Close-up': { en: 'Close-up', sv: 'Närbild', es: 'Primer Plano', fr: 'Gros Plan', de: 'Nahaufnahme' },
    'Medium shot': { en: 'Medium Shot', sv: 'Halvbild', es: 'Plano Medio', fr: 'Plan Moyen', de: 'Halbnah' },
    'Wide shot': { en: 'Wide Shot', sv: 'Vidvinkelbild', es: 'Plano General', fr: 'Plan Large', de: 'Weite Einstellung' },
    'Establishing shot': { en: 'Establishing Shot', sv: 'Etableringsbild', es: 'Plano de Establecimiento', fr: 'Plan d\'Ensemble', de: 'Totale Einstellung' },
  };
  return Object.keys(distances).map(key => ({ value: key, label: distances[key][lang] }));
};

export const getLensTypes = (lang: Language): SelectOption[] => {
  const lenses: { [key:string]: { [lang in Language]: string } } = {
    'Standard prime lens': { en: 'Standard Prime Lens', sv: 'Standardobjektiv (Prime)', es: 'Lente Fijo Estándar', fr: 'Objectif à Focale Fixe Standard', de: 'Standard-Festbrennweite' },
    'Wide-angle lens': { en: 'Wide-angle Lens', sv: 'Vidvinkelobjektiv', es: 'Lente Gran Angular', fr: 'Objectif Grand Angle', de: 'Weitwinkelobjektiv' },
    'Telephoto lens': { en: 'Telephoto Lens', sv: 'Teleobjektiv', es: 'Teleobjetivo', fr: 'Téléobjectif', de: 'Teleobjektiv' },
    'Macro lens': { en: 'Macro Lens', sv: 'Makroobjektiv', es: 'Lente Macro', fr: 'Objectif Macro', de: 'Makroobjektiv' },
    'Fisheye lens': { en: 'Fisheye Lens', sv: 'Fisheye-objektiv', es: 'Lente Ojo de Pez', fr: 'Objectif Fisheye', de: 'Fischaugenobjektiv' },
  };
  return Object.keys(lenses).map(key => ({ value: key, label: lenses[key][lang] }));
};


export const getVisualEffects = (lang: Language): SelectOption[] => {
  const effects: { [key: string]: { [lang in Language]: string } } = {
    'None': { en: 'None', sv: 'Ingen', es: 'Ninguno', fr: 'Aucun', de: 'Keine' },
    'Slow motion': { en: 'Slow Motion', sv: 'Slow Motion', es: 'Cámara Lenta', fr: 'Ralenti', de: 'Zeitlupe' },
    'Motion Blur': { en: 'Motion Blur', sv: 'Rörelseoskärpa', es: 'Desenfoque de Movimiento', fr: 'Flou de Mouvement', de: 'Bewegungsunschärfe' },
    'Time-lapse': { en: 'Time-lapse', sv: 'Time-lapse', es: 'Time-lapse', fr: 'Accéléré', de: 'Zeitraffer' },
    'Glitch effect': { en: 'Glitch Effect', sv: 'Glitch-effekt', es: 'Efecto Glitch', fr: 'Effet Glitch', de: 'Glitch-Effekt' },
    'Neon glow': { en: 'Neon Glow', sv: 'Neonsken', es: 'Brillo de Neón', fr: 'Lueur de Néon', de: 'Neon-Leuchten' },
    'Lens flare': { en: 'Lens Flare', sv: 'Linsöverstrålning', es: 'Destello de Lente', fr: 'Reflet d\'Objectif', de: 'Linsenreflexion' },
    'Anamorphic Lens Flare': { en: 'Anamorphic Lens Flare', sv: 'Anamorfisk Linsöverstrålning', es: 'Destello de Lente Anamórfico', fr: 'Reflet d\'Objectif Anamorphique', de: 'Anamorphotische Linsenreflexion' },
    'Volumetric Lighting': { en: 'Volumetric Lighting (God Rays)', sv: 'Volumetrisk belysning', es: 'Iluminación Volumétrica', fr: 'Éclairage Volumétrique', de: 'Volumetrische Beleuchtung' },
    'Double Exposure': { en: 'Double Exposure', sv: 'Dubbel Exponering', es: 'Doble Exposición', fr: 'Double Exposition', de: 'Doppelbelichtung' },
    'Dream-like haze': { en: 'Dream-like Haze', sv: 'Drömlik dimma', es: 'Neblina Onírica', fr: 'Brume Onirique', de: 'Traumartiger Dunst' },
    'Particle effects (e.g., dust, sparks)': { en: 'Particle Effects', sv: 'Partikeleffekter', es: 'Efectos de Partículas', fr: 'Effets de Particules', de: 'Partikeleffekte' },
    'Light trails': { en: 'Light Trails', sv: 'Ljusspår', es: 'Estelas de Luz', fr: 'Traînées de Lumière', de: 'Lichtspuren' },
    '8mm film grain': { en: '8mm Film Grain', sv: '8mm filmkorn', es: 'Grano de Película de 8mm', fr: 'Grain de Film 8mm', de: '8mm Filmkörnung' },
    '16mm film grain': { en: '16mm Film Grain', sv: '16mm filmkorn', es: 'Grano de Película de 16mm', fr: 'Grain de Film 16mm', de: '16mm Filmkörnung' },
    '35mm film grain': { en: '35mm Film Grain', sv: '35mm filmkorn', es: 'Grano de Película de 35mm', fr: 'Grain de Film 35mm', de: '35mm Filmkörnung' },
    'Light leaks': { en: 'Light Leaks', sv: 'Ljusläckor', es: 'Fugas de Luz', fr: 'Fuites de Lumière', de: 'Lichtlecks' },
    'Bloom effect': { en: 'Bloom Effect', sv: 'Bloom-effekt', es: 'Efecto Bloom', fr: 'Effet de Bloom', de: 'Bloom-Effekt' },
    'Chromatic aberration': { en: 'Chromatic Aberration', sv: 'Kromatisk aberration', es: 'Aberración Cromática', fr: 'Aberration Chromatique', de: 'Chromatische Aberration' },
    'Vignette': { en: 'Vignette', sv: 'Vinjett', es: 'Viñeta', fr: 'Vignette', de: 'Vignette' },
    'Tilt-shift': { en: 'Tilt-shift', sv: 'Tilt-shift', es: 'Tilt-shift', fr: 'Tilt-shift', de: 'Tilt-shift' },
  };
  return Object.keys(effects).map(key => ({ value: key, label: effects[key][lang] }));
};

export const getColorPalettes = (lang: Language): SelectOption[] => {
  const palettes: { [key: string]: { [lang in Language]: string } } = {
    'Vibrant and saturated': { en: 'Vibrant', sv: 'Levande', es: 'Vibrante', fr: 'Vibrant', de: 'Lebendig' },
    'Muted and desaturated': { en: 'Muted', sv: 'Dämpad', es: 'Apagado', fr: 'Atténué', de: 'Gedämpft' },
    'Monochrome (black and white)': { en: 'Monochrome', sv: 'Monokrom', es: 'Monocromático', fr: 'Monochrome', de: 'Monochrom' },
    'Pastel colors': { en: 'Pastel', sv: 'Pastell', es: 'Pastel', fr: 'Pastel', de: 'Pastell' },
    'Earthy Tones': { en: 'Earthy Tones', sv: 'Jordnära toner', es: 'Tonos Tierra', fr: 'Tons Terreux', de: 'Erdtöne' },
    'Synthwave neon': { en: 'Synthwave Neon', sv: 'Synthwave Neon', es: 'Neón Synthwave', fr: 'Néon Synthwave', de: 'Synthwave-Neon' },
    'Sepia tone': { en: 'Sepia', sv: 'Sepia', es: 'Sepia', fr: 'Sépia', de: 'Sepia' },
    'Cool, blue tones': { en: 'Cool Tones', sv: 'Kalla toner', es: 'Tonos Fríos', fr: 'Tons Froids', de: 'Kühle Töne' },
    'Warm, golden hour tones': { en: 'Warm Tones', sv: 'Varma toner', es: 'Tonos Cálidos', fr: 'Tons Chauds', de: 'Warme Töne' },
    'High contrast': { en: 'High Contrast', sv: 'Högkontrast', es: 'Alto Contraste', fr: 'Contraste Élevé', de: 'Hoher Kontrast' },
    'Technicolor': { en: 'Technicolor', sv: 'Technicolor', es: 'Technicolor', fr: 'Technicolor', de: 'Technicolor' },
    'Complementary color scheme': { en: 'Complementary Color Scheme', sv: 'Komplementärt färgschema', es: 'Esquema de Color Complementario', fr: 'Schéma de Couleurs Complémentaire', de: 'Komplementäres Farbschema' },
    'Triadic color scheme': { en: 'Triadic Color Scheme', sv: 'Triadisk färgschema', es: 'Esquema de Color Triádico', fr: 'Schéma de Couleurs Triadique', de: 'Triadisches Farbschema' },
    'Analogous color scheme': { en: 'Analogous Color Scheme', sv: 'Analog färgschema', es: 'Esquema de Color Análogo', fr: 'Schéma de Couleurs Analogue', de: 'Analoges Farbschema' },
  };
  return Object.keys(palettes).map(key => ({ value: key, label: palettes[key][lang] }));
};

export const getAspectRatios = (lang: Language): SelectOption[] => {
    const ratios: { [key: string]: { [lang in Language]: string } } = {
      '16:9': { en: '16:9 (Widescreen)', sv: '16:9 (Widescreen)', es: '16:9 (Panorámico)', fr: '16:9 (Panoramique)', de: '16:9 (Breitbild)' },
      '9:16': { en: '9:16 (Vertical)', sv: '9:16 (Vertikal)', es: '9:16 (Vertical)', fr: '9:16 (Vertical)', de: '9:16 (Vertikal)' },
      '1:1': { en: '1:1 (Square)', sv: '1:1 (Kvadratisk)', es: '1:1 (Cuadrado)', fr: '1:1 (Carré)', de: '1:1 (Quadratisch)' },
      '4:3': { en: '4:3 (Standard)', sv: '4:3 (Standard)', es: '4:3 (Estándar)', fr: '4:3 (Standard)', de: '4:3 (Standard)' },
      '3:4': { en: '3:4 (Portrait)', sv: '3:4 (Porträtt)', es: '3:4 (Retrato)', fr: '3:4 (Portrait)', de: '3:4 (Hochformat)' },
    };
    return Object.keys(ratios).map(key => ({ value: key, label: ratios[key][lang] }));
};

export const getResolutionOptions = (lang: Language): SelectOption[] => [
  { value: '1080p', label: '1080p (High Quality)' },
  { value: '720p', label: '720p (Faster)' },
];

export const getAnimationPresets = (lang: Language): SelectOption[] => {
    const presets: { [key: string]: { [lang in Language]: string } } = {
      'None': { en: 'None', sv: 'Ingen', es: 'Ninguna', fr: 'Aucune', de: 'Keine' },
      'Smooth Transition': { en: 'Smooth Transition', sv: 'Mjuk Övergång', es: 'Transición Suave', fr: 'Transition Fluide', de: 'Sanfter Übergang' },
      'Dynamic Zoom': { en: 'Dynamic Zoom', sv: 'Dynamisk Zoom', es: 'Zoom Dinámico', fr: 'Zoom Dynamique', de: 'Dynamischer Zoom' },
      'Wipe Effect': { en: 'Wipe Effect', sv: 'Svepeffekt', es: 'Efecto Barrido', fr: 'Effet de Volet', de: 'Wisch-Effekt' },
      'Fade In/Out': { en: 'Fade In/Out', sv: 'Tona In/Ut', es: 'Aparecer/Desvanecer', fr: 'Fondu Entrant/Sortant', de: 'Ein-/Ausblenden' },
      'Crossfade': { en: 'Crossfade', sv: 'Korsbländning', es: 'Fundido Cruzado', fr: 'Fondu Enchaîné', de: 'Überblendung' },
      'Slide In/Out': { en: 'Slide In/Out', sv: 'Skjut In/Ut', es: 'Deslizar Entrada/Salida', fr: 'Glisser Entrant/Sortant', de: 'Herein-/Herausgleiten' },
    };
    return Object.keys(presets).map(key => ({ value: key, label: presets[key][lang] }));
};

export const getVoiceStyles = (lang: Language): SelectOption[] => {
    const styles: { [key: string]: { [lang in Language]: string } } = {
      'None': { en: 'None (Music/Ambiance only)', sv: 'Ingen (Endast musik/atmosfär)', es: 'Ninguna (Solo música/ambiente)', fr: 'Aucune (Musique/Ambiance uniquement)', de: 'Keine (Nur Musik/Atmosphäre)' },
      'Standard Narrator': { en: 'Standard Narrator', sv: 'Standardberättare', es: 'Narrador Estándar', fr: 'Narrateur Standard', de: 'Standard-Erzähler' },
      'Documentary Narrator': { en: 'Documentary Narrator', sv: 'Dokumentärberättare', es: 'Narrador de Documental', fr: 'Narrateur de Documentaire', de: 'Dokumentar-Erzähler' },
      'Character Monologue': { en: 'Character Monologue', sv: 'Karaktärsmonolog', es: 'Monólogo de Personaje', fr: 'Monologue de Personnage', de: 'Charakter-Monolog' },
      'High-Energy Announcer': { en: 'High-Energy Announcer', sv: 'Högenergi-utropare', es: 'Anunciante Energético', fr: 'Annonceur Énergique', de: 'Energiereicher Sprecher' },
      'Calm ASMR Voice': { en: 'Calm ASMR Voice', sv: 'Lugn ASMR-röst', es: 'Voz Relajante ASMR', fr: 'Voix Calme ASMR', de: 'Ruhige ASMR-Stimme' },
      'AI Assistant Voice': { en: 'AI Assistant Voice', sv: 'AI-assistentröst', es: 'Voz de Asistente de IA', fr: 'Voix d\'Assistant IA', de: 'KI-Assistenten-Stimme' },
      'Whispered ASMR': { en: 'Whispered ASMR (for relaxation)', sv: 'Viskande ASMR (för avslappning)', es: 'ASMR Susurrado (para relajación)', fr: 'ASMR Chuchoté (pour la relaxation)', de: 'Geflüstertes ASMR (zur Entspannung)' },
      'Deep Sci-Fi Robot': { en: 'Deep Sci-Fi Robot (for futuristic themes)', sv: 'Djup Sci-Fi Robot (för framtidsteman)', es: 'Robot de Sci-Fi Profundo (para temas futuristas)', fr: 'Robot de Sci-Fi Grave (pour thèmes futuristes)', de: 'Tiefe Sci-Fi-Roboterstimme (für futuristische Themen)' },
      'Excited Child': { en: 'Excited Child (for whimsical content)', sv: 'Exalterat Barn (för lekfullt innehåll)', es: 'Niño Emocionado (para contenido fantástico)', fr: 'Enfant Excité (pour contenu fantaisiste)', de: 'Aufgeregtes Kind (für skurrile Inhalte)' },
    };
    return Object.keys(styles).map(key => ({ value: key, label: styles[key][lang] }));
};

export const getTimeOfDayOptions = (lang: Language): SelectOption[] => {
    const times: { [key: string]: { [lang in Language]: string } } = {
      'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
      'Morning': { en: 'Morning', sv: 'Morgon', es: 'Mañana', fr: 'Matin', de: 'Morgen' },
      'Midday': { en: 'Midday', sv: 'Mitt på dagen', es: 'Mediodía', fr: 'Midi', de: 'Mittag' },
      'Golden Hour': { en: 'Golden Hour', sv: 'Gyllene timmen', es: 'Hora Dorada', fr: 'Heure Dorée', de: 'Goldene Stunde' },
      'Dusk': { en: 'Dusk', sv: 'Skymning', es: 'Atardecer', fr: 'Crépuscule', de: 'Dämmerung' },
      'Night': { en: 'Night', sv: 'Natt', es: 'Noche', fr: 'Nuit', de: 'Nacht' },
      'Twilight': { en: 'Twilight', sv: 'Tussmörker', es: 'Crepúsculo', fr: 'Pénombre', de: 'Zwielicht' },
    };
    return Object.keys(times).map(key => ({ value: key, label: times[key][lang] }));
};

export const getWeatherOptions = (lang: Language): SelectOption[] => {
    const weathers: { [key: string]: { [lang in Language]: string } } = {
      'Any': { en: 'Any / Not Specified', sv: 'Valfritt / Ej specificerat', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
      'Clear skies': { en: 'Clear Skies', sv: 'Klar himmel', es: 'Cielos Despejados', fr: 'Ciel Dégagé', de: 'Klarer Himmel' },
      'Light clouds': { en: 'Light Clouds', sv: 'Lätt molnighet', es: 'Nubes Ligeras', fr: 'Légèrement Nuageux', de: 'Leicht bewölkt' },
      'Overcast': { en: 'Overcast', sv: 'Mulet', es: 'Nublado', fr: 'Couvert', de: 'Bedeckt' },
      'Light rain': { en: 'Light Rain', sv: 'Lätt regn', es: 'Lluvia Ligera', fr: 'Pluie Légère', de: 'Leichter Regen' },
      'Heavy rain': { en: 'Heavy Rain', sv: 'Kraftigt regn', es: 'Lluvia Fuerte', fr: 'Forte Pluie', de: 'Starker Regen' },
      'Stormy': { en: 'Stormy', sv: 'Stormigt', es: 'Tormentoso', fr: 'Orageux', de: 'Stürmisch' },
      'Snowing': { en: 'Snowing', sv: 'Snöfall', es: 'Nevando', fr: 'Neigeux', de: 'Schneefall' },
      'Foggy': { en: 'Foggy', sv: 'Dimmigt', es: 'Neblinoso', fr: 'Brouillard', de: 'Nebelig' },
    };
    return Object.keys(weathers).map(key => ({ value: key, label: weathers[key][lang] }));
};

export const getMotionIntensityOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { [lang in Language]: string } } = {
    'Low': { en: 'Low', sv: 'Låg', es: 'Baja', fr: 'Faible', de: 'Niedrig' },
    'Medium': { en: 'Medium', sv: 'Medel', es: 'Media', fr: 'Moyenne', de: 'Mittel' },
    'High': { en: 'High', sv: 'Hög', es: 'Alta', fr: 'Élevée', de: 'Hoch' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getCreativityLevelOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { [lang in Language]: string } } = {
    'Grounded': { en: 'Grounded in Reality', sv: 'Verklighetsförankrad', es: 'Basado en la Realidad', fr: 'Ancré dans la Réalité', de: 'Realitätsnah' },
    'Balanced': { en: 'Balanced', sv: 'Balanserad', es: 'Equilibrado', fr: 'Équilibré', de: 'Ausgewogen' },
    'Imaginative': { en: 'Highly Imaginative', sv: 'Mycket Fantasifull', es: 'Muy Imaginativo', fr: 'Très Imaginatif', de: 'Sehr Fantasievoll' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getCharacterGenders = (lang: Language): SelectOption[] => {
  const genders: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Male': { en: 'Male', sv: 'Man', es: 'Masculino', fr: 'Masculin', de: 'Männlich' },
    'Female': { en: 'Female', sv: 'Kvinna', es: 'Femenino', fr: 'Féminin', de: 'Weiblich' },
    'Non-binary': { en: 'Non-binary', sv: 'Icke-binär', es: 'No binario', fr: 'Non binaire', de: 'Nicht-binär' },
    'Agender': { en: 'Agender', sv: 'Könlös', es: 'Agénero', fr: 'Agenré', de: 'Agender' },
    'Genderfluid': { en: 'Genderfluid', sv: 'Könslikvid', es: 'Género fluido', fr: 'Genderfluid', de: 'Genderfluid' },
    'Two-Spirit': { en: 'Two-Spirit', sv: 'Två-själad', es: 'Dos Espíritus', fr: 'Bispirituel', de: 'Zwei-Geist' },
  };
  return Object.keys(genders).map(key => ({ value: key, label: genders[key][lang] }));
};

export const getCharacterEthnicityOptions = (lang: Language): SelectOption[] => {
  const ethnicities: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'African (General)': { en: 'African (General)', sv: 'Afrikansk (Allmän)', es: 'Africana (General)', fr: 'Africaine (Général)', de: 'Afrikanisch (Allgemein)' },
    'Afro-Caribbean': { en: 'Afro-Caribbean', sv: 'Afro-karibisk', es: 'Afrocaribeña', fr: 'Afro-Caribéenne', de: 'Afro-Karibisch' },
    'Afro-Latino': { en: 'Afro-Latino', sv: 'Afro-latinsk', es: 'Afrolatino/a', fr: 'Afro-Latino', de: 'Afro-Lateinamerikanisch' },
    'Central African': { en: 'Central African', sv: 'Centralafrikansk', es: 'Centroafricana', fr: 'Centrafricaine', de: 'Zentralafrikanisch' },
    'East African': { en: 'East African', sv: 'Östafrikansk', es: 'Africana Oriental', fr: 'Est-Africaine', de: 'Ostafrikanisch' },
    'North African': { en: 'North African', sv: 'Nordafrikansk', es: 'Norteafricana', fr: 'Nord-Africaine', de: 'Nordafrikanisch' },
    'Southern African': { en: 'Southern African', sv: 'Sydafrikansk', es: 'Africana del Sur', fr: 'Sud-Africaine', de: 'Südafrikanisch' },
    'West African': { en: 'West African', sv: 'Västafrikansk', es: 'Africana Occidental', fr: 'Ouest-Africaine', de: 'Westafrikanisch' },
    'Central Asian': { en: 'Central Asian', sv: 'Centralasiatisk', es: 'Asiática Central', fr: 'Asiatique Centrale', de: 'Zentralasiatisch' },
    'East Asian': { en: 'East Asian', sv: 'Östasiatisk', es: 'Asiática Oriental', fr: 'Asiatique de l\'Est', de: 'Ostasiatisch' },
    'South Asian': { en: 'South Asian', sv: 'Sydasiatisk', es: 'Asiática del Sur', fr: 'Asiatique du Sud', de: 'Südasiatisch' },
    'Southeast Asian': { en: 'Southeast Asian', sv: 'Sydostasiatisk', es: 'Asiática del Sudeste', fr: 'Asiatique du Sud-Est', de: 'Südostasiatisch' },
    'European (General)': { en: 'European (General)', sv: 'Europeisk (Allmän)', es: 'Europea (General)', fr: 'Européenne (Général)', de: 'Europäisch (Allgemein)' },
    'Eastern European': { en: 'Eastern European', sv: 'Östeuropé', es: 'Europea del Este', fr: 'Européenne de l\'Est', de: 'Osteuropäisch' },
    'Northern European': { en: 'Northern European', sv: 'Nordeuropé', es: 'Nordeuropea', fr: 'Européenne du Nord', de: 'Nordeuropäisch' },
    'Southern European': { en: 'Southern European', sv: 'Sydeuropé', es: 'Europea del Sur', fr: 'Européenne du Sud', de: 'Südeuropäisch' },
    'Mediterranean': { en: 'Mediterranean', sv: 'Medelhavs', es: 'Mediterránea', fr: 'Méditerranéenne', de: 'Mediterran' },
    'Hispanic/Latin': { en: 'Hispanic/Latin', sv: 'Spansk/Latinamerikansk', es: 'Hispana/Latina', fr: 'Hispanique/Latine', de: 'Hispanisch/Lateinamerikanisch' },
    'Mestizo': { en: 'Mestizo', sv: 'Mestiz', es: 'Mestizo/a', fr: 'Métis', de: 'Mestize' },
    'Middle Eastern': { en: 'Middle Eastern', sv: 'Mellanöstern', es: 'De Oriente Medio', fr: 'Moyen-Orientale', de: 'Nahöstlich' },
    'Indigenous/Aboriginal': { en: 'Indigenous / Aboriginal', sv: 'Urfolk / Aborigin', es: 'Indígena / Aborigen', fr: 'Indigène / Aborigène', de: 'Indigen / Aboriginal' },
    'Native American': { en: 'Native American', sv: 'Amerikansk urinvånare', es: 'Nativa Americana', fr: 'Amérindienne', de: 'Amerikanischer Ureinwohner' },
    'Pacific Islander': { en: 'Pacific Islander', sv: 'Stillahavsöbor', es: 'Isleña del Pacífico', fr: 'Insulaire du Pacifique', de: 'Pazifischer Inselbewohner' },
    'Polynesian': { en: 'Polynesian', sv: 'Polynesisk', es: 'Polinesia', fr: 'Polynésienne', de: 'Polynesisch' },
    'Mixed': { en: 'Mixed', sv: 'Blandad', es: 'Mixta', fr: 'Mixte', de: 'Gemischt' },
  };
  return Object.keys(ethnicities).map(key => ({ value: key, label: ethnicities[key][lang] }));
};

export const getCharacterClothings = (lang: Language): SelectOption[] => {
  const clothings: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Casual': { en: 'Casual', sv: 'Vardaglig', es: 'Casual', fr: 'Décontracté', de: 'Lässig' },
    'Formal': { en: 'Formal', sv: 'Formell', es: 'Formal', fr: 'Formel', de: 'Formell' },
    'Business Formal': { en: 'Business Formal', sv: 'Affärsformell', es: 'Formal de Negocios', fr: 'Tenue de Ville', de: 'Business-Formal' },
    'Sportswear': { en: 'Sportswear', sv: 'Sportkläder', es: 'Ropa Deportiva', fr: 'Vêtements de Sport', de: 'Sportkleidung' },
    'Athleisure': { en: 'Athleisure', sv: 'Athleisure', es: 'Athleisure', fr: 'Athleisure', de: 'Athleisure' },
    'Uniform': { en: 'Uniform', sv: 'Uniform', es: 'Uniforme', fr: 'Uniforme', de: 'Uniform' },
    'Fantasy Armor': { en: 'Fantasy Armor', sv: 'Fantasirustning', es: 'Armadura de Fantasía', fr: 'Armure Fantastique', de: 'Fantasie-Rüstung' },
    'Sci-fi Suit': { en: 'Sci-fi Suit', sv: 'Sci-fi-dräkt', es: 'Traje de Ciencia Ficción', fr: 'Combinaison de Science-Fiction', de: 'Sci-Fi-Anzug' },
    'Cyberpunk Gear': { en: 'Cyberpunk Gear', sv: 'Cyberpunk-utrustning', es: 'Equipo Cyberpunk', fr: 'Équipement Cyberpunk', de: 'Cyberpunk-Ausrüstung' },
    'Post-apocalyptic': { en: 'Post-apocalyptic', sv: 'Postapokalyptisk', es: 'Post-apocalíptico', fr: 'Post-apocalyptique', de: 'Postapokalyptisch' },
    'Historical Garb': { en: 'Historical Garb', sv: 'Historisk dräkt', es: 'Atuendo Histórico', fr: 'Costume Historique', de: 'Historische Kleidung' },
    'Regal Attire': { en: 'Regal Attire', sv: 'Kunglig klädsel', es: 'Atuendo Real', fr: 'Tenue Royale', de: 'Königliche Kleidung' },
    'Bohemian': { en: 'Bohemian', sv: 'Bohemisk', es: 'Bohemio', fr: 'Bohème', de: 'Bohemian' },
  };
  return Object.keys(clothings).map(key => ({ value: key, label: clothings[key][lang] }));
};

export const getCharacterArchetypes = (lang: Language): SelectOption[] => {
  const archetypes: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Hero': { en: 'Hero', sv: 'Hjälte', es: 'Héroe', fr: 'Héros', de: 'Held' },
    'Villain': { en: 'Villain', sv: 'Skurk', es: 'Villano', fr: 'Méchant', de: 'Bösewicht' },
    'Anti-hero': { en: 'Anti-hero', sv: 'Antihjälte', es: 'Antihéroe', fr: 'Anti-héros', de: 'Anti-Held' },
    'Mentor': { en: 'Mentor', sv: 'Mentor', es: 'Mentor', fr: 'Mentor', de: 'Mentor' },
    'Sidekick': { en: 'Sidekick', sv: 'Medhjälpare', es: 'Compañero', fr: 'Acolyte', de: 'Sidekick' },
    'Explorer': { en: 'Explorer', sv: 'Utforskare', es: 'Explorador', fr: 'Explorateur', de: 'Entdecker' },
    'Rebel': { en: 'Rebel', sv: 'Rebell', es: 'Rebelde', fr: 'Rebelle', de: 'Rebell' },
    'Sage': { en: 'Sage', sv: 'Vise man', es: 'Sabio', fr: 'Sage', de: 'Weiser' },
    'Jester': { en: 'Jester', sv: 'Gycklare', es: 'Bufón', fr: 'Bouffon', de: 'Hofnarr' },
    'Orphan': { en: 'Orphan', sv: 'Föräldralös', es: 'Huérfano', fr: 'Orphelin', de: 'Waise' },
    'The Lover': { en: 'The Lover', sv: 'Älskaren', es: 'El Amante', fr: 'L\'Amoureux', de: 'Der Liebende' },
    'The Ruler': { en: 'The Ruler', sv: 'Härskaren', es: 'El Gobernante', fr: 'Le Souverain', de: 'Der Herrscher' },
    'The Creator': { en: 'The Creator', sv: 'Skaparen', es: 'El Creador', fr: 'Le Créateur', de: 'Der Schöpfer' },
    'The Caregiver': { en: 'The Caregiver', sv: 'Vårdaren', es: 'El Cuidador', fr: 'Le Protecteur', de: 'Der Betreuer' },
    'The Everyman': { en: 'The Everyman', sv: 'Vardagsmänniskan', es: 'El Hombre Común', fr: 'L\'Homme Ordinaire', de: 'Der Jedermann' },
  };
  return Object.keys(archetypes).map(key => ({ value: key, label: archetypes[key][lang] }));
};

export const getCharacterAges = (lang: Language): SelectOption[] => {
  const ages: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Infant': { en: 'Infant (0-1)', sv: 'Spädbarn (0-1)', es: 'Bebé (0-1)', fr: 'Nourrisson (0-1)', de: 'Säugling (0-1)' },
    'Toddler': { en: 'Toddler (2-4)', sv: 'Småbarn (2-4)', es: 'Infante (2-4)', fr: 'Bambin (2-4)', de: 'Kleinkind (2-4)' },
    'Young Child (5-9)': { en: 'Young Child (5-9)', sv: 'Yngre Barn (5-9)', es: 'Niño/a Pequeño/a (5-9)', fr: 'Jeune Enfant (5-9)', de: 'Jüngeres Kind (5-9)' },
    'Preteen (10-12)': { en: 'Preteen (10-12)', sv: 'Förtonåring (10-12)', es: 'Preadolescente (10-12)', fr: 'Préadolescent (10-12)', de: 'Prä-Teenager (10-12)' },
    'Teenager (13-17)': { en: 'Teenager (13-17)', sv: 'Tonåring (13-17)', es: 'Adolescente (13-17)', fr: 'Adolescent (13-17)', de: 'Teenager (13-17)' },
    'Young Adult (18-25)': { en: 'Young Adult (18-25)', sv: 'Ung vuxen (18-25)', es: 'Adulto/a joven (18-25)', fr: 'Jeune adulte (18-25)', de: 'Junger Erwachsener (18-25)' },
    'Adult (26-45)': { en: 'Adult (26-45)', sv: 'Vuxen (26-45)', es: 'Adulto/a (26-45)', fr: 'Adulte (26-45)', de: 'Erwachsener (26-45)' },
    'Middle-aged (46-65)': { en: 'Middle-aged (46-65)', sv: 'Medelålders (46-65)', es: 'De mediana edad (46-65)', fr: 'D\'âge moyen (46-65)', de: 'Mittelalter (46-65)' },
    'Senior (66+)': { en: 'Senior (66+)', sv: 'Senior (66+)', es: 'Mayor (66+)', fr: 'Sénior (66+)', de: 'Senior (66+)' },
    'Elderly': { en: 'Elderly', sv: 'Äldre', es: 'Anciano/a', fr: 'Personne âgée', de: 'Ältere' },
    'Centenarian': { en: 'Centenarian', sv: 'Hundraåring', es: 'Centenario/a', fr: 'Centenaire', de: 'Hundertjähriger' },
  };
  return Object.keys(ages).map(key => ({ value: key, label: ages[key][lang] }));
};

export const getCharacterMoods = (lang: Language): SelectOption[] => {
  const moods: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Angry': { en: 'Angry', sv: 'Arg', es: 'Enojado/a', fr: 'En colère', de: 'Wütend' },
    'Anxious': { en: 'Anxious', sv: 'Ångestfylld', es: 'Ansioso/a', fr: 'Anxieux', de: 'Ängstlich' },
    'Apathetic': { en: 'Apathetic', sv: 'Apatisk', es: 'Apático/a', fr: 'Apathique', de: 'Apathisch' },
    'Confident': { en: 'Confident', sv: 'Självsäker', es: 'Confiado/a', fr: 'Confiant', de: 'Selbstbewusst' },
    'Contemplative': { en: 'Contemplative', sv: 'Kontemplativ', es: 'Contemplativo/a', fr: 'Contemplatif', de: 'Nachdenklich' },
    'Curious': { en: 'Curious', sv: 'Nyfiken', es: 'Curioso/a', fr: 'Curieux', de: 'Neugierig' },
    'Determined': { en: 'Determined', sv: 'Beslutsam', es: 'Determinado/a', fr: 'Déterminé', de: 'Entschlossen' },
    'Energetic': { en: 'Energetic', sv: 'Energisk', es: 'Enérgico/a', fr: 'Énergique', de: 'Energisch' },
    'Excited': { en: 'Excited', sv: 'Exalterad', es: 'Emocionado/a', fr: 'Excité', de: 'Aufgeregt' },
    'Fearful': { en: 'Fearful', sv: 'Rädd', es: 'Temeroso/a', fr: 'Craintif', de: 'Ängstlich' },
    'Happy': { en: 'Happy', sv: 'Glad', es: 'Feliz', fr: 'Heureux', de: 'Fröhlich' },
    'Joyful': { en: 'Joyful', sv: 'Glädjefull', es: 'Alegre', fr: 'Joyeux', de: 'Freudig' },
    'Melancholy': { en: 'Melancholy', sv: 'Melankolisk', es: 'Melancólico/a', fr: 'Mélancolique', de: 'Melancholisch' },
    'Mysterious': { en: 'Mysterious', sv: 'Mystisk', es: 'Misterioso/a', fr: 'Mystérieux', de: 'Geheimnisvoll' },
    'Playful': { en: 'Playful', sv: 'Lekfull', es: 'Juguetón/a', fr: 'Enjoué', de: 'Verspielt' },
    'Sad': { en: 'Sad', sv: 'Ledsen', es: 'Triste', fr: 'Triste', de: 'Traurig' },
    'Serene': { en: 'Serene', sv: 'Fridfull', es: 'Sereno/a', fr: 'Serein', de: 'Gelassen' },
    'Surprised': { en: 'Surprised', sv: 'Överraskad', es: 'Sorprendido/a', fr: 'Surpris', de: 'Überrascht' },
    'Suspicious': { en: 'Suspicious', sv: 'Misstänksam', es: 'Suspicaz', fr: 'Soupçonneux', de: 'Misstrauisch' },
  };
  return Object.keys(moods).map(key => ({ value: key, label: moods[key][lang] }));
};

export const getCharacterPoses = (lang: Language): SelectOption[] => {
  const poses: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Arms crossed': { en: 'Arms Crossed', sv: 'Armarna i kors', es: 'Brazos cruzados', fr: 'Bras croisés', de: 'Arme verschränkt' },
    'Climbing': { en: 'Climbing', sv: 'Klättrande', es: 'Escalando', fr: 'Grimper', de: 'Kletternd' },
    'Crouching': { en: 'Crouching', sv: 'Hukande', es: 'Agachado/a', fr: 'Accroupi', de: 'Hockend' },
    'Dancing': { en: 'Dancing', sv: 'Dansande', es: 'Bailando', fr: 'Dansant', de: 'Tanzend' },
    'Fighting Stance': { en: 'Fighting Stance', sv: 'Kampställning', es: 'Postura de combate', fr: 'Posture de combat', de: 'Kampfhaltung' },
    'Fist clenched': { en: 'Fist Clenched', sv: 'Knytnäve', es: 'Puño cerrado', fr: 'Poing serré', de: 'Geballte Faust' },
    'Jumping': { en: 'Jumping', sv: 'Hoppande', es: 'Saltando', fr: 'Sautant', de: 'Springend' },
    'Kneeling': { en: 'Kneeling', sv: 'Knästående', es: 'Arrodillado/a', fr: 'À genoux', de: 'Kniend' },
    'Leaning': { en: 'Leaning', sv: 'Lutande', es: 'Apoyado/a', fr: 'Appuyé', de: 'Lehnend' },
    'Lying down': { en: 'Lying down', sv: 'Liggande', es: 'Acostado/a', fr: 'Allongé', de: 'Liegend' },
    'Meditating': { en: 'Meditating', sv: 'Mediterande', es: 'Meditando', fr: 'Méditant', de: 'Meditierend' },
    'Pointing': { en: 'Pointing', sv: 'Pekande', es: 'Señalando', fr: 'Pointant', de: 'Zeigend' },
    'Reaching': { en: 'Reaching', sv: 'Sträckande', es: 'Alcanzando', fr: 'Atteignant', de: 'Greifend' },
    'Running': { en: 'Running', sv: 'Springande', es: 'Corriendo', fr: 'Courant', de: 'Laufend' },
    'Sitting': { en: 'Sitting', sv: 'Sittande', es: 'Sentado/a', fr: 'Assis', de: 'Sitzend' },
    'Standing': { en: 'Standing', sv: 'Stående', es: 'De pie', fr: 'Debout', de: 'Stehend' },
    'Stretching': { en: 'Stretching', sv: 'Sträckande', es: 'Estirándose', fr: 'S\'étirant', de: 'Dehnend' },
    'Walking': { en: 'Walking', sv: 'Gående', es: 'Caminando', fr: 'Marchant', de: 'Gehend' },
    'Waving': { en: 'Waving', sv: 'Vinkande', es: 'Saludando con la mano', fr: 'Faisant signe de la main', de: 'Winkend' },
  };
  return Object.keys(poses).map(key => ({ value: key, label: poses[key][lang] }));
};

export const getCharacterSkinTones = (lang: Language): SelectOption[] => {
  const tones: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Pale, fair': { en: 'Pale, Fair', sv: 'Blek, ljus', es: 'Pálida, clara', fr: 'Pâle, clair', de: 'Blass, hell' },
    'Light, olive': { en: 'Light, Olive', sv: 'Ljus, oliv', es: 'Clara, oliva', fr: 'Clair, olive', de: 'Hell, oliv' },
    'Medium, brown': { en: 'Medium, Brown', sv: 'Medium, brun', es: 'Mediana, morena', fr: 'Moyen, brun', de: 'Mittel, braun' },
    'Dark, deep brown': { en: 'Dark, Deep Brown', sv: 'Mörk, djupbrun', es: 'Oscura, marrón profundo', fr: 'Foncé, brun profond', de: 'Dunkel, tiefbraun' },
    'Black': { en: 'Black', sv: 'Svart', es: 'Negra', fr: 'Noir', de: 'Schwarz' },
    'Unusual (e.g., blue, green)': { en: 'Unusual (e.g., blue, green)', sv: 'Ovanlig (t.ex. blå, grön)', es: 'Inusual (p. ej., azul, verde)', fr: 'Inhabituel (ex: bleu, vert)', de: 'Ungewöhnlich (z.B. blau, grün)' },
  };
  return Object.keys(tones).map(key => ({ value: key, label: tones[key][lang] }));
};

export const getAmbientSounds = (lang: Language): SelectOption[] => {
    const sounds: { [key: string]: { [lang in Language]: string } } = {
      'None': { en: 'None / Music Only', sv: 'Inga / Endast Musik', es: 'Ninguno / Solo Música', fr: 'Aucun / Musique Uniquement', de: 'Keine / Nur Musik' },
      'City Ambience': { en: 'City Ambience', sv: 'Stadsatmosfär', es: 'Ambiente de Ciudad', fr: 'Ambiance de Ville', de: 'Stadt-Atmosphäre' },
      'Forest Sounds': { en: 'Forest Sounds', sv: 'Skogsljud', es: 'Sonidos del Bosque', fr: 'Sons de la Forêt', de: 'Waldgeräusche' },
      'Rain and Thunder': { en: 'Rain and Thunder', sv: 'Regn och åska', es: 'Lluvia y Truenos', fr: 'Pluie et Tonnerre', de: 'Regen und Donner' },
      'Ocean Waves': { en: 'Ocean Waves', sv: 'Havsvågor', es: 'Olas del Mar', fr: 'Vagues de l\'Océan', de: 'Meeresrauschen' },
      'Crowded Market': { en: 'Crowded Market', sv: 'Fullsatt Marknad', es: 'Mercado Concurrido', fr: 'Marché Bondé', de: 'Belebter Markt' },
      'Tense Silence': { en: 'Tense Silence', sv: 'Spänd tystnad', es: 'Silencio Tenso', fr: 'Silence Tendu', de: 'Gespannte Stille' },
      'Cozy Fireplace': { en: 'Cozy Fireplace', sv: 'Mysig brasa', es: 'Chimenea Acogedora', fr: 'Feu de Cheminée Confortable', de: 'Gemütlicher Kamin' },
      'Distant Celebration': { en: 'Distant Celebration', sv: 'Firande på avstånd', es: 'Celebración a lo Lejos', fr: 'Célébration Lointaine', de: 'Feier in der Ferne' },
      'Sci-fi Space Hum': { en: 'Sci-fi Space Hum', sv: 'Sci-fi Rymdbrum', es: 'Zumbido Espacial de Sci-fi', fr: 'Bourdonnement Spatial de Sci-fi', de: 'Sci-Fi-Weltraumsurren' },
      'Mechanical Hum': { en: 'Mechanical Hum', sv: 'Mekaniskt brum', es: 'Zumbido Mecánico', fr: 'Bourdonnement Mécanique', de: 'Mechanisches Summen' },
    };
    return Object.keys(sounds).map(key => ({ value: key, label: sounds[key][lang] }));
};

export const getSoundEffectsIntensity = (lang: Language): SelectOption[] => {
    const intensity: { [key: string]: { [lang in Language]: string } } = {
      'None': { en: 'None', sv: 'Inga', es: 'Ninguna', fr: 'Aucun', de: 'Keine' },
      'Subtle': { en: 'Subtle', sv: 'Subtil', es: 'Sutil', fr: 'Subtil', de: 'Dezent' },
      'Moderate': { en: 'Moderate', sv: 'Måttlig', es: 'Moderada', fr: 'Modérée', de: 'Mäßig' },
      'Prominent': { en: 'Prominent', sv: 'Framträdande', es: 'Prominente', fr: 'Prédominante', de: 'Hervorgehoben' },
    };
    return Object.keys(intensity).map(key => ({ value: key, label: intensity[key][lang] }));
};

export const getArchitecturalStyles = (lang: Language): SelectOption[] => {
  const styles: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Modernist': { en: 'Modernist', sv: 'Modernistisk', es: 'Modernista', fr: 'Moderniste', de: 'Modernistisch' },
    'Brutalist': { en: 'Brutalist', sv: 'Brutalistisk', es: 'Brutalista', fr: 'Brutaliste', de: 'Brutalistisch' },
    'Art Deco': { en: 'Art Deco', sv: 'Art Deco', es: 'Art Déco', fr: 'Art Déco', de: 'Art Déco' },
    'Victorian Gothic': { en: 'Victorian Gothic', sv: 'Viktoriansk Gotik', es: 'Gótico Victoriano', fr: 'Gothique Victorien', de: 'Viktorianische Gotik' },
    'Deconstructivist': { en: 'Deconstructivist', sv: 'Dekonstruktivistisk', es: 'Deconstructivista', fr: 'Déconstructiviste', de: 'Dekonstruktivistisch' },
    'Ancient Roman': { en: 'Ancient Roman', sv: 'Antik Romersk', es: 'Antiguo Romano', fr: 'Romain Antique', de: 'Altrömisch' },
    'Baroque': { en: 'Baroque', sv: 'Barock', es: 'Barroco', fr: 'Baroque', de: 'Barock' },
  };
  return Object.keys(styles).map(key => ({ value: key, label: styles[key][lang] }));
};

export const getLightingStyles = (lang: Language): SelectOption[] => {
    const styles: { [key: string]: { [lang in Language]: string } } = {
        'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
        'High-key': { en: 'High-key (bright, low contrast)', sv: 'High-key (ljus, låg kontrast)', es: 'Clave alta (brillante, bajo contraste)', fr: 'High-key (lumineux, faible contraste)', de: 'High-Key (hell, geringer Kontrast)' },
        'Low-key': { en: 'Low-key (dark, high contrast)', sv: 'Low-key (mörk, hög kontrast)', es: 'Clave baja (oscuro, alto contraste)', fr: 'Low-key (sombre, contraste élevé)', de: 'Low-Key (dunkel, hoher Kontrast)' },
        'Rembrandt lighting': { en: 'Rembrandt lighting (dramatic)', sv: 'Rembrandt-ljus (dramatiskt)', es: 'Iluminación Rembrandt (dramática)', fr: 'Éclairage Rembrandt (dramatique)', de: 'Rembrandt-Beleuchtung (dramatisch)' },
        'Backlit / Silhouette': { en: 'Backlit / Silhouette', sv: 'Bakgrundsbelyst / Silhuett', es: 'Contraluz / Silueta', fr: 'Contre-jour / Silhouette', de: 'Gegenlicht / Silhouette' },
        'Hard, direct sunlight': { en: 'Hard, direct sunlight', sv: 'Hårt, direkt solljus', es: 'Luz solar dura y directa', fr: 'Lumière du soleil dure et directe', de: 'Hartes, direktes Sonnenlicht' },
        'Soft, diffused light': { en: 'Soft, diffused light (overcast)', sv: 'Mjukt, spritt ljus (mulet)', es: 'Luz suave y difusa (nublado)', fr: 'Lumière douce et diffuse (couvert)', de: 'Weiches, diffuses Licht (bewölkt)' },
    };
    return Object.keys(styles).map(key => ({ value: key, label: styles[key][lang] }));
};

export const getCompositionalGuides = (lang: Language): SelectOption[] => {
    const guides: { [key: string]: { [lang in Language]: string } } = {
        'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
        'Rule of Thirds': { en: 'Rule of Thirds', sv: 'Tredjedelsregeln', es: 'Regla de los tercios', fr: 'Règle des tiers', de: 'Drittel-Regel' },
        'Leading Lines': { en: 'Leading Lines', sv: 'Ledande linjer', es: 'Líneas de guía', fr: 'Lignes directrices', de: 'Führende Linien' },
        'Symmetry': { en: 'Symmetry', sv: 'Symmetri', es: 'Simetría', fr: 'Symétrie', de: 'Symmetrie' },
        'Centered Subject': { en: 'Centered Subject', sv: 'Centrerat motiv', es: 'Sujeto centrado', fr: 'Sujet centré', de: 'Zentriertes Motiv' },
        'Frame within a Frame': { en: 'Frame within a Frame', sv: 'Ram i en ram', es: 'Marco dentro de un marco', fr: 'Cadre dans le cadre', de: 'Rahmen im Rahmen' },
    };
    return Object.keys(guides).map(key => ({ value: key, label: guides[key][lang] }));
};

export const getStaticInspirationPrompts = (lang: Language): ExamplePrompt[] => {
  const prompts: { [key: string]: { [lang in Language]: { title: string; idea: string; prompt: string } } & { params: ExamplePrompt['params'] } } = {
    "artisan": {
      en: { title: "The Artisan's Hand", idea: "A close-up, intimate portrait of a Renaissance painter creating a masterpiece.", prompt: "Extreme close-up on an artist's hand, aged and stained with paint, meticulously applying a final brushstroke to a masterpiece on canvas. The setting is a dusty, sun-drenched Renaissance studio filled with books and artifacts. The camera is static, focusing on the delicate movement of the brush. The art style is Baroque, with deep shadows and warm, golden hour tones creating a sense of timeless dedication. The scene is silent, accompanied only by the subtle ambient sound of a crackling fireplace. The final video should have a 4:3 aspect ratio, giving it a classic, historical feel." },
      sv: { title: "Hantverkarens Hand", idea: "Ett intimt närporträtt av en renässansmålare som skapar ett mästerverk.", prompt: "Extrem närbild på en konstnärs hand, åldrad och fläckad av färg, som minutiöst applicerar ett sista penseldrag på ett mästerverk på duk. Miljön är en dammig, solbelyst renässansateljé fylld med böcker och artefakter. Kameran är statisk och fokuserar på penselns fina rörelse. Konststilen är barock, med djupa skuggor och varma, gyllene timmens toner som skapar en känsla av tidlös hängivenhet. Scenen är tyst, ackompanjerad endast av det subtila omgivningsljudet från en sprakande brasa. Den slutliga videon ska ha ett 4:3-bildförhållande, vilket ger den en klassisk, historisk känsla." },
      es: { title: "La Mano del Artesano", idea: "Un retrato íntimo y en primer plano de un pintor renacentista creando una obra maestra.", prompt: "Primerísimo primer plano de la mano de un artista, envejecida y manchada de pintura, aplicando meticulosamente una pincelada final a una obra maestra sobre lienzo. El escenario es un polvoriento estudio renacentista bañado por el sol, lleno de libros y artefactos. La cámara es estática, centrándose en el delicado movimiento del pincel. El estilo artístico es barroco, con sombras profundas y tonos cálidos de la hora dorada que crean una sensación de dedicación atemporal. La escena es silenciosa, acompañada únicamente por el sutil sonido ambiental de una chimenea crepitante. El video final debe tener una relación de aspecto de 4:3, dándole una sensación clásica e histórica." },
      fr: { title: "La Main de l'Artisan", idea: "Un portrait intime et en gros plan d'un peintre de la Renaissance créant un chef-d'œuvre.", prompt: "Très gros plan sur la main d'un artiste, vieillie et tachée de peinture, appliquant méticuleusement un dernier coup de pinceau à un chef-d'œuvre sur toile. Le décor est un atelier poussiéreux de la Renaissance, baigné de soleil, rempli de livres et d'artefacts. La caméra est statique, se concentrant sur le mouvement délicat du pinceau. Le style artistique est baroque, avec des ombres profondes et des tons chauds de l'heure dorée créant un sentiment de dévouement intemporel. La scène est silencieuse, accompagnée seulement par le son ambiant subtil d'un feu de cheminée crépitant. La vidéo finale devrait avoir un rapport d'aspect de 4:3, lui donnant une atmosphère classique et historique." },
      de: { title: "Die Hand des Handwerkers", idea: "Ein intimes Nahaufnahme-Porträt eines Renaissance-Malers, der ein Meisterwerk schafft.", prompt: "Extreme Nahaufnahme der Hand eines Künstlers, gealtert und mit Farbe befleckt, die akribisch einen letzten Pinselstrich auf ein Meisterwerk auf Leinwand aufträgt. Die Szene ist ein staubiges, sonnendurchflutetes Renaissance-Atelier voller Bücher und Artefakte. Die Kamera ist statisch und konzentriert sich auf die zarte Bewegung des Pinsels. Der Kunststil ist barock, mit tiefen Schatten und warmen, goldenen Stundentönen, die ein Gefühl zeitloser Hingabe erzeugen. Die Szene ist still, nur begleitet vom subtilen Umgebungsgeräusch eines knisternden Kamins. Das endgültige Video sollte ein Seitenverhältnis von 4:3 haben, was ihm ein klassisches, historisches Flair verleiht." },
      params: { environment: "A dusty, sun-drenched Renaissance studio", timeOfDay: "Golden Hour", characterActions: "An artist's hand applying a final brushstroke to a masterpiece.", characterArchetype: "Sage", artStyle: "Baroque", cameraMovement: "Static shot", cameraDistance: "Extreme close-up", lensType: "Macro lens", visualEffect: "None", colorPalette: "Warm, golden hour tones", aspectRatio: "4:3", animationPreset: "None", voiceStyle: "None", ambientSound: "Cozy Fireplace", soundEffectsIntensity: "Subtle" },
    },
    // ... other example prompts omitted for brevity in this update
  };
  
  return Object.values(prompts).map(p => ({
    title: p[lang].title,
    idea: p[lang].idea,
    prompt: p[lang].prompt,
    params: p.params,
  }));
};

export const MUSIC_GENRES = `Rock, Pop, Jazz, Blues, Classical, Hip-Hop, Reggae, Country, Electronic, Metal, Punk, Folk, R&B, Soul, Funk, Gospel, Ska, Grime, Dubstep, Techno, House, Trance, Ambient, Drum and Bass, World Music, Opera, Indie, Experimental, Lo-fi, Synth-Pop, Disco, Swing, Bluegrass, Emo, Shoegaze, Post-Rock, Reggaeton, Bachata, Samba, Flamenco, Qawwali, Afrobeats, K-Pop, J-Pop, C-Pop, Hard Rock, Soft Rock, Glam Rock, Progressive Rock, Psychedelic Rock, Folk Rock, Punk Rock, Alternative Rock, Grunge, Metalcore, Death Metal, Black Metal, Thrash Metal, Nu Metal, Folk Metal, Power Metal, Gothic Metal, Symphonic Metal, Garage Rock, Indie Rock, New Wave, Art Rock, Post-Punk, Noise Rock, Industrial, Dark Wave, Hardcore Punk, Post-Hardcore, Screamo, Emo-Pop, Britpop, Paisley Underground, Jangle Pop, Dream Pop, Math Rock, Southern Rock, Rockabilly, Surf Rock, Psychedelia, Doom Metal, Sludge Metal, Stoner Rock, Heavy Metal, Christian Metal, Folk Punk, Celtic Punk, Digital Hardcore, Crust Punk, Anarcho-Punk, Oi!, Skate Punk, Pop Punk, Ska Punk, Rap Rock, Rap Metal, Funk Rock, Funk Metal, Jazz Funk, G-Funk, P-Funk, Acid Jazz, Smooth Jazz, Free Jazz, Jazz Fusion, Bebop, Hard Bop, Modal Jazz, Swing Jazz, Dixieland, Big Band, Latin Jazz, Cool Jazz, Traditional Pop, Bubblegum Pop, Dance Pop, Pop Rock, Electropop, Baroque Pop, Chamber Pop, Wonky Pop, Indie Pop, Noise Pop, Teen Pop, Kawaii Metal, Visual Kei, J-Rock, Shibuya-Kei, Cantopop, Mandopop, Filmi, Bhangra, Bollywood, Indian Classical, Indian Folk, Arabic Pop, Arabic Classical, Turkish Classical, Fado, Sertanejo, Bossa Nova, Merengue, Salsa, Cumbia, Bolero, Mariachi, Norteño, Banda, Tango, Milonga, Zydeco, Cajun, Mbalax, Soukous, Highlife, Kwaito, Zouk, Kompa, Calypso, Soca, Reggae Fusion, Dancehall, Ragga, Roots Reggae, Dub, Lovers Rock, Rocksteady, 2 Tone, Dembow, Bachata Moderna, Chicha, Forró, Axé, Pagode, Vallenato, Ranchera, Corrido, Duranguense, Tejano, Champeta, Kizomba, Palo de Mayo, Arrocha, Tecnobrega, Eurodance, Italo Disco, Disco Polo, Hi-NRG, Freestyle, Electro, Breakbeat, UK Garage, Drill, Trap, Crunk, Snap, Hyphy, Chicago Drill, UK Drill, New Orleans Bounce, Miami Bass, Jersey Club, Footwork, Moombahton, Moombahcore, Acid House, Deep House, Future House, Minimal Techno, Hardstyle, Jumpstyle, Psytrance, Hard Trance, Euro Trance, Vocal Trance, Chillout, Downtempo, Trip Hop, Glitch Hop, Liquid Funk, Neurofunk, Jungle, Raggajungle, Acid Rock, Garage Punk, Freak Folk, Anti-Folk, New Romantic, Ethereal Wave, Neoclassical, Dark Cabaret, Gothic Rock, Steampunk, Space Rock, Krautrock, Electroclash, Dance-Punk, Post-Industrial, EBM, Coldwave, Synthwave, Vaporwave, Future Funk, Bitpop, Chiptune, Nerdcore, Skweee, Witch House, Chillwave, Glo-fi, Future Bass, Melodic Dubstep, Liquid Dubstep, Tropical House, Bass House, Psybient, Dark Psytrance, Uplifting Trance, Tech Trance, Speedcore, Terrorcore, Happy Hardcore, Nu-Disco, Gypsy Jazz, Ethio-jazz, Afrobeat, Desi, Folktronica, Country Rock, Country Blues, Country Pop, Outlaw Country, Bluegrass Gospel, Progressive Bluegrass, Neotraditional Country, Red Dirt, Texas Country, Americana, Australian Country, Canadian Country, Celtic Music, Andean Music, Native American Music, Inuit Music, African Gospel, Afro Pop, K-pop, Mandarin Pop, Tai Pop, Pinoy Pop, Thai Pop, Vietnamese Pop, Indonesian Pop, Malaysian Pop, Singaporean Pop, Burmese Pop, Cambodian Pop, Laos Pop, Nepali Pop, Bhutanese Pop, Afghan Pop, Pakistani Pop, Bangladeshi Pop, Sri Lankan Pop, Armenian Pop, Azerbaijani Pop, Georgian Pop, Ukrainian Pop, Belarusian Pop, Moldovan Pop, Albanian Pop, Kosovar Pop, Macedonian Pop, Bulgarian Pop, Romanian Pop, Serbian Pop, Croatian Pop, Bosnian Pop, Montenegrin Pop, Slovenian Pop, Slovak Pop, Czech Pop, Polish Pop, Hungarian Pop, Baltic Pop, Scandinavian Pop, Nordic Pop, Icelandic Pop, Greenlandic Pop, Faroese Pop, Orchestral, Chamber Music, Solo Instrumental, Concerto, Symphony, Opera, Choral, Gregorian Chant, Renaissance, Baroque, Classical Period, Romantic, Modern Classical, Contemporary Classical, Avant-garde, Minimalism, Electronic Classical, Jazz Rap, Turntablism, Alternative Hip Hop, Old School Hip Hop, New School Hip Hop, Golden Age Hip Hop, East Coast Hip Hop, West Coast Hip Hop, Southern Hip Hop, Midwest Hip Hop, Christian Hip Hop, Conscious Hip Hop, Gangsta Rap, Trap`;

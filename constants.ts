

import { SelectOption, ExamplePrompt } from './types';

export const CHARACTER_LIMITS = {
  idea: 300,
  environment: 250,
  environmentSensoryDetails: 200,
  environmentDynamicEvents: 200,
  characterActions: 250,
  characterNuances: 200,
  characterObjectInteraction: 200,
  characterCameoTag: 50,
  voiceOver: 1000,
  negativePrompt: 200,
  customArtStyle: 150,
  characterSpecificClothing: 200,
  characterAccessories: 200,
  youtubeUrl: 500,
  imageStudioPrompt: 300,
  sunoIdea: 300,
  spatialMotion: 100, // Limit for individual grid sector motion
  overlayTextContent: 100,
};

// This is a basic example list for demonstration.
// A real-world application would use a more sophisticated, managed service.
export const RESTRICTED_KEYWORDS = [
  'gore', 'violence', 'nsfw', 'hate speech'
];


type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

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
    "neon-noir": {
      en: { title: "Neon Noir", idea: "A detective investigates a crime in a rainy, futuristic city.", prompt: "A lone detective in a trench coat walks down a rain-slicked alley in a dense, cyberpunk city at night. Towering holographic advertisements cast a neon glow, reflecting in the puddles. The camera is a medium tracking shot, following them from the side. The style is a mix of Noir and Cyberpunk, with a cool, blue color palette and heavy rain creating a moody atmosphere. The only sounds are the city ambience and distant sirens." },
      sv: { title: "Neon Noir", idea: "En detektiv utreder ett brott i en regnig, futuristisk stad.", prompt: "En ensam detektiv i trenchcoat går längs en regnvåt gränd i en tät, cyberpunk-stad på natten. Höga holografiska annonser kastar ett neonsken som reflekteras i pölarna. Kameran är en medium åkning, som följer dem från sidan. Stilen är en blandning av Noir och Cyberpunk, med en kall, blå färgpalett och kraftigt regn som skapar en dyster atmosfär. De enda ljuden är stadens atmosfär och avlägsna sirener." },
      es: { title: "Neon Noir", idea: "Un detective investiga un crimen en una lluviosa ciudad futurista.", prompt: "Un detective solitario con gabardina camina por un callejón mojado por la lluvia en una densa ciudad ciberpunk de noche. Imponentes anuncios holográficos proyectan un brillo de neón que se refleja en los charcos. La cámara es un plano de seguimiento medio, siguiéndolos desde un lado. El estilo es una mezcla de Noir y Ciberpunk, con una paleta de colores fríos y azules y una lluvia intensa que crea una atmósfera melancólica. Los únicos sonidos son el ambiente de la ciudad y sirenas lejanas." },
      fr: { title: "Néon Noir", idea: "Un détective enquête sur un crime dans une ville futuriste et pluvieuse.", prompt: "Un détective solitaire en trench-coat marche dans une ruelle détrempée par la pluie dans une ville cyberpunk dense la nuit. D'imposantes publicités holographiques projettent une lueur néon qui se transporte dans les flaques. La caméra est un plan de suivi moyen, les suivant de côté. Le style est un mélange de Noir et de Cyberpunk, avec une palette de couleurs froides et bleues et une forte pluie créant une atmosphère maussade. Les seuls sons sont l'ambiance de la ville et des sirènes lointaines." },
      de: { title: "Neon Noir", idea: "Ein Detektiv untersucht ein Verbrechen in einer regnerischen, futuristischen Stadt.", prompt: "Ein einsamer Detektiv im Trenchcoat geht nachts durch eine regennasse Gasse in einer dichten Cyberpunk-Stadt. Turmhohe holographische Werbungen werfen einen Neonschein, der sich in den Pfützen spiegelt. Die Kamera ist eine mittlere Kamerafahrt, die ihm von der Seite folgt. Der Stil ist eine Mischung aus Noir und Cyberpunk, mit einer kühlen, blauen Farbpalette und starkem Regen, der eine düstere Atmosphäre schafft. Die einzigen Geräusche sind das Stadtambiente und entfernte Sirenen." },
      params: { environment: "A dense, cyberpunk city alley at night with holographic ads.", timeOfDay: "Night", weather: "Heavy rain", characterActions: "A lone detective in a trench coat walks down the alley.", characterArchetype: "Hero", artStyle: "Cyberpunk", cameraMovement: "Tracking shot", cameraDistance: "Medium shot", visualEffect: "Neon glow", colorPalette: "Cool, blue tones", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "None", ambientSound: "City Ambience", soundEffectsIntensity: "Subtle" },
    },
    "arctic-hunter": {
      en: { title: "Arctic Hunter", idea: "A photorealistic drone shot of an arctic fox hunting in a snowy landscape.", prompt: "A beautiful, photorealistic drone shot flying over a vast, snowy tundra. An arctic fox, with its thick white fur, stalks silently through the deep snow, its eyes focused. The weather is overcast with light snow falling. The style is that of a high-end nature documentary, captured with a telephoto lens to maintain distance. The color palette is muted and desaturated, emphasizing the stark whiteness of the scene. A professional documentary narrator speaks about the fox's resilience." },
      sv: { title: "Arktisk Jägare", idea: "En fotorealistisk drönarbild av en fjällräv som jagar i ett snöigt landskap.", prompt: "En vacker, fotorealistisk drönarbild som flyger över en vidsträckt, snöig tundra. En fjällräv, med sin tjocka vita päls, smyger tyst genom den djupa snön, med fokuserad blick. Vädret är mulet med lätt snöfall. Stilen är som en påkostad naturdokumentär, fångad med ett teleobjektiv för att hålla avstånd. Färgpaletten är dämpad och avmättad, vilket framhäver scenens skarpa vithet. En professionell dokumentärberättare talar om rävens motståndskraft." },
      es: { title: "Cazador Ártico", idea: "Una toma de dron fotorrealista de un zorro ártico cazando en un paisaje nevado.", prompt: "Una hermosa toma de dron fotorrealista sobrevolando una vasta tundra nevada. Un zorro ártico, con su espeso pelaje blanco, acecha silenciosamente a través de la nieve profunda, con los ojos fijos. El tiempo está nublado con una ligera nevada. El estilo es el de un documental de naturaleza de alta gama, capturado con un teleobjetivo para mantener la distancia. La paleta de colores es apagada y desaturada, enfatizando la cruda blancura de la escena. Un narrador profesional de documentales habla sobre la resiliencia del zorro." },
      fr: { title: "Chasseur Arctique", idea: "Un plan de drone photoréaliste d'un renard arctique chassant dans un paysage enneigé.", prompt: "Un magnifique plan de drone photoréaliste survolant une vaste toundra enneigée. Un renard arctique, avec son épaisse fourrure blanche, traque silenciosamente dans la neige profonde, les yeux concentrés. Le temps est couvert avec de légères chutes de neige. Le style est celui d'un documentaire animalier haut de gamme, capturé avec un téléobjectif pour maintenir la distance. La palette de couleurs est atténuée et désaturée, soulignant la blancheur austère de la scène. Un narrateur de documentaire professionnel parle de la résilience du renard." },
      de: { title: "Arktischer Jäger", idea: "Eine fotorealistische Drohnenaufnahme eines Polarfuchses bei der Jagd in einer Schneelandschaft.", prompt: "Eine wunderschöne, fotorealistische Drohnenaufnahme, die über eine weite, verschneite Tundra fliegt. Ein Polarfuchs mit seinem dicken weißen Fell pirscht lautlos durch den tiefen Schnee, seine Augen sind fokussiert. Das Wetter ist bedeckt mit leichtem Schneefall. Der Stil ist der eines hochwertigen Naturdokumentarfilms, aufgenommen mit einem Teleobjektiv, um Abstand zu wahren. Die Farbpalette ist gedämpft und entsättigt, was die krasse Weiße der Szene betont. Ein professioneller Dokumentarfilmsprecher spricht über die Widerstandsfähigkeit des Fuchses." },
      params: { environment: "A vast, snowy tundra.", timeOfDay: "Midday", weather: "Snowing", characterActions: "An arctic fox stalks silently through the deep snow.", artStyle: "Photorealistic", cameraMovement: "Drone shot, flying over", cameraDistance: "Wide shot", lensType: "Telephoto lens", visualEffect: "None", colorPalette: "Muted and desaturated", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "Documentary Narrator", voiceOver: "In the vast, frozen expanse, survival is a daily battle. The arctic fox, a master of camouflage and patience, endures.", ambientSound: "None", soundEffectsIntensity: "Subtle" },
    },
    "whispers-of-twilight": {
      en: { title: "Whispers of Twilight", idea: "An anime-style scene of a girl releasing a glowing lantern over a lake.", prompt: "A young girl in a simple yukata stands at the edge of a tranquil lake during twilight. She gently releases a glowing paper lantern into the sky, watching it float away with a hopeful expression. The scene is rendered in a beautiful Anime style, with a dream-like haze and a warm, golden hour color palette. The camera tilts up, following the lantern as it joins others in the dusky sky. The sound is of gentle water lapping and a soft, emotional musical score." },
      sv: { title: "Skymningsviskningar", idea: "En scen i anime-stil av en flicka som släpper en glödande lykta över en sjö.", prompt: "En ung flicka i en enkel yukata står vid kanten av en lugn sjö i skymningen. Hon släpper försiktigt upp en glödande papperslykta mot himlen och ser den sväva iväg med ett hoppfullt uttryck. Scenen är renderad i en vacker anime-stil, med ett drömlikt dis och en varm, gyllene timmens färgpalett. Kameran tiltar upp och följer lyktan när den ansluter sig till andra på den dunkla himlen. Ljudet är av stilla vågskvalp och en mjuk, känslosam musik." },
      es: { title: "Susurros del Crepúsculo", idea: "Una escena de estilo anime de una chica soltando un farolillo brillante sobre un lago.", prompt: "Una joven con un sencillo yukata está al borde de un lago tranquilo durante el crepúsculo. Suelta suavemente un farolillo de papel brillante en el cielo, viéndolo flotar con una expresión de esperanza. La escena está renderizada en un hermoso estilo Anime, con una neblina onírica y una paleta de colores cálidos de la hora dorada. La cámara se inclina hacia arriba, siguiendo el farolillo mientras se une a otros en el cielo crepuscular. El sonido es de suaves olas y una partitura musical suave y emotiva." },
      fr: { title: "Murmures du Crépuscule", idea: "Une scène de style anime d'une fille lâchant une lanterne brillante au-dessus d'un lac.", prompt: "Une jeune fille en simple yukata se tient au bord d'un lac tranquille au crépuscule. Elle lâche doucement une lanterne en papier brillante dans le ciel, la regardant s'éloigner avec une expression pleine d'espoir. La scène est rendue dans un magnifique style Anime, avec une brume onirique et une palette de couleurs chaudes de l'heure dorée. La caméra s'incline vers le haut, suivant la lanterne alors qu'elle rejoint d'autres dans le ciel crépusculaire. Le son est celui de douces vagues et d'une musique douce et émouvante." },
      de: { title: "Flüstern der Dämmerung", idea: "Eine Szene im Anime-Stil, in der ein Mädchen eine leuchtende Laterne über einem See loslässt.", prompt: "Ein junges Mädchen in einem einfachen Yukata steht am Rande eines ruhigen Sees in der Dämmerung. Sie lässt sanft eine leuchtende Papierlaterne in den Himmel steigen und beobachtet sie mit einem hoffnungsvollen Ausdruck, wie sie davonschwebt. Die Szene ist in einem wunderschönen Anime-Stil gerendert, mit einem traumartigen Dunst und einer warmen, goldenen Stunden-Farbpalette. Die Kamera neigt sich nach oben und folgt der Laterne, wie sie sich anderen am dämmrigen Himmel anschließt. Der Ton besteht aus sanftem Plätschern von Wasser und einer weichen, emotionalen Musikpartitur." },
      params: { environment: "The edge of a tranquil lake.", timeOfDay: "Twilight", weather: "Clear skies", characterActions: "A young girl in a yukata releases a glowing paper lantern.", characterGender: "Female", artStyle: "Anime", cameraMovement: "Tilting shot", cameraDistance: "Medium shot", visualEffect: "Dream-like haze", colorPalette: "Warm, golden hour tones", aspectRatio: "16:9", animationPreset: "Smooth Transition", voiceStyle: "None", ambientSound: "Ocean Waves", soundEffectsIntensity: "Subtle" },
    },
    "urban-flow": {
      en: { title: "Urban Flow", idea: "High-energy parkour POV across city rooftops.", prompt: "First-person POV shot of a parkour athlete sprinting across sunny city rooftops. The camera shakes realistically with every landing. The runner leaps over a gap between buildings, hands grasping a ledge. The style is raw and energetic, reminiscent of a GoPro action video. Motion blur emphasizes the speed. The audio is the heavy breathing of the runner and the wind rushing past." },
      sv: { title: "Stadsflöde", idea: "Högenergisk parkour ur förstapersonsperspektiv över stadens tak.", prompt: "Förstapersonsperspektiv av en parkouratlet som sprintar över soliga stadstak. Kameran skakar realistiskt vid varje landning. Löparen hoppar över ett gap mellan byggnader och griper tag i en kant. Stilen är rå och energisk, påminner om en GoPro-actionvideo. Rörelseoskärpa framhäver farten. Ljudet är löparens tunga andning och vinden som rusar förbi." },
      es: { title: "Flujo Urbano", idea: "POV de parkour de alta energía a través de los tejados de la ciudad.", prompt: "Toma en primera persona (POV) de un atleta de parkour corriendo por los soleados tejados de la ciudad. La cámara tiembla de forma realista con cada aterrizaje. El corredor salta sobre un hueco entre edificios, agarrándose a una cornisa. El estilo es crudo y enérgico, recordando a un video de acción GoPro. El desenfoque de movimiento enfatiza la velocidad. El audio es la respiración pesada del corredor y el viento pasando." },
      fr: { title: "Flux Urbain", idea: "POV de parkour à haute énergie sur les toits de la ville.", prompt: "Plan en vue subjective (POV) d'un athlète de parkour sprintant sur les toits ensoleillés de la ville. La caméra tremble de manière réaliste à chaque atterrissage. Le coureur saute par-dessus un espace entre les bâtiments, les mains saisissant un rebord. Le style est brut et énergique, rappelant une vidéo d'action GoPro. Le flou de mouvement souligne la vitesse. L'audio est la respiration lourde du coureur et le vent qui passe." },
      de: { title: "Urbaner Fluss", idea: "Hochenergetische Parkour-POV über die Dächer der Stadt.", prompt: "First-Person-POV-Aufnahme eines Parkour-Athleten, der über sonnige Dächer der Stadt sprintet. Die Kamera wackelt realistisch bei jeder Landung. Der Läufer springt über eine Lücke zwischen Gebäuden und greift nach einem Vorsprung. Der Stil ist roh und energiegeladen, erinnert an ein GoPro-Actionvideo. Bewegungsunschärfe betont die Geschwindigkeit. Der Ton ist das schwere Atmen des Läufers und der vorbeirauschende Wind." },
      params: { environment: "City rooftops under bright sun.", timeOfDay: "Midday", weather: "Clear skies", characterActions: "Sprinting, jumping, climbing.", artStyle: "Vlog 4K", cameraMovement: "First-person POV", visualEffect: "Motion Blur", colorPalette: "High contrast", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "None", ambientSound: "City Ambience", soundEffectsIntensity: "Prominent" }
    },
    "steampunk-harbor": {
      en: { title: "Steampunk Harbor", idea: "Airships docking at a brass-clad tower in a foggy Victorian city.", prompt: "A wide shot of a bustling steampunk harbor suspended in the clouds. Giant brass airships dock at intricate towers emitting steam. People in Victorian attire walk on suspended walkways, carrying strange mechanical devices. The atmosphere is thick with fog and steam, illuminated by warm lantern light. The style is detailed and textured, emphasizing the brass and iron materials. Sounds of steam whistles and clanking gears fill the air." },
      sv: { title: "Steampunk-hamn", idea: "Luftskepp dockar vid ett mässingsklätt torn i en dimmig viktoriansk stad.", prompt: "En vid bild av en livlig steampunk-hamn som svävar bland molnen. Jättelika luftskepp av mässing dockar vid intrikata torn som släpper ut ånga. Människor i viktoriansk klädsel går på hängande gångvägar och bär på märkliga mekaniska apparater. Atmosfären är tjock av dimma och ånga, upplyst av varmt lyktsken. Stilen är detaljerad och texturerad, med betoning på mässing och järn. Ljud av ångvisslor och skramlande kugghjul fyller luften." },
      es: { title: "Puerto Steampunk", idea: "Dirigibles atracando en una torre revestida de latón en una ciudad victoriana con niebla.", prompt: "Un plano general de un bullicioso puerto steampunk suspendido en las nubes. Gigantescos dirigibles de latón atracan en intrincadas torres que emiten vapor. Personas con atuendo victoriano caminan por pasarelas suspendidas, llevando extraños dispositivos mecánicos. La atmósfera es espesa con niebla y vapor, iluminada por la cálida luz de los faroles. El estilo es detallado y texturizado, enfatizando los materiales de latón y hierro. Sonidos de silbatos de vapor y engranajes tintineantes llenan el aire." },
      fr: { title: "Port Steampunk", idea: "Des dirigeables s'amarrant à une tour en laiton dans une ville victorienne brumeuse.", prompt: "Un plan large d'un port steampunk animé suspendu dans les nuages. Des dirigeables géants en laiton s'amarrent à des tours complexes émettant de la vapeur. Des gens en tenue victorienne marchent sur des passerelles suspendues, portant d'étranges appareils mécaniques. L'atmosphère est épaisse de brouillard et de vapeur, illuminée par la lumière chaude des lanternes. Le style est détaillé et texturé, soulignant les matériaux en laiton et en fer. Des sons de sifflets à vapeur et d'engrenages qui s'entrechoquent remplissent l'air." },
      de: { title: "Steampunk-Hafen", idea: "Luftschiffe docken an einem mit Messing verkleideten Turm in einer nebligen viktorianischen Stadt an.", prompt: "Eine Weitwinkelaufnahme eines geschäftigen Steampunk-Hafens, der in den Wolken schwebt. Riesige Messingluftschiffe docken an komplizierten Türmen an, die Dampf ausstoßen. Menschen in viktorianischer Kleidung gehen auf Hängebrücken und tragen seltsame mechanische Geräte. Die Atmosphäre ist dicht mit Nebel und Dampf, beleuchtet von warmem Laternenlicht. Der Stil ist detailliert und texturiert, betont die Messing- und Eisenmaterialien. Geräusche von Dampfpfeifen und klappernden Zahnrädern erfüllen die Luft." },
      params: { environment: "A steampunk harbor in the clouds.", timeOfDay: "Dusk", weather: "Foggy", characterActions: "People walking, airships docking.", artStyle: "Steampunk", cameraMovement: "Panning shot", cameraDistance: "Wide shot", visualEffect: "None", colorPalette: "Sepia tone", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "None", ambientSound: "Mechanical Hum", soundEffectsIntensity: "Moderate" }
    },
    "cosmic-voyage": {
      en: { title: "Cosmic Voyage", idea: "View from a spaceship window looking at a sunrise over an alien planet.", prompt: "A view from inside a spaceship cockpit, looking out a large window. A spectacular sunrise is breaking over the horizon of a purple alien planet, casting long shadows across strange geological formations. The light is blindingly bright and colorful. Reflections of the cockpit controls are visible on the glass. The style is photorealistic sci-fi, similar to 'Interstellar'. A low, steady hum of the ship's engine provides the background noise." },
      sv: { title: "Kosmisk Resa", idea: "Vy från ett rymdskeppsfönster som tittar på en soluppgång över en främmande planet.", prompt: "En vy inifrån en rymdskeppscockpit, ut genom ett stort fönster. En spektakulär soluppgång bryter fram över horisonten på en lila främmande planet och kastar långa skuggor över märkliga geologiska formationer. Ljuset är bländande starkt och färgglatt. Reflektioner av cockpitens kontroller syns på glaset. Stilen är fotorealistisk sci-fi, liknande 'Interstellar'. Ett lågt, stadigt brummande från skeppets motor ger bakgrundsljudet." },
      es: { title: "Viaje Cósmico", idea: "Vista desde la ventana de una nave espacial mirando un amanecer sobre un planeta alienígena.", prompt: "Una vista desde el interior de la cabina de una nave espacial, mirando por una ventana grande. Un amanecer espectacular está rompiendo sobre el horizonte de un planeta alienígena púrpura, proyectando largas sombras sobre extrañas formaciones geológicas. La luz es cegadoramente brillante y colorida. Los reflejos de los controles de la cabina son visibles en el cristal. El estilo es ciencia ficción fotorrealista, similar a 'Interstellar'. Un zumbido bajo y constante del motor de la nave proporciona el ruido de fondo." },
      fr: { title: "Voyage Cosmique", idea: "Vue depuis la fenêtre d'un vaisseau spatial regardant un lever de soleil sur une planète extraterrestre.", prompt: "Une vue de l'intérieur du cockpit d'un vaisseau spatial, regardant par une grande fenêtre. Un lever de soleil spectaculaire se lève à l'horizon d'une planète extraterrestre violette, projetant de longues ombres sur d'étranges formations géologiques. La lumière est aveuglante et colorée. Les reflets des commandes du cockpit sont visibles sur la vitre. Le style est de la science-fiction photoréaliste, similaire à 'Interstellar'. Un bourdonnement bas et régulier du moteur du vaisseau fournit le bruit de fond." },
      de: { title: "Kosmische Reise", idea: "Blick aus einem Raumschifffenster auf einen Sonnenaufgang über einem fremden Planeten.", prompt: "Ein Blick aus dem Inneren eines Raumschiff-Cockpits durch ein großes Fenster. Ein spektakulärer Sonnenaufgang bricht über dem Horizont eines lila fremden Planeten an und wirft lange Schatten über seltsame geologische Formationen. Das Licht ist blendend hell und farbenfroh. Reflexionen der Cockpit-Steuerung sind auf dem Glas sichtbar. Der Stil ist fotorealistische Sci-Fi, ähnlich wie 'Interstellar'. Ein tiefes, stetiges Summen des Schiffsmotors liefert das Hintergrundgeräusch." },
      params: { environment: "Spaceship cockpit orbit.", timeOfDay: "Morning", weather: "Clear skies", characterActions: "None (POV).", artStyle: "Photorealistic", cameraMovement: "Static shot", cameraDistance: "Wide shot", lensType: "Wide-angle lens", visualEffect: "Lens flare", colorPalette: "Vibrant and saturated", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "Deep Sci-Fi Robot", voiceOver: "Orbit achieved. Commencing sunrise sequence.", ambientSound: "Sci-fi Space Hum", soundEffectsIntensity: "Subtle" }
    },
    "clay-bakery": {
      en: { title: "The Baker's Morning", idea: "A whimsical claymation of a dough character kneading itself.", prompt: "A charming stop-motion animation set in a cozy, miniature bakery kitchen. A character made entirely of raw dough creates itself by kneading and rolling on a floured wooden table. It forms little arms and waves cheerfully. The texture of the clay is visible, complete with fingerprints. The lighting is warm and soft. The animation style is jerky and playful, typical of classic claymation. Upbeat, plunky acoustic music plays." },
      sv: { title: "Bagarens Morgon", idea: "En nyckfull leranimation av en degfigur som knådar sig själv.", prompt: "En charmig stop-motion-animation som utspelar sig i ett mysigt miniatyrbagerikök. En figur helt gjord av rå deg skapar sig själv genom att knåda och rulla på ett mjölat träbord. Den formar små armar och vinkar glatt. Lerans textur är synlig, komplett med fingeravtryck. Belysningen är varm och mjuk. Animationsstilen är ryckig och lekfull, typisk för klassisk leranimation. Uppiggande, plinkande akustisk musik spelas." },
      es: { title: "La Mañana del Panadero", idea: "Una animación de plastilina caprichosa de un personaje de masa amasándose a sí mismo.", prompt: "Una encantadora animación stop-motion ambientada en una acogedora cocina de panadería en miniatura. Un personaje hecho completamente de masa cruda se crea a sí mismo amasando y rodando sobre una mesa de madera enharinada. Forma pequeños brazos y saluda alegremente. La textura de la plastilina es visible, completa con huellas dactilares. La iluminación es cálida y suave. El estilo de animación es entrecortado y juguetón, típico de la animación de plastilina clásica. Suena música acústica alegre." },
      fr: { title: "Le Matin du Boulanger", idea: "Une animation en pâte à modeler fantaisiste d'un personnage en pâte se pétrissant lui-même.", prompt: "Une charmante animation en stop-motion située dans une cuisine de boulangerie miniature confortable. Un personnage entièrement fait de pâte crue se crée en pétrissant et en roulant sur une table en bois farinée. Il forme de petits bras et fait signe joyeusement. La texture de la pâte à modeler est visible, avec des empreintes digitales. L'éclairage est chaud et doux. Le style d'animation est saccadé et ludique, typique de l'animation en pâte à modeler classique. Une musique acoustique entraînante joue." },
      de: { title: "Der Morgen des Bäckers", idea: "Eine skurrile Knetanimation einer Teigfigur, die sich selbst knetet.", prompt: "Eine charmante Stop-Motion-Animation in einer gemütlichen Miniatur-Bäckereiküche. Eine Figur, die vollständig aus rohem Teig besteht, erschafft sich selbst, indem sie auf einem bemehlten Holztisch knetet und rollt. Sie formt kleine Arme und winkt fröhlich. Die Textur der Knete ist sichtbar, komplett mit Fingerabdrücken. Die Beleuchtung ist warm und weich. Der Animationsstil ist ruckartig und verspielt, typisch für klassische Knetanimationen. Fröhliche, klimpernde akustische Musik spielt." },
      params: { environment: "Miniature bakery kitchen.", timeOfDay: "Morning", weather: "Any", characterActions: "Dough character kneading itself.", artStyle: "Claymation", cameraMovement: "Static shot", cameraDistance: "Close-up", lensType: "Macro lens", visualEffect: "None", colorPalette: "Pastel colors", aspectRatio: "4:3", animationPreset: "None", voiceStyle: "None", ambientSound: "None", soundEffectsIntensity: "None" }
    },
    "abstract-rhythm": {
      en: { title: "Quantum Geometry", idea: "Abstract 3D animation of shifting fractal geometry in a void.", prompt: "An abstract 3D animation of shifting fractal geometry floating in a dark void. Crystalline shapes fracture, reform, and rotate in perfect rhythm. The lighting is iridescent, reflecting a spectrum of colors against the deep black background. The visual effect includes chromatic aberration and bloom, giving it a digital, futuristic feel. The scene is hypnotic and precise." },
      sv: { title: "Kvantgeometri", idea: "Abstrakt 3D-animation av skiftande fraktalgeometri i ett tomrum.", prompt: "En abstrakt 3D-animation av skiftande fraktalgeometri som svävar i ett mörkt tomrum. Kristallina former bryts, omformas och roterar i perfekt rytm. Belysningen är iriserande och reflekterar ett spektrum av färger mot den djupt svarta bakgrunden. Den visuella effekten inkluderar kromatisk aberration och bloom, vilket ger den en digital, futuristisk känsla. Scenen är hypnotisk och exakt." },
      es: { title: "Geometría Cuántica", idea: "Animación 3D abstracta de geometría fractal cambiante en un vacío.", prompt: "Una animación 3D abstracta de geometría fractal cambiante flotando en un vacío oscuro. Las formas cristalinas se fracturan, reforman y rotan en perfecto ritmo. La iluminación es iridiscente, reflejando un espectro de colores contra el fondo negro profundo. El efecto visual incluye aberración cromática y resplandor, dándole una sensación digital y futurista. La escena es hipnótica y precisa." },
      fr: { title: "Géométrie Quantique", idea: "Animation 3D abstraite de géométrie fractale changeante dans le vide.", prompt: "Une animation 3D abstraite de géométrie fractale changeante flottant dans un vide sombre. Des formes cristallines se fracturent, se reforment et tournent en rythme parfait. L'éclairage est iridescent, reflétant un spectre de couleurs contre le fond noir profond. L'effet visuel inclut l'aberration chromatique et le bloom, lui donnant une sensation numérique et futuriste. La scène est hypnotique et précise." },
      de: { title: "Quantengeometrie", idea: "Abstrakte 3D-Animation sich verändernder fraktaler Geometrie in einem Leerraum.", prompt: "Eine abstrakte 3D-Animation sich verändernder fraktaler Geometrie, die in einem dunklen Leerraum schwebt. Kristalline Formen brechen, bilden sich neu und rotieren in perfektem Rhythmus. Die Beleuchtung ist schillernd und reflektiert ein Spektrum von Farben vor dem tiefschwarzen Hintergrund. Der visuelle Effekt umfasst chromatische Aberration und Bloom, was ihm ein digitales, futuristisches Gefühl verleiht. Die Szene ist hypnotisch und präzise." },
      params: { environment: "A dark void.", timeOfDay: "Any", weather: "Any", characterActions: "None.", artStyle: "Abstract", cameraMovement: "Static shot", cameraDistance: "Close-up", lensType: "Standard prime lens", visualEffect: "Chromatic aberration", colorPalette: "High contrast", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "None", ambientSound: "None", soundEffectsIntensity: "None" }
    },
    "microscopic-rainforest": {
      en: { title: "Microscopic Rainforest", idea: "A journey through moss on a rock, filmed like a vast jungle.", prompt: "Macro videography of vibrant green moss growing on a wet stone. The camera moves slowly through the 'canopy' of moss, making it look like a dense, ancient rainforest. Water droplets cling to the tiny leaves, refracting light like crystal balls. Shallow depth of field blurs the background into a creamy bokeh. The lighting is soft and diffused, mimicking sunlight filtering through trees. The audio features magnified sounds of water dripping and tiny insect movements." },
      sv: { title: "Mikroskopisk Regnskog", idea: "En resa genom mossa på en sten, filmad som en vidsträckt djungel.", prompt: "Makrovideografi av levande grön mossa som växer på en våt sten. Kameran rör sig långsamt genom mossans 'krontak', vilket får det att se ut som en tät, uråldrig regnskog. Vattendroppar klamrar sig fast vid de små bladen och bryter ljuset som kristallkulor. Grunt skärpedjup gör bakgrunden till en krämig bokeh. Ljuset är mjukt och diffust, och efterliknar solljus som filtreras genom träd. Ljudet innehåller förstärkta ljud av droppande vatten och små insektsrörelser." },
      es: { title: "Selva Microscópica", idea: "Un viaje a través del musgo en una roca, filmado como una vasta jungla.", prompt: "Videografía macro de musgo verde vibrante creciendo en una piedra húmeda. La cámara se mueve lentamente a través del 'dosel' de musgo, haciendo que parezca una densa y antigua selva tropical. Las gotas de agua se adhieren a las pequeñas hojas, refractando la luz como bolas de cristal. La poca profundidad de campo desenfoca el fondo en un bokeh cremoso. La iluminación es suave y difusa, imitando la luz del sol filtrándose a través de los árboles. El audio presenta sonidos magnificados de agua goteando y pequeños movimientos de insectos." },
      fr: { title: "Forêt Tropicale Microscopique", idea: "Un voyage à travers la mousse sur un rocher, filmé comme une vaste jungle.", prompt: "Vidéographie macro de mousse verte vibrante poussant sur une pierre humide. La caméra se déplace lentement à travers la 'canopée' de mousse, la faisant ressembler à une forêt tropicale dense et ancienne. Des gouttelettes d'eau s'accrochent aux minuscules feuilles, réfractant la lumière comme des boules de cristal. Une faible profondeur de champ floute l'arrière-plan en un bokeh crémeux. L'éclairage est doux et diffus, imitant la lumière du soleil filtrant à travers les arbres. L'audio présente des sons amplifiés de gouttes d'eau et de minuscules mouvements d'insectes." },
      de: { title: "Mikroskopischer Regenwald", idea: "Eine Reise durch Moos auf einem Stein, gefilmt wie ein riesiger Dschungel.", prompt: "Makro-Videografie von lebendigem grünem Moos, das auf einem nassen Stein wächst. Die Kamera bewegt sich langsam durch das 'Kronendach' des Mooses und lässt es wie einen dichten, uralten Regenwald aussehen. Wassertropfen klammern sich an die winzigen Blätter und brechen das Licht wie Kristallkugeln. Eine geringe Schärfentiefe verschwimmt den Hintergrund zu einem cremigen Bokeh. Die Beleuchtung ist weich und diffus und ahmt das durch Bäume gefilterte Sonnenlicht nach. Der Ton enthält vergrößerte Geräusche von tropfendem Wasser und winzigen Insektenbewegungen." },
      params: { environment: "Mossy rock surface", timeOfDay: "Morning", weather: "Light rain", characterActions: "None", artStyle: "Photorealistic", cameraMovement: "Tracking shot", cameraDistance: "Extreme close-up", lensType: "Macro lens", visualEffect: "None", colorPalette: "Earthy Tones", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "None", ambientSound: "Forest Sounds", soundEffectsIntensity: "Subtle" }
    },
    "culinary-slow-mo": {
      en: { title: "The Perfect Pour", idea: "A high-speed slow motion shot of coffee being poured.", prompt: "Extreme close-up of hot water being poured over fresh coffee grounds in a glass dripper. The water blooms the coffee, releasing steam and golden bubbles. Filmed in high frame rate slow motion to capture every fluid dynamic. The lighting is warm and back-lit, highlighting the steam against a dark background. The scene evokes a sense of morning ritual and luxury." },
      sv: { title: "Den Perfekta Hällningen", idea: "En slow motion-bild i hög hastighet av kaffe som hälls upp.", prompt: "Extrem närbild av hett vatten som hälls över färskt kaffe i en glasdripper. Vattnet får kaffet att blomma och frigör ånga och gyllene bubblor. Filmad i slow motion med hög bildhastighet för att fånga varje vätskedynamik. Belysningen är varm och bakgrundsbelyst, vilket framhäver ångan mot en mörk bakgrund. Scenen väcker en känsla av morgonritual och lyx." },
      es: { title: "El Vertido Perfecto", idea: "Una toma en cámara lenta de alta velocidad de café siendo vertido.", prompt: "Primerísimo primer plano de agua caliente siendo vertida sobre granos de café frescos en un gotero de vidrio. El agua hace florecer el café, liberando vapor y burbujas doradas. Filmado en cámara lenta de alta velocidad de fotogramas para capturar cada dinámica de fluido. La iluminación es cálida y a contraluz, destacando el vapor contra un fondo oscuro. La escena evoca una sensación de ritual matutino y lujo." },
      fr: { title: "Le Versage Parfait", idea: "Un plan au ralenti à grande vitesse de café en train d'être versé.", prompt: "Très gros plan d'eau chaude versée sur du café moulu frais dans un goutteur en verre. L'eau fait fleurir le café, libérant de la vapeur et des bulles dorées. Filmé au ralenti à fréquence d'images élevée pour capturer chaque dynamique de fluide. L'éclairage est chaud et rétro-éclairé, soulignant la vapeur contre un fond sombre. La scène évoque un sentiment de rituel matinal et de luxe." },
      de: { title: "Der Perfekte Aufguss", idea: "Eine High-Speed-Zeitlupenaufnahme von Kaffee, der aufgegossen wird.", prompt: "Extreme Nahaufnahme von heißem Wasser, das über frischen Kaffeesatz in einem Glasfilter gegossen wird. Das Wasser lässt den Kaffee aufblühen, Dampf und goldene Blasen freisetzend. Gefilmt in High-Frame-Rate-Zeitlupe, um jede Flüssigkeitsdynamik einzufangen. Die Beleuchtung ist warm und von hinten beleuchtet, was den Dampf vor einem dunklen Hintergrund hervorhebt. Die Szene ruft ein Gefühl von Morgenritual und Luxus hervor." },
      params: { environment: "Dark, cozy cafe setting", timeOfDay: "Morning", weather: "Any", characterActions: "Pouring water", artStyle: "Cinematic", cameraMovement: "Static shot", cameraDistance: "Extreme close-up", lensType: "Macro lens", visualEffect: "Slow motion", colorPalette: "Warm, golden hour tones", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "None", ambientSound: "Cozy Fireplace", soundEffectsIntensity: "Moderate" }
    },
    "fantasy-islands": {
      en: { title: "Floating Archipelago", idea: "Epic drone shot establishing a world of floating islands.", prompt: "A majestic wide shot of a fantasy world where lush green islands float in a sky filled with fluffy clouds. Waterfalls cascade from the edges of the islands into the abyss below. Flocks of alien birds soar between the landmasses. The architectural style of tiny ruins on the islands is ancient and white. The lighting is bright and ethereal (high-key). The camera pans slowly across the horizon, revealing the scale of this magical world." },
      sv: { title: "Flytande Arkipelag", idea: "Episk drönarbild som etablerar en värld av flytande öar.", prompt: "En majestätisk vid bild av en fantasivärld där frodiga gröna öar svävar i en himmel fylld av fluffiga moln. Vattenfall forsar från öarnas kanter ner i avgrunden nedanför. Flockar av främmande fåglar svävar mellan landmassorna. Den arkitektoniska stilen på små ruiner på öarna är uråldrig och vit. Belysningen är ljus och eterisk (high-key). Kameran panorerar långsamt över horisonten och avslöjar skalan av denna magiska värld." },
      es: { title: "Archipiélago Flotante", idea: "Toma épica de dron estableciendo un mundo de islas flotantes.", prompt: "Una majestuosa toma amplia de un mundo de fantasía donde exuberantes islas verdes flotan en un cielo lleno de nubes esponjosas. Cascadas caen desde los bordes de las islas hacia el abismo de abajo. Bandadas de pájaros alienígenas vuelan entre las masas de tierra. El estilo arquitectónico de las pequeñas ruinas en las islas es antiguo y blanco. La iluminación es brillante y etérea (clave alta). La cámara panea lentamente a través del horizonte, revelando la escala de este mundo mágico." },
      fr: { title: "Archipel Flottant", idea: "Plan de drone épique établissant un monde d'îles flottantes.", prompt: "Un plan large majestueux d'un monde fantastique où des îles verdoyantes flottent dans un ciel rempli de nuages duveteux. Des cascades tombent des bords des îles dans l'abîme en dessous. Des volées d'oiseaux extraterrestres planent entre les masses terrestres. Le style architectural des minuscules ruines sur les îles est ancien et blanc. L'éclairage est brillant et éthéré (high-key). La caméra effectue un panoramique lent à travers l'horizon, révélant l'échelle de ce monde magique." },
      de: { title: "Schwebender Archipel", idea: "Epische Drohnenaufnahme, die eine Welt aus schwebenden Inseln etabliert.", prompt: "Eine majestätische Weitwinkelaufnahme einer Fantasiewelt, in der üppige grüne Inseln in einem Himmel voller flauschiger Wolken schweben. Wasserfälle stürzen von den Rändern der Inseln in den Abgrund darunter. Schwärme fremdartiger Vögel segeln zwischen den Landmassen. Der architektonische Stil winziger Ruinen auf den Inseln ist antik und weiß. Die Beleuchtung ist hell und ätherisch (High-Key). Die Kamera schwenkt langsam über den Horizont und enthüllt die Größe dieser magischen Welt." },
      params: { environment: "Floating islands in the sky", timeOfDay: "Midday", weather: "Clear skies", characterActions: "None", artStyle: "Fantasy Epic", cameraMovement: "Panning shot", cameraDistance: "Establishing shot", lensType: "Wide-angle lens", visualEffect: "Dream-like haze", colorPalette: "Vibrant and saturated", aspectRatio: "16:9", animationPreset: "Smooth Transition", voiceStyle: "None", ambientSound: "None", soundEffectsIntensity: "Subtle" }
    }
  };
  
  return Object.values(prompts).map(p => ({
    title: p[lang].title,
    idea: p[lang].idea,
    prompt: p[lang].prompt,
    params: p.params,
  }));
};

export const MUSIC_GENRES = `Rock, Pop, Jazz, Blues, Classical, Hip-Hop, Reggae, Country, Electronic, Metal, Punk, Folk, R&B, Soul, Funk, Gospel, Ska, Grime, Dubstep, Techno, House, Trance, Ambient, Drum and Bass, World Music, Opera, Indie, Experimental, Lo-fi, Synth-Pop, Disco, Swing, Bluegrass, Emo, Shoegaze, Post-Rock, Reggaeton, Bachata, Samba, Flamenco, Qawwali, Afrobeats, K-Pop, J-Pop, C-Pop, Hard Rock, Soft Rock, Glam Rock, Progressive Rock, Psychedelic Rock, Folk Rock, Punk Rock, Alternative Rock, Grunge, Metalcore, Death Metal, Black Metal, Thrash Metal, Nu Metal, Folk Metal, Power Metal, Gothic Metal, Symphonic Metal, Garage Rock, Indie Rock, New Wave, Art Rock, Post-Punk, Noise Rock, Industrial, Dark Wave, Hardcore Punk, Post-Hardcore, Screamo, Emo-Pop, Britpop, Paisley Underground, Jangle Pop, Dream Pop, Math Rock, Southern Rock, Rockabilly, Surf Rock, Psychedelia, Doom Metal, Sludge Metal, Stoner Rock, Heavy Metal, Christian Metal, Folk Punk, Celtic Punk, Digital Hardcore, Crust Punk, Anarcho-Punk, Oi!, Skate Punk, Pop Punk, Ska Punk, Rap Rock, Rap Metal, Funk Rock, Funk Metal, Jazz Funk, G-Funk, P-Funk, Acid Jazz, Smooth Jazz, Free Jazz, Jazz Fusion, Bebop, Hard Bop, Modal Jazz, Swing Jazz, Dixieland, Big Band, Latin Jazz, Cool Jazz, Traditional Pop, Bubblegum Pop, Dance Pop, Pop Rock, Electropop, Baroque Pop, Chamber Pop, Wonky Pop, Indie Pop, Noise Pop, Teen Pop, Kawaii Metal, Visual Kei, J-Rock, Shibuya-Kei, Cantopop, Mandopop, Filmi, Bhangra, Bollywood, Indian Classical, Indian Folk, Arabic Pop, Arabic Classical, Turkish Classical, Fado, Sertanejo, Bossa Nova, Merengue, Salsa, Cumbia, Bolero, Mariachi, Norteño, Banda, Tango, Milonga, Zydeco, Cajun, Mbalax, Soukous, Highlife, Kwaito, Zouk, Kompa, Calypso, Soca, Reggae Fusion, Dancehall, Ragga, Roots Reggae, Dub, Lovers Rock, Rocksteady, 2 Tone, Dembow, Bachata Moderna, Chicha, Forró, Axé, Pagode, Vallenato, Ranchera, Corrido, Duranguense, Tejano, Champeta, Kizomba, Palo de Mayo, Arrocha, Tecnobrega, Eurodance, Italo Disco, Disco Polo, Hi-NRG, Freestyle, Electro, Breakbeat, UK Garage, Drill, Trap, Crunk, Snap, Hyphy, Chicago Drill, UK Drill, New Orleans Bounce, Miami Bass, Jersey Club, Footwork, Moombahton, Moombahcore, Acid House, Deep House, Future House, Minimal Techno, Hardstyle, Jumpstyle, Psytrance, Hard Trance, Euro Trance, Vocal Trance, Chillout, Downtempo, Trip Hop, Glitch Hop, Liquid Funk, Neurofunk, Jungle, Raggajungle, Acid Rock, Garage Punk, Freak Folk, Anti-Folk, New Romantic, Ethereal Wave, Neoclassical, Dark Cabaret, Gothic Rock, Steampunk, Space Rock, Krautrock, Electroclash, Dance-Punk, Post-Industrial, EBM, Coldwave, Synthwave, Vaporwave, Future Funk, Bitpop, Chiptune, Nerdcore, Skweee, Witch House, Chillwave, Glo-fi, Future Bass, Melodic Dubstep, Liquid Dubstep, Tropical House, Bass House, Psybient, Dark Psytrance, Uplifting Trance, Tech Trance, Speedcore, Terrorcore, Happy Hardcore, Nu-Disco, Gypsy Jazz, Ethio-jazz, Afrobeat, Desi, Folktronica, Country Rock, Country Blues, Country Pop, Outlaw Country, Bluegrass Gospel, Progressive Bluegrass, Neotraditional Country, Red Dirt, Texas Country, Americana, Australian Country, Canadian Country, Celtic Music, Andean Music, Native American Music, Inuit Music, African Gospel, Afro Pop, K-pop, Mandarin Pop, Tai Pop, Pinoy Pop, Thai Pop, Vietnamese Pop, Indonesian Pop, Malaysian Pop, Singaporean Pop, Burmese Pop, Cambodian Pop, Laos Pop, Nepali Pop, Bhutanese Pop, Afghan Pop, Pakistani Pop, Bangladeshi Pop, Sri Lankan Pop, Armenian Pop, Azerbaijani Pop, Georgian Pop, Ukrainian Pop, Belarusian Pop, Moldovan Pop, Albanian Pop, Kosovar Pop, Macedonian Pop, Bulgarian Pop, Romanian Pop, Serbian Pop, Croatian Pop, Bosnian Pop, Montenegrin Pop, Slovenian Pop, Slovak Pop, Czech Pop, Polish Pop, Hungarian Pop, Baltic Pop, Scandinavian Pop, Nordic Pop, Icelandic Pop, Greenlandic Pop, Faroese Pop, Orchestral, Chamber Music, Solo Instrumental, Concerto, Symphony, Opera, Choral, Gregorian Chant, Renaissance, Baroque, Classical Period, Romantic, Modern Classical, Contemporary Classical, Avant-garde, Minimalism, Electronic Classical, Jazz Rap, Turntablism, Alternative Hip Hop, Old School Hip Hop, New School Hip Hop, Golden Age Hip Hop, East Coast Hip Hop, West Coast Hip Hop, Southern Hip Hop, Midwest Hip Hop, Christian Hip Hop, Conscious Hip Hop, Gangsta Rap, Trap`;

import { SelectOption, ExamplePrompt } from './types';

export const CHARACTER_LIMITS = {
  idea: 300,
  environment: 250,
  characterActions: 250,
  voiceOver: 1000,
  negativePrompt: 200,
  customArtStyle: 150,
  youtubeUrl: 500,
  imageStudioPrompt: 300,
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
    'gemini-2.5-flash': { en: 'Flash (Fast & Efficient)', sv: 'Flash (Snabb & Effektiv)', es: 'Flash (Rápido y Eficiente)', fr: 'Flash (Rapide et Efficace)', de: 'Flash (Schnell & Effizient)' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getArtStyles = (lang: Language): SelectOption[] => {
  const styles: { [key: string]: { [lang in Language]: string } } = {
    'Cinematic': { en: 'Cinematic', sv: 'Filmisk', es: 'Cinematográfico', fr: 'Cinématographique', de: 'Filmisch' },
    'Photorealistic': { en: 'Photorealistic', sv: 'Fotorealistisk', es: 'Fotorrealista', fr: 'Photoréaliste', de: 'Fotorealistisch' },
    'Vlog 4K': { en: 'Vlog 4K', sv: 'Vlogg 4K', es: 'Vlog 4K', fr: 'Vlog 4K', de: 'Vlog 4K' },
    'Gorilla Viral Style': { en: 'Gorilla Viral Style', sv: 'Gorilla Viral-stil', es: 'Estilo Viral Gorila', fr: 'Style Viral Gorille', de: 'Gorilla Viral-Stil' },
    'Anime': { en: 'Anime', sv: 'Anime', es: 'Anime', fr: 'Anime', de: 'Anime' },
    'Claymation': { en: 'Claymation', sv: 'Leranimation', es: 'Plastimación', fr: 'Pâte à modeler', de: 'Knetanimation' },
    'Surrealism': { en: 'Surrealism', sv: 'Surrealism', es: 'Surrealismo', fr: 'Surréalisme', de: 'Surrealismus' },
    'Impressionistic': { en: 'Impressionistic', sv: 'Impressionistisk', es: 'Impresionista', fr: 'Impressionniste', de: 'Impressionistisch' },
    'Noir': { en: 'Noir', sv: 'Noir', es: 'Noir', fr: 'Noir', de: 'Noir' },
    'Baroque': { en: 'Baroque', sv: 'Barock', es: 'Barroco', fr: 'Baroque', de: 'Barock' },
    'Minimalist': { en: 'Minimalist', sv: 'Minimalistisk', es: 'Minimalista', fr: 'Minimaliste', de: 'Minimalistisch' },
    'Retro-futurism': { en: 'Retro-futurism', sv: 'Retro-futurism', es: 'Retro-futurismo', fr: 'Rétrofuturisme', de: 'Retro-Futurismus' },
    'Vintage 1950s film': { en: 'Vintage 1950s Film', sv: 'Vintage 1950-talsfilm', es: 'Película Vintage 1950s', fr: 'Film Vintage des années 50', de: 'Vintage 1950er Film' },
    'Cyberpunk': { en: 'Cyberpunk', sv: 'Cyberpunk', es: 'Cyberpunk', fr: 'Cyberpunk', de: 'Cyberpunk' },
    'Watercolor': { en: 'Watercolor', sv: 'Akvarell', es: 'Acuarela', fr: 'Aquarelle', de: 'Aquarell' },
    'Gothic Horror': { en: 'Gothic Horror', sv: 'Gotisk Skräck', es: 'Horror Gótico', fr: 'Horreur Gothique', de: 'Gothic Horror' },
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
    'Time-lapse': { en: 'Time-lapse', sv: 'Time-lapse', es: 'Time-lapse', fr: 'Accéléré', de: 'Zeitraffer' },
    'Glitch effect': { en: 'Glitch Effect', sv: 'Glitch-effekt', es: 'Efecto Glitch', fr: 'Effet Glitch', de: 'Glitch-Effekt' },
    'Neon glow': { en: 'Neon Glow', sv: 'Neonsken', es: 'Brillo de Neón', fr: 'Lueur de Néon', de: 'Neon-Leuchten' },
    'Lens flare': { en: 'Lens Flare', sv: 'Linsöverstrålning', es: 'Destello de Lente', fr: 'Reflet d\'Objectif', de: 'Linsenreflexion' },
    'Dream-like haze': { en: 'Dream-like Haze', sv: 'Drömlik dimma', es: 'Neblina Onírica', fr: 'Brume Onirique', de: 'Traumartiger Dunst' },
    'Particle effects (e.g., dust, sparks)': { en: 'Particle Effects', sv: 'Partikeleffekter', es: 'Efectos de Partículas', fr: 'Effets de Particules', de: 'Partikeleffekte' },
    'Light trails': { en: 'Light Trails', sv: 'Ljusspår', es: 'Estelas de Luz', fr: 'Traînées de Lumière', de: 'Lichtspuren' },
  };
  return Object.keys(effects).map(key => ({ value: key, label: effects[key][lang] }));
};

export const getColorPalettes = (lang: Language): SelectOption[] => {
  const palettes: { [key: string]: { [lang in Language]: string } } = {
    'Vibrant and saturated': { en: 'Vibrant', sv: 'Levande', es: 'Vibrante', fr: 'Vibrant', de: 'Lebendig' },
    'Muted and desaturated': { en: 'Muted', sv: 'Dämpad', es: 'Apagado', fr: 'Atténué', de: 'Gedämpft' },
    'Monochrome (black and white)': { en: 'Monochrome', sv: 'Monokrom', es: 'Monocromático', fr: 'Monochrome', de: 'Monochrom' },
    'Pastel colors': { en: 'Pastel', sv: 'Pastell', es: 'Pastel', fr: 'Pastel', de: 'Pastell' },
    'Synthwave neon': { en: 'Synthwave Neon', sv: 'Synthwave Neon', es: 'Neón Synthwave', fr: 'Néon Synthwave', de: 'Synthwave-Neon' },
    'Sepia tone': { en: 'Sepia', sv: 'Sepia', es: 'Sepia', fr: 'Sépia', de: 'Sepia' },
    'Cool, blue tones': { en: 'Cool Tones', sv: 'Kalla toner', es: 'Tonos Fríos', fr: 'Tons Froids', de: 'Kühle Töne' },
    'Warm, golden hour tones': { en: 'Warm Tones', sv: 'Varma toner', es: 'Tonos Cálidos', fr: 'Tons Chauds', de: 'Warme Töne' },
  };
  return Object.keys(palettes).map(key => ({ value: key, label: palettes[key][lang] }));
};

export const getAspectRatios = (lang: Language): SelectOption[] => {
    const ratios: { [key: string]: { [lang in Language]: string } } = {
      '16:9': { en: '16:9 (Widescreen)', sv: '16:9 (Widescreen)', es: '16:9 (Panorámico)', fr: '16:9 (Panoramique)', de: '16:9 (Breitbild)' },
      '9:16': { en: '9:16 (Vertical)', sv: '9:16 (Vertikal)', es: '9:16 (Vertical)', fr: '9:16 (Vertical)', de: '9:16 (Vertikal)' },
      '1:1': { en: '1:1 (Square)', sv: '1:1 (Kvadratisk)', es: '1:1 (Cuadrado)', fr: '1:1 (Carré)', de: '1:1 (Quadratisch)' },
      '4:3': { en: '4:3 (Standard)', sv: '4:3 (Standard)', es: '4:3 (Estándar)', fr: '4:3 (Standard)', de: '4:3 (Standard)' },
      '2.35:1': { en: '2.35:1 (Cinemascope)', sv: '2.35:1 (Cinemascope)', es: '2.35:1 (Cinemascope)', fr: '2.35:1 (Cinemascope)', de: '2.35:1 (Cinemascope)' },
    };
    return Object.keys(ratios).map(key => ({ value: key, label: ratios[key][lang] }));
};

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
  };
  return Object.keys(genders).map(key => ({ value: key, label: genders[key][lang] }));
};

export const getCharacterEthnicities = (lang: Language): SelectOption[] => {
  const ethnicities: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'African': { en: 'African', sv: 'Afrikansk', es: 'Africana', fr: 'Africaine', de: 'Afrikanisch' },
    'East Asian': { en: 'East Asian', sv: 'Östasiatisk', es: 'Asiática Oriental', fr: 'Asiatique de l\'Est', de: 'Ostasiatisch' },
    'South Asian': { en: 'South Asian', sv: 'Sydasiatisk', es: 'Asiática del Sur', fr: 'Asiatique du Sud', de: 'Südasiatisch' },
    'European': { en: 'European', sv: 'Europeisk', es: 'Europea', fr: 'Européenne', de: 'Europäisch' },
    'Hispanic/Latin': { en: 'Hispanic/Latin', sv: 'Spansk/Latinamerikansk', es: 'Hispana/Latina', fr: 'Hispanique/Latine', de: 'Hispanisch/Lateinamerikanisch' },
    'Middle Eastern': { en: 'Middle Eastern', sv: 'Mellanöstern', es: 'De Oriente Medio', fr: 'Moyen-Orientale', de: 'Nahöstlich' },
    'Native American': { en: 'Native American', sv: 'Amerikansk urinvånare', es: 'Nativa Americana', fr: 'Amérindienne', de: 'Amerikanischer Ureinwohner' },
    'Mixed': { en: 'Mixed', sv: 'Blandad', es: 'Mixta', fr: 'Mixte', de: 'Gemischt' },
  };
  return Object.keys(ethnicities).map(key => ({ value: key, label: ethnicities[key][lang] }));
};

export const getCharacterClothings = (lang: Language): SelectOption[] => {
  const clothings: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Casual': { en: 'Casual', sv: 'Vardaglig', es: 'Casual', fr: 'Décontracté', de: 'Lässig' },
    'Formal': { en: 'Formal', sv: 'Formell', es: 'Formal', fr: 'Formel', de: 'Formell' },
    'Fantasy Armor': { en: 'Fantasy Armor', sv: 'Fantasirustning', es: 'Armadura de Fantasía', fr: 'Armure Fantastique', de: 'Fantasie-Rüstung' },
    'Sci-fi Suit': { en: 'Sci-fi Suit', sv: 'Sci-fi-dräkt', es: 'Traje de Ciencia Ficción', fr: 'Combinaison de Science-Fiction', de: 'Sci-Fi-Anzug' },
    'Historical Garb': { en: 'Historical Garb', sv: 'Historisk dräkt', es: 'Atuendo Histórico', fr: 'Costume Historique', de: 'Historische Kleidung' },
    'Sportswear': { en: 'Sportswear', sv: 'Sportkläder', es: 'Ropa Deportiva', fr: 'Vêtements de Sport', de: 'Sportkleidung' },
    'Uniform': { en: 'Uniform', sv: 'Uniform', es: 'Uniforme', fr: 'Uniforme', de: 'Uniform' },
  };
  return Object.keys(clothings).map(key => ({ value: key, label: clothings[key][lang] }));
};

export const getCharacterArchetypes = (lang: Language): SelectOption[] => {
  const archetypes: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Hero': { en: 'Hero', sv: 'Hjälte', es: 'Héroe', fr: 'Héros', de: 'Held' },
    'Villain': { en: 'Villain', sv: 'Skurk', es: 'Villano', fr: 'Méchant', de: 'Bösewicht' },
    'Mentor': { en: 'Mentor', sv: 'Mentor', es: 'Mentor', fr: 'Mentor', de: 'Mentor' },
    'Sidekick': { en: 'Sidekick', sv: 'Medhjälpare', es: 'Compañero', fr: 'Acolyte', de: 'Sidekick' },
    'Anti-hero': { en: 'Anti-hero', sv: 'Antihjälte', es: 'Antihéroe', fr: 'Anti-héros', de: 'Anti-Held' },
    'Explorer': { en: 'Explorer', sv: 'Utforskare', es: 'Explorador', fr: 'Explorateur', de: 'Entdecker' },
    'Rebel': { en: 'Rebel', sv: 'Rebell', es: 'Rebelde', fr: 'Rebelle', de: 'Rebell' },
    'Sage': { en: 'Sage', sv: 'Vise man', es: 'Sabio', fr: 'Sage', de: 'Weiser' },
    'Jester': { en: 'Jester', sv: 'Gycklare', es: 'Bufón', fr: 'Bouffon', de: 'Hofnarr' },
    'Orphan': { en: 'Orphan', sv: 'Föräldralös', es: 'Huérfano', fr: 'Orphelin', de: 'Waise' },
  };
  return Object.keys(archetypes).map(key => ({ value: key, label: archetypes[key][lang] }));
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

export const getStaticInspirationPrompts = (lang: Language): ExamplePrompt[] => {
  const prompts: { [key: string]: { [lang in Language]: { title: string; idea: string; prompt: string } } & { params: ExamplePrompt['params'] } } = {
    "artisan": {
      en: { title: "The Artisan's Hand", idea: "A close-up, intimate portrait of a Renaissance painter creating a masterpiece.", prompt: "Extreme close-up on an artist's hand, aged and stained with paint, meticulously applying a final brushstroke to a masterpiece on canvas. The setting is a dusty, sun-drenched Renaissance studio filled with books and artifacts. The camera is static, focusing on the delicate movement of the brush. The art style is Baroque, with deep shadows and warm, golden hour tones creating a sense of timeless dedication. The scene is silent, accompanied only by the subtle ambient sound of a crackling fireplace. The final video should have a 4:3 aspect ratio, giving it a classic, historical feel." },
      sv: { title: "Hantverkarens Hand", idea: "Ett intimt närporträtt av en renässansmålare som skapar ett mästerverk.", prompt: "Extrem närbild på en konstnärs hand, åldrad och fläckad av färg, som minutiöst applicerar ett sista penseldrag på ett mästerverk på duk. Miljön är en dammig, solbelyst renässansateljé fylld med böcker och artefakter. Kameran är statisk och fokuserar på penselns fina rörelse. Konststilen är barock, med djupa skuggor och varma, gyllene timmens toner som skapar en känsla av tidlös hängivenhet. Scenen är tyst, ackompanjerad endast av det subtila omgivningsljudet från en sprakande brasa. Den slutliga videon ska ha ett 4:3-bildförhållande, vilket ger den en klassisk, historisk känsla." },
      es: { title: "La Mano del Artesano", idea: "Un retrato íntimo y en primer plano de un pintor renacentista creando una obra maestra.", prompt: "Primerísimo primer plano de la mano de un artista, envejecida y manchada de pintura, aplicando meticulosamente una pincelada final a una obra maestra sobre lienzo. El escenario es un polvoriento estudio renacentista bañado por el sol, lleno de libros y artefactos. La cámara es estática, centrándose en el delicado movimiento del pincel. El estilo artístico es barroco, con sombras profundas y tonos cálidos de la hora dorada que crean una sensación de dedicación atemporal. La escena es silenciosa, acompañada únicamente por el sutil sonido ambiental de una chimenea crepitante. El video final debe tener una relación de aspecto de 4:3, dándole una sensación clásica e histórica." },
      fr: { title: "La Main de l'Artisan", idea: "Un portrait intime et en gros plan d'un peintre de la Renaissance créant un chef-d'œuvre.", prompt: "Très gros plan sur la main d'un artiste, vieillie et tachée de peinture, appliquant méticuleusement un dernier coup de pinceau à un chef-d'œuvre sur toile. Le décor est un atelier poussiéreux de la Renaissance, baigné de soleil, rempli de livres et d'artefacts. La caméra est statique, se concentrant sur le mouvement délicat du pinceau. Le style artistique est baroque, avec des ombres profondes et des tons chauds de l'heure dorée créant un sentiment de dévouement intemporel. La scène est silencieuse, accompagnée seulement par le son ambiant subtil d'un feu de cheminée crépitant. La vidéo finale devrait avoir un rapport d'aspect de 4:3, lui donnant une atmosphère classique et historique." },
      de: { title: "Die Hand des Handwerkers", idea: "Ein intimes Nahaufnahme-Porträt eines Renaissance-Malers, der ein Meisterwerk schafft.", prompt: "Extreme Nahaufnahme der Hand eines Künstlers, gealtert und mit Farbe befleckt, die akribisch einen letzten Pinselstrich auf ein Meisterwerk auf Leinwand aufträgt. Die Szene ist ein staubiges, sonnendurchflutetes Renaissance-Atelier voller Bücher und Artefakte. Die Kamera ist statisch und konzentriert sich auf die zarte Bewegung des Pinsels. Der Kunststil ist barock, mit tiefen Schatten und warmen, goldenen Stundentönen, die ein Gefühl zeitloser Hingabe erzeugen. Die Szene ist still, nur begleitet vom subtilen Umgebungsgeräusch eines knisternden Kamins. Das endgültige Video sollte ein Seitenverhältnis von 4:3 haben, was ihm ein klassisches, historisches Flair verleiht." },
      params: { environment: "A dusty, sun-drenched Renaissance studio", timeOfDay: "Golden Hour", characterActions: "An artist's hand applying a final brushstroke to a masterpiece.", characterArchetype: "Sage", artStyle: "Baroque", cameraMovement: "Static shot", cameraDistance: "Extreme close-up", lensType: "Macro lens", visualEffect: "None", colorPalette: "Warm, golden hour tones", aspectRatio: "4:3", animationPreset: "None", voiceStyle: "None", ambientSound: "None", soundEffectsIntensity: "Subtle" },
    },
    "culinary": {
      en: { title: "Culinary Close-up", idea: "A vibrant, macro 4K vlog-style video of ingredients being prepared for a gourmet meal.", prompt: "A dynamic, macro 4K vlog-style shot of fresh basil being chopped on a wooden board, with drops of water flying in slow motion. The camera pans smoothly across other ingredients: glistening tomatoes, a clove of garlic. The scene is vibrant and saturated, captured with a macro lens to emphasize texture and detail. The overall style is photorealistic and clean. The audio features a high-energy announcer voice-over explaining the recipe, mixed with prominent, crisp sound effects of the chopping and sizzling. The aspect ratio is 9:16, perfect for social media." },
      sv: { title: "Kulinarisk Närbild", idea: "En livfull 4K-vloggvideo i makrostil av ingredienser som förbereds för en gourmetmåltid.", prompt: "En dynamisk makrobild i 4K-vloggstil av färsk basilika som hackas på en träskärbräda, med vattendroppar som flyger i slow motion. Kameran panorerar mjukt över andra ingredienser: glänsande tomater, en vitlöksklyfta. Scenen är levande och mättad, fångad med ett makroobjektiv för att framhäva textur och detaljer. Den övergripande stilen är fotorealistisk och ren. Ljudet har en högenergisk speakerröst som förklarar receptet, blandat med framträdande, krispiga ljudeffekter av hackandet och fräsandet. Bildförhållandet är 9:16, perfekt för sociala medier." },
      es: { title: "Primer Plano Culinario", idea: "Un vibrante video estilo vlog 4K macro de ingredientes preparándose para una comida gourmet.", prompt: "Una toma dinámica estilo vlog 4K macro de albahaca fresca siendo picada en una tabla de madera, con gotas de agua volando en cámara lenta. La cámara se desplaza suavemente por otros ingredientes: tomates relucientes, un diente de ajo. La escena es vibrante y saturada, capturada con una lente macro para enfatizar la textura y el detalle. El estilo general es fotorrealista y limpio. El audio presenta una voz en off de un anunciante de alta energía explicando la receta, mezclada con efectos de sonido prominentes y nítidos del corte y el chisporroteo. La relación de aspecto es de 9:16, perfecta para redes sociales." },
      fr: { title: "Gros Plan Culinaire", idea: "Une vidéo vibrante de style vlog 4K en macro d'ingrédients préparés pour un repas gastronomique.", prompt: "Un plan dynamique de style vlog 4K en macro de basilic frais haché sur une planche en bois, avec des gouttes d'eau volant au ralenti. La caméra fait un panoramique doux sur d'autres ingrédients : des tomates brillantes, une gousse d'ail. La scène est vibrante et saturée, capturée avec un objectif macro pour souligner la texture et les détails. Le style général est photoréaliste et propre. L'audio présente une voix off d'annonceur très énergique expliquant la recette, mélangée à des effets sonores proéminents et nets du hachage et du grésillement. Le rapport d'aspect est de 9:16, parfait pour les médias sociaux." },
      de: { title: "Kulinarische Nahaufnahme", idea: "Ein lebhaftes Makro-4K-Vlog-Video von Zutaten, die für ein Gourmet-Essen zubereitet werden.", prompt: "Eine dynamische Makro-4K-Vlog-Aufnahme von frischem Basilikum, das auf einem Holzbrett gehackt wird, mit Wassertropfen, die in Zeitlupe fliegen. Die Kamera schwenkt sanft über andere Zutaten: glänzende Tomaten, eine Knoblauchzehe. Die Szene ist lebendig und gesättigt, aufgenommen mit einem Makroobjektiv, um Textur und Details hervorzuheben. Der Gesamtstil ist fotorealistisch und sauber. Der Ton enthält eine energiegeladene Sprecher-Stimme, die das Rezept erklärt, gemischt mit prominenten, klaren Soundeffekten des Hackens und Brutzelns. Das Seitenverhältnis ist 9:16, perfekt für soziale Medien." },
      params: { environment: "A clean, professional kitchen setting.", characterActions: "Fresh basil being chopped on a wooden board, with drops of water flying.", artStyle: "Vlog 4K", cameraMovement: "Panning shot", cameraDistance: "Extreme close-up", lensType: "Macro lens", visualEffect: "Slow motion", colorPalette: "Vibrant and saturated", aspectRatio: "9:16", animationPreset: "Smooth Transition", voiceStyle: "High-Energy Announcer", ambientSound: "None", soundEffectsIntensity: "Prominent" },
    },
    "dreamscape": {
      en: { title: "Abstract Dreamscape", idea: "A surreal, dream-like journey through a world of floating geometric shapes and shifting colors.", prompt: "A surreal journey through an abstract landscape made of glowing, geometric shapes that slowly drift and morph. The camera tracks smoothly through this world, which is bathed in a dream-like haze and a pastel color palette. The style is minimalist and surreal, with light trails following the moving shapes. The aspect ratio is a cinematic 16:9. A calm ASMR voice whispers cryptic phrases, accompanied by a subtle sci-fi space hum, creating a mesmerizing and hypnotic experience." },
      sv: { title: "Abstrakt Drömlandskap", idea: "En surrealistisk, drömlik resa genom en värld av svävande geometriska former och skiftande färger.", prompt: "En surrealistisk resa genom ett abstrakt landskap av glödande, geometriska former som långsamt driver och förvandlas. Kameran följer mjukt genom denna värld, som badar i ett drömlikt dis och en pastellfärgpalett. Stilen är minimalistisk och surrealistisk, med ljusspår som följer de rörliga formerna. Bildförhållandet är filmiska 16:9. En lugn ASMR-röst viskar kryptiska fraser, ackompanjerad av ett subtilt sci-fi-rymdbrummande, vilket skapar en fascinerande och hypnotisk upplevelse." },
      es: { title: "Paisaje Onírico Abstracto", idea: "Un viaje surrealista y onírico a través de un mundo de formas geométricas flotantes y colores cambiantes.", prompt: "Un viaje surrealista a través de un paisaje abstracto hecho de formas geométricas brillantes que flotan y se transforman lentamente. La cámara se desplaza suavemente por este mundo, bañado en una neblina onírica y una paleta de colores pastel. El estilo es minimalista y surrealista, con estelas de luz que siguen a las formas en movimiento. La relación de aspecto es cinematográfica, 16:9. Una voz tranquila de ASMR susurra frases crípticas, acompañada de un sutil zumbido espacial de ciencia ficción, creando una experiencia fascinante e hipnótica." },
      fr: { title: "Paysage de Rêve Abstrait", idea: "Un voyage surréaliste et onirique à travers un monde de formes géométriques flottantes et de couleurs changeantes.", prompt: "Un voyage surréaliste à travers un paysage abstrait composé de formes géométriques lumineuses qui dérivent et se transforment lentement. La caméra suit en douceur ce monde, baigné d'une brume onirique et d'une palette de couleurs pastel. Le style est minimaliste et surréaliste, avec des traînées de lumière suivant les formes en mouvement. Le rapport d'aspect est un 16:9 cinématographique. Une voix calme ASMR chuchote des phrases cryptiques, accompagnée d'un subtil bourdonnement spatial de science-fiction, créant une expérience fascinante et hypnotique." },
      de: { title: "Abstrakte Traumlandschaft", idea: "Eine surreale, traumartige Reise durch eine Welt aus schwebenden geometrischen Formen und wechselnden Farben.", prompt: "Eine surreale Reise durch eine abstrakte Landschaft aus leuchtenden, geometrischen Formen, die langsam treiben und sich verwandeln. Die Kamera verfolgt sanft diese Welt, die in einen traumartigen Dunst und eine Pastellfarbpalette getaucht ist. Der Stil ist minimalistisch und surreal, mit Lichtspuren, die den bewegten Formen folgen. Das Seitenverhältnis ist ein filmisches 16:9. Eine ruhige ASMR-Stimme flüstert kryptische Sätze, begleitet von einem subtilen Sci-Fi-Weltraumsurren, was ein faszinierendes und hypnotisches Erlebnis schafft." },
      params: { environment: "An abstract landscape of glowing, geometric shapes.", characterActions: "No characters, focus on the morphing shapes.", artStyle: "Surrealism", cameraMovement: "Tracking shot", cameraDistance: "Wide shot", lensType: "Wide-angle lens", visualEffect: "Dream-like haze", colorPalette: "Pastel colors", aspectRatio: "16:9", animationPreset: "Crossfade", voiceStyle: "Calm ASMR Voice", ambientSound: "Sci-fi Space Hum", soundEffectsIntensity: "Subtle" },
    },
  };
  
  return Object.values(prompts).map(p => ({
    title: p[lang].title,
    idea: p[lang].idea,
    prompt: p[lang].prompt,
    params: p.params,
  }));
};
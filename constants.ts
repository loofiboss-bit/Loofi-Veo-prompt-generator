

import { SelectOption, ExamplePrompt } from './types';

export const CHARACTER_LIMITS = {
  idea: 300,
  environment: 250,
  characterActions: 250,
  voiceOver: 1000,
  negativePrompt: 200,
  customArtStyle: 150,
  characterSpecificClothing: 200,
  characterAccessories: 200,
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
      '3:4': { en: '3:4 (Portrait)', sv: '3:4 (Porträtt)', es: '3:4 (Retrato)', fr: '3:4 (Portrait)', de: '3:4 (Hochformat)' },
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
    // FIX: Added the missing French ('fr') translation for 'Uniform'.
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

export const getCharacterAges = (lang: Language): SelectOption[] => {
  const ages: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Child': { en: 'Child', sv: 'Barn', es: 'Niño/a', fr: 'Enfant', de: 'Kind' },
    'Teenager': { en: 'Teenager', sv: 'Tonåring', es: 'Adolescente', fr: 'Adolescent', de: 'Teenager' },
    'Young Adult': { en: 'Young Adult', sv: 'Ung vuxen', es: 'Adulto/a joven', fr: 'Jeune adulte', de: 'Junger Erwachsener' },
    'Middle-aged': { en: 'Middle-aged', sv: 'Medelålders', es: 'De mediana edad', fr: 'D\'âge moyen', de: 'Mittelalter' },
    'Senior': { en: 'Senior', sv: 'Senior', es: 'Mayor', fr: 'Sénior', de: 'Senior' },
  };
  return Object.keys(ages).map(key => ({ value: key, label: ages[key][lang] }));
};

export const getCharacterMoods = (lang: Language): SelectOption[] => {
  const moods: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificado', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Happy': { en: 'Happy', sv: 'Glad', es: 'Feliz', fr: 'Heureux', de: 'Fröhlich' },
    'Sad': { en: 'Sad', sv: 'Ledsen', es: 'Triste', fr: 'Triste', de: 'Traurig' },
    'Angry': { en: 'Angry', sv: 'Arg', es: 'Enojado/a', fr: 'En colère', de: 'Wütend' },
    'Contemplative': { en: 'Contemplative', sv: 'Kontemplativ', es: 'Contemplativo/a', fr: 'Contemplatif', de: 'Nachdenklich' },
    'Mysterious': { en: 'Mysterious', sv: 'Mystisk', es: 'Misterioso/a', fr: 'Mystérieux', de: 'Geheimnisvoll' },
    'Energetic': { en: 'Energetic', sv: 'Energisk', es: 'Enérgico/a', fr: 'Énergique', de: 'Energisch' },
  };
  return Object.keys(moods).map(key => ({ value: key, label: moods[key][lang] }));
};

export const getCharacterPoses = (lang: Language): SelectOption[] => {
  const poses: { [key: string]: { [lang in Language]: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad', es: 'Cualquiera / No especificada', fr: 'Indifférent / Non spécifié', de: 'Beliebig / Nicht angegeben' },
    'Standing': { en: 'Standing', sv: 'Stående', es: 'De pie', fr: 'Debout', de: 'Stehend' },
    'Sitting': { en: 'Sitting', sv: 'Sittande', es: 'Sentado/a', fr: 'Assis', de: 'Sitzend' },
    'Walking': { en: 'Walking', sv: 'Gående', es: 'Caminando', fr: 'Marchant', de: 'Gehend' },
    'Running': { en: 'Running', sv: 'Springande', es: 'Corriendo', fr: 'Courant', de: 'Laufend' },
    'Leaning': { en: 'Leaning', sv: 'Lutande', es: 'Apoyado/a', fr: 'Appuyé', de: 'Lehnend' },
    'Fighting Stance': { en: 'Fighting Stance', sv: 'Kampställning', es: 'Postura de combate', fr: 'Posture de combat', de: 'Kampfhaltung' },
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
      params: { environment: "A vast, snowy tundra.", timeOfDay: "Midday", weather: "Snowing", characterActions: "An arctic fox stalks silently through the deep snow.", artStyle: "Photorealistic", cameraMovement: "Drone shot, flying over", cameraDistance: "Wide shot", lensType: "Telephoto lens", visualEffect: "None", colorPalette: "Muted and desaturated", aspectRatio: "16:9", animationPreset: "None", voiceStyle: "Documentary Narrator", ambientSound: "None", soundEffectsIntensity: "Subtle" },
    },
    "whispers-of-twilight": {
      en: { title: "Whispers of Twilight", idea: "An anime-style scene of a girl releasing a glowing lantern over a lake.", prompt: "A young girl in a simple yukata stands at the edge of a tranquil lake during twilight. She gently releases a glowing paper lantern into the sky, watching it float away with a hopeful expression. The scene is rendered in a beautiful Anime style, with a dream-like haze and a warm, golden hour color palette. The camera tilts up, following the lantern as it joins others in the dusky sky. The sound is of gentle water lapping and a soft, emotional musical score." },
      sv: { title: "Skymningsviskningar", idea: "En scen i anime-stil av en flicka som släpper en glödande lykta över en sjö.", prompt: "En ung flicka i en enkel yukata står vid kanten av en lugn sjö i skymningen. Hon släpper försiktigt upp en glödande papperslykta mot himlen och ser den sväva iväg med ett hoppfullt uttryck. Scenen är renderad i en vacker anime-stil, med ett drömlikt dis och en varm, gyllene timmens färgpalett. Kameran tiltar upp och följer lyktan när den ansluter sig till andra på den dunkla himlen. Ljudet är av stilla vågskvalp och en mjuk, känslosam musik." },
      es: { title: "Susurros del Crepúsculo", idea: "Una escena de estilo anime de una chica soltando un farolillo brillante sobre un lago.", prompt: "Una joven con un sencillo yukata está al borde de un lago tranquilo durante el crepúsculo. Suelta suavemente un farolillo de papel brillante en el cielo, viéndolo flotar con una expresión de esperanza. La escena está renderizada en un hermoso estilo Anime, con una neblina onírica y una paleta de colores cálidos de la hora dorada. La cámara se inclina hacia arriba, siguiendo el farolillo mientras se une a otros en el cielo crepuscular. El sonido es de suaves olas y una partitura musical suave y emotiva." },
      fr: { title: "Murmures du Crépuscule", idea: "Une scène de style anime d'une fille lâchant une lanterne brillante au-dessus d'un lac.", prompt: "Une jeune fille en simple yukata se tient au bord d'un lac tranquille au crépuscule. Elle lâche doucement une lanterne en papier brillante dans le ciel, la regardant s'éloigner avec une expression pleine d'espoir. La scène est rendue dans un magnifique style Anime, avec une brume onirique et une palette de couleurs chaudes de l'heure dorée. La caméra s'incline vers le haut, suivant la lanterne alors qu'elle rejoint d'autres dans le ciel crépusculaire. Le son est celui de douces vagues et d'une musique douce et émouvante." },
      de: { title: "Flüstern der Dämmerung", idea: "Eine Szene im Anime-Stil, in der ein Mädchen eine leuchtende Laterne über einem See loslässt.", prompt: "Ein junges Mädchen in einem einfachen Yukata steht am Rande eines ruhigen Sees in der Dämmerung. Sie lässt sanft eine leuchtende Papierlaterne in den Himmel steigen und beobachtet sie mit einem hoffnungsvollen Ausdruck, wie sie davonschwebt. Die Szene ist in einem wunderschönen Anime-Stil gerendert, mit einem traumartigen Dunst und einer warmen, goldenen Stunden-Farbpalette. Die Kamera neigt sich nach oben und folgt der Laterne, wie sie sich anderen am dämmrigen Himmel anschließt. Der Ton besteht aus sanftem Plätschern von Wasser und einer weichen, emotionalen Musikpartitur." },
      params: { environment: "The edge of a tranquil lake.", timeOfDay: "Twilight", weather: "Clear skies", characterActions: "A young girl in a yukata releases a glowing paper lantern.", characterGender: "Female", artStyle: "Anime", cameraMovement: "Tilting shot", cameraDistance: "Medium shot", visualEffect: "Dream-like haze", colorPalette: "Warm, golden hour tones", aspectRatio: "16:9", animationPreset: "Smooth Transition", voiceStyle: "None", ambientSound: "Ocean Waves", soundEffectsIntensity: "Subtle" },
    },
  };
  
  return Object.values(prompts).map(p => ({
    title: p[lang].title,
    idea: p[lang].idea,
    prompt: p[lang].prompt,
    params: p.params,
  }));
};

export const MUSIC_GENRES = "Rock, Pop, Jazz, Blues, Classical, Hip-Hop, Reggae, Country, Electronic, Metal, Punk, Folk, R&B, Soul, Funk, Gospel, Ska, Grime, Dubstep, Techno, House, Trance, Ambient, Drum and Bass, World Music, Opera, Indie, Experimental, Lo-fi, Synth-Pop, Disco, Swing, Bluegrass, Emo, Shoegaze, Post-Rock, Reggaeton, Bachata, Samba, Flamenco, Qawwali, Afrobeats, K-Pop, J-Pop, C-Pop, Hard Rock, Soft Rock, Glam Rock, Progressive Rock, Psychedelic Rock, Folk Rock, Punk Rock, Alternative Rock, Grunge, Metalcore, Death Metal, Black Metal, Thrash Metal, Nu Metal, Folk Metal, Power Metal, Gothic Metal, Symphonic Metal, Garage Rock, Indie Rock, New Wave, Art Rock, Post-Punk, Noise Rock, Industrial, Dark Wave, Hardcore Punk, Post-Hardcore, Screamo, Emo-Pop, Britpop, Paisley Underground, Jangle Pop, Dream Pop, Math Rock, Southern Rock, Rockabilly, Surf Rock, Psychedelia, Doom Metal, Sludge Metal, Stoner Rock, Heavy Metal, Christian Metal, Folk Punk, Celtic Punk, Digital Hardcore, Crust Punk, Anarcho-Punk, Oi!, Skate Punk, Pop Punk, Ska Punk, Rap Rock, Rap Metal, Funk Rock, Funk Metal, Jazz Funk, G-Funk, P-Funk, Acid Jazz, Smooth Jazz, Free Jazz, Jazz Fusion, Bebop, Hard Bop, Modal Jazz, Swing Jazz, Dixieland, Big Band, Latin Jazz, Cool Jazz, Traditional Pop, Bubblegum Pop, Dance Pop, Pop Rock, Electropop, Baroque Pop, Chamber Pop, Wonky Pop, Indie Pop, Noise Pop, Teen Pop, Kawaii Metal, Visual Kei, J-Rock, Shibuya-Kei, Cantopop, Mandopop, Filmi, Bhangra, Bollywood, Indian Classical, Indian Folk, Arabic Pop, Arabic Classical, Turkish Classical, Fado, Sertanejo, Bossa Nova, Merengue, Salsa, Cumbia, Bolero, Mariachi, Norteño, Banda, Tango, Milonga, Zydeco, Cajun, Mbalax, Soukous, Highlife, Kwaito, Zouk, Kompa, Calypso, Soca, Reggae Fusion, Dancehall, Ragga, Roots Reggae, Dub, Lovers Rock, Ska Jazz, Rocksteady, 2 Tone, Dembow, Bachata Moderna, Chicha, Forró, Axé, Pagode, Vallenato, Ranchera, Corrido, Duranguense, Tejano, Champeta, Kizomba, Palo de Mayo, Arrocha, Tecnobrega, Eurodance, Italo Disco, Disco Polo, Hi-NRG, Freestyle, Electro, Breakbeat, UK Garage, Drill, Trap, Crunk, Snap, Hyphy, Chicago Drill, UK Drill, New Orleans Bounce, Miami Bass, Jersey Club, Footwork, Moombahton, Moombahcore, Acid House, Deep House, Future House, Minimal Techno, Hardstyle, Jumpstyle, Psytrance, Hard Trance, Euro Trance, Vocal Trance, Chillout, Downtempo, Trip Hop, Glitch Hop, Liquid Funk, Neurofunk, Jungle, Raggajungle, Acid Rock, Garage Punk, Freak Folk, Anti-Folk, New Romantic, Ethereal Wave, Neoclassical, Dark Cabaret, Gothic Rock, Steampunk, Space Rock, Krautrock, Electroclash, Dance-Punk, Post-Industrial, EBM, Coldwave, Synthwave, Vaporwave, Future Funk, Bitpop, Chiptune, Nerdcore, Skweee, Witch House, Chillwave, Glo-fi, Future Bass, Melodic Dubstep, Liquid Dubstep, Tropical House, Bass House, Psybient, Dark Psytrance, Uplifting Trance, Tech Trance, Speedcore, Terrorcore, Happy Hardcore, Nu-Disco, Gypsy Jazz, Ethio-jazz, Afrobeat, Desi, Folktronica, Country Rock, Country Blues, Country Pop, Outlaw Country, Bluegrass Gospel, Progressive Bluegrass, Neotraditional Country, Red Dirt, Texas Country, Americana, Australian Country, Canadian Country, Celtic Music, Andean Music, Native American Music, Inuit Music, African Gospel, Afro Pop, K-pop, Mandarin Pop, Tai Pop, Pinoy Pop, Thai Pop, Vietnamese Pop, Indonesian Pop, Malaysian Pop, Singaporean Pop, Burmese Pop, Cambodian Pop, Laos Pop, Nepali Pop, Bhutanese Pop, Afghan Pop, Pakistani Pop, Bangladeshi Pop, Sri Lankan Pop, Armenian Pop, Azerbaijani Pop, Georgian Pop, Ukrainian Pop, Belarusian Pop, Moldovan Pop, Albanian Pop, Kosovar Pop, Macedonian Pop, Bulgarian Pop, Romanian Pop, Serbian Pop, Croatian Pop, Bosnian Pop, Montenegrin Pop, Slovenian Pop, Slovak Pop, Czech Pop, Polish Pop, Hungarian Pop, Baltic Pop, Scandinavian Pop, Nordic Pop, Icelandic Pop, Greenlandic Pop, Faroese Pop, Orchestral, Chamber Music, Solo Instrumental, Concerto, Symphony, Opera, Choral, Gregorian Chant, Renaissance, Baroque, Classical Period, Romantic, Modern Classical, Contemporary Classical, Avant-garde, Minimalism, Electronic Classical, Jazz Rap, Turntablism, Alternative Hip Hop, Old School Hip Hop, New School Hip Hop, Golden Age Hip Hop, East Coast Hip Hop, West Coast Hip Hop, Southern Hip Hop, Midwest Hip Hop, Christian Hip Hop, Conscious Hip Hop, Gangsta Rap, Trap, Crunk, Snap Music, Glitch, EDM, IDM, Ambient Techno, Tech House, Detroit Techno, Berlin Techno, Acid Techno, Dub Techno, Minimal Techno, Deep Tech, Microhouse, Polartronics, Ghetto Tech, Juke, Footwork, Techstep, Liquid Funk, Hardstep, Jump-Up, Drumfunk, Sambass, Ragga Twins, Drumstep, Darkstep, Neurohop, Breakcore, Digital Mystikz, Space Bass, Halftime, Rhythm and Grime, Grimestep, Future Garage, Post-Dubstep, Brostep, Chillstep, Deep Medi Musik, Hyperdub, Planet Mu, Rinse FM, Bassline, Speed Garage, 2-Step, Dubwise, Steppers, Rootstep, Dancehall, Bashment, Ragga, Ragga Jungle, Raggacore, Dubstep, Grime, UK Funky, Grindie, Dubtronica, Dub Reggae, Lovers Rock, Roots Reggae, Reggae 110, Reggae Fusion, Ska, Rocksteady, 2 Tone, Ska Punk, Ska Jazz, Ska Core, Dancehall, Bashment, Dub, Dub Poetry, Raggamuffin, Soca, Calypso, Steelpan, Parang, Chutney, Chutney Soca, Bacchanal, Jouvert, Mas, Carnival, Bachata, Merengue, Salsa, Salsa Dura, Salsa Romantica, Timba, Son, Son Montuno, Charanga, Son Cubano, Guajira, Guaracha, Bolero Son, Trova, Nueva Trova, Cubaton, Reggaeton Cubano, Gaita Zuliana, Joropo, Vallenato, Musica Llanera, Cumbia Villera, Tecnocumbia, Neo-Cumbia, Andean Folk, Huayno, Son Jarocho, Ranchera, Corrido, Norteño-Banda, Quebradita, Duranguense, Pasito Duranguense, Mexican Pop, Mexican Rock, Grupera, Tejano, Tex-Mex, Chicano Rock, Chicano Rap, Latin Alternative, Latin Trap, Latin Jazz Fusion, Nu Cumbia, Electro Tango, Tango Nuevo, Folklore Argentino, Punta, Garifuna Music, Paranda, Miskito Music, Palos Dominicanos, Gaga, Bomba, Plena, Musica Jibara, Gwo Ka, Cadence-lypso, Zouk Love, Kuduro, Semba, Marrabenta, Palm-Wine Music, Soukous Stars, Ndombolo, Cape Jazz, Amapiano, Gqom, Shangaan Electro, Kwaito House, Afroswing, Azonto, Hiplife, Bongo Flava, Gengetone, Ethio Jazz, Arabesque, Persian Traditional, Persian Pop, Dangdut, Indo Pop, Filipino Rock, OPM (Original Pilipino Music), Pinoy Hip-Hop, Thai Molam, Luk Thung, Luk Krung, V-pop (Vietnamese Pop), Shamstep, Arab Pop, Arab Hip-Hop, Mizrahi Music, Rebetiko, Entekhno, Skiladiko, Russian Chanson, Russian Pop, K-pop Ballad, Trot, C-pop Ballad, Mando-pop, Cantopop, Hong Kong Pop, Taiwanese Pop, J-pop Idol, Kayokyoku, Enka, Anison, J-Indie, Jazz K-pop, T-pop, Lao Pop, Khmer Pop, Burmese Traditional, Nepali Modern, Bhutanese Traditional, Dzongkha Pop, Tibetan Pop, Mongolian Pop, Uzbek Pop, Tajik Pop, Turkmen Pop, Kazakh Pop, Kyrgyz Pop, Altai Pop, Siberian Folk, Inuit Throat Singing, Sami Joik, Ainu Music, Pacific Islander Pop, Hawaiian Traditional, Hawaiian Contemporary, Polynesian Pop, Micronesian Music, Melanesian Music, Antillean Music, Caribbean Folk, Punta Rock, Belizean Pop, Guyanese Pop, Surinamese Pop, Falklands Folk, Greenlandic Traditional, Swedish orten rap";
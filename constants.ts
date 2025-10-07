import { SelectOption } from './types';

type Language = 'en' | 'sv';

export const getModelOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { en: string, sv: string } } = {
    'gemini-2.5-flash': { en: 'Flash (Fast & Efficient)', sv: 'Flash (Snabb & Effektiv)' },
    'gemini-2.5-pro': { en: 'Pro (Advanced & Creative)', sv: 'Pro (Avancerad & Kreativ)' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getArtStyles = (lang: Language): SelectOption[] => {
  const styles: { [key: string]: { en: string, sv: string } } = {
    'Cinematic': { en: 'Cinematic', sv: 'Filmisk' },
    'Photorealistic': { en: 'Photorealistic', sv: 'Fotorealistisk' },
    'Vlog 4K': { en: 'Vlog 4K', sv: 'Vlogg 4K' },
    'Gorilla Viral Style': { en: 'Gorilla Viral Style', sv: 'Gorilla Viral-stil' },
    'Anime': { en: 'Anime', sv: 'Anime' },
    'Claymation': { en: 'Claymation', sv: 'Leranimation' },
    'Surrealism': { en: 'Surrealism', sv: 'Surrealism' },
    'Impressionistic': { en: 'Impressionistic', sv: 'Impressionistisk' },
    'Noir': { en: 'Noir', sv: 'Noir' },
    'Baroque': { en: 'Baroque', sv: 'Barock' },
    'Minimalist': { en: 'Minimalist', sv: 'Minimalistisk' },
    'Retro-futurism': { en: 'Retro-futurism', sv: 'Retro-futurism' },
    'Vintage 1950s film': { en: 'Vintage 1950s Film', sv: 'Vintage 1950-talsfilm' },
    'Cyberpunk': { en: 'Cyberpunk', sv: 'Cyberpunk' },
    'Watercolor': { en: 'Watercolor', sv: 'Akvarell' },
    'Gothic Horror': { en: 'Gothic Horror', sv: 'Gotisk Skräck' },
    'Custom': { en: 'Custom Style...', sv: 'Anpassad stil...' },
  };
  return Object.keys(styles).map(key => ({ value: key, label: styles[key][lang] }));
};

export const getCameraMovements = (lang: Language): SelectOption[] => {
  const angles: { [key: string]: { en: string, sv: string } } = {
    'Static shot': { en: 'Static Shot', sv: 'Statisk Bild' },
    'Panning shot': { en: 'Panning Shot', sv: 'Panorering' },
    'Tilting shot': { en: 'Tilting Shot', sv: 'Tiltning' },
    'Drone shot, flying over': { en: 'Drone Shot', sv: 'Drönarvy' },
    'First-person POV': { en: 'First Person POV', sv: 'Förstapersonsvy' },
    'Dutch angle': { en: 'Dutch Angle', sv: 'Dutch Angle' },
    'Tracking shot': { en: 'Tracking Shot', sv: 'Åkning' },
  };
  return Object.keys(angles).map(key => ({ value: key, label: angles[key][lang] }));
};

export const getCameraDistances = (lang: Language): SelectOption[] => {
  const distances: { [key: string]: { en: string, sv: string } } = {
    'Extreme close-up': { en: 'Extreme Close-up', sv: 'Extrem Närbild' },
    'Close-up': { en: 'Close-up', sv: 'Närbild' },
    'Medium shot': { en: 'Medium Shot', sv: 'Halvbild' },
    'Wide shot': { en: 'Wide Shot', sv: 'Vidvinkelbild' },
    'Establishing shot': { en: 'Establishing Shot', sv: 'Etableringsbild' },
  };
  return Object.keys(distances).map(key => ({ value: key, label: distances[key][lang] }));
};

export const getLensTypes = (lang: Language): SelectOption[] => {
  const lenses: { [key:string]: { en: string, sv: string } } = {
    'Standard prime lens': { en: 'Standard Prime Lens', sv: 'Standardobjektiv (Prime)' },
    'Wide-angle lens': { en: 'Wide-angle Lens', sv: 'Vidvinkelobjektiv' },
    'Telephoto lens': { en: 'Telephoto Lens', sv: 'Teleobjektiv' },
    'Macro lens': { en: 'Macro Lens', sv: 'Makroobjektiv' },
    'Fisheye lens': { en: 'Fisheye Lens', sv: 'Fisheye-objektiv' },
  };
  return Object.keys(lenses).map(key => ({ value: key, label: lenses[key][lang] }));
};


export const getVisualEffects = (lang: Language): SelectOption[] => {
  const effects: { [key: string]: { en: string, sv: string } } = {
    'None': { en: 'None', sv: 'Ingen' },
    'Slow motion': { en: 'Slow Motion', sv: 'Slow Motion' },
    'Time-lapse': { en: 'Time-lapse', sv: 'Time-lapse' },
    'Glitch effect': { en: 'Glitch Effect', sv: 'Glitch-effekt' },
    'Neon glow': { en: 'Neon Glow', sv: 'Neonsken' },
    'Lens flare': { en: 'Lens Flare', sv: 'Linsöverstrålning' },
    'Dream-like haze': { en: 'Dream-like Haze', sv: 'Drömlik dimma' },
    'Particle effects (e.g., dust, sparks)': { en: 'Particle Effects', sv: 'Partikeleffekter' },
    'Light trails': { en: 'Light Trails', sv: 'Ljusspår' },
  };
  return Object.keys(effects).map(key => ({ value: key, label: effects[key][lang] }));
};

export const getColorPalettes = (lang: Language): SelectOption[] => {
  const palettes: { [key: string]: { en: string, sv: string } } = {
    'Vibrant and saturated': { en: 'Vibrant', sv: 'Levande' },
    'Muted and desaturated': { en: 'Muted', sv: 'Dämpad' },
    'Monochrome (black and white)': { en: 'Monochrome', sv: 'Monokrom' },
    'Pastel colors': { en: 'Pastel', sv: 'Pastell' },
    'Synthwave neon': { en: 'Synthwave Neon', sv: 'Synthwave Neon' },
    'Sepia tone': { en: 'Sepia', sv: 'Sepia' },
    'Cool, blue tones': { en: 'Cool Tones', sv: 'Kalla toner' },
    'Warm, golden hour tones': { en: 'Warm Tones', sv: 'Varma toner' },
  };
  return Object.keys(palettes).map(key => ({ value: key, label: palettes[key][lang] }));
};

export const getAspectRatios = (lang: Language): SelectOption[] => {
    const ratios: { [key: string]: { en: string, sv: string } } = {
      '16:9': { en: '16:9 (Widescreen)', sv: '16:9 (Widescreen)' },
      '9:16': { en: '9:16 (Vertical)', sv: '9:16 (Vertikal)' },
      '1:1': { en: '1:1 (Square)', sv: '1:1 (Kvadratisk)' },
      '4:3': { en: '4:3 (Standard)', sv: '4:3 (Standard)' },
      '2.35:1': { en: '2.35:1 (Cinemascope)', sv: '2.35:1 (Cinemascope)' },
    };
    return Object.keys(ratios).map(key => ({ value: key, label: ratios[key][lang] }));
};

export const getAnimationPresets = (lang: Language): SelectOption[] => {
    const presets: { [key: string]: { en: string, sv: string } } = {
      'None': { en: 'None', sv: 'Ingen' },
      'Smooth Transition': { en: 'Smooth Transition', sv: 'Mjuk Övergång' },
      'Dynamic Zoom': { en: 'Dynamic Zoom', sv: 'Dynamisk Zoom' },
      'Wipe Effect': { en: 'Wipe Effect', sv: 'Svepeffekt' },
      'Fade In/Out': { en: 'Fade In/Out', sv: 'Tona In/Ut' },
      'Crossfade': { en: 'Crossfade', sv: 'Korsbländning' },
      'Slide In/Out': { en: 'Slide In/Out', sv: 'Skjut In/Ut' },
    };
    return Object.keys(presets).map(key => ({ value: key, label: presets[key][lang] }));
};

export const getVoiceStyles = (lang: Language): SelectOption[] => {
    const styles: { [key: string]: { en: string, sv: string } } = {
      'None': { en: 'None (Music/Ambiance only)', sv: 'Ingen (Endast musik/atmosfär)' },
      'Standard Narrator': { en: 'Standard Narrator', sv: 'Standardberättare' },
      'Documentary Narrator': { en: 'Documentary Narrator', sv: 'Dokumentärberättare' },
      'Character Monologue': { en: 'Character Monologue', sv: 'Karaktärsmonolog' },
      'High-Energy Announcer': { en: 'High-Energy Announcer', sv: 'Högenergi-utropare' },
      'Calm ASMR Voice': { en: 'Calm ASMR Voice', sv: 'Lugn ASMR-röst' },
      'AI Assistant Voice': { en: 'AI Assistant Voice', sv: 'AI-assistentröst' },
      'Whispered ASMR': { en: 'Whispered ASMR (for relaxation)', sv: 'Viskande ASMR (för avslappning)' },
      'Deep Sci-Fi Robot': { en: 'Deep Sci-Fi Robot (for futuristic themes)', sv: 'Djup Sci-Fi Robot (för framtidsteman)' },
      'Excited Child': { en: 'Excited Child (for whimsical content)', sv: 'Exalterat Barn (för lekfullt innehåll)' },
    };
    return Object.keys(styles).map(key => ({ value: key, label: styles[key][lang] }));
};

export const getTimeOfDayOptions = (lang: Language): SelectOption[] => {
    const times: { [key: string]: { en: string, sv: string } } = {
      'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad' },
      'Morning': { en: 'Morning', sv: 'Morgon' },
      'Midday': { en: 'Midday', sv: 'Mitt på dagen' },
      'Golden Hour': { en: 'Golden Hour', sv: 'Gyllene timmen' },
      'Dusk': { en: 'Dusk', sv: 'Skymning' },
      'Night': { en: 'Night', sv: 'Natt' },
      'Twilight': { en: 'Twilight', sv: 'Tussmörker' },
    };
    return Object.keys(times).map(key => ({ value: key, label: times[key][lang] }));
};

export const getWeatherOptions = (lang: Language): SelectOption[] => {
    const weathers: { [key: string]: { en: string, sv: string } } = {
      'Any': { en: 'Any / Not Specified', sv: 'Valfritt / Ej specificerat' },
      'Clear skies': { en: 'Clear Skies', sv: 'Klar himmel' },
      'Light clouds': { en: 'Light Clouds', sv: 'Lätt molnighet' },
      'Overcast': { en: 'Overcast', sv: 'Mulet' },
      'Light rain': { en: 'Light Rain', sv: 'Lätt regn' },
      'Heavy rain': { en: 'Heavy Rain', sv: 'Kraftigt regn' },
      'Stormy': { en: 'Stormy', sv: 'Stormigt' },
      'Snowing': { en: 'Snowing', sv: 'Snöfall' },
      'Foggy': { en: 'Foggy', sv: 'Dimmigt' },
    };
    return Object.keys(weathers).map(key => ({ value: key, label: weathers[key][lang] }));
};

export const getMotionIntensityOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { en: string, sv: string } } = {
    'Low': { en: 'Low', sv: 'Låg' },
    'Medium': { en: 'Medium', sv: 'Medel' },
    'High': { en: 'High', sv: 'Hög' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getCreativityLevelOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { en: string, sv: string } } = {
    'Grounded': { en: 'Grounded in Reality', sv: 'Verklighetsförankrad' },
    'Balanced': { en: 'Balanced', sv: 'Balanserad' },
    'Imaginative': { en: 'Highly Imaginative', sv: 'Mycket Fantasifull' },
  };
  return Object.keys(options).map(key => ({ value: key, label: options[key][lang] }));
};

export const getCharacterGenders = (lang: Language): SelectOption[] => {
  const genders: { [key: string]: { en: string, sv: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad' },
    'Male': { en: 'Male', sv: 'Man' },
    'Female': { en: 'Female', sv: 'Kvinna' },
    'Non-binary': { en: 'Non-binary', sv: 'Icke-binär' },
  };
  return Object.keys(genders).map(key => ({ value: key, label: genders[key][lang] }));
};

export const getCharacterEthnicities = (lang: Language): SelectOption[] => {
  const ethnicities: { [key: string]: { en: string, sv: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad' },
    'African': { en: 'African', sv: 'Afrikansk' },
    'East Asian': { en: 'East Asian', sv: 'Östasiatisk' },
    'South Asian': { en: 'South Asian', sv: 'Sydasiatisk' },
    'European': { en: 'European', sv: 'Europeisk' },
    'Hispanic/Latin': { en: 'Hispanic/Latin', sv: 'Spansk/Latinamerikansk' },
    'Middle Eastern': { en: 'Middle Eastern', sv: 'Mellanöstern' },
    'Native American': { en: 'Native American', sv: 'Amerikansk urinvånare' },
    'Mixed': { en: 'Mixed', sv: 'Blandad' },
  };
  return Object.keys(ethnicities).map(key => ({ value: key, label: ethnicities[key][lang] }));
};

export const getCharacterClothings = (lang: Language): SelectOption[] => {
  const clothings: { [key: string]: { en: string, sv: string } } = {
    'Any': { en: 'Any / Not Specified', sv: 'Valfri / Ej specificerad' },
    'Casual': { en: 'Casual', sv: 'Vardaglig' },
    'Formal': { en: 'Formal', sv: 'Formell' },
    'Fantasy Armor': { en: 'Fantasy Armor', sv: 'Fantasirustning' },
    'Sci-fi Suit': { en: 'Sci-fi Suit', sv: 'Sci-fi-dräkt' },
    'Historical Garb': { en: 'Historical Garb', sv: 'Historisk dräkt' },
    'Sportswear': { en: 'Sportswear', sv: 'Sportkläder' },
    'Uniform': { en: 'Uniform', sv: 'Uniform' },
  };
  return Object.keys(clothings).map(key => ({ value: key, label: clothings[key][lang] }));
};

export const getAmbientSounds = (lang: Language): SelectOption[] => {
    const sounds: { [key: string]: { en: string, sv: string } } = {
      'None': { en: 'None / Music Only', sv: 'Inga / Endast Musik' },
      'City Ambience': { en: 'City Ambience', sv: 'Stadsatmosfär' },
      'Forest Sounds': { en: 'Forest Sounds', sv: 'Skogsljud' },
      'Rain and Thunder': { en: 'Rain and Thunder', sv: 'Regn och åska' },
      'Ocean Waves': { en: 'Ocean Waves', sv: 'Havsvågor' },
      'Sci-fi Space Hum': { en: 'Sci-fi Space Hum', sv: 'Sci-fi Rymdbrum' },
      'Crowded Market': { en: 'Crowded Market', sv: 'Fullsatt Marknad' },
    };
    return Object.keys(sounds).map(key => ({ value: key, label: sounds[key][lang] }));
};

export const getSoundEffectsIntensity = (lang: Language): SelectOption[] => {
    const intensity: { [key: string]: { en: string, sv: string } } = {
      'None': { en: 'None', sv: 'Inga' },
      'Subtle': { en: 'Subtle', sv: 'Subtil' },
      'Moderate': { en: 'Moderate', sv: 'Måttlig' },
      'Prominent': { en: 'Prominent', sv: 'Framträdande' },
    };
    return Object.keys(intensity).map(key => ({ value: key, label: intensity[key][lang] }));
};
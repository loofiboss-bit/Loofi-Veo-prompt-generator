import { SelectOption, ExamplePrompt } from './types';

type Language = 'en' | 'sv';

export const getLanguageOptions = (): SelectOption[] => [
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
];

export const getModelOptions = (lang: Language): SelectOption[] => {
  const options: { [key: string]: { en: string, sv: string } } = {
    'gemini-2.5-pro': { en: 'Pro (Advanced & Creative)', sv: 'Pro (Avancerad & Kreativ)' },
    'gemini-2.5-flash': { en: 'Flash (Fast & Efficient)', sv: 'Flash (Snabb & Effektiv)' },
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
      'Crowded Market': { en: 'Crowded Market', sv: 'Fullsatt Marknad' },
      'Tense Silence': { en: 'Tense Silence', sv: 'Spänd tystnad' },
      'Cozy Fireplace': { en: 'Cozy Fireplace', sv: 'Mysig brasa' },
      'Distant Celebration': { en: 'Distant Celebration', sv: 'Firande på avstånd' },
      'Sci-fi Space Hum': { en: 'Sci-fi Space Hum', sv: 'Sci-fi Rymdbrum' },
      'Mechanical Hum': { en: 'Mechanical Hum', sv: 'Mekaniskt brum' },
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

export const getStaticInspirationPrompts = (lang: Language): ExamplePrompt[] => {
  const prompts = [
    {
      title: { en: "The Artisan's Hand", sv: "Hantverkarens Hand" },
      idea: { en: "A close-up, intimate portrait of a Renaissance painter creating a masterpiece.", sv: "Ett intimt närporträtt av en renässansmålare som skapar ett mästerverk." },
      prompt: { en: "Extreme close-up on an artist's hand, aged and stained with paint, meticulously applying a final brushstroke to a masterpiece on canvas. The setting is a dusty, sun-drenched Renaissance studio filled with books and artifacts. The camera is static, focusing on the delicate movement of the brush. The art style is Baroque, with deep shadows and warm, golden hour tones creating a sense of timeless dedication. The scene is silent, accompanied only by the subtle ambient sound of a crackling fireplace. The final video should have a 4:3 aspect ratio, giving it a classic, historical feel.", sv: "Extrem närbild på en konstnärs hand, åldrad och fläckad av färg, som minutiöst applicerar ett sista penseldrag på ett mästerverk på duk. Miljön är en dammig, solbelyst renässansateljé fylld med böcker och artefakter. Kameran är statisk och fokuserar på penselns fina rörelse. Konststilen är barock, med djupa skuggor och varma, gyllene timmens toner som skapar en känsla av tidlös hängivenhet. Scenen är tyst, ackompanjerad endast av det subtila omgivningsljudet från en sprakande brasa. Den slutliga videon ska ha ett 4:3-bildförhållande, vilket ger den en klassisk, historisk känsla." },
      params: {
        environment: "A dusty, sun-drenched Renaissance studio",
        timeOfDay: "Golden Hour",
        characterActions: "An artist's hand applying a final brushstroke to a masterpiece.",
        artStyle: "Baroque",
        cameraMovement: "Static shot",
        cameraDistance: "Extreme close-up",
        lensType: "Macro lens",
        visualEffect: "None",
        colorPalette: "Warm, golden hour tones",
        aspectRatio: "4:3",
        animationPreset: "None",
        voiceStyle: "None",
        ambientSound: "None",
        soundEffectsIntensity: "Subtle",
      },
    },
    {
      title: { en: "Culinary Close-up", sv: "Kulinarisk Närbild" },
      idea: { en: "A vibrant, macro 4K vlog-style video of ingredients being prepared for a gourmet meal.", sv: "En livfull 4K-vloggvideo i makrostil av ingredienser som förbereds för en gourmetmåltid." },
      prompt: { en: "A dynamic, macro 4K vlog-style shot of fresh basil being chopped on a wooden board, with drops of water flying in slow motion. The camera pans smoothly across other ingredients: glistening tomatoes, a clove of garlic. The scene is vibrant and saturated, captured with a macro lens to emphasize texture and detail. The overall style is photorealistic and clean. The audio features a high-energy announcer voice-over explaining the recipe, mixed with prominent, crisp sound effects of the chopping and sizzling. The aspect ratio is 9:16, perfect for social media.", sv: "En dynamisk makrobild i 4K-vloggstil av färsk basilika som hackas på en träskärbräda, med vattendroppar som flyger i slow motion. Kameran panorerar mjukt över andra ingredienser: glänsande tomater, en vitlöksklyfta. Scenen är levande och mättad, fångad med ett makroobjektiv för att framhäva textur och detaljer. Den övergripande stilen är fotorealistisk och ren. Ljudet har en högenergisk speakerröst som förklarar receptet, blandat med framträdande, krispiga ljudeffekter av hackandet och fräsandet. Bildförhållandet är 9:16, perfekt för sociala medier." },
      params: {
        environment: "A clean, professional kitchen setting.",
        characterActions: "Fresh basil being chopped on a wooden board, with drops of water flying.",
        artStyle: "Vlog 4K",
        cameraMovement: "Panning shot",
        cameraDistance: "Extreme close-up",
        lensType: "Macro lens",
        visualEffect: "Slow motion",
        colorPalette: "Vibrant and saturated",
        aspectRatio: "9:16",
        animationPreset: "Smooth Transition",
        voiceStyle: "High-Energy Announcer",
        ambientSound: "None",
        soundEffectsIntensity: "Prominent",
      },
    },
    {
      title: { en: "Abstract Dreamscape", sv: "Abstrakt Drömlandskap" },
      idea: { en: "A surreal, dream-like journey through a world of floating geometric shapes and shifting colors.", sv: "En surrealistisk, drömlik resa genom en värld av svävande geometriska former och skiftande färger." },
      prompt: { en: "A surreal journey through an abstract landscape made of glowing, geometric shapes that slowly drift and morph. The camera tracks smoothly through this world, which is bathed in a dream-like haze and a pastel color palette. The style is minimalist and surreal, with light trails following the moving shapes. The aspect ratio is a cinematic 16:9. A calm ASMR voice whispers cryptic phrases, accompanied by a subtle sci-fi space hum, creating a mesmerizing and hypnotic experience.", sv: "En surrealistisk resa genom ett abstrakt landskap av glödande, geometriska former som långsamt driver och förvandlas. Kameran följer mjukt genom denna värld, som badar i ett drömlikt dis och en pastellfärgpalett. Stilen är minimalistisk och surrealistisk, med ljusspår som följer de rörliga formerna. Bildförhållandet är filmiska 16:9. En lugn ASMR-röst viskar kryptiska fraser, ackompanjerad av ett subtilt sci-fi-rymdbrummande, vilket skapar en fascinerande och hypnotisk upplevelse." },
      params: {
        environment: "An abstract landscape of glowing, geometric shapes.",
        characterActions: "No characters, focus on the morphing shapes.",
        artStyle: "Surrealism",
        cameraMovement: "Tracking shot",
        cameraDistance: "Wide shot",
        lensType: "Wide-angle lens",
        visualEffect: "Dream-like haze",
        colorPalette: "Pastel colors",
        aspectRatio: "16:9",
        animationPreset: "Crossfade",
        voiceStyle: "Calm ASMR Voice",
        ambientSound: "Sci-fi Space Hum",
        soundEffectsIntensity: "Subtle",
      },
    }
  ];

  return prompts.map(p => ({
    title: p.title[lang],
    idea: p.idea[lang],
    prompt: p.prompt[lang],
    params: p.params,
  }));
};

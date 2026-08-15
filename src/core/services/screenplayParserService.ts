/**
 * Screenplay Parser Service (v12.0.0)
 *
 * Ingests and parses Fountain, Screenplay Markdown, and plaintext scripts into
 * structured Scenes, Characters, Dialogue, and suggested Shot sequences.
 */

import type {
  ScreenplayDocument,
  ScreenplayScene,
  ScreenplayFormat,
  SceneSettingType,
  SceneTimeOfDay,
  ScreenplayDialogueLine,
  ScreenplayActionBlock,
  DirectorStylePreset,
  DirectorStyleConfig,
} from '@core/types/screenplay';
import type { Shot } from '@core/types';

export const DIRECTOR_STYLE_CONFIGS: Record<DirectorStylePreset, DirectorStyleConfig> = {
  'atmospheric-scifi': {
    id: 'atmospheric-scifi',
    displayName: 'Denis Villeneuve — Atmospheric Sci-Fi',
    description:
      'Monumental scale, atmospheric fog, slow deliberate pacing, and deep bass soundscape.',
    lightingKeywords: [
      'volumetric fog',
      'diffused overcast daylight',
      'deep industrial shadows',
      'monochromatic haze',
    ],
    cameraKeywords: [
      'wide panoramic master',
      'slow tracking push-in',
      'statuesque framing',
      'geometric symmetry',
    ],
    colorPaletteKeywords: ['muted sepia', 'desaturated teal', 'dusty amber', 'gunmetal slate'],
    aspectRatio: '2.39:1',
  },
  'symmetrical-whimsical': {
    id: 'symmetrical-whimsical',
    displayName: 'Wes Anderson — Symmetrical Pastel',
    description:
      'Exact center framing, pastel color palettes, flat snap-pans, and meticulous set dressing.',
    lightingKeywords: [
      'bright flat daylight',
      'warm amber interior glow',
      'shadowless storybook lighting',
    ],
    cameraKeywords: [
      'perfect eye-level symmetry',
      '90-degree snap-whip pan',
      'static frontal tableau',
      'telephoto flat field',
    ],
    colorPaletteKeywords: ['pastel pink', 'mustard yellow', 'seafoam mint', 'coral red'],
    aspectRatio: '16:9',
  },
  'kinetic-imax': {
    id: 'kinetic-imax',
    displayName: 'Christopher Nolan — Kinetic IMAX',
    description:
      'Practical physics, high-contrast photochemical IMAX look, ticking tension, and sweeping vistas.',
    lightingKeywords: [
      'harsh natural sunlight',
      'cold tungsten practicals',
      'deep rich shadows',
      'photochemical grain',
    ],
    cameraKeywords: [
      'large format IMAX 70mm',
      'handheld visceral tracking',
      'aerial helicopter sweeping',
      'dutch angle urgency',
    ],
    colorPaletteKeywords: [
      'crisp arctic blue',
      'slate grey',
      'warm amber highlight',
      'deep obsidian black',
    ],
    aspectRatio: '16:9',
  },
  'clinical-thriller': {
    id: 'clinical-thriller',
    displayName: 'David Fincher — Clinical Thriller',
    description:
      'Laser-precise fluid camera motion, low-key desaturated green/yellow cast, and dark voyeuristic tension.',
    lightingKeywords: [
      'low-key fluorescent green-yellow',
      'shadow rim lighting',
      'clinical surgical precision',
    ],
    cameraKeywords: [
      'precise motion-control tripod move',
      'slow creep dolly',
      'low-angle voyeuristic framing',
    ],
    colorPaletteKeywords: [
      'sickly yellow-green',
      'dark charcoal',
      'dim tungsten',
      'cool navy shadow',
    ],
    aspectRatio: '2.39:1',
  },
  'cyberpunk-neon': {
    id: 'cyberpunk-neon',
    displayName: 'Cyberpunk Neon Noir',
    description:
      'High-contrast rain-soaked neon reflections, volumetric headlights, and futuristic urban textures.',
    lightingKeywords: [
      'neon pink and cyan reflections',
      'wet asphalt specular highlights',
      'volumetric searchlights',
    ],
    cameraKeywords: [
      'anamorphic lens flare',
      'low-angle street tracking',
      'dutch tilt crane ascension',
    ],
    colorPaletteKeywords: ['neon magenta', 'electric cyan', 'deep indigo', 'amber haze'],
    aspectRatio: '2.39:1',
  },
  'documentary-verite': {
    id: 'documentary-verite',
    displayName: 'Cinéma Vérité Documentary',
    description:
      'Organic handheld camera re-framing, natural available light, and unfiltered realism.',
    lightingKeywords: [
      'natural available window light',
      'unfiltered sunlight',
      'raw ambient bounce',
    ],
    cameraKeywords: [
      'handheld shoulder-mount',
      'subtle search zoom',
      'reactive subject tracking',
      'eye-level natural',
    ],
    colorPaletteKeywords: [
      'naturalistic tone',
      'earthy ochre',
      'unfiltered skin tone',
      'soft contrast',
    ],
    aspectRatio: '16:9',
  },
  'anime-cinematic': {
    id: 'anime-cinematic',
    displayName: 'Cinematic Anime / Makoto Shinkai',
    description:
      'Luminous skies, hyper-detailed lens flares, emotional particle lighting, and painted backgrounds.',
    lightingKeywords: [
      'golden hour sky bloom',
      'luminous sun flare',
      'twilight starry glow',
      'soft lens aberration',
    ],
    cameraKeywords: [
      'sweeping crane into sky',
      'shallow depth-of-field close-up',
      'expressive angle tracking',
    ],
    colorPaletteKeywords: [
      'vibrant twilight blue',
      'lavender magenta',
      'golden sunburst',
      'emerald grass',
    ],
    aspectRatio: '16:9',
  },
};

const SCENE_HEADING_REGEX =
  /^(INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|INT\/EXT)\s+([^-—\n]+)(?:[-—]\s*(.+))?$/i;
const CHARACTER_CUE_REGEX = /^[A-Z0-9_\s]{2,30}$/;

/**
 * Parses raw text screenplay into a structured ScreenplayDocument.
 */
export function parseScreenplayText(
  rawText: string,
  format: ScreenplayFormat = 'fountain',
): ScreenplayDocument {
  const lines = rawText.split(/\r?\n/);
  const scenes: ScreenplayScene[] = [];
  const characterSet = new Set<string>();
  const locationSet = new Set<string>();

  let currentScene: ScreenplayScene | null = null;
  let currentCharacter: string | null = null;
  let currentParenthetical: string | undefined = undefined;
  let sceneIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      currentCharacter = null;
      currentParenthetical = undefined;
      continue;
    }

    // Check for Scene Heading (Slugline)
    const headingMatch = line.match(SCENE_HEADING_REGEX);
    if (headingMatch) {
      if (currentScene) {
        scenes.push(currentScene);
      }

      const settingRaw = headingMatch[1].toUpperCase().replace(/\.$/, '') as SceneSettingType;
      const locationName = (headingMatch[2] || 'UNKNOWN LOCATION').trim();
      const timeRaw = (headingMatch[3] || 'DAY').trim().toUpperCase() as SceneTimeOfDay;

      locationSet.add(locationName);

      currentScene = {
        id: `scene-${sceneIndex}`,
        sceneNumber: sceneIndex++,
        slugline: line,
        setting:
          settingRaw.includes('INT') && settingRaw.includes('EXT')
            ? 'INT/EXT'
            : settingRaw.includes('INT')
              ? 'INT'
              : 'EXT',
        locationName,
        timeOfDay: timeRaw.includes('NIGHT')
          ? 'NIGHT'
          : timeRaw.includes('DUSK')
            ? 'DUSK'
            : timeRaw.includes('DAWN')
              ? 'DAWN'
              : 'DAY',
        characters: [],
        actionBlocks: [],
        dialogueBlocks: [],
        musicCues: [],
        foleyCues: [],
        suggestedShotCount: 1,
      };
      continue;
    }

    // If no scene heading was encountered yet, create a default first scene
    if (!currentScene) {
      currentScene = {
        id: `scene-${sceneIndex}`,
        sceneNumber: sceneIndex++,
        slugline: 'INT. SCENE - DAY',
        setting: 'INT',
        locationName: 'SCENE',
        timeOfDay: 'DAY',
        characters: [],
        actionBlocks: [],
        dialogueBlocks: [],
        musicCues: [],
        foleyCues: [],
        suggestedShotCount: 1,
      };
    }

    // Check for Sound / Foley cues
    if (/^(SFX|SOUND|MUSIC|AUDIO):/i.test(line)) {
      const cue = line.replace(/^(SFX|SOUND|MUSIC|AUDIO):\s*/i, '').trim();
      if (/^MUSIC/i.test(line)) {
        currentScene.musicCues.push(cue);
      } else {
        currentScene.foleyCues.push(cue);
      }
      continue;
    }

    // Check for Parentheticals e.g. (whispering)
    if (line.startsWith('(') && line.endsWith(')')) {
      currentParenthetical = line.slice(1, -1).trim();
      continue;
    }

    // Check for Character Cue (ALL CAPS line preceded and followed by dialogue)
    if (CHARACTER_CUE_REGEX.test(line) && !line.startsWith('INT') && !line.startsWith('EXT')) {
      const charName = line.replace(/\s*\(.*\)$/, '').trim();
      if (
        charName.length >= 2 &&
        !['THE END', 'FADE IN', 'FADE OUT', 'CUT TO:'].includes(charName)
      ) {
        currentCharacter = charName;
        characterSet.add(charName);
        if (!currentScene.characters.includes(charName)) {
          currentScene.characters.push(charName);
        }
        continue;
      }
    }

    // If we have an active character, this line is Dialogue
    if (currentCharacter) {
      const dialogueItem: ScreenplayDialogueLine = {
        id: `dlg-${currentScene.dialogueBlocks.length + 1}`,
        character: currentCharacter,
        parenthetical: currentParenthetical,
        text: line,
      };
      currentScene.dialogueBlocks.push(dialogueItem);
      currentParenthetical = undefined;
      continue;
    }

    // Otherwise, this line is an Action Block
    const actionBlock: ScreenplayActionBlock = {
      id: `act-${currentScene.actionBlocks.length + 1}`,
      text: line,
    };
    currentScene.actionBlocks.push(actionBlock);
  }

  if (currentScene) {
    scenes.push(currentScene);
  }

  // Calculate suggested shot counts per scene
  for (const sc of scenes) {
    sc.suggestedShotCount = Math.max(1, sc.actionBlocks.length + sc.dialogueBlocks.length);
  }

  return {
    id: `screenplay-${Date.now()}`,
    title: 'Untitled Screenplay',
    rawText,
    format,
    scenes,
    extractedCharacters: Array.from(characterSet),
    extractedLocations: Array.from(locationSet),
    parsedAt: Date.now(),
  };
}

/**
 * Converts parsed Screenplay scenes into storyboard Shots.
 */
export function convertScreenplayToShots(
  document: ScreenplayDocument,
  directorStyle?: DirectorStylePreset,
): Shot[] {
  const shots: Shot[] = [];
  let shotId = 1;
  const styleConfig = directorStyle ? DIRECTOR_STYLE_CONFIGS[directorStyle] : null;

  for (const scene of document.scenes) {
    // 1. Establishing Shot for the scene
    const establishingLighting = styleConfig
      ? styleConfig.lightingKeywords[0]
      : `${scene.timeOfDay.toLowerCase()} atmospheric lighting`;
    const establishingCamera = styleConfig
      ? styleConfig.cameraKeywords[0]
      : 'wide establishing crane shot';

    shots.push({
      id: shotId++,
      type: 'video',
      characterId: '',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: true,
      action: `Establishing shot of ${scene.locationName}. ${scene.actionBlocks[0]?.text || ''}`,
      camera: establishingCamera,
      lighting: establishingLighting,
      environment: `${scene.setting} ${scene.locationName}`,
      duration: 4,
      transition: { type: 'cut', duration: 0 },
    });

    // 2. Shots for dialogues and actions
    for (let i = 0; i < scene.dialogueBlocks.length; i++) {
      const dlg = scene.dialogueBlocks[i];
      const cameraChoice = i % 2 === 0 ? 'medium close-up' : 'over-the-shoulder tracking';

      shots.push({
        id: shotId++,
        type: 'video',
        characterId: dlg.character,
        takes: [],
        selectedTakeIndex: 0,
        visualLink: true,
        action: `${dlg.character} speaks in ${scene.locationName}.`,
        dialogue: dlg.text,
        characterArchetype: dlg.character,
        camera: cameraChoice,
        lighting: establishingLighting,
        duration: Math.max(3, Math.min(8, Math.round(dlg.text.length / 15))),
        transition: { type: 'cut', duration: 0 },
      });
    }
  }

  return shots;
}

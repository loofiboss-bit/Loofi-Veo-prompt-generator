/**
 * v12 Screenplay & Script-to-Production Breakdown contracts.
 */

export type ScreenplayFormat = 'fountain' | 'markdown' | 'plaintext';

export type SceneTimeOfDay =
  | 'DAY'
  | 'NIGHT'
  | 'DUSK'
  | 'DAWN'
  | 'MAGIC_HOUR'
  | 'CONTINUOUS'
  | 'AFTERNOON'
  | 'MORNING';

export type SceneSettingType = 'INT' | 'EXT' | 'INT/EXT';

export interface ScreenplayDialogueLine {
  id: string;
  character: string;
  parenthetical?: string;
  text: string;
  audioCue?: string;
}

export interface ScreenplayActionBlock {
  id: string;
  text: string;
  cameraSuggestion?: string;
  foleySuggestions?: string[];
  visualLooks?: string[];
}

export interface ScreenplayScene {
  id: string;
  sceneNumber: number;
  slugline: string;
  setting: SceneSettingType;
  locationName: string;
  timeOfDay: SceneTimeOfDay;
  synopsis?: string;
  characters: string[];
  actionBlocks: ScreenplayActionBlock[];
  dialogueBlocks: ScreenplayDialogueLine[];
  musicCues: string[];
  foleyCues: string[];
  suggestedShotCount: number;
}

export interface ScreenplayDocument {
  id: string;
  title: string;
  author?: string;
  rawText: string;
  format: ScreenplayFormat;
  scenes: ScreenplayScene[];
  extractedCharacters: string[];
  extractedLocations: string[];
  parsedAt: number;
}

export type DirectorStylePreset =
  | 'atmospheric-scifi' // Denis Villeneuve style
  | 'symmetrical-whimsical' // Wes Anderson style
  | 'kinetic-imax' // Christopher Nolan style
  | 'clinical-thriller' // David Fincher style
  | 'cyberpunk-neon' // Ridley Scott / Blade Runner style
  | 'documentary-verite' // Handheld naturalistic
  | 'anime-cinematic'; // Makoto Shinkai / Studio Ghibli style

export interface DirectorStyleConfig {
  id: DirectorStylePreset;
  displayName: string;
  description: string;
  lightingKeywords: string[];
  cameraKeywords: string[];
  colorPaletteKeywords: string[];
  aspectRatio: '16:9' | '9:16' | '2.39:1';
}

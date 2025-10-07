export interface SelectOption {
  value: string;
  label: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info';
}

export interface PromptState {
  idea: string;
  environment: string;
  characterActions: string;
  characterGender: string;
  characterEthnicity: string;
  characterClothing: string;
  timeOfDay: string;
  weather: string;
  voiceOver: string;
  voiceStyle: string;
  ambientSound: string;
  soundEffectsIntensity: string;
  negativePrompt: string;
  optimizeFor8Seconds: boolean;
  artStyle: string;
  customArtStyle: string;
  cameraMovement: string;
  cameraDistance: string;
  lensType: string;
  visualEffect: string;
  colorPalette: string;
  aspectRatio: string;
  animationPreset: string;
  motionIntensity: string;
  creativityLevel: string;
  includeOverlayText: boolean;
  useGoogleSearch: boolean;
  generateAsSeries: boolean;
  youtubeUrl: string;
  language: 'en' | 'sv';
}

export interface PromptGenerationParams {
  idea: string;
  // Scene
  environment: string;
  timeOfDay: string;
  weather: string;
  // Character
  characterActions: string;
  characterGender: string;
  characterEthnicity: string;
  characterClothing: string;
  // Style
  artStyle: string;
  customArtStyle: string;
  colorPalette: string;
  visualEffect: string;
  // Camera
  cameraMovement: string;
  cameraDistance: string;
  lensType: string;
  aspectRatio: string;
  // Animation
  animationPreset: string;
  motionIntensity: string;
  // Audio
  voiceStyle: string;
  voiceOver: string;
  ambientSound: string;
  soundEffectsIntensity: string;
  // Advanced
  creativityLevel: string;
  negativePrompt: string;
  optimizeFor8Seconds: boolean;
  includeOverlayText: boolean;
  useGoogleSearch: boolean;
  generateAsSeries: boolean;
  // Meta
  language: 'en' | 'sv';
}

export interface EditedImageResponse {
  newMimeType: string;
  newImageBytes: string;
}

export interface ExamplePrompt {
  title: string;
  idea: string;
  prompt: string;
  params: {
    environment?: string;
    timeOfDay?: string;
    weather?: string;
    characterActions?: string;
    characterGender?: string;
    characterEthnicity?: string;
    characterClothing?: string;
    artStyle: string;
    customArtStyle?: string;
    cameraMovement: string;
    cameraDistance?: string;
    lensType?: string;
    visualEffect: string;
    colorPalette: string;
    aspectRatio: string;
    animationPreset: string;
    motionIntensity?: string;
    creativityLevel?: string;
    voiceStyle?: string;
    ambientSound?: string;
    soundEffectsIntensity?: string;
    negativePrompt?: string;
  };
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface VeoPromptResponse {
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  params: PromptGenerationParams;
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  icon: 'palette' | 'globe' | 'history' | 'magic';
  params: Partial<Omit<PromptGenerationParams, 'language'>>;
}
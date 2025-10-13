// This file centralizes all the core type definitions for the application.

// A name from the Icon component, used for type safety with icons.
type IconName = 'spinner' | 'copy' | 'check' | 'edit' | 'cancel' | 'palette' | 'magic' | 'globe' | 'history' | 'trash' | 'template' | 'audio' | 'download' | 'lightbulb' | 'chevron-down' | 'video' | 'film' | 'share' | 'upload' | 'sparkles' | 'save' | 'image' | 'music' | 'search';

// A standard option for select inputs.
export interface SelectOption {
  value: string;
  label: string;
}

// Represents the entire state of the prompt generation form.
export interface PromptState {
  idea: string;
  environment: string;
  characterActions: string;
  characterGender: string;
  characterEthnicity: string;
  characterClothing: string;
  characterArchetype: string;
  characterAge: string;
  characterMood: string;
  characterPose: string;
  characterSkinTone: string;
  characterSpecificClothing: string;
  characterAccessories: string;
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
  imageStudioPrompt: string;
  uploadedImage: { data: string; mimeType: string; } | null;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
  targetModel: 'veo' | 'sora';
}

// The parameters passed to the Gemini API for prompt generation.
export type PromptGenerationParams = PromptState;

// Represents a toast notification message.
export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// Represents a grounding chunk from a Google Search-grounded response.
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

// Represents the response from the Veo prompt generation service.
export interface VeoPromptResponse {
    prompt: string;
    groundingChunks?: GroundingChunk[];
}

// Represents a single entry in the prompt history.
export interface HistoryEntry {
  id: string;
  timestamp: number;
  params: PromptState;
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

// Represents a pre-defined template for a prompt.
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  params: Partial<PromptState>;
}

// Represents a pre-defined example prompt for inspiration.
export interface ExamplePrompt {
    title: string;
    idea: string;
    prompt: string;
    params: Partial<PromptState>;
    groundingChunks?: GroundingChunk[];
}

// Represents the response from the image editing service.
export interface EditedImageResponse {
    newImageBytes: string;
    newMimeType: string;
}

// Represents the data structure for a song generated for Suno.
export interface SunoSongData {
    title: string;
    styleOfMusic: string;
    lyrics: string;
}

// Represents a single term in the pronunciation guide.
export interface PronunciationTerm {
    term: string;
    pronunciation: string;
    description: string;
}

// Represents the data structure for a language's pronunciation guide.
export interface PronunciationGuideData {
    terms: PronunciationTerm[];
}

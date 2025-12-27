
// This file centralizes all the core type definitions for the application.

// A name from the Icon component, used for type safety with icons.
type IconName = 'spinner' | 'copy' | 'check' | 'edit' | 'cancel' | 'palette' | 'magic' | 'globe' | 'history' | 'trash' | 'template' | 'audio' | 'download' | 'lightbulb' | 'chevron-down' | 'video' | 'film' | 'share' | 'upload' | 'sparkles' | 'save' | 'image' | 'music' | 'search' | 'undo' | 'redo' | 'moon' | 'chat' | 'video-analysis' | 'plus' | 'help' | 'sliders' | 'user' | 'smile' | 'clock' | 'activity' | 'alert-triangle' | 'play' | 'compare' | 'grid-3x3';

// A standard option for select inputs.
export interface SelectOption {
  value: string;
  label: string;
}

// Represents the entire state of the prompt generation form.
export interface PromptState {
  idea: string;
  environment: string;
  environmentSensoryDetails: string;
  environmentDynamicEvents: string;
  architecturalStyle: string;
  characterActions: string;
  characterNuances: string;
  characterObjectInteraction: string;
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
  characterCameoTag: string;
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
  lightingStyle: string;
  cameraMovement: string;
  cameraDistance: string;
  lensType: string;
  compositionalGuide: string;
  visualEffect: string;
  colorPalette: string;
  aspectRatio: string;
  animationPreset: string;
  motionIntensity: string;
  creativityLevel: string;
  includeOverlayText: boolean;
  useGoogleSearch: boolean;
  useGoogleMaps: boolean;
  generateAsSeries: boolean;
  thinkingMode: boolean;
  youtubeUrl: string;
  imageStudioPrompt: string;
  uploadedImage: { data: string; mimeType: string; } | null;
  uploadedAudio: { data: string; mimeType: string; name: string; } | null;
  audioMix: { voice: number; ambient: number; sfx: number; };
  useImageAsCameo: boolean;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
  targetModel: 'veo' | 'sora';
  resolution: '1080p' | '720p';
  veoModel: 'fast' | 'quality';
  spatialMotions: Record<string, string>; // Key: "row-col" (e.g. "0-2"), Value: "Birds flying"
}

// Represents a user-saved custom preset.
export interface CustomPreset {
  id: string;
  name: string;
  params: PromptState;
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
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        text?: string;
        author?: string;
      }[];
    }[];
  };
}

// Represents the response from the Veo prompt generation service.
export interface VeoPromptResponse {
    prompt: string;
    groundingChunks?: GroundingChunk[];
}

// Represents the response from the model comparison service.
export interface ModelComparisonResponse {
    veoPrompt: string;
    soraPrompt: string;
}

// Represents a single structured prompt variation with a label.
export interface PromptVariation {
    label: string;
    prompt: string;
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
    lyricalTheme?: string;
}

// Represents a single entry in the Suno song history.
export interface SavedSunoSong {
    id: string;
    timestamp: number;
    songData: SunoSongData;
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

// Represents a single message in the chatbot.
export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

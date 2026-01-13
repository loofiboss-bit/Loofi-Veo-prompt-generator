

// This file centralizes all the core type definitions for the application.

// A name from the Icon component, used for type safety with icons.
type IconName = 'spinner' | 'copy' | 'check' | 'edit' | 'cancel' | 'palette' | 'magic' | 'globe' | 'history' | 'trash' | 'template' | 'audio' | 'download' | 'lightbulb' | 'chevron-down' | 'video' | 'film' | 'share' | 'upload' | 'sparkles' | 'save' | 'image' | 'music' | 'search' | 'undo' | 'redo' | 'moon' | 'chat' | 'video-analysis' | 'plus' | 'help' | 'sliders' | 'user' | 'smile' | 'clock' | 'activity' | 'alert-triangle' | 'play' | 'compare' | 'grid-3x3' | 'dna' | 'users' | 'folder' | 'heart' | 'filter' | 'library' | 'subtitles' | 'scissors' | 'shuffle' | 'arrow-right' | 'circle-filled' | 'smartphone' | 'map-pin';

// A standard option for select inputs.
export interface SelectOption {
  value: string;
  label: string;
}

// Represents an asset in the global library
export interface Asset {
    id: string;
    type: 'image' | 'audio';
    name: string;
    url: string; // Blob URL for preview
    data: string; // Base64 data
    mimeType: string;
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
  resolution: '1080p' | '720p';
  animationPreset: string;
  motionIntensity: string;
  creativityLevel: string;
  includeOverlayText: boolean;
  overlayTextContent: string;
  useGoogleSearch: boolean;
  useGoogleMaps: boolean;
  generateAsSeries: boolean;
  thinkingMode: boolean;
  thinkingBudget?: number;
  youtubeUrl: string;
  imageStudioPrompt: string;
  uploadedImage: { data: string; mimeType: string; } | null;
  uploadedAudio: { data: string; mimeType: string; name: string; } | null;
  audioMix: { voice: number; ambient: number; sfx: number; };
  useImageAsCameo: boolean;
  language: 'en' | 'sv' | 'es' | 'fr' | 'de';
  model: string;
  targetModel: 'veo' | 'sora';
  veoModel: 'fast' | 'quality';
  spatialMotions: Record<string, string>; // Key: "row-col" (e.g. "0-2"), Value: "Birds flying"
}

// --- Storyboard Types ---

export type TransitionType = 'cut' | 'crossfade' | 'fade_black' | 'wipe_left';

export interface SFXEvent {
    id: string;
    timestamp: number; // Seconds relative to shot start
    description: string;
    audioUrl: string;
}

export interface Shot {
    id: number;
    action: string;
    camera: string;
    dialogueText?: string; // Subtitles/Captions
    characterId?: string;
    locationId?: string; // Links to a LocationProfile
    generatedVideoUrl?: string;
    conceptImageUrl?: string; // Base64 data URL for static preview
    takes?: string[]; // List of video URLs for variations
    selectedTakeIndex?: number; // Currently selected take
    visualLink?: boolean; // If true, uses the last frame of the previous shot as input
    transitionToNext?: TransitionType; // Transition effect to the NEXT shot
    audioUrl?: string; // Main voice/dialogue track
    audioVolume?: number; // 0.0 to 1.0, default 1.0
    audioDuration?: number; // Actual duration of the audio file in seconds
    duration?: number; // Target duration of the shot in seconds (synced to audio or manual)
    sfx?: SFXEvent[]; // List of generated sound effects
    critique?: {
        score: number;
        feedback: string;
    };
    isGreenScreen?: boolean; // Chroma Key: Foreground layer
    backgroundLayerUrl?: string; // Background video/image URL for compositing
}

export interface GlobalContext {
    style: string;
    character: string;
    setting: string;
}

export interface StoryboardState {
    globalContext: GlobalContext;
    shots: Shot[];
}

export interface VideoFilters {
    contrast: number; // 100 default (percentage)
    saturation: number; // 100 default (percentage)
    sepia: number; // 0 default (percentage)
    grain: number; // 0 default (opacity 0-100)
}

export interface CropConfig {
    xPercentage: number; // 0.0 to 1.0 (relative to video width)
}

// --- Project Management Types ---
export interface ProjectMetadata {
    id: string;
    name: string;
    lastModified: number;
}

export interface Project extends ProjectMetadata {
    promptState: PromptState;
    characterBank: CharacterProfile[];
    locationBank: LocationProfile[];
    visualDNA: VisualDNA[];
    storyboard: StoryboardState;
}

// Represents a user-saved custom preset.
export interface CustomPreset {
  id: string;
  name: string;
  params: PromptState;
}

// Represents a persistent character profile for the Character Bank.
export interface CharacterProfile {
  id: string;
  name: string;
  thumbnailUrl?: string; // Optional URL for visual reference
  attributes: {
    age: string;
    gender: string;
    ethnicity: string;
    bodyType: string;
    skinTone: string;
  };
  appearance: {
    hair: string;
    eyes: string;
    distinguishingFeatures: string;
  };
  wardrobe: string; // Detailed clothing description
  lockedSeed?: number; // Optional seed for consistency
}

// Represents a persistent location/set profile.
export interface LocationProfile {
    id: string;
    name: string; // Short name e.g. "Spaceship Bridge"
    description: string; // Full prompt description
    visualTags: string[]; // e.g. "Sci-Fi", "Dark", "Metallic"
    referenceImage?: string; // Optional base64 or URL
}

// Represents a saved visual style configuration (Visual DNA).
export interface VisualDNA {
  id: string;
  name: string;
  timestamp: number;
  styleParams: Partial<PromptState>;
}

// Represents a shared style in the community
export interface SharedVisualDNA {
  id: string;
  name: string;
  author: string;
  styleParams: Partial<PromptState>;
  likes: number;
  timestamp: number;
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
    placeAnswerSources?: any;
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

// Represents a single video generation task
export interface GenerationTask {
    id: string;
    status: string; // 'Init', 'Processing', 'Polling', 'Fetching', 'Complete', 'Error', 'Queued'
    videoUrl: string | null;
    error?: string;
    prompt?: string;
    settings?: {
        aspectRatio: string;
        resolution: '1080p' | '720p';
        veoModel: 'fast' | 'quality';
    };
    inputImage?: {
        data: string;
        mimeType: string;
    };
}

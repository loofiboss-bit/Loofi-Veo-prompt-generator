
// This file centralizes all the core type definitions for the application.

// A name from the Icon component, used for type safety with icons.
export type IconName = 'spinner' | 'copy' | 'check' | 'edit' | 'cancel' | 'palette' | 'magic' | 'globe' | 'history' | 'trash' | 'template' | 'audio' | 'download' | 'lightbulb' | 'chevron-down' | 'video' | 'film' | 'share' | 'upload' | 'sparkles' | 'save' | 'image' | 'music' | 'search' | 'undo' | 'redo' | 'moon' | 'sun' | 'chat' | 'video-analysis' | 'plus' | 'help' | 'sliders' | 'user' | 'smile' | 'clock' | 'activity' | 'alert-triangle' | 'play' | 'compare' | 'grid-3x3' | 'dna' | 'users' | 'folder' | 'heart' | 'filter' | 'library' | 'subtitles' | 'scissors' | 'shuffle' | 'arrow-right' | 'circle-filled' | 'smartphone' | 'map-pin' | 'pencil' | 'square' | 'circle' | 'eraser' | 'cloud-download' | 'expand' | 'accessibility' | 'move';

// A standard option for select inputs.
export interface SelectOption {
  value: string;
  label: string;
}

// Represents an asset in the global library
export interface Asset {
    id: string;
    type: 'image' | 'audio' | 'video';
    name: string;
    url: string; // Blob URL for preview
    data: string; // Base64 data
    mimeType: string;
    proxyUrl?: string; // Lightweight version for preview
}

// Represents a stock media search result
export interface StockAsset {
    id: string;
    type: 'video' | 'audio';
    url: string;
    thumbnailUrl?: string;
    duration: number;
    width?: number;
    height?: number;
    author: string;
    title: string;
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

export interface TextOverlay {
    id: string;
    text: string;
    startTime: number; // Seconds from start of shot
    duration: number; // Duration in seconds
    animationIn?: 'none' | 'fade' | 'slide_up' | 'zoom' | 'typewriter';
    animationOut?: 'none' | 'fade' | 'slide_down' | 'zoom';
    animationDuration?: number; // Duration of the enter/exit animation itself
    position: {
        x: number; // 0-100 percentage from left
        y: number; // 0-100 percentage from top
    };
    style: {
        fontSize: number;
        color: string; // Hex
        backgroundColor?: string; // Hex
        backgroundOpacity?: number; // 0-1
        fontFamily?: string;
    };
}

export interface ColorGradeParams {
    contrast: number; // 1.0 default (range 0.0-2.0)
    brightness: number; // 0.0 default (range -1.0-1.0)
    saturation: number; // 1.0 default (range 0.0-3.0)
    gamma_r: number; // 1.0 default (range 0.1-10.0)
    gamma_g: number; // 1.0 default
    gamma_b: number; // 1.0 default
}

export interface MotionKeyframe {
    x: number; // Center X % (0.0 - 1.0)
    y: number; // Center Y % (0.0 - 1.0)
    zoom: number; // Scale Factor (1.0 - 5.0)
}

export interface MotionConfig {
    start: MotionKeyframe;
    end: MotionKeyframe;
    ease: 'linear' | 'ease-in-out';
}

export interface Shot {
    id: number;
    type?: 'video' | 'title'; // 'video' is default if undefined
    sourceType?: 'generated' | 'stock' | 'upload'; // Origin of the media
    stockSourceId?: string; // ID for attribution if stock
    titleConfig?: {
        text: string;
        background: string; // Hex color
        color: string; // Hex color
        fontSize: number;
    };
    action: string;
    camera: string;
    dialogueText?: string; // Subtitles/Captions
    characterId?: string;
    locationId?: string; // Links to a LocationProfile
    generatedVideoUrl?: string;
    proxyVideoUrl?: string; // Lightweight version for playback
    conceptImageUrl?: string; // Base64 data URL for static preview
    poseUrl?: string; // Base64 or URL for skeleton reference image
    takes?: string[]; // List of video URLs for variations
    selectedTakeIndex?: number; // Currently selected take
    visualLink?: boolean; // If true, uses the last frame of the previous shot as input
    transitionToNext?: TransitionType; // Transition effect to the NEXT shot
    audioUrl?: string; // Main voice/dialogue track
    audioVolume?: number; // 0.0 to 1.0, default 1.0
    audioDuration?: number; // Actual duration of the audio file in seconds
    duration?: number; // Target duration of the shot in seconds (synced to audio or manual)
    sfx?: SFXEvent[]; // List of generated sound effects
    overlays?: TextOverlay[]; // Text overlays for this shot
    colorGrade?: ColorGradeParams; // AI Color Matching
    motionConfig?: MotionConfig; // Ken Burns Effect
    critique?: {
        score: number;
        feedback: string;
    };
    isGreenScreen?: boolean; // Chroma Key: Foreground layer
    backgroundLayerUrl?: string; // Background video/image URL for compositing
    syncStatus?: 'synced' | 'unsynced' | 'processing'; // Lip Sync status
}

export interface GlobalContext {
    style: string;
    character: string;
    setting: string;
}

// --- Timeline NLE Types ---

export interface TimelineClip {
    id: string;
    resourceId: string | number; // ID of the Shot or Asset
    trackId: string;
    startTime: number; // Timeline start time in seconds
    duration: number; // Duration on timeline in seconds
    offset: number; // Start offset within source media
    type: 'video' | 'audio';
    label: string;
}

export interface TimelineTrack {
    id: string;
    label: string;
    type: 'video' | 'audio';
    isMuted?: boolean;
    isLocked?: boolean;
}

export interface TimelineState {
    tracks: TimelineTrack[];
    clips: TimelineClip[];
    zoomLevel: number; // pixels per second
    currentTime: number;
}

export interface StoryboardState {
    globalContext: GlobalContext;
    shots: Shot[];
    timeline: TimelineState;
}

export interface VideoFilters {
    contrast: number; // 100 default (percentage)
    saturation: number; // 100 default (percentage)
    sepia: number; // 0 default (percentage)
    grain: number; // 0 default (opacity 0-100)
    vfxType?: 'none' | 'grain' | 'vignette' | 'letterbox';
    vfxIntensity: number; // 0-100
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
    proxyUrl?: string | null; // Lightweight proxy
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

// Auto-Director Agent Types
export type DirectorActionTool = 'update_shot' | 'add_shot' | 'remove_shot' | 'set_global' | 'chat';

export interface AgentAction {
    tool: DirectorActionTool;
    reply: string; // Conversational response to user
    parameters: {
        shotId?: number;
        field?: keyof Shot | 'style' | 'character' | 'setting'; // What to update
        value?: any; // The new value
    }
}

// Advanced Suno Types
export interface SunoLyricRequest {
    topic: string;
    mood: string;
    structure: 'pop_standard' | 'rap_freestyle' | 'edm_build' | 'ballad';
    customStructure?: string[]; // Optional user-defined structure sequence
    language: string;
    model: string;
}

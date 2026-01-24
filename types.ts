
export type IconName = 'expand' | 'square' | 'circle' | 'eraser' | 'pencil' | 'map-pin' | 'smartphone' | 'scissors' | 'shuffle' | 'arrow-right' | 'circle-filled' | 'accessibility' | 'spinner' | 'filter' | 'library' | 'subtitles' | 'copy' | 'check' | 'edit' | 'cancel' | 'palette' | 'magic' | 'sparkles' | 'globe' | 'history' | 'trash' | 'template' | 'audio' | 'download' | 'save' | 'lightbulb' | 'moon' | 'sun' | 'chevron-down' | 'video' | 'film' | 'share' | 'upload' | 'image' | 'music' | 'search' | 'undo' | 'redo' | 'chat' | 'video-analysis' | 'plus' | 'sliders' | 'help' | 'user' | 'users' | 'smile' | 'clock' | 'activity' | 'alert-triangle' | 'play' | 'compare' | 'grid-3x3' | 'dna' | 'folder' | 'heart' | 'cloud-download' | 'move' | 'zap' | 'layers' | 'eye-dropper';

export interface SelectOption {
  value: string;
  label: string;
}

export type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

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
  resolution: string;
  animationPreset: string;
  motionIntensity: string;
  creativityLevel: string;
  includeOverlayText: boolean;
  overlayTextContent: string;
  useGoogleSearch: boolean;
  useGoogleMaps: boolean;
  generateAsSeries: boolean;
  thinkingMode: boolean;
  thinkingBudget: number;
  youtubeUrl: string;
  imageStudioPrompt: string;
  uploadedImage: { data: string; mimeType: string } | null;
  uploadedAudio: { data: string; mimeType: string; name: string } | null;
  audioMix: { voice: number; ambient: number; sfx: number };
  useImageAsCameo: boolean;
  language: Language;
  model: string;
  targetModel: 'veo' | 'sora';
  veoModel: 'fast' | 'quality';
  spatialMotions: Record<string, string>;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  maps?: { uri?: string; title?: string; placeAnswerSources?: any };
}

export interface VeoPromptResponse {
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  params: PromptState;
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  params: Partial<PromptState>;
}

export interface CustomPreset {
  id: string;
  name: string;
  params: PromptState;
}

export interface ExamplePrompt {
  title: string;
  idea: string;
  prompt: string;
  params: Partial<PromptState>;
  groundingChunks?: GroundingChunk[];
}

export interface PromptVariation {
  label: string;
  prompt: string;
}

export interface VisualDNA {
  id: string;
  name: string;
  timestamp: number;
  styleParams: Partial<PromptState>;
}

export interface CharacterProfile {
  id: string;
  name: string;
  thumbnailUrl?: string;
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
  wardrobe: string;
  lockedSeed?: number;
}

export interface LocationProfile {
    id: string;
    name: string;
    description: string;
    visualTags: string[];
    referenceImage?: string;
}

export interface SFXEvent {
    description: string;
    timestamp: number;
}

export type TransitionType = 'cut' | 'dissolve' | 'fade_black' | 'wipe_left';

export interface ClipTransition {
    type: TransitionType;
    duration: number;
}

export interface TextOverlay {
    id: string;
    text: string;
    startTime: number;
    duration: number;
    animationIn?: 'none' | 'fade' | 'slide_up' | 'zoom' | 'typewriter';
    animationOut?: 'none' | 'fade' | 'slide_down' | 'zoom';
    animationDuration?: number;
    position: { x: number; y: number };
    style: {
        fontSize: number;
        color: string;
        backgroundColor?: string;
        backgroundOpacity?: number;
        fontFamily?: string;
    };
}

export interface ColorGradeParams {
    contrast: number;
    brightness: number;
    saturation: number;
    gamma_r: number;
    gamma_g: number;
    gamma_b: number;
}

export interface MotionKeyframe {
    x: number;
    y: number;
    zoom: number;
}

export interface MotionConfig {
    start: MotionKeyframe;
    end: MotionKeyframe;
    ease: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface ChromaKeyConfig {
    enabled: boolean;
    color: string; // Hex color string
    similarity: number; // 0.0 to 1.0
    smoothness: number; // 0.0 to 1.0
    spill: number; // 0.0 to 1.0
}

export interface Shot {
  id: number;
  type: 'video' | 'title';
  action: string;
  camera: string;
  characterId: string;
  locationId?: string;
  dialogueText?: string;
  generatedVideoUrl?: string;
  proxyVideoUrl?: string;
  conceptImageUrl?: string;
  audioUrl?: string;
  audioVolume?: number;
  audioDuration?: number;
  duration?: number;
  visualLink?: boolean;
  isGreenScreen?: boolean; // Deprecated in favor of chromaKey, but kept for back-compat
  chromaKey?: ChromaKeyConfig;
  backgroundLayerUrl?: string;
  sfx?: SFXEvent[];
  takes?: string[];
  selectedTakeIndex?: number;
  transition?: ClipTransition;
  overlays?: TextOverlay[];
  colorGrade?: ColorGradeParams;
  motionConfig?: MotionConfig;
  poseUrl?: string;
  titleConfig?: {
      text: string;
      background: string;
      color: string;
      fontSize: number;
  };
  sourceType?: 'generated' | 'stock';
  stockSourceId?: string;
  is4K?: boolean;
  versions?: Record<string, string>; // Language code -> Video URL (e.g. 'es': 'blob:...')
}

export interface ProjectMetadata {
    id: string;
    name: string;
    lastModified: number;
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  promptState: PromptState;
  characterBank: CharacterProfile[];
  locationBank: LocationProfile[];
  visualDNA: VisualDNA[];
  storyboard: StoryboardState;
}

export interface StoryboardState {
    globalContext: GlobalContext;
    shots: Shot[];
    timeline: TimelineState;
}

export interface GlobalContext {
  style: string;
  character: string;
  setting: string;
}

export interface Asset {
    id: string;
    type: 'image' | 'video' | 'audio';
    name: string;
    url: string;
    data: string;
    mimeType: string;
    proxyUrl?: string;
}

export interface StockAsset {
    id: string;
    type: 'video' | 'audio';
    title: string;
    author: string;
    url: string;
    thumbnailUrl?: string;
    duration?: number;
}

export interface ModelComparisonResponse {
  veoPrompt: string;
  soraPrompt: string;
}

export interface EditedImageResponse {
  newImageBytes: string;
  newMimeType: string;
}

export interface AgentAction {
  tool: 'update_shot' | 'add_shot' | 'remove_shot' | 'set_global' | 'chat';
  reply: string;
  parameters: {
    shotId?: number;
    field?: string;
    value?: string;
  };
}

export interface PronunciationTerm {
  term: string;
  pronunciation: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface GenerationTask {
  id: string;
  status: 'Queued' | 'Pending' | 'Init' | 'Processing' | 'Polling' | 'Fetching' | 'Complete' | 'Error';
  prompt: string;
  settings: any;
  inputImage?: { data: string; mimeType: string };
  videoUrl: string | null;
  proxyUrl?: string;
  error?: string;
  timestamp: number;
}

export interface CropConfig {
    xPercentage: number;
}

export interface SharedVisualDNA extends VisualDNA {
    author: string;
    likes: number;
}

export interface VideoFilters {
    contrast: number;
    saturation: number;
    sepia: number;
    grain: number;
    vfxType: 'none' | 'grain' | 'vignette' | 'letterbox';
    vfxIntensity: number;
}

export interface VolumeKeyframe {
    time: number; // Seconds relative to clip start
    value: number; // 0.0 to 1.0 (linear volume)
}

export interface TimelineClip {
    id: string;
    resourceId: string | number;
    trackId: string;
    startTime: number;
    duration: number;
    offset: number;
    type: 'video' | 'audio';
    label: string;
    transition?: ClipTransition;
    volumeKeyframes?: VolumeKeyframe[];
    isLoading?: boolean;
}

export interface TimelineTrack {
    id: string;
    label: string;
    type: 'video' | 'audio';
    trackType?: 'dialogue' | 'music' | 'sfx';
    isMuted?: boolean;
    isLocked?: boolean;
}

export interface TimelineState {
    tracks: TimelineTrack[];
    clips: TimelineClip[];
    zoomLevel: number;
    currentTime: number;
}

export interface SunoLyricRequest {
    topic: string;
    mood: string;
    structure: 'pop_standard' | 'rap_freestyle' | 'edm_build' | 'ballad';
    customStructure?: string[];
    language: string;
    model: string;
}

export interface SongMetadata {
    title: string;
    styleDescription: string;
}

export interface VisualizerConfig {
    style: 'waves' | 'lines' | 'frequency';
    color: string;
}

export interface StyleOptions {
    decade: string;
    genre: string;
    subGenre: string;
    voice: string;
    tempo: string;
    mood: string;
    instruments?: string[];
}

export interface SunoPack {
    title: string;
    style: string;
    lyrics: string;
    explanation?: string;
}

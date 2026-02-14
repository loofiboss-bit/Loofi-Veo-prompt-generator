export * from './diagnostics';
export * from './workspace';
export * from './registry';

export type Language = 'en' | 'sv' | 'es' | 'fr' | 'de';

export type IconName =
  | 'expand'
  | 'square'
  | 'circle'
  | 'eraser'
  | 'pencil'
  | 'map-pin'
  | 'smartphone'
  | 'scissors'
  | 'shuffle'
  | 'arrow-right'
  | 'circle-filled'
  | 'accessibility'
  | 'spinner'
  | 'filter'
  | 'library'
  | 'subtitles'
  | 'copy'
  | 'check'
  | 'edit'
  | 'cancel'
  | 'palette'
  | 'magic'
  | 'sparkles'
  | 'globe'
  | 'history'
  | 'trash'
  | 'template'
  | 'audio'
  | 'download'
  | 'save'
  | 'lightbulb'
  | 'moon'
  | 'sun'
  | 'chevron-down'
  | 'video'
  | 'film'
  | 'share'
  | 'upload'
  | 'image'
  | 'music'
  | 'search'
  | 'undo'
  | 'redo'
  | 'chat'
  | 'video-analysis'
  | 'plus'
  | 'sliders'
  | 'help'
  | 'user'
  | 'users'
  | 'smile'
  | 'clock'
  | 'activity'
  | 'alert-triangle'
  | 'play'
  | 'compare'
  | 'grid-3x3'
  | 'dna'
  | 'folder'
  | 'heart'
  | 'cloud-download'
  | 'move'
  | 'zap'
  | 'layers'
  | 'eye-dropper'
  | 'mic'
  | 'keyframe'
  | 'keyframe-filled'
  | 'chevron-right'
  | 'tag'
  | 'file-text'
  | 'list'
  | 'brush'
  | 'arrow-up-right'
  | 'lock'
  | 'unlock'
  | 'settings'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'info'
  | 'external-link'
  | 'check-circle'
  | 'key'
  | 'code'
  | 'document'
  | 'menu';

export interface SelectOption {
  value: string;
  label: string;
}

export interface GlobalStyle {
  description: string;
  referenceImage?: string;
  strength: number; // 0-100
  isLocked: boolean;
}

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

  // Identity Lock
  characterVisualDNA: string;
  characterFixedSeed: number | null;
  characterNegativePrompt: string;

  // Global Project Style
  globalStyle: GlobalStyle;

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

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maps?: { uri?: string; title?: string; placeAnswerSources?: any };
}

export interface VeoPromptResponse {
  prompt: string;
  groundingChunks?: GroundingChunk[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
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
  description?: string;
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

export interface SharedVisualDNA extends VisualDNA {
  author: string;
  likes: number;
}

export interface CharacterProfile {
  id: string;
  name: string;
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
  visualPrompt: string;
  fixedSeed: number | null;
  negativePrompt: string;
  thumbnailUrl?: string;
}

export interface LocationProfile {
  id: string;
  name: string;
  description: string;
  visualTags: string[];
  referenceImage?: string;
}

export interface StoryboardState {
  globalContext: GlobalContext;
  shots: Shot[];
  timeline: TimelineState;
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

export interface ModelComparisonResponse {
  veoPrompt: string;
  soraPrompt: string;
}

export interface EditedImageResponse {
  newImageBytes: string;
  newMimeType: string;
}

export interface SFXEvent {
  description: string;
  timestamp: number;
}

export interface TransitionType {
  type: 'cut' | 'dissolve' | 'fade_black' | 'wipe_left';
  duration: number;
}

export type ClipTransition = TransitionType;

// --- MODULAR EFFECTS SYSTEM ---

export type EffectType = 'color' | 'chroma' | 'shake';

export interface BaseEffect {
  id: string;
  type: EffectType;
  isEnabled: boolean;
  name?: string;
}

export interface ColorGradeEffect extends BaseEffect {
  type: 'color';
  brightness: number; // 0 to 2, 1 is default
  contrast: number; // 0 to 2, 1 is default
  saturation: number; // 0 to 2, 1 is default
  sepia: number; // 0 to 1
  hueRotate: number; // -180 to 180 degrees
}

export interface ChromaKeyEffect extends BaseEffect {
  type: 'chroma';
  color: string; // Hex e.g., #00FF00
  similarity: number; // 0 to 1
  smoothness: number; // 0 to 1
  spill: number; // 0 to 1
}

export interface CameraShakeEffect extends BaseEffect {
  type: 'shake';
  intensity: number; // 0 to 1
  speed: number; // 0.1 to 5
  scale: number; // 1.0 to 1.5 (Overscan to prevent black edges)
}

export type VideoEffect = ColorGradeEffect | ChromaKeyEffect | CameraShakeEffect;

// --- END EFFECTS SYSTEM ---

export interface MotionKeyframe {
  x: number;
  y: number;
  zoom: number;
}

export interface MotionConfig {
  start: MotionKeyframe;
  end: MotionKeyframe;
  ease: string; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
    fontFamily?: string;
  };
  animationIn?: 'none' | 'fade' | 'slide_up' | 'zoom' | 'typewriter';
  animationOut?: 'none' | 'fade' | 'slide_down' | 'zoom';
  animationDuration?: number;
}

export interface ColorGrade {
  contrast: number;
  saturation: number;
  brightness: number;
  sepia: number;
  hueRotate: number;
  gamma_r?: number;
  gamma_g?: number;
  gamma_b?: number;
}

export type ColorGradeParams = ColorGrade;

export interface CameraEffect {
  type: 'static' | 'handheld' | 'drift' | 'zoom_in' | 'zoom_out';
  intensity: number;
  scale?: number;
  speed?: number;
}

export interface Shot {
  id: number;
  type: 'video' | 'title';
  action: string;
  camera: string;
  characterId: string;
  locationId?: string;
  generatedVideoUrl?: string;
  proxyVideoUrl?: string;
  conceptImageUrl?: string;
  takes: string[];
  selectedTakeIndex: number;
  visualLink: boolean;
  duration: number;
  transition: ClipTransition;
  titleConfig?: {
    text: string;
    background: string;
    color: string;
    fontSize: number;
  };
  sfx?: SFXEvent[];
  dialogueText?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioVolume?: number;
  is4K?: boolean;
  // Removed specific effect fields in favor of syncing to timeline clips
  // but kept for legacy/compatibility if needed:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chromaKey?: any;
  backgroundLayerUrl?: string;
  colorGrade?: ColorGradeParams;
  cameraEffect?: CameraEffect;

  motionConfig?: MotionConfig;
  overlays?: TextOverlay[];
  poseUrl?: string;
  sourceType?: 'generated' | 'stock';
  stockSourceId?: string;
  isGreenScreen?: boolean;

  // Magic Mask
  maskSequence?: string[]; // Array of Blob URLs for each frame
}

export interface GenerationTask {
  id: string;
  status:
    | 'Queued'
    | 'Init'
    | 'Processing'
    | 'Polling'
    | 'Fetching'
    | 'Complete'
    | 'Error'
    | 'Pending';
  videoUrl: string | null;
  proxyUrl?: string | null;
  prompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  inputImage?: { data: string; mimeType: string };
  error?: string;
  timestamp: number;
}

export interface Asset {
  id: string;
  type: 'image' | 'audio' | 'video';
  name: string;
  url: string;
  data: string;
  mimeType: string;
  isProxyReady?: boolean;
  proxyUrl?: string;
  tags?: string[];
  groupId?: string;
  version?: number;
  parentId?: string;

  // Takes System
  takeGroupId?: string;
  takeNumber?: number;
}

export interface StockAsset {
  id: string;
  type: 'video' | 'audio';
  title: string;
  author: string;
  duration?: number;
  url: string;
  thumbnailUrl?: string;
}

export interface ScriptBreakdownItem {
  id: string;
  scene: string;
  description: string;
  visualPrompt: string;
  duration: number;
  action?: string;
  status: 'pending' | 'generated';
}

export interface SunoSettings {
  topic: string;
  genre: string;
  mood: string;
  voice: string;
  tempo: string;
  structure: 'Auto' | 'Standard' | 'Pop' | 'Rap' | 'Ambient' | 'Custom';
}

export interface SunoPack {
  title: string;
  style: string;
  lyrics: string;
  explanation: string;
}

export interface SunoLyricRequest {
  topic: string;
}

export interface SongMetadata {
  // ...
}

export interface StyleOptions {
  // ...
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: 'pop' | 'karaoke' | 'classic';
}

export interface AgentAction {
  // ...
}

export interface VideoFilters {
  contrast: number;
  saturation: number;
  brightness: number;
  sepia: number;
  hueRotate: number;
  grain: number;
  vfxType: 'none' | 'grain' | 'vignette' | 'letterbox';
  vfxIntensity: number;
  filmConfig?: {
    enabled: boolean;
    preset: 'custom' | 'super8' | 'vhs' | 'cinema';
    grainIntensity: number;
    halationIntensity: number;
    jitterIntensity: number;
  };
}

export interface GlobalContext {
  style: string;
  character: string;
  setting: string;
}

export interface TimelineTrack {
  id: string;
  label: string;
  type: 'video' | 'audio' | 'text';
  trackType: 'captions' | 'dialogue' | 'sfx' | 'music' | 'ambience';
  zIndex: number;
}

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  property: string;
  easing: string; // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

export interface TransformProps {
  scale: number;
  position: { x: number; y: number };
  rotation: number;
  opacity: number;
}

export interface VolumeKeyframe {
  time: number;
  value: number;
}

export interface TimelineClip {
  id: string;
  resourceId: string | number;
  trackId: string;
  startTime: number;
  duration: number;
  offset: number;
  type: 'video' | 'audio' | 'text' | 'image';
  label: string;
  isLoading?: boolean;
  transition?: ClipTransition;
  volume?: number;
  volumeKeyframes?: VolumeKeyframe[];
  opacity?: number;
  panning?: { x: number; z: number };
  caption?: Caption;
  transform?: TransformProps;
  keyframes?: Keyframe[];

  // NEW MODULAR EFFECTS
  effects?: VideoEffect[];

  // Takes System
  selectedTakeId?: string;

  // Deprecated / Legacy Fields (Kept for compatibility during migration)
  colorGrade?: ColorGradeParams;
  cameraEffect?: CameraEffect;

  reactivity?: {
    targetProperty: 'scale' | 'opacity' | 'brightness';
    frequencyRange: 'bass' | 'mids' | 'highs';
    sensitivity: number; // 0 to 2.0
  };

  // Magic Mask
  maskSequence?: string[];
}

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  zoomLevel: number;
  currentTime: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface PronunciationTerm {
  term: string;
  pronunciation: string;
  description: string;
}

export interface VisualizerConfig {
  style: 'frequency' | 'lines' | 'waves';
  color: string;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string;
  similarity: number;
  smoothness: number;
  spill: number;
}

export interface CropConfig {
  xPercentage: number;
  keyframes?: { time: number; x: number }[];
}

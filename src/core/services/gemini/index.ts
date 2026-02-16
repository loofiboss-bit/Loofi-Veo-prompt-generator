/**
 * Barrel-export for the Gemini domain sub-modules.
 *
 * Consumers can import from `@core/services/gemini` directly for tree-shaken
 * access to individual modules, or continue importing via the existing
 * `@core/services/geminiService` facade (which re-exports everything here).
 */
export { getAiClient, cleanJson } from './aiClient';

// Prompt domain
export {
  // Interfaces
  type ModifierOptions,
  type AudioDesignParams,
  type AdvancedSettingsParams,
  type AdvancedSettingsOptions,
  type CameraSetupParams,
  type CameraSetupOptions,
  type ActionFlowParams,
  // Functions
  generateVeoPrompt,
  generateBRollPrompt,
  analyzeIdeaForModifiers,
  generatePromptVariations,
  suggestPromptIdeas,
  enhancePrompt,
  combinePromptVariations,
  refinePrompt,
  restructurePrompt,
  generateModelComparison,
  validatePhysicsLogic,
  validateCinematography,
  suggestFullAudioDesign,
  suggestEnvironmentDetails,
  suggestSensoryDetails,
  suggestCharacterNuances,
  suggestVisualEffect,
  suggestAdvancedSettings,
  suggestArtStyles,
  suggestCharacterDetails,
  generateCharacterDNA,
  suggestCameraSetup,
  suggestCharacterActionFlow,
  mixVisualDNA,
  generateFromWizard,
  generateStyleVariations,
  extractStyleDNA,
  translateScript,
  extractVisualKeywords,
} from './geminiPromptService';

// Vision domain
export {
  generateConceptArt,
  generateStoryboard,
  generateStyleThumbnail,
  editImageWithGemini,
  generateOutpaint,
  describeImage,
  analyzeVideo,
  analyzeImageForSFX,
  analyzeVideoForSFX,
  generateAssetTags,
} from './geminiVisionService';

// Audio domain
export {
  generateSpeech,
  generateSoundEffect,
  transcribeAudio,
  analyzeAudio,
  generateAmbiencePrompt,
  generateAmbienceAudio,
  generateSunoPack,
  extendSunoLyrics,
} from './geminiAudioService';

// Production domain
export {
  calculateColorGrade,
  generateColorGrade,
  bridgeScenes,
  generateLocationDescription,
  interpretCameraPath,
  createAppChat,
  analyzeScriptBreakdown,
  generateBridgeVideo,
  generateBlockingFromScript,
} from './geminiProductionService';

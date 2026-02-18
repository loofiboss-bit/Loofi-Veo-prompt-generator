// Service exports - organized by domain
export * from './apiExportService';
export * from './errorLoggingService';
export * from './apiKeyService';
// audioAnalysisService and beatDetection both export 'detectBeats' — audioAnalysisService is primary
export * from './audioAnalysisService';
export * from './audioSeparationService';
export * from './autosaveService';
// beatDetection: aliased to avoid conflict
export { detectBeats as detectBeatsAsync } from './beatDetection';
export * from './colorGradeService';
export * from './communityService';
export * from './composerService';
export * from './databaseService';
export * from './diffService';
export * from './effectPipeline';
// exportService conflicts with apiExportService on 'ExportFormat' — export non-conflicting members only
export type { ExportJob, ExportOptions } from './exportService';
export {
  queueExport,
  getExportStatus,
  downloadExport,
  quickExport,
  validateExportData,
  getExportQueue,
  clearCompletedJobs,
  cancelExport,
} from './exportService';
export * from './geminiService';
export * from './historyService';
export * from './imageEditService';
export * from './keyboardShortcutManager';
export * from './lipSyncService';
export * from './loggerService';
export * from './montageService';
export * from './performanceService';
export * from './pluginService';
export * from './presetManager';
export * from './performanceProfiler';
export * from './projectAnalysisService';
export * from './projectService';
export * from './promptBuilder';
// proxyService and videoEditorService both export 'generateProxy' — proxyService is primary
export * from './proxyService';
export * from './registryService';
export * from './searchService';
export * from './segmentationService';
export * from './sfxService';
export * from './smartCropService';
export * from './stockMediaService';
export * from './templateManager';
export * from './transitionAnalyst';
export * from './updateService';
export * from './upscaleService';
// videoEditorService: export all except 'generateProxy' to avoid conflict with proxyService
export {
  stitchVideos,
  renderTitleCard,
  renderAudioVisualizer,
  transcodeVideo,
} from './videoEditorService';
export * from './videoGenerationService';
export * from './workspaceService';
export * from './settingsResolutionService';
export * from './dataMigrationService';
export * from './pluginSandboxService';
export * from './pluginInstallService';
export * from './crashReporterService';
export * from './telemetryService';
export * from './differentialUpdateService';

// v2.6.0 — Collaboration Suite
export * from './authService';
export * from './permissionService';
export * from './commentService';
export * from './collaborationService';

// v2.7.0 — AI-Driven Project Optimization
export * from './promptRefinementService';
export * from './assetIntelligenceService';
export * from './costEstimationService';
export * from './narrativeAnalysisService';

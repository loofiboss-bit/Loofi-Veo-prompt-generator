#!/bin/bash
# Create barrel exports for all modules
set -e

PROJECT_ROOT="/home/loofi/LOOFI GRAV/Loofi-Veo-prompt-generator"
cd "$PROJECT_ROOT"

echo "📦 Creating barrel exports..."

# Core Constants
cat > src/core/constants/index.ts << 'EOF'
// Re-export all constants
export * from './templates';
export * from './translations';
EOF

# Core Services
cat > src/core/services/index.ts << 'EOF'
// Service exports - organized by domain
export * from './apiExportService';
export * from './apiKeyService';
export * from './audioAnalysisService';
export * from './audioSeparationService';
export * from './autosaveService';
export * from './beatDetection';
export * from './colorGradeService';
export * from './communityService';
export * from './databaseService';
export * from './diffService';
export * from './effectPipeline';
export * from './exportService';
export * from './geminiService';
export * from './historyService';
export * from './imageEditService';
export * from './keyboardShortcutManager';
export * from './lipSyncService';
export * from './loggerService';
export * from './montageService';
export * from './pluginService';
export * from './presetManager';
export * from './projectService';
export * from './promptBuilder';
export * from './proxyService';
export * from './searchService';
export * from './segmentationService';
export * from './sfxService';
export * from './smartCropService';
export * from './stockMediaService';
export * from './templateManager';
export * from './transitionAnalyst';
export * from './updateService';
export * from './upscaleService';
export * from './videoEditorService';
EOF

# Core Utils
cat > src/core/utils/index.ts << 'EOF'
// Utility functions
export * from './apiErrors';
export * from './audio';
export * from './cameraPhysics';
export * from './easing';
export * from './edlExport';
export * from './errorHandler';
export * from './filmGrain';
export * from './pdfExport';
export * from './projectArchiver';
export * from './promptScoring';
export * from './retry';
export * from './search';
export * from './storage';
export * from './textUtils';
export * from './timeUtils';
export * from './timelineUtils';
export * from './validation';
export * from './variableParser';
export * from './videoUtils';
export * from './xmlExport';
EOF

# Core Store
cat > src/core/store/index.ts << 'EOF'
// State management
export * from './useAppStore';
export * from './useHistoryStore';
export * from './useLocationStore';
export * from './useProjectStore';
export * from './useSettingsStore';
export * from './pluginStore';
EOF

# Shared Components UI
cat > src/shared/components/ui/index.ts << 'EOF'
// UI Components
export { default as Button } from './Button';
export { default as CheckboxInput } from './CheckboxInput';
export { default as RangeInput } from './RangeInput';
export { default as SelectInput } from './SelectInput';
export { default as TextAreaInput } from './TextAreaInput';
export { default as Chip } from './Chip';
export { default as Icon } from './Icon';
export { default as Toast } from './Toast';
export { default as Tooltip } from './Tooltip';
export { default as Tabs } from './Tabs';
export { default as CollapsibleSection } from './CollapsibleSection';
EOF

# Shared Components Layout
cat > src/shared/components/layout/index.ts << 'EOF'
// Layout Components
export { default as Header } from './Header';
export { default as Sidebar } from './Sidebar';
export { default as ActionBar } from './ActionBar';
export { default as ModalManager } from './ModalManager';
EOF

# Shared Hooks
cat > src/shared/hooks/index.ts << 'EOF'
// Shared hooks
export * from './useAppSync';
export * from './useAudioWorker';
export * from './useBroadcastState';
export * from './useCollaborativeProject';
export * from './useDirectorsChain';
export * from './useHistoryState';
export * from './useHotkeys';
export * from './useProjectManager';
export * from './usePromptLogic';
export * from './useSceneAmbience';
export * from './useSequentialGeneration';
export * from './useStudios';
export * from './useVideoGeneration';
EOF

# Features - History
cat > src/features/history/index.ts << 'EOF'
// History feature
export { default as HistoryPanel } from './HistoryPanel';
export { default as HistoryControls } from './HistoryControls';
export { default as DiffViewer } from './DiffViewer';
EOF

# Features - Project
cat > src/features/project/index.ts << 'EOF'
// Project management
export { default as ProjectManager } from './ProjectManager';
export { default as ProjectManagerModal } from './ProjectManagerModal';
export { default as VariablesPanel } from './VariablesPanel';
EOF

# Features - Export
cat > src/features/export/index.ts << 'EOF'
// Export functionality
export { default as ExportModal } from './ExportModal';
export { default as ApiExportModal } from './ApiExportModal';
EOF

# Features - Plugins
cat > src/features/plugins/index.ts << 'EOF'
// Plugin system
export { default as PluginManager } from './PluginManager';
EOF

# Features - Settings
cat > src/features/settings/index.ts << 'EOF'
// Settings
export { default as SettingsModal } from './SettingsModal';
export { default as ApiKeyModal } from './ApiKeyModal';
export { default as ShortcutsModal } from './ShortcutsModal';
EOF

# Features - Prompt
cat > src/features/prompt/index.ts << 'EOF'
// Prompt building
export { default as PromptOutput } from './PromptOutput';
export { default as PromptBuilderSummary } from './PromptBuilderSummary';
export { default as QualityMeter } from './QualityMeter';
export { default as TemplatesPanel } from './TemplatesPanel';
EOF

# Features - Timeline
cat > src/features/timeline/index.ts << 'EOF'
// Timeline
export { default as TimelinePlayer } from './TimelinePlayer';
export { default as TransitionHandle } from './TransitionHandle';
export { default as StoryBoard } from './StoryBoard';
EOF

# Features - Studios
cat > src/features/studios/index.ts << 'EOF'
// Studios
export { default as AmbienceStudio } from './AmbienceStudio';
export { default as ImageStudio } from './ImageStudio';
export { default as VideoGenerationStudio } from './VideoGenerationStudio';
export { default as VideoAnalysisStudio } from './VideoAnalysisStudio';
export { default as SunoSongStudio } from './SunoSongStudio';
EOF

echo "✅ Barrel exports created"

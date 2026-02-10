#!/bin/bash
# Project Restructuring Script - v1.5.0
set -e

PROJECT_ROOT="/home/loofi/LOOFI GRAV/Loofi-Veo-prompt-generator"
cd "$PROJECT_ROOT"

echo "🏗️  Starting Project Restructuring..."

# Phase 1: Move Core Files
echo "📦 Phase 1: Moving Core Files..."

# Move types
mv types.ts src/core/types/index.ts 2>/dev/null || true
mv types/plugin.ts src/core/types/plugin.ts 2>/dev/null || true

# Move constants
mv constants.ts src/core/constants/index.ts 2>/dev/null || true
mv templates.ts src/core/constants/templates.ts 2>/dev/null || true
mv translations.ts src/core/constants/translations.ts 2>/dev/null || true

# Move services from root to core
for service in services/*.ts; do
  if [ -f "$service" ]; then
    filename=$(basename "$service")
    mv "$service" "src/core/services/$filename" 2>/dev/null || true
  fi
done

# Move service adapters
if [ -d "services/adapters" ]; then
  mv services/adapters src/core/services/ 2>/dev/null || true
fi

# Move utils from root to core
for util in utils/*.ts; do
  if [ -f "$util" ]; then
    filename=$(basename "$util")
    mv "$util" "src/core/utils/$filename" 2>/dev/null || true
  fi
done

# Move shaders
if [ -d "utils/shaders" ]; then
  mv utils/shaders src/core/utils/ 2>/dev/null || true
fi

echo "✅ Core files moved"

# Phase 2: Move Hooks
echo "📦 Phase 2: Moving Hooks..."

for hook in hooks/*.ts hooks/*.tsx; do
  if [ -f "$hook" ]; then
    filename=$(basename "$hook")
    mv "$hook" "src/shared/hooks/$filename" 2>/dev/null || true
  fi
done

echo "✅ Hooks moved"

# Phase 3: Move Store
echo "📦 Phase 3: Moving Store..."

mkdir -p src/core/store
for store_file in store/*.ts; do
  if [ -f "$store_file" ]; then
    filename=$(basename "$store_file")
    mv "$store_file" "src/core/store/$filename" 2>/dev/null || true
  fi
done

if [ -d "store/slices" ]; then
  mv store/slices src/core/store/ 2>/dev/null || true
fi

echo "✅ Store moved"

# Phase 4: Organize Components by Feature
echo "📦 Phase 4: Organizing Components..."

# Studios
mkdir -p src/features/studios
mv components/AmbienceStudio.tsx src/features/studios/ 2>/dev/null || true
mv components/ImageStudio.tsx src/features/studios/ 2>/dev/null || true
mv components/VideoGenerationStudio.tsx src/features/studios/ 2>/dev/null || true
mv components/VideoAnalysisStudio.tsx src/features/studios/ 2>/dev/null || true
mv components/SunoSongStudio.tsx src/features/studios/ 2>/dev/null || true

# Timeline
mkdir -p src/features/timeline
mv components/Timeline src/features/timeline/components 2>/dev/null || true
mv components/TimelinePlayer.tsx src/features/timeline/ 2>/dev/null || true
mv components/TransitionHandle.tsx src/features/timeline/ 2>/dev/null || true
mv components/StoryBoard.tsx src/features/timeline/ 2>/dev/null || true

# Project Management
mkdir -p src/features/project
mv components/ProjectManager.tsx src/features/project/ 2>/dev/null || true
mv components/ProjectManagerModal.tsx src/features/project/ 2>/dev/null || true
mv components/VariablesPanel.tsx src/features/project/ 2>/dev/null || true

# History
mkdir -p src/features/history
mv components/HistoryPanel.tsx src/features/history/ 2>/dev/null || true
mv components/HistoryControls.tsx src/features/history/ 2>/dev/null || true
mv components/DiffViewer.tsx src/features/history/ 2>/dev/null || true

# Export
mkdir -p src/features/export
mv components/ExportModal.tsx src/features/export/ 2>/dev/null || true
mv components/ApiExportModal.tsx src/features/export/ 2>/dev/null || true

# Plugins
mkdir -p src/features/plugins
mv components/PluginManager.tsx src/features/plugins/ 2>/dev/null || true

# Settings
mkdir -p src/features/settings
mv components/SettingsModal.tsx src/features/settings/ 2>/dev/null || true
mv components/ApiKeyModal.tsx src/features/settings/ 2>/dev/null || true
mv components/ShortcutsModal.tsx src/features/settings/ 2>/dev/null || true

# Prompt Building
mkdir -p src/features/prompt
mv components/PromptOutput.tsx src/features/prompt/ 2>/dev/null || true
mv components/PromptBuilderSummary.tsx src/features/prompt/ 2>/dev/null || true
mv components/QualityMeter.tsx src/features/prompt/ 2>/dev/null || true
mv components/TemplatesPanel.tsx src/features/prompt/ 2>/dev/null || true

# Move all modals to features
mkdir -p src/features/studios/modals
mv components/*Modal.tsx src/features/studios/modals/ 2>/dev/null || true

# Move UI components to shared
mkdir -p src/shared/components/ui
mv components/Button.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/CheckboxInput.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/RangeInput.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/SelectInput.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/TextAreaInput.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/Chip.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/Icon.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/Toast.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/Tooltip.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/Tabs.tsx src/shared/components/ui/ 2>/dev/null || true
mv components/CollapsibleSection.tsx src/shared/components/ui/ 2>/dev/null || true

# Move layout components
mkdir -p src/shared/components/layout
mv components/Header.tsx src/shared/components/layout/ 2>/dev/null || true
mv components/Sidebar.tsx src/shared/components/layout/ 2>/dev/null || true
mv components/ActionBar.tsx src/shared/components/layout/ 2>/dev/null || true
mv components/ModalManager.tsx src/shared/components/layout/ 2>/dev/null || true

# Move onboarding
mv components/Onboarding src/features/onboarding 2>/dev/null || true
mv components/onboarding src/features/onboarding/components 2>/dev/null || true
mv components/TutorialGuide.tsx src/features/onboarding/ 2>/dev/null || true
mv components/WizardModal.tsx src/features/onboarding/ 2>/dev/null || true

# Move help
mkdir -p src/features/help
mv components/help src/features/help/components 2>/dev/null || true

# Move accessibility
mkdir -p src/shared/components/accessibility
mv components/accessibility src/shared/components/accessibility/components 2>/dev/null || true

# Move updates
mkdir -p src/features/settings/updates
mv components/updates src/features/settings/updates/components 2>/dev/null || true

echo "✅ Components organized"

# Phase 5: Move Infrastructure
echo "📦 Phase 5: Moving Infrastructure..."

# Database
mv src/data src/infrastructure/database/migrations 2>/dev/null || true

# Workers
mv workers src/infrastructure/ 2>/dev/null || true

echo "✅ Infrastructure moved"

# Phase 6: Move remaining components
echo "📦 Phase 6: Moving remaining components..."

# Move any remaining components to shared
for comp in components/*.tsx; do
  if [ -f "$comp" ]; then
    filename=$(basename "$comp")
    mv "$comp" "src/shared/components/$filename" 2>/dev/null || true
  fi
done

# Move tabs
if [ -d "components/tabs" ]; then
  mv components/tabs src/features/prompt/tabs 2>/dev/null || true
fi

echo "✅ Remaining components moved"

# Phase 7: Move contexts
echo "📦 Phase 7: Moving contexts..."

for context in src/contexts/*.tsx src/contexts/*.ts; do
  if [ -f "$context" ]; then
    filename=$(basename "$context")
    mv "$context" "src/shared/contexts/$filename" 2>/dev/null || true
  fi
done

echo "✅ Contexts moved"

# Phase 8: Consolidate styles
echo "📦 Phase 8: Consolidating styles..."

mkdir -p src/shared/styles
for style in src/styles/*; do
  if [ -f "$style" ]; then
    filename=$(basename "$style")
    mv "$style" "src/shared/styles/$filename" 2>/dev/null || true
  fi
done

echo "✅ Styles consolidated"

# Phase 9: Clean up empty directories
echo "📦 Phase 9: Cleaning up..."

find . -type d -empty -delete 2>/dev/null || true

echo "✅ Cleanup complete"

echo "🎉 Restructuring complete!"
echo ""
echo "Next steps:"
echo "1. Update import paths"
echo "2. Create barrel exports (index.ts files)"
echo "3. Verify build: npm run build"
echo "4. Run tests"

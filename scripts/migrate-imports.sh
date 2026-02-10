#!/bin/bash
# Import Path Migration Script
# Automatically updates import paths to use new aliases

PROJECT_ROOT="/home/loofi/LOOFI GRAV/Loofi-Veo-prompt-generator"
cd "$PROJECT_ROOT"

echo "🔄 Starting import path migration..."

# Function to update imports in a file
update_imports() {
  local file="$1"
  
  # Skip node_modules and dist
  if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"dist"* ]]; then
    return
  fi
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Update imports - Services
  sed -i "s|from ['\"].*\/services\/\(.*\)['\"]|from '@core/services/\1'|g" "$file"
  sed -i "s|from ['\"]\.\.\/\.\.\/services\/\(.*\)['\"]|from '@core/services/\1'|g" "$file"
  
  # Update imports - Types
  sed -i "s|from ['\"].*\/types['\"]|from '@core/types'|g" "$file"
  sed -i "s|from ['\"]\.\.\/types['\"]|from '@core/types'|g" "$file"
  
  # Update imports - Constants
  sed -i "s|from ['\"].*\/constants['\"]|from '@core/constants'|g" "$file"
  sed -i "s|from ['\"]\.\.\/constants['\"]|from '@core/constants'|g" "$file"
  
  # Update imports - Utils
  sed -i "s|from ['\"].*\/utils\/\(.*\)['\"]|from '@core/utils/\1'|g" "$file"
  sed -i "s|from ['\"]\.\.\/\.\.\/utils\/\(.*\)['\"]|from '@core/utils/\1'|g" "$file"
  
  # Update imports - Store
  sed -i "s|from ['\"].*\/store\/\(.*\)['\"]|from '@core/store/\1'|g" "$file"
  sed -i "s|from ['\"]\.\.\/\.\.\/store\/\(.*\)['\"]|from '@core/store/\1'|g" "$file"
  
  # Update imports - Hooks
  sed -i "s|from ['\"].*\/hooks\/\(.*\)['\"]|from '@shared/hooks/\1'|g" "$file"
  sed -i "s|from ['\"]\.\.\/\.\.\/hooks\/\(.*\)['\"]|from '@shared/hooks/\1'|g" "$file"
  
  # Update imports - Components (basic UI)
  for comp in Button CheckboxInput RangeInput SelectInput TextAreaInput Chip Icon Toast Tooltip Tabs CollapsibleSection; do
    sed -i "s|from ['\"].*\/components\/${comp}['\"]|from '@shared/components/ui'|g" "$file"
  done
  
  # Update imports - Layout components
  for comp in Header Sidebar ActionBar ModalManager; do
    sed -i "s|from ['\"].*\/components\/${comp}['\"]|from '@shared/components/layout'|g" "$file"
  done
  
  echo "  ✓ Updated: $file"
}

# Find all TypeScript/TSX files in src
echo "📝 Updating TypeScript files..."
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  update_imports "$file"
done

echo ""
echo "✅ Import migration complete!"
echo ""
echo "⚠️  Important:"
echo "1. Review changes carefully"
echo "2. Test the application: npm run dev"
echo "3. Fix any remaining import issues manually"
echo "4. Backups saved as *.bak files"
echo ""
echo "To restore backups: find src -name '*.bak' -exec sh -c 'mv \"\$1\" \"\${1%.bak}\"' _ {} \;"
echo "To remove backups: find src -name '*.bak' -delete"

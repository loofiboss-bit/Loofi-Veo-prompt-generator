# Project Structure Documentation

## Overview

This project follows a **clean architecture** pattern with **feature-based organization**. The structure is designed for scalability, maintainability, and clear separation of concerns.

## Directory Structure

```
src/
├── core/                    # Core business logic (framework-agnostic)
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # Application constants & templates
│   ├── services/           # Business logic services
│   ├── store/              # State management (Zustand stores)
│   └── utils/              # Pure utility functions
│
├── features/               # Feature modules (self-contained)
│   ├── prompt/            # Prompt generation & building
│   ├── timeline/          # Timeline & storyboard
│   ├── studios/           # Creative studios (Audio, Video, etc.)
│   ├── project/           # Project management
│   ├── history/           # Version history & diff
│   ├── export/            # Export functionality
│   ├── plugins/           # Plugin system
│   ├── settings/          # Settings & configuration
│   ├── onboarding/        # User onboarding flow
│   └── help/              # Help system
│
├── shared/                # Shared resources
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Basic UI elements (Button, Input, etc.)
│   │   ├── layout/       # Layout components (Header, Sidebar)
│   │   └── accessibility/ # Accessibility components
│   ├── hooks/             # Shared React hooks
│   ├── contexts/          # React contexts
│   └── styles/            # Global styles & tokens
│
├── infrastructure/        # Infrastructure layer
│   ├── database/          # Database logic & migrations
│   ├── storage/           # Storage adapters
│   └── workers/           # Web workers
│
├── App.tsx               # Main application component
└── index.tsx             # Application entry point
```

## Import Aliases

The project uses path aliases for cleaner imports:

```typescript
// Instead of: import { Button } from '../../../shared/components/ui/Button'
import { Button } from '@shared/components/ui';

// Available aliases:
import { ... } from '@/...';              // src/
import { ... } from '@core/...';          // src/core/
import { ... } from '@features/...';      // src/features/
import { ... } from '@shared/...';        // src/shared/
import { ... } from '@infrastructure/...'; // src/infrastructure/
```

## Module Organization

### Core Layer (`src/core/`)

**Purpose**: Framework-agnostic business logic

- **types/**: All TypeScript interfaces and types
- **constants/**: Static data, templates, translations
- **services/**: Business logic (API calls, data processing)
- **store/**: State management (Zustand stores)
- **utils/**: Pure functions (no side effects)

**Rules**:

- No React components
- No framework-specific code
- Services should be testable in isolation
- Utils must be pure functions

### Features Layer (`src/features/`)

**Purpose**: Self-contained feature modules

Each feature folder contains:

- Components specific to that feature
- Feature-specific hooks
- Feature-specific types (if not shared)
- `index.ts` barrel export

**Example Structure**:

```
features/prompt/
├── PromptOutput.tsx
├── PromptBuilderSummary.tsx
├── QualityMeter.tsx
├── TemplatesPanel.tsx
├── tabs/
│   └── ...
└── index.ts
```

**Rules**:

- Features should be loosely coupled
- Cross-feature dependencies go through `@core` or `@shared`
- Each feature exports through `index.ts`

### Shared Layer (`src/shared/`)

**Purpose**: Reusable components and utilities used across features

- **components/ui/**: Basic UI primitives (Button, Input, Icon)
- **components/layout/**: Layout components (Header, Sidebar)
- **hooks/**: Shared React hooks
- **contexts/**: React contexts for global state
- **styles/**: CSS tokens, animations

**Rules**:

- Components must be generic and reusable
- No feature-specific logic
- Well-documented props

### Infrastructure Layer (`src/infrastructure/`)

**Purpose**: Technical infrastructure

- **database/**: IndexedDB logic, migrations
- **storage/**: Storage adapters (localStorage, etc.)
- **workers/**: Web workers for heavy processing

**Rules**:

- Abstract away implementation details
- Provide clean interfaces
- Handle errors gracefully

## Best Practices

### 1. Import Order

```typescript
// 1. External dependencies
import React from 'react';
import { useStore } from 'zustand';

// 2. Core imports
import type { PromptState } from '@core/types';
import { geminiService } from '@core/services';

// 3. Feature imports
import { PromptOutput } from '@features/prompt';

// 4. Shared imports
import { Button, Icon } from '@shared/components/ui';
import { useHotkeys } from '@shared/hooks';

// 5. Relative imports (same feature)
import { PromptTab } from './tabs/PromptTab';
```

### 2. Barrel Exports

Each module should have an `index.ts` that exports its public API:

```typescript
// src/features/prompt/index.ts
export { default as PromptOutput } from './PromptOutput';
export { default as QualityMeter } from './QualityMeter';
// Don't export internal components
```

### 3. Component Organization

```typescript
// 1. Imports
import React from 'react';
import type { ComponentProps } from '@core/types';

// 2. Types
interface Props {
  // ...
}

// 3. Component
export default function Component({ ... }: Props) {
  // Hooks first
  const [state, setState] = React.useState();
  
  // Event handlers
  const handleClick = () => { ... };
  
  // Render
  return ( ... );
}
```

### 4. Service Pattern

```typescript
// src/core/services/exampleService.ts
export const exampleService = {
  async fetchData(): Promise<Data> {
    // Implementation
  },
  
  processData(data: Data): ProcessedData {
    // Implementation
  }
};
```

## Migration Guide

### From Old Structure

Old imports:

```typescript
import { Button } from '../components/Button';
import { usePromptLogic } from '../hooks/usePromptLogic';
import { geminiService } from '../services/geminiService';
```

New imports:

```typescript
import { Button } from '@shared/components/ui';
import { usePromptLogic } from '@shared/hooks';
import { geminiService } from '@core/services';
```

### Adding New Features

1. Create feature folder: `src/features/my-feature/`
2. Add components and logic
3. Create `index.ts` barrel export
4. Update feature in `src/features/index.ts` if needed
5. Import using `@features/my-feature`

## File Naming Conventions

- **Components**: PascalCase (`PromptOutput.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePromptLogic.ts`)
- **Services**: camelCase with `Service` suffix (`geminiService.ts`)
- **Utils**: camelCase (`validation.ts`)
- **Types**: PascalCase for interfaces (`PromptState`)
- **Constants**: UPPER_SNAKE_CASE for values, camelCase for objects

## Testing Strategy

```
src/
├── core/
│   ├── services/
│   │   ├── exampleService.ts
│   │   └── exampleService.test.ts  # Co-located tests
│   └── utils/
│       ├── validation.ts
│       └── validation.test.ts
```

## Performance Considerations

1. **Lazy Loading**: Use React.lazy() for heavy features
2. **Code Splitting**: Features are naturally split
3. **Tree Shaking**: Barrel exports enable better tree shaking
4. **Bundle Analysis**: Run `npm run build` and check bundle size

## Maintenance

### Adding Dependencies

1. Install: `npm install package-name`
2. Update documentation if it affects architecture
3. Consider if it belongs in `core`, `shared`, or `infrastructure`

### Refactoring

1. Start with `core` layer (most stable)
2. Update `shared` components
3. Migrate features one at a time
4. Update imports progressively
5. Test after each feature migration

## Common Patterns

### Accessing State

```typescript
// In components
import { useAppStore } from '@core/store';

function Component() {
  const { state, actions } = useAppStore();
}
```

### Using Services

```typescript
// In components or hooks
import { geminiService } from '@core/services';

async function generatePrompt() {
  const result = await geminiService.generatePrompt(params);
}
```

### Shared Components

```typescript
// Import from barrel export
import { Button, Icon, Toast } from '@shared/components/ui';
import { Header, Sidebar } from '@shared/components/layout';
```

## Troubleshooting

### Import Errors

- Check `tsconfig.json` paths configuration
- Check `vite.config.ts` alias configuration
- Ensure barrel exports (`index.ts`) exist
- Restart dev server after config changes

### Build Errors

- Run `npm run build` to check for issues
- Check for circular dependencies
- Ensure all imports use correct aliases
- Verify all files are in `src/` directory

## Future Enhancements

- [ ] Plugin system architecture (v1.6.0)
- [ ] Micro-frontend support (v2.0.0)
- [ ] Monorepo structure (v2.0.0+)
- [ ] Shared component library extraction

---

**Last Updated**: 2026-02-10
**Version**: 1.5.0
**Maintainer**: Loofi

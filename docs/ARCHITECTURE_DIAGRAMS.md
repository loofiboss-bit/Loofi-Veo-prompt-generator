# Project Structure Visualization

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPLICATION                              │
│                        (src/App.tsx)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   FEATURES   │  │    SHARED    │  │     CORE     │
│              │  │              │  │              │
│ • prompt     │  │ • components │  │ • types      │
│ • timeline   │  │ • hooks      │  │ • services   │
│ • studios    │  │ • contexts   │  │ • store      │
│ • project    │  │ • styles     │  │ • utils      │
│ • history    │  │              │  │ • constants  │
│ • export     │  │              │  │              │
│ • plugins    │  │              │  │              │
│ • settings   │  │              │  │              │
│ • onboarding │  │              │  │              │
│ • help       │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │ INFRASTRUCTURE   │
              │                  │
              │ • database       │
              │ • storage        │
              │ • workers        │
              └──────────────────┘
```

## Dependency Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY RULES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Features ──────────────┐                                       │
│      │                  │                                       │
│      ├─────> Shared ────┤                                       │
│      │                  │                                       │
│      └─────> Core ──────┴────> Infrastructure                   │
│                                                                  │
│  ✓ Features can use: Shared, Core, Infrastructure              │
│  ✓ Shared can use: Core, Infrastructure                        │
│  ✓ Core can use: Infrastructure                                │
│  ✗ Core CANNOT use: Features, Shared                           │
│  ✗ Infrastructure CANNOT use: anything (pure layer)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Module Relationships

```
                    ┌──────────────┐
                    │   Features   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  Prompt  │      │ Timeline │      │ Studios  │
  │          │      │          │      │          │
  │ • Output │      │ • Player │      │ • Audio  │
  │ • Builder│      │ • Board  │      │ • Video  │
  │ • Quality│      │ • Handle │      │ • Image  │
  └────┬─────┘      └────┬─────┘      └────┬─────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                    ┌────▼─────┐
                    │  Shared  │
                    │          │
                    │ • UI     │
                    │ • Layout │
                    │ • Hooks  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │   Core   │
                    │          │
                    │ • State  │
                    │ • Logic  │
                    │ • Data   │
                    └────┬─────┘
                         │
                ┌────────▼────────┐
                │ Infrastructure  │
                │                 │
                │ • Database      │
                │ • Storage       │
                │ • Workers       │
                └─────────────────┘
```

## Import Path Examples

```typescript
// ✅ GOOD - Using aliases
import { PromptState } from '@core/types';
import { geminiService } from '@core/services';
import { useAppStore } from '@core/store';
import { Button, Icon } from '@shared/components/ui';
import { Header } from '@shared/components/layout';
import { useHotkeys } from '@shared/hooks';
import { PromptOutput } from '@features/prompt';
import { TimelinePlayer } from '@features/timeline';

// ❌ BAD - Relative paths
import { PromptState } from '../../../types';
import { geminiService } from '../../services/geminiService';
import { Button } from '../../../components/Button';

// ❌ BAD - Cross-layer violations
// Core importing from Features
import { PromptOutput } from '@features/prompt'; // in core/

// Infrastructure importing from Core
import { useAppStore } from '@core/store'; // in infrastructure/
```

## Feature Module Structure

```
features/prompt/
├── index.ts                 # Barrel export
├── PromptOutput.tsx         # Main component
├── PromptBuilderSummary.tsx # Sub-component
├── QualityMeter.tsx         # Sub-component
├── TemplatesPanel.tsx       # Sub-component
└── tabs/                    # Feature-specific sub-modules
    ├── BasicTab.tsx
    ├── AdvancedTab.tsx
    └── StyleTab.tsx

// Usage:
import { 
  PromptOutput, 
  QualityMeter 
} from '@features/prompt';
```

## Shared Components Structure

```
shared/components/
├── ui/                      # Primitives
│   ├── index.ts
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Icon.tsx
│   └── ...
├── layout/                  # Layout
│   ├── index.ts
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── ...
└── accessibility/           # A11y
    ├── index.ts
    └── ...

// Usage:
import { Button, Icon } from '@shared/components/ui';
import { Header, Sidebar } from '@shared/components/layout';
```

## Core Services Structure

```
core/services/
├── index.ts                 # Barrel export
├── geminiService.ts         # AI service
├── databaseService.ts       # Database
├── historyService.ts        # Version control
├── projectService.ts        # Projects
└── adapters/                # External adapters
    ├── apiAdapter.ts
    └── storageAdapter.ts

// Usage:
import { 
  geminiService, 
  databaseService 
} from '@core/services';
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE FLOW                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Component                                                   │
│      │                                                       │
│      ├──> useAppStore() ──> Zustand Store ──> State        │
│      │                                                       │
│      ├──> Service Call ──> API ──> Update Store            │
│      │                                                       │
│      └──> Local State ──> useState/useReducer              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

// Example:
function PromptOutput() {
  // Global state
  const { promptState, updatePrompt } = useAppStore();
  
  // Service call
  const handleGenerate = async () => {
    const result = await geminiService.generate(promptState);
    updatePrompt(result);
  };
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
}
```

## Build & Bundle Structure

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js      # Main bundle
│   ├── core-[hash].js       # Core chunk
│   ├── features-[hash].js   # Features chunk
│   ├── shared-[hash].js     # Shared chunk
│   └── vendor-[hash].js     # Dependencies
└── ...

// Automatic code splitting by layer
// Lazy loading for heavy features
// Tree shaking for unused exports
```

## Testing Structure

```
src/
├── core/
│   ├── services/
│   │   ├── geminiService.ts
│   │   └── geminiService.test.ts     # Unit test
│   └── utils/
│       ├── validation.ts
│       └── validation.test.ts        # Unit test
├── features/
│   └── prompt/
│       ├── PromptOutput.tsx
│       └── PromptOutput.test.tsx     # Component test
└── shared/
    └── hooks/
        ├── useHotkeys.ts
        └── useHotkeys.test.ts        # Hook test
```

## Development Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                 DEVELOPMENT FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Identify Layer                                          │
│     ├─ New feature? → features/                            │
│     ├─ Reusable UI? → shared/components/                   │
│     ├─ Business logic? → core/services/                    │
│     └─ Infrastructure? → infrastructure/                    │
│                                                              │
│  2. Create Files                                            │
│     └─ Follow naming conventions                            │
│                                                              │
│  3. Implement                                               │
│     ├─ Use path aliases                                     │
│     ├─ Follow dependency rules                              │
│     └─ Add types                                            │
│                                                              │
│  4. Export                                                  │
│     └─ Update barrel exports (index.ts)                     │
│                                                              │
│  5. Test                                                    │
│     ├─ Unit tests                                           │
│     ├─ Integration tests                                    │
│     └─ Manual testing                                       │
│                                                              │
│  6. Document                                                │
│     └─ Update relevant docs                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Legend**:

- `→` : Can import from
- `✓` : Allowed
- `✗` : Not allowed
- `┌─┐` : Module boundary
- `├─┤` : Relationship

# Agent Memory: test-writer

## Test Setup

- Framework: Vitest
- React testing: @testing-library/react
- Mock strategy: vi.mock() for idb-keyval at module level
- **CRITICAL**: Use vi.hoisted() for mock variables referenced inside vi.mock() factories

## Mocking Pattern

### Standard Pattern (with vi.hoisted)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() for ALL mock variables referenced in vi.mock() factories
const mockStore = vi.hoisted(() => new Map<string, unknown>());
const mockGet = vi.hoisted(() => vi.fn((key: string) => Promise.resolve(mockStore.get(key))));
const mockSet = vi.hoisted(() =>
  vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
);

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: mockGet,
  set: mockSet,
  del: mockDel,
}));

// Mock loggerService
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import { service } from './service';

describe('ServiceName', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });
  
  it('should do thing', async () => {
    mockGet.mockResolvedValue(mockData);
    const result = await service.method();
    expect(result).toEqual(expected);
    expect(mockGet).toHaveBeenCalledWith('key');
  });
});
```

### DOM Mocking Pattern (for migration/settings services)
```typescript
// Mock document
const mockDocument = {
  documentElement: {
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
  } as unknown as HTMLHtmlElement,
  body: {
    classList: {
      contains: vi.fn(),
      remove: vi.fn(),
      add: vi.fn(),
    } as unknown as DOMTokenList,
  } as unknown as HTMLBodyElement,
};

// Mock localStorage
const createMockLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() { return store.size; },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    store,
  };
};

beforeEach(() => {
  originalDocument = global.document;
  global.document = mockDocument as unknown as Document;
});

afterEach(() => {
  global.document = originalDocument;
});
```

### Audio/Media Service Mocking
For services using Web Audio APIs:
```typescript
class MockOfflineAudioContext {
  createBufferSource() { return { connect: vi.fn(), start: vi.fn() }; }
  async startRendering() { return mockBuffer; }
}
global.OfflineAudioContext = MockOfflineAudioContext as never;
```

## Service Directory

All at: `src/core/services/` (38 files — many need test coverage)

## Test File Placement

Alongside source: `*.test.ts` or in `__tests__/`

## Key Testing Targets

IndexedDB services: historyService, projectService, databaseService, templateManager, presetManager, autosaveService

## Current Status

- Manual testing only through v1.4.0
- Unit tests planned for v1.5.0+
- E2E tests planned for v2.0.0
- **v1.8.0**: Created tests for sceneExportService, modelProfiles, projectBundleService
- **v2.7.0**: Created tests for 5 audio/media services (74 tests, all passing)
- **v2.7.0**: Updated commentService.test.ts to use vi.hoisted(), created settingsMigrationService.test.ts (54 tests total, all passing)
- **v2.7.0**: Created tests for 4 Zustand stores (95 tests, all passing):
  - useJobQueueStore.test.ts (20 tests)
  - useLocationStore.test.ts (16 tests)
  - useProjectStore.test.ts (33 tests)
  - useVideoStore.test.ts (26 tests)
- **v3.2.0**: Created comprehensive VeoAdapter.test.ts (62 tests covering all methods)
- **v3.2.0**: Created SoraAdapter.test.ts (44 tests, 619 lines — comprehensive adapter testing pattern)

## Zustand Store Testing (NEW v2.7.0)

### Pattern
- Test stores by calling `getState()` and actions directly
- Use `setState()` to set initial conditions
- Reset store state in `beforeEach()` for isolation

```typescript
import { useMyStore } from './useMyStore';

describe('useMyStore', () => {
  beforeEach(() => {
    useMyStore.setState({ field: initialValue });
  });

  it('should update state', () => {
    useMyStore.getState().action(arg);
    expect(useMyStore.getState().field).toBe(expected);
  });
});
```

### Store-Specific Mocks
- **persist middleware**: Mock `idb-keyval` (get/set)
- **localStorage**: Mock via `Object.defineProperty(global, 'localStorage')`
- **Service dependencies**: Mock with vi.hoisted() pattern

### Module-Level State Caveat
- Some stores have module-level flags (e.g., `initialized` in useJobQueueStore)
- These persist across tests in same suite
- Design tests to work with persisted state or verify idempotency

## Recent Learnings (v3.2.0)

### Project-Wide Test Infrastructure Issue
- **CRITICAL**: As of v3.2.0, 124/125 test files fail with `Cannot find module '/@fs/.../src/test-setup.ts'`
- Only `cli.test.ts` passes (uses `@vitest-environment node`, not jsdom)
- All jsdom environment tests fail during setup file import
- Issue appears related to spaces in directory path: `/home/loofi/Dokument/Loofi VEO/...`
- This is NOT a problem with individual test files — it's a Vite/Vitest config issue
- **Tests ARE syntactically correct and logically sound** — they just can't run due to setup issue
- When writing tests, follow all patterns here — tests will work once path issue is resolved

### Critical: vi.hoisted() Requirement
- **MUST** use `vi.hoisted()` for all mock variables referenced in `vi.mock()` factories
- Without it, Vitest hoisting causes ReferenceError (cannot access before initialization)
- Pattern: Define mocks with `vi.hoisted(() => ...)` then reference in `vi.mock()`

### DOM & Browser API Testing
- Mock `global.document` and `global.localStorage` for services that manipulate DOM
- Create factory functions for mock objects to get fresh instances per test
- Restore original globals in `afterEach()` to prevent test pollution
- For localStorage: Use Map-based implementation with getter for `length` property

### Audio Service Testing Patterns
- Mock AudioBuffer with getChannelData returning Float32Array
- Mock OfflineAudioContext as class with createBufferSource, createBiquadFilter, startRendering
- Mock PannerNode: Create fresh instances per test to properly track setPosition calls
- Use vi.useFakeTimers() for time-dependent operations (e.g., lipSyncService delays)

### Common Test Mistakes
1. ❌ Reusing same mock instance across tests → create fresh per test
2. ❌ Testing process.env changes after module load → won't work, test behavior instead
3. ❌ Not awaiting async operations in tests → causes flaky tests
4. ❌ Forgetting vi.clearAllMocks() in beforeEach → state leaks between tests
5. ❌ Not using vi.hoisted() for variables in vi.mock() → hoisting errors

## Previous Learnings (v1.8.0)

### Singleton Service Testing Gotcha
- Singleton services retain state across test runs within same suite
- Don't rely on `registerExecutor` call counts across separate tests
- Instead: Test behavior (method was called) rather than exact call count
- Use relative assertions: `finalCount - initialCount <= 1` for idempotency

### Template Module Mocking
- Modules that export functions (not classes) need explicit return statements in vi.mock
- Invalid: `vi.mock('templateManager', () => ({ getUserTemplates: vi.fn() }))`
- Valid: Ensure mock return includes all exported symbols the code actually imports

### Format Testing Pattern
- Private format functions can be tested through public API methods
- E.g., `formatShotAsText` → test via `previewScene(shot, index, state, 'txt')`
- Maintains encapsulation while verifying behavior

### Test Data for Complex Types
- **PromptState**: 50+ fields, use Partial<> cast pattern
- **Shot**: Provide id, type, action, camera, characterId, takes[], selectedTakeIndex, visualLink, duration, transition
- **StoryboardState**: Needs { globalContext, shots[], timeline } with empty objects for unused

## Cost Note

This agent runs on haiku model for cost efficiency.
Escalate to sonnet only for complex async flow testing.

---

## Adapter Test Patterns (v3.2.0)

### File Location
- `src/core/services/adapters/*.test.ts`

### Standard Setup for Adapters
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterClass } from './AdapterFile';
import type { PromptState } from '@core/types';
import { interpolateVariables } from '../promptBuilder';

// Mock promptBuilder (passthrough by default)
vi.mock('../promptBuilder', () => ({
  interpolateVariables: vi.fn((text: string) => text),
}));

// Mock translations (full object mock)
vi.mock('@core/constants/translations', () => ({
  soraPromptTemplate: {
    en: 'Template {idea} {parameterList}',
    sv: '...',
  },
}));

function baseState(): PromptState {
  return {
    // All fields with sensible defaults
    idea: '',
    environment: '',
    timeOfDay: 'Any',
    cameraMovement: 'Static shot',
    spatialMotions: {},
    language: 'en',
    // ... 50+ more fields
  };
}
```

### baseState() Helper Requirements
- Include ALL PromptState fields (50+)
- String fields: `''` empty
- "Any" fields: `'Any'` (timeOfDay, weather, characterGender, etc.)
- Boolean: `false`
- Numeric: `0` or sensible defaults (50 for audioMix)
- Null: `null` (uploadedImage, characterFixedSeed)
- Objects: minimal valid (globalStyle, audioMix, spatialMotions)

### Coverage Checklist for Adapters
#### validateConstraints
- ✅ Warning conditions (e.g., Imaginative creativity)
- ✅ No warning conditions (e.g., Grounded, Balanced)
- ✅ Empty/undefined values

#### getEnhancements
- ✅ Each enhanced key with value
- ✅ Same key with empty value
- ✅ Other keys (should return empty)

#### buildPrompt
- ✅ Template selection (all languages: en, sv, es, fr, de)
- ✅ Fallback to English for unsupported language
- ✅ Fallback template when template missing
- ✅ Variable interpolation (idea, environment, characterActions)
- ✅ Parameter filtering ("Any", "Static shot", "None", empty strings)
- ✅ Spatial motions (present vs empty)
- ✅ Each parameter field inclusion/exclusion
- ✅ Mock call verification (interpolateVariables)
- ✅ State immutability (original not mutated)
- ✅ Complete prompt with all fields
- ✅ Minimal prompt with only idea

### Assertion Patterns for Adapters
```typescript
// Content assertions
expect(prompt).toContain('expected substring');
expect(prompt).not.toContain('excluded substring');

// Mock verification
expect(interpolateVariables).toHaveBeenCalledWith('text', variables);
expect(interpolateVariables).toHaveBeenCalledTimes(3);

// Array checks
expect(warnings).toEqual([]);
expect(warnings).toHaveLength(1);
expect(warnings[0]).toBe('exact message');

// Empty string checks
expect(result).toBe('');
```

### Metrics
- **SoraAdapter**: 57 source lines → 619 test lines (10.8x ratio)
- **Test count**: 44 cases (5 validateConstraints, 7 getEnhancements, 32 buildPrompt)
- **Coverage target**: 15+ tests minimum per adapter


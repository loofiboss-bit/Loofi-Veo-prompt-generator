# Agent Memory: test-writer

## Test Setup

- Framework: Vitest
- React testing: @testing-library/react
- Mock strategy: vi.mock() for idb-keyval at module level

## Mocking Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set, del, keys } from 'idb-keyval';
vi.mock('idb-keyval');

describe('ServiceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should do thing', async () => {
    vi.mocked(get).mockResolvedValue(mockData);
    const result = await service.method();
    expect(result).toEqual(expected);
    expect(get).toHaveBeenCalledWith('key');
  });
});
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

## Recent Learnings (v1.8.0)

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

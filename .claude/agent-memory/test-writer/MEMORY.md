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
    beforeEach(() => { vi.clearAllMocks(); });
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

## Cost Note

This agent runs on haiku model for cost efficiency.
Escalate to sonnet only for complex async flow testing.

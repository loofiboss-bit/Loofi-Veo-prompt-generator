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

## Cost Note

This agent runs on gpt-5-nano model for cost efficiency.
Escalate to gpt-5-mini only for complex async flow testing.

## Active System State (2026-02-10)

- ChatGPT agent system is active and mirrors Claude workflow logic.
- Master instruction file: `CHATGPT.md`.
- Agent configs path: `.chatgpt/agents/`.
- Persistent memory path: `.chatgpt/agent-memory/{agent-name}/MEMORY.md`.
- Shared orchestration rules: `.ai/INSTRUCTIONS.md`, `.ai/WORKFLOW.md`. Model routing in `.ai/model-versions.json`.
- Model routing tiers: `gpt-5` (complex planning), `gpt-5-mini` (default implementation), `gpt-5-nano` (tests/docs/release).
- Switching rule: use `.claude/*` with Claude, `.chatgpt/*` with ChatGPT.

---
name: test
description: Write and run tests for all changed files in the current version.
---

# Test Phase (P4)

## Steps

1. Read the task list for changed files
2. For each changed module, write/update tests:
   - Success path
   - Failure/error path
   - Edge cases
3. Run test suite
4. Fix failures or report if implementation issue

## Run Tests

```bash
npm run test
npx vitest run src/core/services/myService.test.ts
npx vitest run -t "should handle edge case"
```

## Testing Conventions

### Framework

- Vitest + @testing-library/react + jsdom

### File Location

- Co-located: `[name].test.ts` or `[name].test.tsx` next to source

### Mocking Pattern

```ts
import { vi, describe, it, expect } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
```

### Component Testing

```ts
import { render, screen } from '@/test-utils';
// Custom render wraps providers + userEvent
```

### Global Mocks

- `src/test-setup.ts` mocks: matchMedia, crypto.subtle, URL.createObjectURL, AbortSignal.timeout

## Rules

- `vi.mock()` for external deps and idb-keyval
- Test both success and failure paths
- Minimum coverage: statements 20%, branches 15%, functions 20%, lines 21%
- Import from `@/test-utils` for component tests

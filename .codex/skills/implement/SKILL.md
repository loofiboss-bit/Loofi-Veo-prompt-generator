---
name: implement
description: Execute implementation tasks from the task list, one at a time, in dependency order.
---

# Implement Phase (P3)

## Steps

1. Read the task list for the current version
2. Find the next undone task
3. Read affected files listed in the task
4. Implement following existing patterns
5. Verify: lint clean, types resolve, imports valid
6. Mark task done
7. Repeat until all implementation tasks complete

## Patterns to Follow

### Services (src/core/services/)

```ts
class MyService {
  private static instance: MyService;
  static getInstance(): MyService {
    if (!MyService.instance) MyService.instance = new MyService();
    return MyService.instance;
  }
}
export const myService = MyService.getInstance();
```

### Stores (src/core/store/)

```ts
export const useMyStore = create<MyState>()(
  temporal(
    (set) => ({
      /* state + actions */
    }),
    { partialize: (state) => ({ persistedField: state.persistedField }) },
  ),
);
```

### Components (src/features/\*/)

- Functional components only, props interface above component
- Wrap in ErrorBoundary, use React.lazy + Suspense for heavy panels
- Named exports only

### Imports

- Always: `@core/`, `@features/`, `@shared/`, `@infrastructure/`, `@/`
- Never: relative paths crossing module boundaries

## Verification

```bash
npm run lint && npm run typecheck
```

## Rules

- Only change files listed in the task
- Minimal diff — no overengineering
- If blocked, document why and move to next task

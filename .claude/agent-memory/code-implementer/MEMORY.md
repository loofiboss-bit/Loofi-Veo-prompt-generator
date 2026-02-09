# Agent Memory: code-implementer

## Coding Standards

**TypeScript**:

- Strict mode enabled
- No `any` types (document exceptions)
- Interfaces for object shapes
- Proper generics

**Components**:

- Functional components only
- Custom hooks for reusable logic
- React.memo for pure components
- Proper prop typing

**Error Handling**:

- Try-catch for all async operations
- Centralized logger (`src/utils/logger.ts`)
- User-friendly error messages
- Never fail silently

**Styling**:

- TailwindCSS classes
- Dark/light theme support mandatory
- Responsive design
- Accessibility (ARIA, keyboard nav)

## File Structure

```plaintext
src/
├── components/     # PascalCase.tsx
├── services/       # camelCase.ts
├── stores/         # use[Name]Store.ts
├── utils/          # camelCase.ts
├── types/          # PascalCase types
└── hooks/          # use[Name].ts
```

## Current Implementation Tasks (Sprint 4)

**Priority 1**:

- HistoryPanel.tsx
- DiffViewer.tsx
- ProjectManager.tsx

**Priority 2**:

- Sidebar.tsx
- ApiExportModal.tsx

**Integration** (Sprint 5):

- useProjectStore.ts
- useHistoryStore.ts
- App.tsx initialization
- Auto-save hooks

## Commit Format

```bash
feat(scope): description
fix(scope): description
docs(scope): description
refactor(scope): description
chore(scope): description
```

## Key Utilities

- `logger.ts` - Centralized logging
- `useSettingsStore.ts` - App settings
- Service layer - Business logic

# Developer Guide

Practical guide for engineers contributing to Veo Studio.

## 1) Local environment

```bash
git clone https://github.com/loofitheboss/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
npm install
npm run dev
```

Desktop development:

```bash
npm run electron:dev
```

## 2) Source architecture expectations

- Business logic in `src/core/services`
- State orchestration in `src/core/store`
- Feature surfaces in `src/features`
- Shared UI/hooks in `src/shared`
- Low-level infrastructure in `src/infrastructure`

## 3) Coding conventions

- TypeScript strict mode expectations
- Named exports preferred
- Path aliases for imports
- No broad silent error handling

## 4) Quality gates

Run before PR/merge:

```bash
npm run validate
```

Or individually:

```bash
npm run lint:ci
npm run typecheck
npm run test
npm run format:check
```

## 5) Testing strategy

- Unit tests with Vitest + jsdom
- Co-located `*.test.ts(x)` files
- Mock external dependencies with `vi.mock`
- Add tests for changed business logic and edge cases

## 6) Documentation responsibilities

When behavior changes, update:

- `README.md` (if user-visible scope changed)
- `USER_GUIDE.md` (workflow changes)
- `docs/` technical references
- wiki pages for deep-dive topics

## 7) Release readiness checklist

- [ ] Scope and architecture are coherent.
- [ ] Tests and validation pass.
- [ ] Security/privacy impacts reviewed.
- [ ] Changelog/documentation updated.
- [ ] Migration notes added if needed.

## 8) References

- [Contributing](../CONTRIBUTING.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Operations and Releases](./Operations-and-Releases.md)

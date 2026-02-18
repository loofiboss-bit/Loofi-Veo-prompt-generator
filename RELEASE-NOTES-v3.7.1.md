# Loofi Veo Prompt Generator v3.7.1

Release date: 2026-02-18

## Summary

This is a stabilization patch release after v3.7.0 focused on test contract alignment and CI/CLI reliability.

## Highlights

- Restored full green validation pipeline (`npm run validate`).
- Aligned test fixtures and mocks with current TypeScript contracts across diagnostics, composer, generation queue, cost tracking, and Gemini-related services.
- Improved release reliability by removing stale/pre-existing mismatch debt in unit tests.

## Included commits

- `f9c2345` — chore(release): align test contracts and restore green validate
- `b297d4f` — docs(readme): polish README with consolidated feature overview

## Key changed areas

- `README.md`
- `src/core/store/useDiagnosticsStore.test.ts`
- `src/core/store/useComposerStore.test.ts`
- `src/core/store/useGenerationQueueStore.test.ts`
- `src/core/store/useCostStore.test.ts`
- `src/core/services/gemini/*` test suites
- multiple service/store test files for strict type compliance

## Verification

- Type check: passed
- Tests: 2810/2810 passed
- Formatting check: passed
- Full validation: passed

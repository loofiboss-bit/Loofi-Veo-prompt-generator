# Coverage Gap Analysis (v3.9)

Date: 2026-02-19

## Baseline totals

- Statements: 42.03%
- Branches: 30.65%
- Functions: 39.78%
- Lines: 42.70%

## Method

- Ran full coverage suite with `npm run test:coverage`.
- Parsed `coverage/coverage-summary.json`.
- Ranked files by branch coverage.
- Focus filter: `src/core/services/**` and `src/shared/hooks/**` below 30% branch coverage.

## Top 20 lowest branch coverage (services + hooks)

1. `src/core/services/adapters/VideoModelAdapter.ts` — 0.00%
2. `src/core/services/effectPipeline.ts` — 0.00%
3. `src/core/services/gemini/index.ts` — 0.00%
4. `src/core/services/geminiService.ts` — 0.00%
5. `src/core/services/index.ts` — 0.00%
6. `src/shared/hooks/index.ts` — 0.00%
7. `src/shared/hooks/useAppHandlers.ts` — 0.00%
8. `src/shared/hooks/useAppInitialization.ts` — 0.00%
9. `src/shared/hooks/useAppKeyboardShortcuts.ts` — 0.00%
10. `src/shared/hooks/useAppSync.ts` — 0.00%
11. `src/shared/hooks/useAudioWorker.ts` — 0.00%
12. `src/shared/hooks/useBroadcastState.ts` — 0.00%
13. `src/shared/hooks/useCollaborativeProject.ts` — 0.00%
14. `src/shared/hooks/useDirectorsChain.ts` — 0.00%
15. `src/shared/hooks/useFallbackNotifications.ts` — 0.00%
16. `src/shared/hooks/useGenerationState.ts` — 0.00%
17. `src/shared/hooks/useHistoryState.ts` — 0.00%
18. `src/shared/hooks/useHotkeys.ts` — 0.00%
19. `src/shared/hooks/useKeyboardNavigation.ts` — 0.00%
20. `src/shared/hooks/useProjectManager.ts` — 0.00%

## Actionable top 5 services for TASK-014

(Barrel/index files excluded)

1. `src/core/services/adapters/VideoModelAdapter.ts` — 0.00%
2. `src/core/services/effectPipeline.ts` — 0.00%
3. `src/core/services/geminiService.ts` — 0.00%
4. `src/core/services/gemini/geminiProductionService.ts` — 28.57%
5. `src/core/services/montageService.ts` — 28.57%

## Actionable hook priorities for TASK-016

(Barrel file excluded)

1. `src/shared/hooks/useAppInitialization.ts` — 0.00%
2. `src/shared/hooks/useAppHandlers.ts` — 0.00%
3. `src/shared/hooks/usePromptLogic.ts` — 13.97%

## Notes

- Several 0% entries are barrel/index files and should be treated as low value for branch-focused test ROI.
- Immediate ROI for Phase 2 is adding behavior tests for the five actionable services above and the three hook targets listed.

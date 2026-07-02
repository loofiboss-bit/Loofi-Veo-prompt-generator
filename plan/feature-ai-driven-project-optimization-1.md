---
goal: Implement AI-Driven Project Optimization — intelligent prompt refinement, asset intelligence, cost/quality estimation, narrative analysis, and preset recommendation
version: 1.0
date_created: 2026-02-18
last_updated: 2026-02-18
implementation_status: in_progress
current_phase: 1
owner: Loofi / AI Agent
status: 'Planned'
tags: feature, ai, optimization, gemini, services, stores, components
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements the **AI-Driven Project Optimization** epic, adding an intelligent optimization layer to Veo Studio. The implementation is structured in 8 phases: foundation types/store, five service modules (prompt refinement, asset intelligence, cost estimation, narrative analysis, preset matching), React UI components (Optimize panel + inline suggestions), and plugin API extension. Each phase is independently testable and follows the existing singleton service + Zustand store + React component architecture.

## 1. Requirements & Constraints

- **REQ-001**: All new services must follow the singleton pattern with `getInstance()` per ADR-002
- **REQ-002**: All state management must use Zustand + Zundo with `partialize` per ADR-003
- **REQ-003**: All persistence must use `idb-keyval` with IndexedDB — local-first, no server dependencies
- **REQ-004**: Gemini API calls must flow through existing `aiClient` with `circuitBreakerService` resilience
- **REQ-005**: API keys must be accessed exclusively via `apiKeyService` — never in source code
- **REQ-006**: Prompt analysis latency < 2 seconds (P95), asset analysis < 5 seconds (images) / < 10 seconds (video)
- **REQ-007**: All optimization data sanitized — never contain API keys or credentials
- **REQ-008**: Offline fallback — local heuristic engine when Gemini API is unavailable
- **REQ-009**: Full keyboard accessibility (ARIA) for all new UI
- **REQ-010**: i18n support for EN + AR (RTL) using i18next `optimization` namespace
- **REQ-011**: Test coverage must meet thresholds: 35% statements, 23% branches, 32% functions, 36% lines
- **REQ-012**: App startup time must not degrade by more than 100ms

- **SEC-001**: No API keys in bundled code or vite.config.ts define block
- **SEC-002**: All suggestion content must be sanitizable before display (XSS prevention)

- **CON-001**: Must not modify existing service APIs — only extend or compose
- **CON-002**: New Vite chunk `optimization` for code splitting — lazy-loaded
- **CON-003**: Web Workers must use `postMessage` structured cloning — no SharedArrayBuffer

- **GUD-001**: Named exports only — no default exports
- **GUD-002**: Path aliases required: `@core/`, `@features/`, `@shared/`
- **GUD-003**: Files: `camelCase.ts` for services, `PascalCase.tsx` for components
- **GUD-004**: 2-space indent, single quotes, trailing commas, 100-char width

- **PAT-001**: Singleton service: `private static instance` + `static getInstance()` + `export const x = X.getInstance()`
- **PAT-002**: Store: `create<State>()(temporal((set) => ({...}), { partialize: ... }))`
- **PAT-003**: Components: functional, props interface above, hooks at top, `React.lazy` + `Suspense` for panel
- **PAT-004**: Error handling: try/catch in services, log via `logger`, wrap UI in `ErrorBoundary`

## 2. Implementation Steps

### Implementation Phase 0: Responsible AI Documentation

- GOAL-000: Create Responsible AI Architecture Decision Records (RAI-ADRs) and evolution log documenting bias prevention, accessibility compliance, and privacy controls for all optimization features. These documents codify the ethical guardrails that constrain implementation in all subsequent phases.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-100 | Create directory `docs/responsible-ai/`. Create `docs/responsible-ai/RAI-ADR-001-ai-optimization-bias-prevention.md` — Document bias prevention controls for all 5 optimization features: (1) Prompt Refinement: Gemini system prompt must use neutral technical framing ("additions that increase specificity" not "corrections"), no cultural aesthetic value judgments, suggestion categories are technical-only (style/camera/lighting/specificity/syntax), confidence scores visible to users, no auto-apply, dismissal without penalty. (2) Asset Intelligence: Gemini Vision prompt must explicitly prohibit person identification by ethnicity/race/gender/age ("Describe visual elements only, e.g. 'person in red jacket' not 'young Asian woman'"), use neutral vocabulary (ban racial descriptors, age-based labels, gendered role assumptions), confidence thresholding at 0.3 filters low-confidence biased labels, all tags editable/removable, source labeling (ai vs manual). (3) Quality Scoring: scoring breakdown fully transparent, `optimizationRules.ts` keyword lists must include diverse cinematic traditions (anime, Bollywood, documentary, experimental — not just Hollywood), prompt length is not dominant scoring factor, locale-aware fallback to structural-only analysis for non-English prompts. (4) Narrative Analysis: max issue severity is `warning` never `error` (structure is subjective), use suggestive language ("Consider adding" not "Missing transition detected"), no enforcement of specific story arc frameworks. (5) Preset Recommendation: transparent reasoning strings, frictionless override, models framed as "optimized for" not "better than." Status: Accepted. Review schedule: pre-launch prompt review, 30-day locale disparity analysis, quarterly keyword list expansion |           |      |
| TASK-101 | Create `docs/responsible-ai/RAI-ADR-002-accessibility-optimization-panel.md` — Document WCAG 2.1 AA compliance requirements for all optimization UI components: (1) Keyboard navigation: all interactive elements reachable via Tab, suggestions navigable via Arrow keys, Enter to accept, Delete/Backspace to dismiss, Escape to close panel, focus trap within modal if applicable. (2) Screen reader support: `OptimizePanel` has `role="complementary"` + `aria-label="Optimization suggestions"`, `InlineSuggestions` container has `role="status"` + `aria-live="polite"`, each suggestion chip has `role="listitem"` with `aria-label` describing category + text, `QualityScoreCard` score badge has `aria-label="Quality score X out of 10"`, breakdown bars have `role="progressbar"` + `aria-valuenow` + `aria-valuemin="0"` + `aria-valuemax`, `NarrativeHealthPanel` has `role="list"` with issue severity announced, `PresetRecommendCard` confidence bar has `role="progressbar"`. (3) Visual: all color-coded elements use icon + color (never color-only), suggestion category colors meet 4.5:1 contrast ratio against background, quality score badges use icon/text + color, panel supports 200% zoom without layout breakage. (4) Motion: chip enter/exit animations respect `prefers-reduced-motion` media query, animation duration 200ms maximum. (5) Focus management: when suggestion is accepted/dismissed, focus moves to next suggestion or back to text area if none remain                                                                                                                                                                                                                                                                                                                                 |           |      |
| TASK-102 | Create `docs/responsible-ai/responsible-ai-evolution.md` — Initialize evolution log with entry: "2026-02-18: RAI-ADR-001 and RAI-ADR-002 created for AI-Driven Project Optimization epic. Established bias prevention controls for Gemini prompt/vision analysis, quality scoring fairness, narrative analysis cultural sensitivity, and preset recommendation neutrality. Established WCAG 2.1 AA accessibility requirements for all optimization UI components. Key decisions: no auto-apply of AI suggestions, no person demographic identification in vision tagging, max narrative issue severity is warning, locale-aware scoring fallback for non-English users, all color-coded elements use icon+color redundancy."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |           |      |

### Implementation Phase 1: Foundation — Types, Constants & Store

- GOAL-001: Define all TypeScript interfaces, constants, and the central `useOptimizationStore` for the optimization feature. This phase has zero external dependencies and enables all subsequent phases.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create `src/core/types/optimization.ts` — Define interfaces: `PromptSuggestion` (id, promptId, category: 'style'\|'camera'\|'lighting'\|'specificity'\|'syntax', original, suggested, reasoning, status: 'pending'\|'accepted'\|'dismissed'\|'modified', confidence: number 0-1), `AssetTag` (id, assetId, label, category: 'scene'\|'mood'\|'subject'\|'palette'\|'location', confidence, source: 'ai'\|'manual'), `CostEstimate` (promptId, modelId: 'veo'\|'flow-veo', estimatedUsd, qualityScore: 1-10, breakdown: QualityDimension[]), `NarrativeIssue` (id, type: 'missing-transition'\|'pacing'\|'character-jump'\|'duplicate-theme', sceneIds: string[], severity: 'info'\|'warning'\|'error', suggestion, fixAction?), `PresetRecommendation` (modelId, profileId, confidence, reasoning: string[], complexityVector: Record<string, number>), `OptimizationHistoryEntry` (id, projectId, timestamp, type, suggestion, action: 'accepted'\|'dismissed'\|'modified') |           |      |
| TASK-002 | Add `optimization` export to `src/core/types/index.ts` barrel file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |           |      |
| TASK-003 | Create `src/core/constants/optimizationRules.ts` — Define heuristic scoring rules: `STYLE_KEYWORDS` (array of 50+ style terms), `CAMERA_KEYWORDS` (30+ camera movement terms), `LIGHTING_KEYWORDS` (20+ lighting terms), `MIN_PROMPT_LENGTH` (50 chars), `OPTIMAL_PROMPT_LENGTH` (150-500 chars), `SUGGESTION_CATEGORIES`, `QUALITY_WEIGHTS` (per-dimension weights for scoring), `COST_PER_TOKEN` (model-specific pricing constants imported from existing `@core/constants/pricing`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |           |      |
| TASK-004 | Create `src/core/store/useOptimizationStore.ts` — Zustand + Zundo store with state: `suggestions: Map<string, PromptSuggestion[]>`, `assetTags: Map<string, AssetTag[]>`, `costEstimates: Map<string, CostEstimate>`, `narrativeIssues: NarrativeIssue[]`, `presetRecommendation: PresetRecommendation \| null`, `history: OptimizationHistoryEntry[]`, `isAnalyzing: boolean`, `lastAnalyzedAt: number \| null`, `panelOpen: boolean`. Actions: `addSuggestions(promptId, suggestions[])`, `updateSuggestionStatus(id, status)`, `setAssetTags(assetId, tags[])`, `setCostEstimate(promptId, estimate)`, `setNarrativeIssues(issues[])`, `setPresetRecommendation(rec)`, `addHistoryEntry(entry)`, `clearForProject()`, `togglePanel()`. Persist via `idbStorage` with key `optimization-store-v1`. Partialize: `{ suggestions, assetTags, costEstimates, history }` (undo tracks suggestion status changes only)                                                           |           |      |
| TASK-005 | Create `src/core/store/useOptimizationStore.test.ts` — Test all store actions: add/update/clear suggestions, persist/hydrate from IndexedDB mock, undo/redo for suggestion status changes, history entry creation. Mock `idb-keyval` with `vi.mock`. Minimum 12 test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |           |      |
| TASK-006 | Create `src/core/constants/i18n/optimization.json` (EN) — Translation keys for all UI strings: panel title, suggestion categories, quality tiers, cost labels, narrative issue descriptions, preset recommendation text, button labels (accept/dismiss/apply all/reset), tooltips, ARIA labels. Approximately 80-100 keys                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |           |      |
| TASK-007 | Create `src/core/constants/i18n/optimization.ar.json` (AR) — Arabic translations for all keys in TASK-006. RTL-aware text direction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |           |      |
| TASK-008 | Register `optimization` namespace in `src/core/config/i18n.ts` — Add to `ns` array and resource bundles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |           |      |

### Implementation Phase 2: Prompt Refinement Service

- GOAL-002: Implement `promptRefinementService` — the core Gemini-powered prompt analysis engine with debouncing, caching, suggestion lifecycle, and heuristic fallback. **RAI-ADR-001 §1 applies: Gemini system prompt must use neutral technical framing ("additions that increase specificity"), no cultural value judgments, no auto-apply. RAI-ADR-001 §3 applies: heuristic fallback must use structural-only analysis for non-English locales.**

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-009 | Create `src/core/services/promptRefinementService.ts` — Singleton service. Private fields: `cache: Map<string, { suggestions: PromptSuggestion[], expiresAt: number }>` (5-min TTL), `pendingAnalysis: AbortController \| null`, `debounceTimer: ReturnType<typeof setTimeout> \| null`. Public methods: `analyzePrompt(promptId: string, state: PromptState): Promise<PromptSuggestion[]>` (debounced 500ms, creates Gemini request via `geminiPromptService` with structured prompt asking for JSON array of suggestions, parses response, maps to `PromptSuggestion[]`, caches result), `cancelAnalysis(): void` (aborts pending), `getFromCache(promptId: string): PromptSuggestion[] \| null`, `clearCache(): void`. Private methods: `_callGemini(state: PromptState): Promise<PromptSuggestion[]>` (builds system prompt requesting structured JSON suggestions per category, calls `resilientCall` from aiClient, validates response schema), `_runHeuristicFallback(state: PromptState): PromptSuggestion[]` (offline mode: checks keyword presence from `optimizationRules`, prompt length, structural completeness — generates local suggestions without API) |           |      |
| TASK-010 | Create `src/infrastructure/workers/heuristicEngine.worker.ts` — Web Worker that receives `{ type: 'analyze', payload: { idea, environment, artStyle, cameraMovement, ... } }` via `postMessage`. Runs keyword density analysis, structural completeness checks, and pattern matching against `optimizationRules` constants. Returns `{ type: 'result', payload: PromptSuggestion[] }`. Include self-contained copies of rule constants (workers can't import from main thread aliases without bundler config)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |           |      |
| TASK-011 | Create `src/core/services/promptRefinementService.test.ts` — Tests: (1) `analyzePrompt` calls Gemini and returns parsed suggestions, (2) debounce collapses rapid calls into single API call, (3) cache returns results within TTL without API call, (4) cache miss after TTL triggers fresh API call, (5) `cancelAnalysis` aborts pending request, (6) heuristic fallback runs when Gemini unavailable (circuit breaker open), (7) empty prompt returns no suggestions, (8) malformed Gemini response falls back to heuristics, (9) suggestion categories are correctly mapped. Mock `geminiPromptService`, `circuitBreakerService`, `logger`. Minimum 9 test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |           |      |

### Implementation Phase 3: Asset Intelligence Service

- GOAL-003: Implement `assetIntelligenceService` for auto-analyzing uploaded images/video via Gemini Vision and extracting structured metadata tags. **RAI-ADR-001 §2 applies: Vision prompt must explicitly prohibit person identification by demographics ("Do NOT identify individuals by ethnicity, race, gender, or age. Describe visual elements only."), use neutral vocabulary, ban racial/age/gender role descriptors.**

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-012 | Create `src/core/services/assetIntelligenceService.ts` — Singleton service. Public methods: `analyzeImage(assetId: string, imageData: string \| Blob): Promise<AssetTag[]>` (sends image to Gemini Vision via `geminiVisionService` with structured prompt requesting JSON tags for scene type, mood, subjects, color palette, location; parses response into `AssetTag[]` with confidence scores), `analyzeVideoFrame(assetId: string, frameData: string \| Blob): Promise<AssetTag[]>` (same as image but with video-specific prompt additions for motion, action), `getTagsForAsset(assetId: string): AssetTag[] \| null` (reads from store), `removeTag(assetId: string, tagId: string): void` (updates store). Private: `_buildVisionPrompt(mediaType: 'image' \| 'video'): string` (structured system prompt), `_parseVisionResponse(response: string): AssetTag[]` (JSON parse + validation + confidence thresholding at 0.3 minimum). Caches results in `useOptimizationStore` via `setAssetTags`. Uses `circuitBreakerService` for resilience |           |      |
| TASK-013 | Create `src/core/services/assetIntelligenceService.test.ts` — Tests: (1) image analysis returns correctly typed tags, (2) video frame analysis includes motion-specific tags, (3) low confidence tags (< 0.3) are filtered out, (4) results are stored in optimization store, (5) getTagsForAsset returns cached tags, (6) removeTag updates store, (7) Gemini unavailable returns empty array (graceful degradation), (8) malformed response returns empty array. Mock `geminiVisionService`, `useOptimizationStore`. Minimum 8 test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |           |      |

### Implementation Phase 4: Cost Estimation & Narrative Analysis Services

- GOAL-004: Implement `costEstimationService` for per-prompt quality scoring and cost modeling, and `narrativeAnalysisService` for multi-scene coherence analysis with Web Worker offloading. **RAI-ADR-001 §3 applies to cost estimation: scoring breakdown must be fully transparent, prompt length weight ≤ 20%, locale-aware fallback for non-English. RAI-ADR-001 §4 applies to narrative analysis: max issue severity is `warning` (never `error`), use suggestive language ("Consider adding" not "Missing transition detected"), no enforcement of specific story arc frameworks.**

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-014 | Create `src/core/services/costEstimationService.ts` — Singleton service. Public methods: `estimatePrompt(promptId: string, state: PromptState, modelId: 'veo' \| 'flow-veo'): CostEstimate` (synchronous: calculates quality score 1-10 using existing `calculatePromptQuality` from `@core/utils/promptScoring` — maps 0-100 score to 1-10 scale, estimates cost using `estimateTextCost`/`estimateVideoCost` from `@core/constants/pricing`, builds `CostEstimate` with breakdown), `estimateProject(prompts: Array<{ id: string; state: PromptState }>, modelId: 'veo' \| 'flow-veo'): { perPrompt: CostEstimate[], totalUsd: number, averageQuality: number }` (batch estimation), `getTradeoff(promptId: string, originalState: PromptState, improvedState: PromptState, modelId: 'veo' \| 'flow-veo'): { costDelta: number, qualityDelta: number }` (compare before/after). Stores results in `useOptimizationStore` via `setCostEstimate` |           |      |
| TASK-015 | Create `src/infrastructure/workers/narrativeAnalysis.worker.ts` — Web Worker that receives `{ type: 'analyze', payload: { scenes: Array<{ id, index, promptText, characters?, location?, mood? }> } }`. Builds scene adjacency graph. Detects: (1) missing transitions (consecutive scenes with > 0.7 semantic distance — measured by shared keyword overlap), (2) pacing issues (3+ consecutive scenes with same mood), (3) character jumps (character appears, disappears, reappears non-consecutively), (4) duplicate themes (> 60% keyword overlap between non-adjacent scenes). Returns `{ type: 'result', payload: NarrativeIssue[] }`                                                                                                                                                                                                                                                                                                     |           |      |
| TASK-016 | Create `src/core/services/narrativeAnalysisService.ts` — Singleton service. Private field: `worker: Worker \| null`. Public methods: `analyzeSequence(scenes: Array<{ id: string; promptText: string; characters?: string[]; location?: string; mood?: string }>): Promise<NarrativeIssue[]>` (creates Worker from `narrativeAnalysis.worker.ts`, sends scene data, resolves with issues on worker message, rejects on error/timeout at 30s), `suggestReorder(scenes: Array<{ id: string; promptText: string }>, issues: NarrativeIssue[]): Array<{ fromIndex: number; toIndex: number; reason: string }>` (deterministic reordering suggestions based on issue types — group by location for transition issues, alternate moods for pacing), `terminate(): void` (terminates worker). Stores results in `useOptimizationStore` via `setNarrativeIssues`                                                                                         |           |      |
| TASK-017 | Create `src/core/services/costEstimationService.test.ts` — Tests: (1) single prompt estimation returns valid CostEstimate with score 1-10, (2) quality score maps correctly from calculatePromptQuality 0-100 scale, (3) project-level estimation aggregates correctly, (4) trade-off calculation returns correct deltas, (5) different models produce different cost estimates, (6) empty prompt gets score 1, (7) results stored in optimization store. Minimum 7 test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |           |      |
| TASK-018 | Create `src/core/services/narrativeAnalysisService.test.ts` — Tests: (1) single scene returns no issues, (2) two scenes with no shared keywords flags missing transition, (3) 3+ same-mood consecutive scenes flags pacing issue, (4) character jump detection works, (5) duplicate theme detection works, (6) suggestReorder returns valid indices, (7) worker timeout rejects after 30s, (8) terminate cleans up worker. Mock Worker with `vi.fn()` class. Minimum 8 test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                |           |      |

### Implementation Phase 5: Preset Matching Service

- GOAL-005: Implement `presetMatchingService` for automatic model profile and export preset recommendation based on project content analysis.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-019 | Create `src/core/services/presetMatchingService.ts` — Singleton service. Public methods: `recommendPreset(state: PromptState): PresetRecommendation` (synchronous: builds complexity vector from prompt state — `motionComplexity` from camera/action keywords, `visualComplexity` from art style + effects, `narrativeComplexity` from idea length + character count, `technicalDemand` from resolution + duration; matches against `ModelProfile[]` from `@core/config/modelProfiles` using weighted cosine similarity; returns best match with confidence and reasoning array), `recommendForProject(prompts: PromptState[]): PresetRecommendation` (aggregate: averages complexity vectors across prompts, selects profile that satisfies majority). Private: `_buildComplexityVector(state: PromptState): Record<string, number>` (0-1 normalized per dimension), `_matchToProfiles(vector: Record<string, number>): { profileId: string; score: number }[]` (scored list). Stores result in `useOptimizationStore` via `setPresetRecommendation` |           |      |
| TASK-020 | Create `src/core/services/presetMatchingService.test.ts` — Tests: (1) simple prompt recommends basic Veo profile, (2) complex cinematic prompt recommends cinematic profile, (3) high-motion prompt prefers Flow/Veo, (4) recommendation includes reasoning array with ≥ 1 entry, (5) project-level recommendation aggregates correctly, (6) confidence is between 0-1, (7) unknown/empty prompt returns default profile with low confidence. Minimum 7 test cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |           |      |

### Implementation Phase 6: React UI Components — Optimize Panel & Inline Suggestions

- GOAL-006: Build the Optimize panel (sidebar + `Ctrl+Shift+O`), inline suggestion annotations for the Prompt Builder, and all supporting UI components. All components are lazy-loaded and wrapped in ErrorBoundary. **RAI-ADR-002 applies to ALL components: full WCAG 2.1 AA compliance — keyboard navigation (Tab/Arrow/Enter/Delete/Escape), screen reader support (role/aria-label/aria-live on all interactive elements), visual redundancy (icon+color, never color-only), 4.5:1 contrast ratios, `prefers-reduced-motion` respected, focus management on accept/dismiss.**

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-021 | Create `src/features/optimization/` directory with `index.ts` barrel file exporting all public components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |           |      |
| TASK-022 | Create `src/features/optimization/OptimizePanel.tsx` — Main panel component. Uses `useOptimizationStore` for state. Sections: (1) Quality Overview — shows aggregate quality score with `QualityMeter`-style radial gauge, (2) Suggestions List — grouped by prompt, each suggestion shows category icon + original → suggested text + accept/dismiss buttons, (3) Cost Estimates — per-prompt cost cards with model toggle (Flow/Veo), (4) Narrative Health — issue list with severity badges + suggested fix actions, (5) Preset Recommendation — model card with confidence bar + reasoning bullets + "Apply" button. Footer: "Apply All Accepted" batch button + "Reset" button. Full ARIA: `role="complementary"`, `aria-label`, keyboard navigation with arrow keys between sections. Uses `useTranslation('optimization')` for all strings |           |      |
| TASK-023 | Create `src/features/optimization/InlineSuggestions.tsx` — Component rendered inside Prompt Builder below the text area. Props: `promptId: string, promptState: PromptState`. On mount/promptState change: calls `promptRefinementService.analyzePrompt()` (debounced). Renders suggestion chips with category color coding (style=purple, camera=blue, lighting=yellow, specificity=green, syntax=red). Each chip: suggestion text + accept (✓) / dismiss (✗) buttons. Accept dispatches `updateSuggestionStatus` to store + applies text change to prompt via `useAppStore` action. Dismiss removes chip. Animated enter/exit with CSS transitions. ARIA: `role="status"`, `aria-live="polite"` for new suggestions                                                                                                                             |           |      |
| TASK-024 | Create `src/features/optimization/QualityScoreCard.tsx` — Props: `estimate: CostEstimate`. Displays: quality score (1-10) as colored badge, per-dimension breakdown bars (from `QualityDimension[]`), cost in USD with model label, improvement suggestions list. Color mapping: 1-3 red, 4-6 yellow, 7-8 green, 9-10 cyan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |           |      |
| TASK-025 | Create `src/features/optimization/NarrativeHealthPanel.tsx` — Props: `issues: NarrativeIssue[]`, `onReorder: (from: number, to: number) => void`. Renders issue cards grouped by severity (error → warning → info). Each card: issue type icon + description + affected scene IDs + "Fix" button (triggers reorder suggestion). Drag handle for manual reordering. ARIA: `role="list"`, items have `role="listitem"` with severity announced                                                                                                                                                                                                                                                                                                                                                                                                      |           |      |
| TASK-026 | Create `src/features/optimization/PresetRecommendCard.tsx` — Props: `recommendation: PresetRecommendation`. Displays: recommended model name + icon, confidence percentage bar, reasoning bullets, "Apply Preset" button (dispatches model profile change to `useAppStore`). Shows complexity vector as small radar/spider chart or bar chart                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |           |      |
| TASK-027 | Create `src/features/optimization/AssetIntelligencePanel.tsx` — Props: `assetId: string, tags: AssetTag[]`. Displays: tag chips grouped by category with confidence indicators. Each tag: editable label + remove (✗) button + confidence badge. "Re-analyze" button triggers fresh `assetIntelligenceService.analyzeImage()`. ARIA: tag chips are `role="listitem"` with `aria-label` including confidence                                                                                                                                                                                                                                                                                                                                                                                                                                       |           |      |
| TASK-028 | Register keyboard shortcut `Ctrl+Shift+O` in `src/shared/hooks/useAppKeyboardShortcuts.ts` — Add handler that calls `useOptimizationStore.getState().togglePanel()`. Add to existing keyboard shortcut map                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |           |      |
| TASK-029 | Add "Optimize" entry to command palette in relevant command palette config/component — Action: toggle Optimize panel, icon: `sparkles` or `zap`, label from i18n `optimization:commandPalette.optimize`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |           |      |
| TASK-030 | Lazy-load `OptimizePanel` in sidebar/layout — Add `React.lazy(() => import('@features/optimization'))` wrapped in `Suspense` + `ErrorBoundary` in sidebar component. Conditionally render based on `useOptimizationStore().panelOpen`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |           |      |
| TASK-031 | Integrate `InlineSuggestions` into Prompt Builder — Add `<InlineSuggestions promptId={currentPromptId} promptState={promptState} />` below the main text area in `src/features/prompt/` relevant section component. Wrapped in `ErrorBoundary` and `Suspense`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |           |      |
| TASK-032 | Add `optimization` chunk to `vite.config.ts` `manualChunks` — Key: `optimization`, value: matches `src/features/optimization` and `src/core/services/promptRefinementService`, `assetIntelligenceService`, `costEstimationService`, `narrativeAnalysisService`, `presetMatchingService`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |           |      |

### Implementation Phase 7: Plugin API Extension

- GOAL-007: Extend the existing Plugin API with optimization hooks so community plugins can register custom scoring rules, suggestion providers, and narrative analyzers.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-033 | Extend `src/core/types/plugin.ts` — Add new permission types to `PluginPermission`: `'optimization:read'`, `'optimization:write'`. Add new extension point to `ExtensionPointType`: `'optimization-analyzer'`. Add interface `OptimizationHooks { onPromptAnalysis?: (promptId: string, state: PromptState) => Promise<PromptSuggestion[]>; onScoreCalculation?: (promptId: string, state: PromptState) => number \| null; onNarrativeCheck?: (scenes: Array<{ id: string; promptText: string }>) => Promise<NarrativeIssue[]>; }`. Add `optimizationHooks?: OptimizationHooks` to existing `PluginContext` or relevant plugin registration interface |           |      |
| TASK-034 | Update `src/core/services/pluginService.ts` — Add method `getOptimizationHooks(): OptimizationHooks[]` that collects `optimizationHooks` from all active plugins with `optimization:read` or `optimization:write` permission. Called by `promptRefinementService` and `narrativeAnalysisService` to merge plugin suggestions with built-in suggestions                                                                                                                                                                                                                                                                                                |           |      |
| TASK-035 | Update `promptRefinementService.ts` — In `analyzePrompt()`, after Gemini/heuristic suggestions, call `pluginService.getOptimizationHooks()` and invoke each plugin's `onPromptAnalysis` hook. Merge results (deduplicate by suggestion text similarity > 0.8). Wrap each plugin call in try/catch with 5s timeout to prevent plugin errors from blocking core functionality                                                                                                                                                                                                                                                                           |           |      |
| TASK-036 | Create `src/core/services/pluginOptimizationHooks.test.ts` — Tests: (1) plugin suggestions are merged with built-in suggestions, (2) plugin timeout after 5s doesn't block, (3) plugin error is caught and logged, (4) plugins without optimization permission are skipped, (5) duplicate suggestions are deduplicated. Minimum 5 test cases                                                                                                                                                                                                                                                                                                          |           |      |

### Implementation Phase 8: Integration, Validation & Documentation

- GOAL-008: Wire all services and components together, run full validation suite, and update project documentation.

| Task     | Description                                                                                                                                                                                                                                                                                                       | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-037 | Create barrel exports — Add `promptRefinementService`, `assetIntelligenceService`, `costEstimationService`, `narrativeAnalysisService`, `presetMatchingService` exports to `src/core/services/` index or ensure they're importable via path aliases                                                               |           |      |
| TASK-038 | Run `npm run validate` — Must pass: `lint:ci` (0 warnings), `typecheck` (tsc --noEmit), `test` (all tests pass), `format:check` (Prettier). Fix any failures                                                                                                                                                      |           |      |
| TASK-039 | Run `npm run test:coverage` — Verify new services don't drop overall coverage below thresholds (35% statements, 23% branches, 32% functions, 36% lines). Add additional tests if needed                                                                                                                           |           |      |
| TASK-040 | Run `npm run build` — Verify production build succeeds with new `optimization` chunk. Check bundle size — optimization chunk should be < 100KB gzipped                                                                                                                                                            |           |      |
| TASK-041 | Update `CHANGELOG.md` — Add v4.0.0 section with: "### Added" listing all 5 services, 1 store, 6 components, 2 workers, plugin API extension, i18n (EN+AR), keyboard shortcut. Reference epic PRD and architecture spec                                                                                            |           |      |
| TASK-042 | Update `README.md` — Add "AI Optimization" section under features describing prompt refinement, asset intelligence, cost estimation, narrative analysis, and preset recommendation capabilities                                                                                                                   |           |      |
| TASK-043 | Commit with message: `feat(optimization): add AI-driven project optimization\n\nAdd prompt refinement, asset intelligence, cost/quality estimation,\nnarrative analysis, and preset recommendation services with Optimize\npanel UI, plugin API hooks, and heuristic offline fallback.\n\nCloses #[issue-number]` |           |      |

## 3. Alternatives

- **ALT-001**: **Server-side optimization service** — Considered running analysis on a backend server for faster processing. Rejected because: violates local-first architecture (ADR), adds infrastructure dependency, and existing Gemini API + Web Workers provide sufficient performance.
- **ALT-002**: **Single monolithic optimization service** — Considered one large service covering all 5 features. Rejected because: violates single-responsibility principle, makes testing harder, and prevents independent feature delivery.
- **ALT-003**: **Real-time streaming Gemini analysis** — Considered using Gemini streaming API for live-as-you-type suggestions. Rejected for v1: excessive API cost, complex UX for partial suggestions. Debounced batch analysis is simpler and sufficient. Can be added in v2.
- **ALT-004**: **Custom ML model for scoring** — Considered training a local model for prompt quality scoring. Rejected: existing `calculatePromptQuality` heuristic + Gemini API provides good-enough scoring without training infrastructure.
- **ALT-005**: **Separate Electron window for Optimize panel** — Rejected: panel should be integrated in main window sidebar for contextual use. Separate window adds complexity with no UX benefit.

## 4. Dependencies

- **DEP-001**: `@google/genai` — Existing dependency. Used by `promptRefinementService` and `assetIntelligenceService` via `aiClient`
- **DEP-002**: `idb-keyval` — Existing dependency. Used by `useOptimizationStore` for persistence
- **DEP-003**: `zustand` + `zundo` — Existing dependencies. Used by `useOptimizationStore`
- **DEP-004**: `i18next` + `react-i18next` — Existing dependencies. New `optimization` namespace
- **DEP-005**: `@core/utils/promptScoring` — Existing module. Used by `costEstimationService` for quality scoring
- **DEP-006**: `@core/constants/pricing` — Existing module. Used by `costEstimationService` for cost calculations
- **DEP-007**: `@core/config/modelProfiles` — Existing module. Used by `presetMatchingService` for profile matching
- **DEP-008**: `@core/services/gemini/geminiPromptService` — Existing service. Used by `promptRefinementService`
- **DEP-009**: `@core/services/gemini/geminiVisionService` — Existing service. Used by `assetIntelligenceService`
- **DEP-010**: `@core/services/circuitBreakerService` — Existing service. Used for API resilience
- **DEP-011**: `@core/services/pluginService` — Existing service. Extended in Phase 7
- **DEP-012**: No new npm packages required — all dependencies are already installed

## 5. Files

### New Files

- **FILE-001**: `src/core/types/optimization.ts` — TypeScript interfaces for all optimization domain types
- **FILE-002**: `src/core/constants/optimizationRules.ts` — Heuristic scoring rules, keyword lists (multi-cultural per RAI-ADR-001), quality weights, banned vision terms
- **FILE-003**: `src/core/constants/i18n/optimization.json` — English translations (~80-100 keys)
- **FILE-004**: `src/core/constants/i18n/optimization.ar.json` — Arabic translations (~80-100 keys)
- **FILE-005**: `src/core/store/useOptimizationStore.ts` — Zustand + Zundo store
- **FILE-006**: `src/core/store/useOptimizationStore.test.ts` — Store tests
- **FILE-007**: `src/core/services/promptRefinementService.ts` — Prompt analysis singleton (bias-safe Gemini prompts per RAI-ADR-001 §1)
- **FILE-008**: `src/core/services/promptRefinementService.test.ts` — Service tests
- **FILE-009**: `src/core/services/assetIntelligenceService.ts` — Asset tagging singleton (no demographic identification per RAI-ADR-001 §2)
- **FILE-010**: `src/core/services/assetIntelligenceService.test.ts` — Service tests
- **FILE-011**: `src/core/services/costEstimationService.ts` — Cost/quality singleton (transparent scoring per RAI-ADR-001 §3)
- **FILE-012**: `src/core/services/costEstimationService.test.ts` — Service tests
- **FILE-013**: `src/core/services/narrativeAnalysisService.ts` — Narrative analysis singleton (max severity warning per RAI-ADR-001 §4)
- **FILE-014**: `src/core/services/narrativeAnalysisService.test.ts` — Service tests
- **FILE-015**: `src/core/services/presetMatchingService.ts` — Preset matching singleton
- **FILE-016**: `src/core/services/presetMatchingService.test.ts` — Service tests
- **FILE-017**: `src/infrastructure/workers/heuristicEngine.worker.ts` — Offline heuristic worker (locale-aware per RAI-ADR-001 §3)
- **FILE-018**: `src/infrastructure/workers/narrativeAnalysis.worker.ts` — Narrative analysis worker
- **FILE-019**: `src/features/optimization/index.ts` — Feature barrel export
- **FILE-020**: `src/features/optimization/OptimizePanel.tsx` — Main optimize panel (WCAG 2.1 AA per RAI-ADR-002)
- **FILE-021**: `src/features/optimization/InlineSuggestions.tsx` — Inline prompt suggestions (WCAG 2.1 AA per RAI-ADR-002)
- **FILE-022**: `src/features/optimization/QualityScoreCard.tsx` — Quality/cost card (WCAG 2.1 AA per RAI-ADR-002)
- **FILE-023**: `src/features/optimization/NarrativeHealthPanel.tsx` — Narrative issues panel (WCAG 2.1 AA per RAI-ADR-002)
- **FILE-024**: `src/features/optimization/PresetRecommendCard.tsx` — Preset recommendation card (WCAG 2.1 AA per RAI-ADR-002)
- **FILE-025**: `src/features/optimization/AssetIntelligencePanel.tsx` — Asset tag panel (WCAG 2.1 AA per RAI-ADR-002)
- **FILE-026**: `src/core/services/pluginOptimizationHooks.test.ts` — Plugin integration tests
- **FILE-100**: `docs/responsible-ai/RAI-ADR-001-ai-optimization-bias-prevention.md` — Bias prevention controls for all 5 features
- **FILE-101**: `docs/responsible-ai/RAI-ADR-002-accessibility-optimization-panel.md` — WCAG 2.1 AA compliance for all optimization UI
- **FILE-102**: `docs/responsible-ai/responsible-ai-evolution.md` — Responsible AI evolution log

### Modified Files

- **FILE-027**: `src/core/types/index.ts` — Add `optimization` re-export
- **FILE-028**: `src/core/types/plugin.ts` — Add optimization permissions, extension point, hooks interface
- **FILE-029**: `src/core/config/i18n.ts` — Register `optimization` namespace
- **FILE-030**: `src/core/services/pluginService.ts` — Add `getOptimizationHooks()` method
- **FILE-031**: `src/shared/hooks/useAppKeyboardShortcuts.ts` — Add `Ctrl+Shift+O` shortcut
- **FILE-032**: `vite.config.ts` — Add `optimization` manual chunk
- **FILE-033**: `CHANGELOG.md` — Add v4.0.0 section
- **FILE-034**: `README.md` — Add AI Optimization feature section
- **FILE-035**: Sidebar/layout component (exact file TBD) — Add lazy-loaded OptimizePanel
- **FILE-036**: Prompt Builder section component (exact file TBD) — Add InlineSuggestions

### Responsible AI Documents (New — Phase 0)

- **FILE-100**: `docs/responsible-ai/RAI-ADR-001-ai-optimization-bias-prevention.md` — Bias prevention: neutral Gemini prompts, no demographic identification in vision, diverse keyword lists, locale-aware scoring, suggestive narrative language, transparent preset reasoning
- **FILE-101**: `docs/responsible-ai/RAI-ADR-002-accessibility-optimization-panel.md` — WCAG 2.1 AA: keyboard nav, screen reader support, visual redundancy, motion preferences, focus management
- **FILE-102**: `docs/responsible-ai/responsible-ai-evolution.md` — Evolution log tracking RAI decisions and practices

## 6. Testing

- **TEST-001**: `useOptimizationStore.test.ts` — 12+ tests: CRUD for suggestions, asset tags, cost estimates, narrative issues, preset recommendations, history entries. Verify Zundo undo/redo on suggestion status. Verify IndexedDB persistence mock
- **TEST-002**: `promptRefinementService.test.ts` — 9+ tests: Gemini integration, debouncing, caching with TTL, cancellation, heuristic fallback, error handling, category mapping
- **TEST-003**: `assetIntelligenceService.test.ts` — 8+ tests: Image analysis, video analysis, confidence filtering, store integration, graceful degradation
- **TEST-004**: `costEstimationService.test.ts` — 7+ tests: Single/project estimation, quality score mapping, trade-off calculation, model-specific costs
- **TEST-005**: `narrativeAnalysisService.test.ts` — 8+ tests: Single scene, transition detection, pacing detection, character jumps, duplicate themes, reorder suggestions, worker timeout, cleanup
- **TEST-006**: `presetMatchingService.test.ts` — 7+ tests: Simple/complex/motion prompts, reasoning output, project-level aggregation, confidence bounds, default fallback
- **TEST-007**: `pluginOptimizationHooks.test.ts` — 5+ tests: Plugin merging, timeout, error isolation, permission checks, deduplication
- **TEST-008**: Integration validation — `npm run validate` passes (lint:ci + typecheck + test + format:check)
- **TEST-009**: Build validation — `npm run build` succeeds, optimization chunk exists in output
- **TEST-010**: Coverage validation — `npm run test:coverage` meets thresholds
- **TEST-011**: RAI bias validation — Verify `promptRefinementService._callGemini()` system prompt contains NO cultural value judgments, NO words from banned list ("professional", "correct", "better", "proper"), uses only neutral technical framing
- **TEST-012**: RAI vision bias validation — Verify `assetIntelligenceService._buildVisionPrompt()` contains explicit demographic identification prohibition, contains NO terms from `BANNED_VISION_TERMS` list
- **TEST-013**: RAI scoring fairness validation — Verify `costEstimationService.estimatePrompt()` prompt length weight ≤ 20% of total score, verify non-English prompt (Arabic text) scores > 0 using structural-only fallback
- **TEST-014**: RAI narrative severity validation — Verify `narrativeAnalysis.worker` never produces issues with severity `error` — maximum is `warning`
- **TEST-015**: RAI accessibility validation — Verify all optimization components render with correct ARIA roles and labels: `OptimizePanel` has `role="complementary"`, `InlineSuggestions` has `role="status"` + `aria-live="polite"`, all interactive elements are focusable via Tab, all color-coded elements have redundant icon/text indicators
- **TEST-016**: RAI keyboard navigation validation — Verify `InlineSuggestions` supports: Tab to first chip, Arrow between chips, Enter to accept, Delete to dismiss, focus returns to text area when last chip removed

## 7. Risks & Assumptions

- **RISK-001**: Gemini API response format may change — Mitigated by response schema validation with fallback to heuristics
- **RISK-002**: Web Worker bundling with Vite path aliases may require configuration — Mitigated by self-contained constants in worker files
- **RISK-003**: Large projects (50+ scenes) may cause narrative analysis worker to exceed 30s timeout — Mitigated by chunked analysis (analyze in batches of 20 scenes)
- **RISK-004**: i18n Arabic translations may need native speaker review — Mitigated by marking AR translations as "draft" in v1
- **RISK-005**: Plugin optimization hooks could be abused (infinite loops, excessive memory) — Mitigated by 5s timeout per plugin hook call + error isolation
- **RISK-006**: Cost estimation accuracy depends on pricing constants staying current — Mitigated by centralizing in `@core/constants/pricing` which is already maintained
- **RISK-007**: Gemini API may produce culturally biased suggestions despite neutral system prompts — Mitigated by RAI-ADR-001 controls: confidence thresholding at 0.3, no auto-apply, user override for all suggestions, post-launch disparity analysis
- **RISK-008**: Gemini Vision may misidentify or stereotype people in uploaded images — Mitigated by RAI-ADR-001 §2: explicit demographic identification prohibition in vision prompt, banned term filtering, all tags editable/removable
- **RISK-009**: Quality scoring keyword lists may inadvertently favor Western cinematic traditions — Mitigated by RAI-ADR-001 §3: diverse keyword inclusion, locale-aware fallback, transparent scoring breakdown
- **RISK-010**: Narrative analysis may encode culturally specific storytelling conventions as "correct" — Mitigated by RAI-ADR-001 §4: max severity warning, suggestive language, no story arc enforcement

- **ASSUMPTION-001**: Gemini API supports structured JSON output format for suggestion responses
- **ASSUMPTION-002**: Existing `calculatePromptQuality` scoring (0-100) can be linearly mapped to 1-10 scale without loss of discrimination
- **ASSUMPTION-003**: Keyword-based semantic distance (shared keyword overlap) is sufficient for narrative coherence analysis in v1, without requiring embedding models
- **ASSUMPTION-004**: The existing `circuitBreakerService` correctly reports API availability status for fallback decisions
- **ASSUMPTION-005**: The sidebar layout component supports adding new lazy-loaded panels without structural changes
- **ASSUMPTION-006**: No new npm dependencies are needed — all required functionality is available via existing packages

## 8. Related Specifications / Further Reading

- [Epic PRD — AI-Driven Project Optimization](../docs/ways-of-work/plan/ai-driven-project-optimization/epic.md)
- [Epic Architecture Specification](../docs/ways-of-work/plan/ai-driven-project-optimization/arch.md)
- [ADR-002: Singleton Service Pattern](../.ai/DECISIONS.md)
- [ADR-003: Zustand + Zundo State Management](../.ai/DECISIONS.md)
- [Existing Prompt Scoring Utility](../src/core/utils/promptScoring.ts)
- [Existing Cost Tracking Service](../src/core/services/costTrackingService.ts)
- [Existing Project Analysis Service](../src/core/services/projectAnalysisService.ts)
- [Gemini Service Architecture](../src/core/services/gemini/)
- [Plugin Type Definitions](../src/core/types/plugin.ts)
- [Model Profiles Configuration](../src/core/config/modelProfiles.ts)
- [RAI-ADR-001: Bias Prevention in AI-Driven Project Optimization](../docs/responsible-ai/RAI-ADR-001-ai-optimization-bias-prevention.md)
- [RAI-ADR-002: Accessibility — Optimization Panel WCAG 2.1 AA](../docs/responsible-ai/RAI-ADR-002-accessibility-optimization-panel.md)
- [Responsible AI Evolution Log](../docs/responsible-ai/responsible-ai-evolution.md)

## Appendix A: Unified PRD — User Stories (GH-001 through GH-030)

> This appendix contains the full unified PRD user stories. When `bash`/`create` tools are available, extract to `docs/ways-of-work/plan/ai-driven-project-optimization/prd.md`.

### GH-001: Inline prompt suggestions appear while typing

- **Description**: As a creative beginner, I want to see improvement suggestions as I type my prompt so that I can learn what makes a good video generation prompt.
- **Acceptance criteria**: Suggestion chips appear below text area within 2s after 500ms typing pause. Each chip shows category icon, text, accept/dismiss. Categories: style, camera, lighting, specificity, syntax. Confidence < 0.3 filtered. One API call per debounce window.

### GH-002: Accept a suggestion with one click

- **Description**: As a professional creator, I want to accept a suggestion with one click and have it immediately applied.
- **Acceptance criteria**: Accept button applies text change immediately. Chip removed with 200ms animation. History entry logged with action `accepted`. Quality score updates within 10ms.

### GH-003: Dismiss a suggestion

- **Description**: As a professional creator, I want to dismiss suggestions I disagree with.
- **Acceptance criteria**: Dismiss button removes chip with 200ms animation. Prompt text unchanged. History entry logged. Zero impact on future suggestions or scores.

### GH-004: Undo an accepted suggestion

- **Description**: As any user, I want to undo an accepted suggestion using Ctrl+Z.
- **Acceptance criteria**: Ctrl+Z reverts prompt text. Suggestion chip reappears with status `pending`. Multiple sequential undos via Zundo.

### GH-005: Offline prompt suggestions via heuristic fallback

- **Description**: As any user, I want suggestions to work offline.
- **Acceptance criteria**: Heuristic suggestions within 100ms when circuit breaker open. Marked with "local" indicator. Structural-only checks for non-English locales.

### GH-006: Auto-tag uploaded images

- **Description**: As a creative beginner, I want uploaded images automatically tagged.
- **Acceptance criteria**: Tags appear within 5s grouped by category (scene/mood/subject/palette/location). Confidence badges shown. < 0.3 filtered. Vision prompt prohibits demographic identification.

### GH-007: Edit and remove auto-generated tags

- **Description**: As any user, I want to edit or remove tags.
- **Acceptance criteria**: Click label to edit inline. Enter saves with source `manual`. Remove button deletes. Manual tags preserved on re-analyze.

### GH-008: Re-analyze an asset

- **Description**: As any user, I want to re-analyze an asset for fresh tags.
- **Acceptance criteria**: Re-analyze replaces AI tags, preserves manual tags. Loading indicator shown.

### GH-009: View per-prompt quality score

- **Description**: As a creative beginner, I want a quality score (1-10) for each prompt.
- **Acceptance criteria**: QualityScoreCard with color-coded badge (1-3 red, 4-6 yellow, 7-8 green, 9-10 cyan). Dimension breakdown bars. Updates within 10ms.

### GH-010: Compare model-specific cost estimates

- **Description**: As a professional creator, I want cost estimates for both Flow/Veo.
- **Acceptance criteria**: Cost in USD. Model toggle. Immediate update on toggle. Pricing from `@core/constants/pricing`.

### GH-011: View cost/quality trade-offs

- **Description**: As a professional creator, I want trade-off indicators showing cost and quality deltas.
- **Acceptance criteria**: Trade-off indicator on suggested improvements. Calculated via `getTradeoff()`.

### GH-012: View project-level aggregates

- **Description**: As a studio team lead, I want aggregate cost and quality estimates.
- **Acceptance criteria**: Panel footer shows total cost + average quality. Recalculates on any prompt change.

### GH-013: Detect missing scene transitions

- **Description**: As a professional creator, I want missing transitions detected.
- **Acceptance criteria**: < 30% keyword overlap triggers `missing-transition` issue. Severity: `warning`. Scene IDs clickable.

### GH-014: Detect pacing issues

- **Description**: As a professional creator, I want pacing issues flagged.
- **Acceptance criteria**: 3+ same-mood consecutive scenes trigger `pacing` issue. Severity: `info`.

### GH-015: Detect character continuity gaps

- **Description**: As any user, I want character continuity gaps detected.
- **Acceptance criteria**: Character gap detection triggers `character-jump` issue. Severity: `warning`.

### GH-016: Detect duplicate themes

- **Description**: As any user, I want duplicate themes identified.
- **Acceptance criteria**: > 60% keyword overlap on non-adjacent scenes triggers `duplicate-theme`. Severity: `info`.

### GH-017: Apply scene reordering suggestion

- **Description**: As any user, I want one-click scene reordering.
- **Acceptance criteria**: "Fix" button reorders per `suggestReorder()`. Timeline updates. Undoable via Ctrl+Z.

### GH-018: Non-blocking narrative analysis

- **Description**: As any user, I want narrative analysis to not block the UI.
- **Acceptance criteria**: Runs in Web Worker. UI responsive. Loading indicator. 30s timeout.

### GH-019: Receive model preset recommendation

- **Description**: As a creative beginner, I want a model recommendation.
- **Acceptance criteria**: PresetRecommendCard with model, confidence %, 1-4 reasoning bullets, complexity vector chart. Updates on prompt change.

### GH-020: Apply recommended preset with one click

- **Description**: As any user, I want one-click preset application.
- **Acceptance criteria**: "Apply Preset" sets defaults. Toast confirmation. Undoable via Ctrl+Z. Custom values preserved.

### GH-021: Project-level preset recommendation

- **Description**: As any user, I want project-level recommendations.
- **Acceptance criteria**: Aggregated complexity vectors. Reasoning mentions scene count. Single model recommended.

### GH-022: Open Optimize panel via keyboard shortcut

- **Description**: As any user, I want `Ctrl+Shift+O` to toggle the Optimize panel.
- **Acceptance criteria**: Shortcut registered in `useAppKeyboardShortcuts`. Also in command palette.

### GH-023: Batch apply all accepted suggestions

- **Description**: As a professional creator, I want batch-apply for all accepted suggestions.
- **Acceptance criteria**: "Apply All Accepted" button. Count confirmation. Undoable as single Ctrl+Z.

### GH-024: Keyboard navigation for suggestions

- **Description**: As any user, I want keyboard navigation for suggestion chips.
- **Acceptance criteria**: Tab to first chip. Arrow between chips. Enter accepts. Delete dismisses. Focus returns to text area when empty. `role="listitem"` with `aria-label`.

### GH-025: Screen reader support for Optimize panel

- **Description**: As a screen reader user, I want full panel announcement.
- **Acceptance criteria**: `role="complementary"` on panel. `role="status"` + `aria-live="polite"` on suggestions. `role="progressbar"` on bars with aria values. Severity announced.

### GH-026: Color-independent visual indicators

- **Description**: As a color-blind user, I want redundant non-color indicators.
- **Acceptance criteria**: Icon + color for all categories. Numeric text on score badges. Icon + color on severity. 4.5:1 contrast ratios.

### GH-027: Reduced motion support

- **Description**: As a user with motion sensitivity, I want animations to respect system preference.
- **Acceptance criteria**: `prefers-reduced-motion` checked. Instant appear/disappear when enabled.

### GH-028: Plugin-provided optimization suggestions

- **Description**: As a plugin developer, I want to register custom suggestion providers.
- **Acceptance criteria**: `optimization:read`/`write` permissions. Merged suggestions. Deduplication at 0.8 similarity. 5s timeout. Error isolation.

### GH-029: Internationalized optimization panel

- **Description**: As a non-English user, I want localized panel text.
- **Acceptance criteria**: `optimization` i18next namespace. EN + AR translations. RTL support. AI reasoning displayed as-is with indicator.

### GH-030: API key security for optimization services

- **Description**: As any user, I want API keys secure during optimization.
- **Acceptance criteria**: Keys via `apiKeyService` only. No keys in source, bundles, IndexedDB, or history. Sanitized suggestion data.

# Feature PRD: Inline Prompt Refinement

## 1. Feature Name

**Inline Prompt Refinement** — Real-time, AI-powered prompt improvement suggestions that appear inline as users type in the Prompt Builder, with accept/dismiss/modify workflow and full undo support.

## 2. Epic

- [Epic PRD — AI-Driven Project Optimization](../epic.md)
- [Epic Architecture Specification](../arch.md)
- Architecture Feature ID: **F1**
- Primary Service: `promptRefinementService`
- Technical Enablers: TE1, TE6, TE8, TE9

## 3. Goal

**Problem:** Users write prompts without knowing whether their structure, vocabulary, or specificity will produce high-quality video output. First-time users lack knowledge of what makes a "good" prompt — they miss camera movements, lighting details, style coherence cues, and model-specific syntax. Experienced users manually review each prompt for completeness, which is time-consuming and error-prone. There is no automated feedback loop between prompt authoring and generation quality.

**Solution:** Integrate a real-time prompt analysis engine that watches the Prompt Builder input, debounces at 500ms, sends the current prompt state to Gemini for structured analysis, and renders inline suggestion chips below the text area. Each suggestion is categorized (style, camera, lighting, specificity, syntax), color-coded, and actionable with accept/dismiss buttons. When Gemini is unavailable, a local heuristic engine (Web Worker) provides fallback suggestions based on keyword density, structural completeness, and pattern matching. All suggestions are cached (5-minute TTL) to reduce API costs.

**Impact:**

- Reduce time-to-first-generation by ~40% for new users through guided improvement.
- Increase prompt quality scores by +2.0 points on average per session.
- Target > 60% suggestion acceptance rate per session.
- Establish the foundation for all other optimization features (cost estimation, narrative analysis depend on prompt quality).

## 4. User Personas

### Creative Beginner ("Alex")

Needs inline guidance explaining _why_ a prompt should be changed. Accepts most suggestions without modification. Benefits most from style and specificity suggestions.

### Professional Creator ("Maya")

Uses suggestions selectively — accepts camera/lighting suggestions, dismisses style suggestions that conflict with her established aesthetic. Values the "dismiss" workflow to train her own understanding. Expects low-latency (< 2s) response.

### Studio Team Lead ("Jordan")

Uses suggestion acceptance rates as a proxy for team prompt quality. Monitors optimization history to identify which team members need prompt-writing guidance.

## 5. User Stories

- **US-001:** As a Creative Beginner, I want to see improvement suggestions as I type my prompt so that I can learn what makes a good video generation prompt without reading documentation.
- **US-002:** As a Creative Beginner, I want each suggestion to explain _why_ the change improves my prompt so that I can learn and improve over time.
- **US-003:** As a Professional Creator, I want to accept a suggestion with one click and have it immediately applied to my prompt so that I can iterate quickly.
- **US-004:** As a Professional Creator, I want to dismiss suggestions I disagree with so that irrelevant suggestions don't clutter my workflow.
- **US-005:** As a Professional Creator, I want to undo an accepted suggestion using Ctrl+Z so that I can revert changes if the suggestion didn't match my intent.
- **US-006:** As any user, I want suggestions to not appear while I'm actively typing (debounced) so that my writing flow is not interrupted.
- **US-007:** As any user, I want suggestions to work even when I'm offline so that I can use the tool without an internet connection.
- **US-008:** As any user, I want to navigate suggestions using only the keyboard so that the feature is fully accessible.
- **US-009:** As any user, I want suggestions to appear in my preferred language (English or Arabic) so that the feature is usable in my locale.

## 6. Requirements

### Functional Requirements

- **FR-001:** Analyze prompt state on each change, debounced at 500ms minimum, via `promptRefinementService.analyzePrompt()`.
- **FR-002:** Send prompt state to Gemini API with structured system prompt requesting JSON array of suggestions with fields: `category`, `original`, `suggested`, `reasoning`, `confidence`.
- **FR-003:** Parse Gemini response and map to `PromptSuggestion[]` type. Validate response schema; discard malformed entries.
- **FR-004:** Cache analysis results in memory with 5-minute TTL keyed by prompt content hash. Return cached results for identical prompts without API call.
- **FR-005:** Support 5 suggestion categories: `style` (purple), `camera` (blue), `lighting` (yellow), `specificity` (green), `syntax` (red).
- **FR-006:** Render suggestions as chips below the Prompt Builder text area in `InlineSuggestions` component.
- **FR-007:** Each chip displays: category icon, suggestion text, accept button (✓), dismiss button (✗).
- **FR-008:** Accept action: update `PromptSuggestion.status` to `accepted` in store, apply suggested text change to prompt state via `useAppStore` action, log to optimization history.
- **FR-009:** Dismiss action: update `PromptSuggestion.status` to `dismissed` in store, remove chip with exit animation, log to optimization history.
- **FR-010:** Undo/redo for accepted suggestions via Zundo temporal middleware on `useOptimizationStore`.
- **FR-011:** Cancel pending Gemini analysis when user types again before previous analysis completes (via `AbortController`).
- **FR-012:** Fallback to `heuristicEngine.worker` when Gemini API is unavailable (circuit breaker open). Heuristic checks: keyword presence from `optimizationRules`, prompt length vs. optimal range, structural completeness (has environment, has camera, has style).
- **FR-013:** Merge plugin-provided suggestions (via `pluginService.getOptimizationHooks().onPromptAnalysis`) with built-in suggestions. Deduplicate by text similarity > 0.8.
- **FR-014:** Filter suggestions below confidence threshold of 0.3.

### Non-Functional Requirements

- **NFR-001:** Prompt analysis latency < 2 seconds for 95th percentile (Gemini API round-trip + parsing).
- **NFR-002:** Debounce interval: 500ms minimum, configurable up to 2000ms via settings.
- **NFR-003:** Cache TTL: 5 minutes. Maximum cache entries: 50 (LRU eviction).
- **NFR-004:** Heuristic fallback latency < 100ms (Web Worker execution).
- **NFR-005:** Full ARIA compliance: `InlineSuggestions` container has `role="status"`, `aria-live="polite"`. Each chip has `role="listitem"` with `aria-label` describing category + suggestion text.
- **NFR-006:** All UI strings use i18next `optimization` namespace with EN + AR support.
- **NFR-007:** Chip enter/exit animations: CSS transitions (opacity + translateY), 200ms duration.
- **NFR-008:** Component lazy-loaded via `React.lazy` wrapped in `Suspense` + `ErrorBoundary`.
- **NFR-009:** Zero impact on app startup time — service instantiated on first use, not at boot.
- **NFR-010:** API key accessed exclusively via `apiKeyService` — never in service source code.

## 7. Acceptance Criteria

### US-001: Inline suggestions appear while typing

- **Given** a user is typing in the Prompt Builder
- **When** they pause typing for ≥ 500ms
- **Then** suggestion chips appear below the text area within 2 seconds
- **And** each chip shows a category icon, suggestion text, and accept/dismiss buttons

### US-003: Accept suggestion with one click

- **Given** a suggestion chip is displayed
- **When** the user clicks the accept button (✓)
- **Then** the suggested change is applied to the prompt text immediately
- **And** the chip is removed with an exit animation
- **And** an entry is logged in optimization history with action `accepted`

### US-004: Dismiss suggestion

- **Given** a suggestion chip is displayed
- **When** the user clicks the dismiss button (✗)
- **Then** the chip is removed with an exit animation
- **And** the prompt text is not modified
- **And** an entry is logged in optimization history with action `dismissed`

### US-005: Undo accepted suggestion

- **Given** a suggestion was just accepted
- **When** the user presses Ctrl+Z
- **Then** the prompt text reverts to its pre-suggestion state
- **And** the suggestion chip reappears with status `pending`

### US-006: Debounced analysis

- **Given** a user types continuously for 3 seconds
- **When** each keystroke occurs within 500ms of the previous one
- **Then** only ONE Gemini API call is made (after the final 500ms pause)

### US-007: Offline fallback

- **Given** the Gemini API is unavailable (circuit breaker open)
- **When** the user pauses typing for ≥ 500ms
- **Then** heuristic-based suggestions appear within 100ms
- **And** suggestions are marked with a "local" indicator (not AI-generated)

### US-008: Keyboard accessibility

- **Given** suggestion chips are displayed
- **When** the user presses Tab from the text area
- **Then** focus moves to the first suggestion chip
- **And** Arrow keys navigate between chips
- **And** Enter accepts the focused chip
- **And** Delete/Backspace dismisses the focused chip

## 8. Out of Scope

- **Auto-applying suggestions without user confirmation** — all suggestions require explicit accept action.
- **Suggestion modification/editing** — users can accept or dismiss, not edit suggestion text inline (v2 feature).
- **Suggestion learning/personalization** — the system does not learn from accept/dismiss patterns to improve future suggestions in this version.
- **Multi-prompt batch refinement** — this feature handles one prompt at a time; batch is covered by the Optimize Panel feature.
- **Custom suggestion categories** — the 5 categories are fixed; custom categories are a plugin extension point for v2.
- **Streaming suggestions** — suggestions appear as a complete batch, not streamed one-by-one.

---

_Generated: 2026-02-18 | Parent Epic: AI-Driven Project Optimization | Feature ID: F1_

# Feature PRD: Cost/Quality Estimation

## 1. Feature Name

**Cost/Quality Estimation** — Per-prompt quality scoring (1–10), model-specific cost estimation (Veo/Sora), and trade-off visualization showing the impact of prompt improvements on both quality and cost.

## 2. Epic

- [Epic PRD — AI-Driven Project Optimization](../epic.md)
- [Epic Architecture Specification](../arch.md)
- Architecture Feature ID: **F3**
- Primary Service: `costEstimationService`
- Technical Enablers: TE3, TE6

## 3. Goal

**Problem:** Users have no visibility into the relationship between prompt quality and generation cost. They cannot predict how much a generation will cost before submitting, nor can they understand which prompt changes would improve output quality relative to cost. This leads to wasted generation credits on low-quality prompts and missed opportunities to improve prompts cost-effectively. Professionals managing budgets cannot plan generation runs without manual cost calculations.

**Solution:** Provide a `costEstimationService` that evaluates each prompt's quality on a 1–10 scale (mapped from the existing `calculatePromptQuality` 0–100 scoring), estimates generation cost per model (Veo, Sora) using existing pricing constants, and visualizes cost/quality trade-offs. The service operates synchronously (no API calls needed — uses local heuristic scoring and pricing data), enabling instant feedback. Results are displayed in `QualityScoreCard` components within the Optimize panel, with per-prompt and project-aggregate views.

**Impact:**

- Enable informed decision-making: users see quality + cost _before_ committing generation credits.
- Cost estimation accuracy target: within ±15% of actual generation cost.
- Reduce wasted generation credits by surfacing low-quality prompts before submission.
- Support budget planning for professional users managing generation pipelines.

## 4. User Personas

### Creative Beginner ("Alex")

Doesn't understand why some prompts cost more. Needs simple quality scores with clear improvement guidance. Values the "you could improve this prompt by..." messaging.

### Professional Creator ("Maya")

Manages a generation budget. Needs per-prompt and aggregate cost estimates to plan production runs. Uses trade-off visualization to decide which prompts are worth improving before batch generation.

### Studio Team Lead ("Jordan")

Reviews project-level cost estimates before approving generation runs. Uses aggregate quality scores to ensure team output meets minimum quality standards.

## 5. User Stories

- **US-001:** As a Creative Beginner, I want to see a quality score (1–10) for each prompt so that I know how good my prompt is before generating.
- **US-002:** As a Professional Creator, I want to see the estimated cost of generating each prompt for both Veo and Sora so that I can choose the most cost-effective model.
- **US-003:** As a Professional Creator, I want to see trade-off indicators showing "improving this prompt adds $X but increases quality by Y" so that I can make informed optimization decisions.
- **US-004:** As a Studio Team Lead, I want to see aggregate cost and quality estimates for the entire project so that I can plan generation budgets.
- **US-005:** As any user, I want quality scores to update instantly as I change my prompt so that I get real-time feedback without waiting for API calls.
- **US-006:** As any user, I want to understand _why_ my prompt received a particular score so that I can target specific improvements.

## 6. Requirements

### Functional Requirements

- **FR-001:** `costEstimationService.estimatePrompt(promptId, state, modelId)` returns a `CostEstimate` containing: `qualityScore` (1–10), `estimatedUsd` (number), `breakdown` (`QualityDimension[]`), `suggestions` (string[]).
- **FR-002:** Quality score derived from existing `calculatePromptQuality(state)` in `@core/utils/promptScoring`: map 0–100 to 1–10 scale (score / 10, clamped to [1, 10]).
- **FR-003:** Cost estimation uses existing functions from `@core/constants/pricing`: `estimateTextCost()`, `estimateVideoCost()`, `estimateTokenCount()`, `getModelPricing()`.
- **FR-004:** `costEstimationService.estimateProject(prompts[], modelId)` returns aggregate: `{ perPrompt: CostEstimate[], totalUsd: number, averageQuality: number }`.
- **FR-005:** `costEstimationService.getTradeoff(promptId, originalState, improvedState, modelId)` returns `{ costDelta: number, qualityDelta: number }` showing impact of improvement.
- **FR-006:** `QualityScoreCard` component displays: score badge (color-coded: 1–3 red, 4–6 yellow, 7–8 green, 9–10 cyan), per-dimension breakdown bars, cost in USD, model label, improvement suggestions.
- **FR-007:** Store results in `useOptimizationStore` via `setCostEstimate(promptId, estimate)`.
- **FR-008:** Estimation is fully synchronous — no API calls required, enabling instant feedback.
- **FR-009:** Model toggle (Veo/Sora) in UI re-calculates and re-renders estimates immediately.
- **FR-010:** Project aggregate view in Optimize panel shows total estimated cost + average quality.

### Non-Functional Requirements

- **NFR-001:** Estimation latency < 10ms per prompt (synchronous calculation, no I/O).
- **NFR-002:** All estimation data stored locally in IndexedDB via store persistence.
- **NFR-003:** Full ARIA compliance for `QualityScoreCard`: score announced via `aria-label`, breakdown bars have `role="progressbar"` with `aria-valuenow`.
- **NFR-004:** i18n support for all card strings (EN + AR).
- **NFR-005:** Works fully offline — no API dependency.
- **NFR-006:** Component lazy-loaded within Optimize panel.

## 7. Acceptance Criteria

### US-001: Quality score display

- **Given** a prompt exists in the project
- **When** the Optimize panel is opened
- **Then** the prompt's `QualityScoreCard` shows a score from 1–10
- **And** the score badge is color-coded (red/yellow/green/cyan)
- **And** per-dimension breakdown bars show scores for Core Content, Visual, Technical, etc.

### US-002: Model-specific cost estimation

- **Given** a prompt's `QualityScoreCard` is displayed
- **When** the user toggles between Veo and Sora
- **Then** the estimated cost in USD updates immediately
- **And** the cost reflects model-specific pricing from `@core/constants/pricing`

### US-003: Trade-off visualization

- **Given** a prompt has improvement suggestions
- **When** the user views the suggestion in the Optimize panel
- **Then** a trade-off indicator shows: "Improving this prompt: +$X.XX cost, +Y.Y quality"
- **And** the delta values are calculated from `getTradeoff()`

### US-005: Instant feedback

- **Given** a user changes prompt text
- **When** the change is reflected in prompt state
- **Then** the quality score updates within 10ms (no loading state, no API call)

### US-006: Score explanation

- **Given** a `QualityScoreCard` is displayed
- **When** the user views the breakdown section
- **Then** each dimension shows: name, score/max bar, met criteria, improvement suggestions
- **And** suggestions are actionable (e.g., "Add camera movement", "Specify lighting")

## 8. Out of Scope

- **Actual billing or payment processing** — cost estimation is informational only.
- **Post-generation cost comparison** — comparing estimated vs. actual cost after generation is deferred.
- **Custom pricing configuration** — users cannot input custom per-token pricing in this version.
- **Cost budget alerts** — budget tracking is handled by the existing `costTrackingService`; this feature only estimates.
- **AI-powered quality scoring** — scoring uses local heuristics only (existing `calculatePromptQuality`), not Gemini.
- **Historical cost trend analysis** — tracking cost over time is a separate analytics feature.

---

_Generated: 2026-02-18 | Parent Epic: AI-Driven Project Optimization | Feature ID: F3_

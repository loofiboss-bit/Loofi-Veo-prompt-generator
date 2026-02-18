# Feature PRD: Auto-Preset Recommendation

## 1. Feature Name

**Auto-Preset Recommendation** — Automatic model profile and export preset recommendation based on project complexity analysis, with transparent reasoning and one-click application.

## 2. Epic

- [Epic PRD — AI-Driven Project Optimization](../epic.md)
- [Epic Architecture Specification](../arch.md)
- Architecture Feature ID: **F5**
- Primary Service: `presetMatchingService`
- Technical Enablers: TE5, TE6

## 3. Goal

**Problem:** Users — especially beginners — struggle to choose the right AI model (Veo vs. Sora) and export preset for their projects. Each model has different strengths (Veo excels at photorealistic, Sora at motion-heavy cinematic), and choosing the wrong one leads to suboptimal results. The existing model profile system (`@core/config/modelProfiles.ts`) offers pre-configured presets, but users must manually evaluate which profile matches their project's complexity, style, and requirements. This creates decision paralysis for beginners and inefficiency for professionals managing diverse project types.

**Solution:** Implement a `presetMatchingService` that analyzes prompt state to build a multi-dimensional complexity vector (motion, visual, narrative, technical) and matches it against available model profiles using weighted scoring. The recommendation includes a confidence score (0–1), the matched model profile, and an array of reasoning strings explaining why the recommendation was made. Results are displayed in a `PresetRecommendCard` component with a one-click "Apply Preset" button that sets all relevant prompt state fields to the recommended profile's defaults.

**Impact:**

- Target > 50% recommendation acceptance rate without modification.
- Eliminate model selection decision paralysis for beginners.
- Improve generation quality by matching prompt complexity to model capabilities.
- Reduce professional users' model evaluation time from minutes to seconds.

## 4. User Personas

### Creative Beginner ("Alex")

Doesn't understand the difference between Veo and Sora models. Needs a clear recommendation with simple reasoning ("Sora recommended because your prompt has lots of motion"). Trusts and applies recommendations without deep analysis.

### Professional Creator ("Maya")

Understands model differences but manages diverse projects. Uses recommendations as a quick sanity check — often accepts but occasionally overrides based on domain expertise. Values the complexity vector breakdown to understand _how_ the recommendation was derived.

## 5. User Stories

- **US-001:** As a Creative Beginner, I want the system to recommend which AI model to use for my project so that I don't have to research model capabilities myself.
- **US-002:** As a Creative Beginner, I want to understand _why_ a model was recommended (in simple terms) so that I can learn about model strengths over time.
- **US-003:** As a Professional Creator, I want to see the complexity vector (motion, visual, narrative, technical) so that I can evaluate the recommendation against my own judgment.
- **US-004:** As any user, I want to apply the recommended preset with one click so that all relevant prompt settings are configured optimally.
- **US-005:** As any user, I want the recommendation to update when I change my prompt so that I always see the most relevant suggestion.
- **US-006:** As any user, I want to ignore the recommendation and choose manually so that I maintain full control.
- **US-007:** As any user, I want project-level recommendations (not just per-prompt) when I have multiple scenes so that the recommendation considers the full project scope.

## 6. Requirements

### Functional Requirements

- **FR-001:** `presetMatchingService.recommendPreset(state: PromptState)` returns a `PresetRecommendation` containing: `modelId`, `profileId`, `confidence` (0–1), `reasoning` (string[]), `complexityVector` (Record<string, number>).
- **FR-002:** Build complexity vector with 4 dimensions, each normalized 0–1:
  - `motionComplexity`: derived from camera movement keywords, action descriptions, motion intensity settings.
  - `visualComplexity`: derived from art style specificity, effects count, color/lighting detail.
  - `narrativeComplexity`: derived from idea length, character count, environment detail, number of scene elements.
  - `technicalDemand`: derived from target resolution, duration, frame rate settings.
- **FR-003:** Match complexity vector against `ModelProfile[]` from `@core/config/modelProfiles.ts` using weighted scoring. Weights: motion 0.35, visual 0.25, narrative 0.20, technical 0.20.
- **FR-004:** Confidence calculation: 1.0 minus the normalized distance between the prompt's complexity vector and the best-matching profile's ideal vector. Minimum confidence: 0.1.
- **FR-005:** Reasoning array includes 1–4 human-readable strings explaining the match (e.g., "High motion complexity detected — Sora excels at dynamic camera work", "Photorealistic style detected — Veo produces more realistic output").
- **FR-006:** `presetMatchingService.recommendForProject(prompts: PromptState[])` averages complexity vectors across all prompts and returns the profile that satisfies the majority.
- **FR-007:** `PresetRecommendCard` component displays: model name + icon, confidence bar (percentage), reasoning bullets, complexity vector visualization (bar chart), "Apply Preset" button.
- **FR-008:** "Apply Preset" action: reads `ModelProfile.defaults` and applies as partial state update to `useAppStore`, preserving user's custom values for fields not covered by the profile.
- **FR-009:** Store recommendation in `useOptimizationStore` via `setPresetRecommendation(rec)`.
- **FR-010:** Recommendation recalculates on prompt state change (debounced, reuses existing debounce from prompt refinement if active).

### Non-Functional Requirements

- **NFR-001:** Recommendation latency < 5ms per prompt (synchronous computation, no API calls).
- **NFR-002:** Works fully offline — no external dependencies.
- **NFR-003:** Full ARIA compliance: confidence bar has `role="progressbar"` with `aria-valuenow`, reasoning list has `role="list"`.
- **NFR-004:** i18n support for reasoning strings, labels, and button text (EN + AR).
- **NFR-005:** Component lazy-loaded within Optimize panel.
- **NFR-006:** "Apply Preset" is undoable via Ctrl+Z (Zundo temporal middleware on `useAppStore`).

## 7. Acceptance Criteria

### US-001: Model recommendation displayed

- **Given** a user has written a prompt
- **When** the Optimize panel is opened
- **Then** a `PresetRecommendCard` shows the recommended model (Veo or Sora)
- **And** the card includes the model name, icon, and confidence percentage

### US-002: Reasoning explanation

- **Given** a `PresetRecommendCard` is displayed
- **When** the user reads the recommendation
- **Then** 1–4 reasoning bullets explain why this model was chosen
- **And** reasoning uses plain language (no technical jargon)

### US-003: Complexity vector display

- **Given** a `PresetRecommendCard` is displayed
- **When** the user views the detailed section
- **Then** a bar chart shows 4 dimensions (motion, visual, narrative, technical) with 0–1 values
- **And** each bar is labeled with its dimension name

### US-004: One-click preset application

- **Given** a recommendation is displayed
- **When** the user clicks "Apply Preset"
- **Then** the model profile's `defaults` are applied to the prompt state
- **And** a toast notification confirms "Applied [Profile Name] preset"
- **And** the action is undoable via Ctrl+Z

### US-005: Recommendation updates on change

- **Given** a recommendation is displayed for a short, simple prompt
- **When** the user adds detailed camera movements and cinematic descriptions
- **Then** the recommendation updates to reflect the increased complexity
- **And** the model recommendation may change (e.g., from Veo to Sora)

### US-007: Project-level recommendation

- **Given** a project has 5 scenes with varying complexity
- **When** the user opens the Optimize panel
- **Then** the recommendation considers all 5 scenes' aggregated complexity
- **And** the reasoning mentions "Based on analysis of 5 scenes"

## 8. Out of Scope

- **Custom model profile creation** — users cannot define new model profiles in this version.
- **Multi-model recommendation** (e.g., "use Veo for scenes 1–3, Sora for scenes 4–5") — only one recommendation per project.
- **Export preset recommendation** — this version focuses on model selection; export format recommendation is deferred.
- **Recommendation history tracking** — logging which recommendations were applied over time is deferred.
- **Machine learning-based matching** — uses deterministic weighted scoring, not trained models.
- **Third-party model profiles** — only Veo and Sora profiles from `modelProfiles.ts` are matched.

---

_Generated: 2026-02-18 | Parent Epic: AI-Driven Project Optimization | Feature ID: F5_

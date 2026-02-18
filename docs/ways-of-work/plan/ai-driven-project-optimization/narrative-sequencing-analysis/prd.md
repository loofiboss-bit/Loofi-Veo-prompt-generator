# Feature PRD: Narrative Sequencing Analysis

## 1. Feature Name

**Narrative Sequencing Analysis** — Multi-scene coherence analysis that detects missing transitions, pacing issues, character continuity gaps, and duplicate themes, with scene reordering suggestions.

## 2. Epic

- [Epic PRD — AI-Driven Project Optimization](../epic.md)
- [Epic Architecture Specification](../arch.md)
- Architecture Feature ID: **F4**
- Primary Service: `narrativeAnalysisService`
- Technical Enablers: TE4, TE6, TE7

## 3. Goal

**Problem:** Users building multi-scene projects on the timeline have no automated way to check whether their scene sequence tells a coherent visual story. Common issues — missing transitions between visually dissimilar scenes, pacing problems (e.g., three consecutive "tense" scenes with no relief), character disappearances and reappearances, and thematically redundant scenes — are only discovered after generation, wasting time and credits. Manual review is subjective and scales poorly with project size.

**Solution:** Implement a `narrativeAnalysisService` that constructs a scene adjacency graph from timeline data and applies four detection algorithms: (1) transition gap detection via keyword overlap between consecutive scenes, (2) pacing monotony detection via mood/theme repetition, (3) character continuity tracking across scene appearances, and (4) duplicate theme detection via cross-scene keyword similarity. Heavy computation is offloaded to a `narrativeAnalysis.worker` Web Worker to keep the main thread responsive. Results are displayed in a `NarrativeHealthPanel` with issue cards, severity indicators, and actionable reordering suggestions.

**Impact:**

- Catch narrative issues before generation, saving generation credits on poorly sequenced projects.
- Target > 30% engagement rate for multi-scene projects.
- Improve perceived output quality by ensuring visual story coherence.
- Provide a unique differentiator — no competing tool offers automated narrative analysis for AI video projects.

## 4. User Personas

### Professional Creator ("Maya")

Builds multi-scene projects (10–30 scenes) regularly. Needs fast, reliable sequence analysis to catch issues she'd otherwise miss in manual review. Values severity levels to prioritize fixes.

### Studio Team Lead ("Jordan")

Reviews team projects before generation. Uses narrative health as a quality gate — projects with "error"-level issues must be fixed before generation is approved.

## 5. User Stories

- **US-001:** As a Professional Creator, I want the system to automatically detect missing transitions between scenes so that I can add bridging scenes or reorder for visual flow.
- **US-002:** As a Professional Creator, I want pacing issues flagged (e.g., "3 consecutive tense scenes") so that I can vary mood for better storytelling.
- **US-003:** As any user, I want character continuity gaps detected (character appears in scene 1, absent in 2–4, reappears in 5) so that I can ensure consistent character presence.
- **US-004:** As any user, I want duplicate themes identified (scenes 3 and 7 are thematically identical) so that I can remove redundancy.
- **US-005:** As any user, I want scene reordering suggestions with drag-and-drop so that I can quickly fix narrative issues.
- **US-006:** As any user, I want issues categorized by severity (info/warning/error) so that I can prioritize critical fixes.
- **US-007:** As any user, I want narrative analysis to not block the UI so that I can continue editing while analysis runs.
- **US-008:** As any user, I want to navigate and interact with issue cards using only the keyboard so that the feature is accessible.

## 6. Requirements

### Functional Requirements

- **FR-001:** `narrativeAnalysisService.analyzeSequence(scenes[])` accepts an array of `{ id, promptText, characters?, location?, mood? }` and returns `NarrativeIssue[]`.
- **FR-002:** Analysis runs in `narrativeAnalysis.worker` Web Worker via `postMessage` structured cloning.
- **FR-003:** Detect missing transitions: consecutive scenes with < 30% shared keyword overlap are flagged as `missing-transition` with severity `warning`.
- **FR-004:** Detect pacing issues: 3+ consecutive scenes with the same mood value are flagged as `pacing` with severity `info`.
- **FR-005:** Detect character jumps: a character named in scene N, absent in scenes N+1 through N+K, then present in scene N+K+1, is flagged as `character-jump` with severity `warning`.
- **FR-006:** Detect duplicate themes: non-adjacent scenes with > 60% keyword overlap are flagged as `duplicate-theme` with severity `info`.
- **FR-007:** `narrativeAnalysisService.suggestReorder(scenes[], issues[])` returns `Array<{ fromIndex, toIndex, reason }>` — deterministic reordering based on: group by location for transition issues, alternate moods for pacing issues.
- **FR-008:** Worker timeout at 30 seconds — reject promise if analysis exceeds timeout.
- **FR-009:** `NarrativeHealthPanel` component displays issue cards grouped by severity (error → warning → info).
- **FR-010:** Each issue card shows: type icon, description, affected scene IDs (clickable to scroll timeline), "Fix" button (applies suggested reorder), dismiss button.
- **FR-011:** Store issues in `useOptimizationStore` via `setNarrativeIssues(issues[])`.
- **FR-012:** `terminate()` method cleans up Web Worker instance.

### Non-Functional Requirements

- **NFR-001:** Analysis must complete within 30 seconds for projects with up to 50 scenes.
- **NFR-002:** Projects with > 50 scenes analyzed in batches of 20 to prevent worker overload.
- **NFR-003:** Web Worker runs off main thread — zero UI jank during analysis.
- **NFR-004:** Web Worker uses `postMessage` structured cloning — no SharedArrayBuffer.
- **NFR-005:** Full ARIA compliance: `NarrativeHealthPanel` has `role="list"`, issue cards have `role="listitem"` with severity announced.
- **NFR-006:** i18n support for issue descriptions, panel title, and button labels (EN + AR).
- **NFR-007:** Component lazy-loaded within Optimize panel.

## 7. Acceptance Criteria

### US-001: Missing transition detection

- **Given** a project has scenes ["sunny beach", "dark cave"]
- **When** narrative analysis runs
- **Then** a `missing-transition` issue is created linking both scene IDs
- **And** severity is `warning`
- **And** description suggests adding a bridging scene or transition

### US-002: Pacing issue detection

- **Given** a project has 4 consecutive scenes all tagged with mood "tense"
- **When** narrative analysis runs
- **Then** a `pacing` issue is created listing all 4 scene IDs
- **And** severity is `info`
- **And** description suggests varying mood between scenes

### US-003: Character jump detection

- **Given** scenes mention character "Anna" in scenes 1, 5, 6 but not in scenes 2, 3, 4
- **When** narrative analysis runs
- **Then** a `character-jump` issue is created with sceneIds [1, 5]
- **And** description notes the gap in scenes 2–4

### US-005: Scene reordering

- **Given** a `missing-transition` issue exists
- **When** the user clicks "Fix" on the issue card
- **Then** the affected scenes are reordered per `suggestReorder()` output
- **And** the timeline updates to reflect the new order
- **And** the change is undoable via Ctrl+Z

### US-007: Non-blocking UI

- **Given** narrative analysis is running on a 30-scene project
- **When** the user interacts with the Prompt Builder or Timeline
- **Then** the UI remains responsive (no dropped frames, no freezing)
- **And** a loading indicator shows in the Narrative Health panel

## 8. Out of Scope

- **AI-powered narrative analysis** — this version uses deterministic keyword-based algorithms, not Gemini. AI analysis is a v2 enhancement.
- **Automatic scene reordering without user confirmation** — all reorders require explicit "Fix" action.
- **Cross-project narrative comparison** — comparing narrative health across projects is deferred.
- **Narrative templates or story arc presets** — pre-built narrative structures (hero's journey, etc.) are a separate feature.
- **Audio/music pacing analysis** — only visual scene content is analyzed; audio pacing is out of scope.
- **Transition generation** — detecting missing transitions does not auto-generate transition prompts.

---

_Generated: 2026-02-18 | Parent Epic: AI-Driven Project Optimization | Feature ID: F4_

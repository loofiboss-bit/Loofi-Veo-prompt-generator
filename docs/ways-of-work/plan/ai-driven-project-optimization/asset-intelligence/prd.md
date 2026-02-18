# Feature PRD: Asset Intelligence

## 1. Feature Name

**Asset Intelligence** — Automatic analysis and metadata extraction for uploaded images and video clips using Gemini Vision, with auto-tagging and timeline metadata population.

## 2. Epic

- [Epic PRD — AI-Driven Project Optimization](../epic.md)
- [Epic Architecture Specification](../arch.md)
- Architecture Feature ID: **F2**
- Primary Service: `assetIntelligenceService`
- Technical Enablers: TE2, TE6

## 3. Goal

**Problem:** When users upload reference images or video clips to a project, they must manually tag and describe the media's content — scene type, mood, subjects, color palette, location. This is tedious and subjective, leading to incomplete or inconsistent metadata across project assets. Without rich metadata, downstream features (timeline organization, prompt coherence checks, style consistency) lack the structured data they need to function effectively.

**Solution:** Automatically analyze uploaded media using Gemini Vision API to extract structured metadata tags. When a user uploads an image or video frame, the system sends it to Gemini Vision with a structured prompt requesting JSON-formatted tags across 5 categories (scene, mood, subject, palette, location). Extracted tags are displayed in an Asset Intelligence panel where users can confirm, edit, or remove them. Confirmed tags auto-populate relevant timeline metadata fields, enriching the project's data layer for use by other optimization features.

**Impact:**

- Eliminate manual asset tagging for ~80% of uploaded media.
- Improve timeline metadata completeness, enabling better narrative analysis and style coherence checks.
- Reduce asset organization time by providing instant, structured descriptions of uploaded content.

## 4. User Personas

### Creative Beginner ("Alex")

Uploads reference images without knowing how to describe them technically. Benefits from auto-generated tags that teach visual vocabulary (e.g., "golden hour lighting", "wide establishing shot").

### Professional Creator ("Maya")

Uploads large batches of reference assets. Needs quick auto-tagging to maintain workflow speed. Reviews and corrects tags for precision. Values confidence scores to prioritize which tags need review.

## 5. User Stories

- **US-001:** As a Creative Beginner, I want my uploaded images to be automatically tagged with descriptive metadata so that I don't have to manually describe each asset.
- **US-002:** As a Professional Creator, I want to see confidence scores on auto-generated tags so that I know which tags to review first.
- **US-003:** As any user, I want to edit or remove auto-generated tags so that I can correct inaccurate analysis results.
- **US-004:** As any user, I want auto-generated tags to populate my timeline metadata fields so that my project's scene descriptions are enriched automatically.
- **US-005:** As any user, I want to re-analyze an asset so that I can get fresh tags if I think the initial analysis was poor.
- **US-006:** As any user, I want asset analysis to work gracefully when offline so that the feature doesn't block my workflow.
- **US-007:** As any user, I want to navigate and manage tags using only the keyboard so that the feature is fully accessible.

## 6. Requirements

### Functional Requirements

- **FR-001:** Analyze uploaded images via `assetIntelligenceService.analyzeImage(assetId, imageData)` using Gemini Vision API.
- **FR-002:** Analyze video frames via `assetIntelligenceService.analyzeVideoFrame(assetId, frameData)` with video-specific prompt additions for motion and action detection.
- **FR-003:** Extract tags in 5 categories: `scene` (e.g., "interior", "urban street"), `mood` (e.g., "tense", "serene"), `subject` (e.g., "person walking", "vintage car"), `palette` (e.g., "warm earth tones", "cool blue"), `location` (e.g., "beach", "office").
- **FR-004:** Each tag includes: `id`, `assetId`, `label`, `category`, `confidence` (0-1), `source` (`ai` or `manual`).
- **FR-005:** Filter out tags with confidence < 0.3 before display.
- **FR-006:** Display tags in `AssetIntelligencePanel` component grouped by category with confidence badges.
- **FR-007:** Each tag chip supports: edit label (inline), remove (✗ button), view confidence.
- **FR-008:** "Re-analyze" button triggers fresh `analyzeImage()` call, replacing existing AI-generated tags (preserving manual tags).
- **FR-009:** Confirmed tags auto-populate corresponding timeline metadata fields via `useAppStore` actions.
- **FR-010:** Store all tags in `useOptimizationStore` via `setAssetTags(assetId, tags[])`.
- **FR-011:** Tags persist across sessions via IndexedDB (store persistence).
- **FR-012:** Use `circuitBreakerService` for API resilience — return empty array on failure with user-facing message.

### Non-Functional Requirements

- **NFR-001:** Image analysis latency < 5 seconds (Gemini Vision API round-trip + parsing).
- **NFR-002:** Video frame analysis latency < 10 seconds.
- **NFR-003:** All tag data stored locally in IndexedDB via `useOptimizationStore` persistence.
- **NFR-004:** Full ARIA compliance: tag chips have `role="listitem"` with `aria-label` including label + confidence.
- **NFR-005:** i18n support for all panel strings (EN + AR).
- **NFR-006:** Component lazy-loaded via `React.lazy` wrapped in `Suspense` + `ErrorBoundary`.
- **NFR-007:** API key accessed exclusively via `apiKeyService`.
- **NFR-008:** Tag data sanitized — no raw API responses stored, only parsed structured tags.

## 7. Acceptance Criteria

### US-001: Auto-tag uploaded images

- **Given** a user uploads an image to the project
- **When** the upload completes
- **Then** the system sends the image to Gemini Vision for analysis
- **And** tags appear in the Asset Intelligence panel within 5 seconds grouped by category

### US-002: Confidence scores displayed

- **Given** tags are displayed in the Asset Intelligence panel
- **When** the user views a tag chip
- **Then** the confidence score is shown as a percentage badge (e.g., "92%")
- **And** tags are sorted by confidence within each category (highest first)

### US-003: Edit and remove tags

- **Given** a tag chip is displayed
- **When** the user clicks the tag label
- **Then** the label becomes editable inline
- **And** when the user presses Enter, the tag is saved with `source` changed to `manual`
- **When** the user clicks the remove button (✗)
- **Then** the tag is removed from the store and the panel

### US-005: Re-analyze asset

- **Given** an asset has existing AI-generated tags
- **When** the user clicks "Re-analyze"
- **Then** a new Gemini Vision request is sent
- **And** AI-generated tags are replaced with new results
- **And** manually edited tags are preserved

### US-006: Offline graceful degradation

- **Given** the Gemini API is unavailable
- **When** a user uploads an image
- **Then** a message "AI analysis unavailable — tags will be generated when online" is displayed
- **And** the asset is queued for analysis when connectivity returns

## 8. Out of Scope

- **Batch asset analysis** — analyzing multiple assets simultaneously is deferred to v2.
- **Video clip analysis** (full video, not single frame) — only individual frames are analyzed in this version.
- **Asset similarity search** — finding similar assets based on tags is a separate feature.
- **Auto-cropping or image manipulation** — this feature only extracts metadata, not modifies media.
- **Custom tag categories** — the 5 categories are fixed; extensibility via plugins is deferred.
- **Tag-based prompt generation** — using tags to auto-generate prompts is covered by the Inline Prompt Refinement feature.

---

_Generated: 2026-02-18 | Parent Epic: AI-Driven Project Optimization | Feature ID: F2_

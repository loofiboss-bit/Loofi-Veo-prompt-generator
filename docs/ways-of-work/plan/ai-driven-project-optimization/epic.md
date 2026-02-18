# Epic: AI-Driven Project Optimization

## 1. Epic Name

**AI-Driven Project Optimization** — Intelligent creative assistance that analyzes projects, refines prompts, and optimizes workflows to transform Veo Studio from a prompt tool into an AI creative co-pilot.

---

## 2. Goal

### Problem

Users spend significant time crafting and iterating on video generation prompts without knowing whether their inputs will produce high-quality results. First-time users face a steep learning curve understanding prompt structure, model-specific syntax (Veo vs. Sora), and scene sequencing best practices. Experienced users manually audit projects for narrative gaps, weak prompts, and cost inefficiencies. There is no automated feedback loop between what the user writes and what the AI models actually need to produce optimal output.

### Solution

Introduce a suite of AI-powered analysis and optimization features that automatically scan project content — prompts, scenes, timelines, and uploaded assets — and provide actionable suggestions. This includes auto-prompt refinement via Gemini, asset intelligence (auto-tagging uploaded media), cost/quality trade-off estimation, narrative sequencing analysis, and automatic model/preset recommendation. These features run contextually as the user works, surfacing inline suggestions and a dedicated "Optimize" panel.

### Impact

- **Reduce project authoring time by ~40%** for new users through guided prompt improvement.
- **Increase prompt-to-render success rate** by catching weak or ambiguous prompts before generation.
- **Improve user retention** by making the platform progressively smarter as users interact with it.
- **Enable premium tier differentiation** by gating advanced optimization features behind usage tiers.
- **Strengthen competitive positioning** as the only local-first video AI tool with built-in creative intelligence.

---

## 3. User Personas

### Persona 1: Creative Beginner ("Alex")

- **Role:** Content creator new to AI video generation.
- **Goals:** Quickly produce quality video prompts without deep technical knowledge.
- **Pain Points:** Doesn't know what makes a "good" prompt; wastes generation credits on poorly structured inputs; overwhelmed by model options (Veo, Sora).
- **Needs:** Inline guidance, auto-suggestions, and clear explanations of why a prompt should be changed.

### Persona 2: Professional Creator ("Maya")

- **Role:** Experienced video producer using AI tools daily.
- **Goals:** Optimize production pipelines, maintain style coherence across multi-scene projects, and minimize generation costs.
- **Pain Points:** Manually reviews each prompt for consistency; no visibility into cost implications until after generation; narrative flow issues only caught after rendering.
- **Needs:** Batch optimization, cost estimation, narrative gap detection, and preset recommendations based on project complexity.

### Persona 3: Studio Team Lead ("Jordan")

- **Role:** Manages a team of creators using Veo Studio for collaborative projects.
- **Goals:** Ensure consistent quality across team members' work; track project health metrics; enforce style guidelines.
- **Pain Points:** No automated way to audit project quality before generation; inconsistent prompt quality across team members.
- **Needs:** Project-level quality scoring, team-wide optimization presets, and exportable optimization reports.

---

## 4. High-Level User Journeys

### Journey 1: Inline Prompt Refinement

1. User writes or edits a prompt in the Prompt Builder.
2. The system analyzes the prompt in real-time (debounced) using Gemini.
3. Inline suggestions appear as non-intrusive annotations (e.g., "Add camera movement for more dynamic output", "Specify lighting to improve consistency").
4. User accepts, modifies, or dismisses each suggestion.
5. Accepted suggestions are applied to the prompt with undo support (Zundo).

### Journey 2: Asset Intelligence

1. User uploads reference images or video clips to a project.
2. The system auto-analyzes media using Gemini Vision and extracts metadata (scene type, color palette, subjects, mood, location).
3. Extracted tags are displayed in an Asset Intelligence panel and auto-populate relevant timeline metadata fields.
4. User can edit, confirm, or remove auto-generated tags.

### Journey 3: Cost/Quality Estimation

1. User opens the "Optimize" panel from the command palette or sidebar.
2. The system scans all project prompts and displays per-prompt and aggregate cost estimates for each supported model (Veo, Sora).
3. Each prompt shows a quality score (1–10) with specific improvement suggestions.
4. User sees trade-off indicators: "Upgrading this prompt adds ~$0.12 but improves quality score from 6 → 8."
5. User can batch-apply recommended optimizations.

### Journey 4: Narrative Sequencing Analysis

1. User has a multi-scene project on the timeline.
2. The system analyzes scene order, transitions, and content for narrative coherence.
3. Issues are flagged: missing transitions, abrupt character changes, pacing problems, duplicate themes.
4. Suggestions appear in a "Narrative Health" panel with drag-to-reorder recommendations.
5. User accepts or dismisses reordering suggestions.

### Journey 5: Auto-Preset Recommendation

1. User creates or imports a project.
2. The system analyzes prompt complexity, visual style, and target platform.
3. A recommended model profile (Veo 2, Sora, etc.) and export preset are suggested.
4. User can accept the recommendation or choose manually.
5. Recommendation reasoning is displayed (e.g., "Sora recommended: high motion complexity, cinematic style detected").

---

## 5. Business Requirements

### Functional Requirements

- **FR-01:** Real-time prompt analysis with inline improvement suggestions via Gemini API.
- **FR-02:** Debounced analysis (500ms minimum) to avoid excessive API calls during active typing.
- **FR-03:** Suggestion categories: style coherence, camera/motion cues, lighting/atmosphere, technical specificity, model-specific syntax.
- **FR-04:** Accept/dismiss/modify workflow for each suggestion with undo/redo support.
- **FR-05:** Asset auto-tagging for uploaded images and video frames using Gemini Vision.
- **FR-06:** Auto-populated metadata fields from asset analysis (location, mood, subjects, color palette).
- **FR-07:** Per-prompt quality score (1–10 scale) with transparent scoring criteria.
- **FR-08:** Per-prompt and aggregate cost estimation for Veo and Sora models.
- **FR-09:** Cost/quality trade-off visualization showing impact of prompt improvements.
- **FR-10:** Multi-scene narrative coherence analysis (transitions, pacing, character continuity).
- **FR-11:** Scene reordering suggestions with drag-and-drop application.
- **FR-12:** Automatic model and export preset recommendation based on project analysis.
- **FR-13:** "Optimize" panel accessible from sidebar and command palette (`Ctrl+Shift+O`).
- **FR-14:** Batch optimization: apply all accepted suggestions across entire project in one action.
- **FR-15:** Optimization history: log all accepted/dismissed suggestions per project for learning.
- **FR-16:** Plugin API extension: expose optimization hooks for community plugin developers.
- **FR-17:** All optimization features must work offline using cached Gemini responses or local heuristics fallback.

### Non-Functional Requirements

- **NFR-01:** Prompt analysis latency must be < 2 seconds for 95th percentile of requests.
- **NFR-02:** Asset analysis must process images < 5 seconds, video frames < 10 seconds.
- **NFR-03:** All optimization data stored locally in IndexedDB (local-first architecture preserved).
- **NFR-04:** API key management through existing `apiKeyService` — no keys in source code.
- **NFR-05:** Full keyboard accessibility for all optimization UI (ARIA compliant).
- **NFR-06:** i18n support for all optimization panel strings (English + Arabic RTL at minimum).
- **NFR-07:** Optimization features must not degrade app startup time by more than 100ms.
- **NFR-08:** Graceful degradation: if Gemini API is unavailable, fall back to local heuristic rules.
- **NFR-09:** All suggestion data must be sanitizable and never contain user API keys or credentials.
- **NFR-10:** Unit test coverage for all new services must meet or exceed project thresholds (35% statements, 23% branches).

---

## 6. Success Metrics

| KPI                                  | Target                                                       | Measurement Method                                |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- |
| Prompt refinement adoption rate      | > 60% of users accept ≥ 1 suggestion per session             | Telemetry: suggestion accept/dismiss ratio        |
| Average quality score improvement    | +2.0 points per optimized prompt                             | Before/after quality score comparison             |
| Time-to-first-generation (new users) | Reduced by 40%                                               | Session timing: project creation → first render   |
| Cost estimation accuracy             | Within ±15% of actual generation cost                        | Post-generation cost comparison                   |
| Narrative analysis engagement        | > 30% of multi-scene projects use sequencing suggestions     | Telemetry: panel open + suggestion interaction    |
| Preset recommendation acceptance     | > 50% of recommendations accepted without modification       | Telemetry: auto-preset accept rate                |
| Feature retention impact             | +15% 30-day retention for users who engage with optimization | Cohort analysis: optimization users vs. non-users |

---

## 7. Out of Scope

- **Automatic prompt generation from scratch** — this epic optimizes existing prompts, not generates new ones.
- **Video quality analysis post-generation** — analyzing rendered video output is a separate epic.
- **Model fine-tuning or training** — no custom model training; uses existing Gemini API capabilities.
- **Billing or payment integration** — cost estimation is informational only; no actual billing.
- **Real-time collaborative optimization** — multiplayer co-editing of optimization suggestions is deferred.
- **Third-party AI model integration** (beyond Veo/Sora/Gemini) — additional models are a future epic.
- **Mobile or tablet UI optimization** — desktop-first; responsive design is a separate effort.
- **Custom scoring rule configuration** — users cannot create custom quality scoring criteria in this version.

---

## 8. Business Value

**Value: High**

**Justification:**

This epic transforms Veo Studio from a prompt authoring tool into an intelligent creative platform. It directly addresses the #1 user pain point (prompt quality uncertainty) and creates a clear premium feature tier for monetization. The competitive landscape for AI video tools is rapidly evolving — adding creative intelligence establishes a durable moat that pure prompt editors cannot replicate. The technical foundation (Gemini integration, plugin API, service architecture) is already in place, making this a high-impact, moderate-effort initiative that leverages existing infrastructure without requiring architectural changes.

---

_Generated: 2026-02-18 | Status: Draft | Next Step: Technical Architecture Specification_
_Unified PRD: See `prd.md` in this directory (to be created when file creation tools are available)_

# Loofi Creator Studio — Engineering Roadmap (v18+)

> **Core Engineering Philosophy (Zero AI Slop):**
> Loofi Creator Studio is a deterministic, local-first production environment for Google Flow, Veo, and Lyria workflows. We do not build opaque LLM "magic rewrite" buttons, implicit background API calls, or fragile UI wrappers. Every architectural change must improve state predictability, main-thread responsiveness, data integrity, or deterministic prompt/timeline compilation.

---

## Architectural Guardrails (Do Not Violate)

1. **No Implicit Model Calls:** Never trigger external AI/API requests on component mount, tab switch, or debounce without an explicit, payload-hashed user approval gate.
2. **No Direct Cross-Store Mutations:** Zustand stores must never import and mutate other stores directly (`useOtherStore.getState().set...`). All cross-store communication must route through `storeMediator`.
3. **No Main-Thread Serialization Bottlenecks:** Heavy JSON serialization, deep array diffing, and disk I/O must never block the React render loop or NLE timeline playback.
4. **No Root Hook Bloat:** Do not add global subscriptions or dead prop generation to `AppRuntime`. Keep state selectors in leaf components and preserve lazy-loading boundaries for delivery panels and modals.

---

## Completed Foundation (v17–v20 Baseline)

- **v20.0.0 Project-Safe Editing & Reviewed Delivery (PR #96):**
  - Durable media/catalog/project save ordering and frozen take references with explicit, edit-preserving timeline placement.
  - Reviewed selected music/video edits, occurrence-aware lyric locks, protected dialogue and cancellable AI requests.
  - Explicit desktop-local Whisper installation and transcription, shared timeline audio playback and project-scoped delivery recovery.
  - Persistent cost accounting, current delivery review before save, three Start destinations and six updated locales.

- **v19.0.0 Reviewable Video Production & Deterministic Workbench (Released 2026-10-24):**
  - Selected-variant AI editing with field-level review, guarded persistence, and zero-token batch local transforms across all 3 variants.
  - Shared local cinematic AST guidance (`OPT-001`, `MOT-001`, `LGT-002`, `DOF-001`, `TMP-001`) in Studio/Arena, separate from documented provider restrictions.
  - Shared Pro A/B video comparison with Swap A/B, loop, frame-stepping, frozen-source differences, and independent result notes.
  - Multi-shot production batch controls, run cost breakdown, one-click timeline sync for accepted takes, NLE `J/K/L` frame-stepping, and zero-token YouTube chapter timestamp generation.
  - Complete frozen Veo/Lyria request approval binding (`hashVersion: 2`), preserving recovery of known operations and resolving attention job deadlocks.

- **v17.0.0 Smart Local Editing (Released 2026-10-16):**
  - **Microphone Voiceover Recording:** Direct timeline dialogue recording via Web Audio API with real-time waveform visualization, device selection, take management, and dedicated track placement.
  - **Reviewable Silence-Cut Trimming:** Offline FFmpeg `silencedetect` with interactive pause review modal, customizable dB thresholds, and clean ripple-cut splitting.
  - **Offline Speech-to-Text & Linked Captions:** Privacy-first, local-first caption segmentation and script alignment linking caption clips directly to audio sources.
  - **EBU R128 Loudness Normalization & Ducking:** Native FFmpeg EBU R128 (`-14 LUFS`) normalization and dynamic `-14 dB` sidechain music ducking during speech.
  - **Save-on-Close Flush Resilience:** Immediate synchronous/microtask flush of pending debounced project autosaves on window close and navigation events to prevent edit loss.
- **v16.0.1 Performance Stabilization (Released 2026-10-15):**
  - Reliable asynchronous startup, streamed media verification, atomic delivery exports, terminal-safe render progress, reusable 3D resources, and production-path benchmarks.
- **v18 Early Production Pipeline (In-Flight Baseline):**
  - Multi-format sequential delivery exports, selected cover extraction, reusable delivery presets, and picture-in-picture preview/export groundwork.

---

## Phase 1: State Isolation & Non-Blocking Persistence (Completed / Hardened Post-v22)

_Goal: Zero UI frame drops during timeline/node editing and 100% decoupled Zustand stores._

- [x] **1.1 Non-Blocking Autosave & Dirty Versioning (`useProjectAutosave`, `projectDocumentService.ts`):**
  - Replace synchronous deep-diffing and heavy array comparisons on the main thread in `captureProjectDocumentFromStores` with lightweight, monotonic store `mutationVersion` counters.
  - Schedule snapshot capture via `requestIdleCallback` (or debounced idle slices), offload JSON serialization/hashing off the critical UI path, and mirror durable desktop edits into SQLite WAL (`electron/project-db.cjs`).
- [x] **1.2 Strict `storeMediator` Decoupling:**
  - Refactor `useLocationStore` and `useExternalStudioResultStore` to eliminate direct mutations on `useAppStore`. Route all cross-store state synchronization through typed events in `storeMediator` with re-entrancy cycle guards.
  - Add static lint enforcement (`no-restricted-imports` / boundary rules) to prevent store-to-store imports.
- [x] **1.3 `AppRuntime` De-bloat, Playhead Isolation & Render Isolation:**
  - Strip redundant root hooks, `promptState` top-level subscriptions, and dead stub callbacks from `AppRuntime`; move transient 10 Hz timeline playback into `usePlaybackStore` and use O(1) Zundo reference equality.
  - Enforce strict `React.lazy` / `Suspense` boundaries for heavy delivery panels and modal workflows.

---

## Phase 2: Atomic Disk I/O, Schema Migrations & IPC Hardening (P1 — Completed)

_Goal: Eliminate corrupt project saves, unhandled schema drift, and unvalidated IPC calls._

- [x] **2.1 Atomic File Persistence & Rolling Backups (Electron Main):**
  - Replace direct file overwrites with an atomic write pipeline: write to `<project>.tmp` -> `fsync` -> verify JSON parse integrity -> rotate existing file to `<project>.bak` -> atomic `fs.rename` to target path.
- [x] **2.2 Deterministic Project Schema Migrations (`projectDocumentService.ts`):**
  - Enforce strict runtime schema validation (Zod) with explicit `schemaVersion` metadata on every project document.
  - Build pure, unit-tested migration pipelines (`v16 -> v17 -> v18`) so legacy project files upgrade deterministically without runtime undefined errors.
- [x] **2.3 Full Electron IPC Contract Parity:**
  - Enforce shared runtime validation schemas across preload and Electron main IPC handlers (`paid-jobs-ipc.cjs`, filesystem channels, and studio bridges). Reject malformed payloads before executing handler logic.

---

## Phase 3: Deterministic Prompt Compiler & NLE Timeline Engine (P2 — Completed)

_Goal: Replace guesswork with a rule-based static prompt analyzer and frame-accurate timeline math._

- [x] **3.1 Rule-Based Prompt AST & Static Conflict Linter (100% Local Logic):**
  - Build a zero-LLM static analyzer for node graphs and camera/lighting parameters that flags physical or cinematic contradictions in real time (e.g., `Static Tripod` camera move combined with `FPV Whip Pan` subject tracking, or conflicting lighting setups).
  - Validate token budgets, aspect ratios, frame rates, and duration limits against target Google Veo, Flow, and Lyria hardware/API constraints prior to job quoting.
- [x] **3.2 Frame-Accurate Timeline Math (Integer Ticks):**
  - Standardize NLE timeline calculations on integer ticks/frames rather than floating-point seconds to eliminate rounding drift between Veo video cuts and Lyria audio stems.
- [x] **3.3 Bounded Patch/Command Undo-Redo Stack:**
  - Implement a deterministic Undo/Redo engine for NLE timeline and node-graph operations using lightweight command patches, isolated from full-document autosave serialization.
- [x] **3.4 Deterministic Continuity & Seed Registry:**
  - Lock character, lens, environment descriptors, and seed values across multi-scene timeline sequences via immutable reference IDs.

---

## Phase 4: Idempotent Job Queue, Cost Locking & Architecture CI Gates (P3 — Completed)

_Goal: Crash-recoverable paid job execution, cryptographic quote locking, and automated architecture checks._

- [x] **4.1 Persistent Paid-Job State Machine (FSM):**
  - Persist job lifecycle states (`DRAFT -> QUOTED -> APPROVED -> DISPATCHING -> RUNNING -> COMPLETED | FAILED | CANCELLED`) in a local disk journal so in-flight jobs recover cleanly after an Electron restart without double-dispatching.
- [x] **4.2 Payload-Hashed Approval Gate (`paid-job-pricing.cjs`):**
  - Bind new Veo/Lyria approvals to the complete frozen submission (operation, model, endpoint and serialized body, including inline media), using `hashVersion: 2`. Known provider operations recover without resubmission; unsent legacy approvals require renewal.
- [x] **4.3 Automated Architecture & Performance CI Gates:**
  - Add CI checks for zero circular dependencies (`npx madge --circular --extensions ts,tsx src/`).
  - Add a benchmark assertion ensuring `captureProjectDocumentFromStores` dirty-check overhead stays under `< 5ms` on the main thread.
  - Keep `ARCHITECTURE.md` and `ROADMAP.md` strictly synchronized with v18+ module boundaries.

---

## Phase 5: Usability, Design Harmony & Production Trust (v21.0.0 — Completed)

_Goal: Intuitive guided delivery, unified media library protection, complete plugin worker sandboxing, and design consistency._

- [x] **5.1 Guided Delivery Stepper (`DeliveryStepper.tsx`, `DeliveryOutputs.tsx`):**
  - Refactor delivery from scattered action buttons into a guided 4-step pipeline: Check delivery, Review delivery, Export video, Save files.
  - Live progress preflight checks, cancel button with graceful cleanup, and soft preview review recommendations prior to final export.
  - Reusable `DisabledReason` component explaining exactly why an action is blocked and offering direct navigation to fix it.
- [x] **5.2 Unified Media Library & Deletion Guards (`AssetsPage.tsx`, `EditorMediaPanel.tsx`):**
  - Consistent type filters: All, Video, Audio, Images, References, Generated with live count badges.
  - Multi-format local file upload support (`image/*,video/*,audio/*`).
  - Active timeline clip deletion guard blocking accidental removal of media actively referenced on timeline tracks with detailed usage breakdown.
  - Placed-on-timeline badges in the timeline editor media drawer.
- [x] **5.3 Plugin Sandbox Web Worker Isolation (`pluginSandboxService.ts`, CSP):**
  - Eliminate dynamic evaluation (`new Function`, `_initRestricted`) from main thread plugin loader. All external plugins execute inside dedicated Web Workers.
  - Update `index.html` CSP: replace `'unsafe-eval'` with `'wasm-unsafe-eval'`.
- [x] **5.4 Save Status Consolidation & Navigation Streamlining:**
  - Introduce `ProjectStatusChip` in the top app scaffold: compact indicators for saved, saving, conflict, error with immediate save actions.
  - Remove redundant duplicate save status banners in Prompt Studio and only show intrusive banners during genuine conflicts or network errors.
  - Fast "Continue editing" shortcut for the active project in Projects hub, routing to Timeline if clips exist or Studio otherwise.
  - Primary "Open editor & import media" action in empty timeline state.
- [x] **5.5 Full 6-Language i18n & Scoped Zero-Warning ESLint Guard:**
  - Translate all UI strings across English, Swedish, Spanish, French, Japanese, and Arabic with 100% key parity enforced across all 17 namespaces via `npm run i18n:all:check`.
  - Scoped ESLint rule (`react/jsx-no-literals`) enforcing zero raw strings in key delivery and media components while maintaining the strict 0-warning `.lint-threshold`.

---

## Phase 6: Release 1 Workspace Cohesion, Data Integrity & Performance Hardening (Completed)

_Goal: Eliminate silent edit data loss, unify navigation/shortcuts around active workspaces, retire abandoned UI shells, and enforce strict bundle and localization gates._

- [x] **6.1 Non-Destructive Bridge & Portable Video Iteration Lineage (`videoVersionService.ts`, `videoIterationService.ts`, `projectTransferService.ts`):**
  - Preserve existing storyboard shot `action`, `duration`, and trimmed timeline clips when applying iterated video takes, and preserve 3–15s Omni durations across bridges.
  - Persist `VideoIterationSession[]` on canonical project documents (SQLite WAL `meta_json`), rehydrate desktop media assets across sessions and `.loofi-project` bundles, and surface clear EEA/Switzerland/UK upload caveats.
- [x] **6.2 Resilient Vision & Timeline/Render Hygiene (`geminiVisionService.ts`, `creator-render.cjs`, `timelineSlice.ts`):**
  - Migrate vision/SFX/auto-tagging endpoints onto `resilientCall` so desktop `maxRetries=0` cost-approval boundaries apply uniformly.
  - Extend interrupted FFmpeg render recovery to sweep orphaned `segment-*` / `concat.txt` files and remove silent 50-shot truncation in `gcTimeline`.
- [x] **6.3 Coherent Workspace & Retired Legacy Shells (`AppScaffold.tsx`, `StartPage.tsx`, `ShortcutsModal.tsx`, `ModalManager.tsx`):**
  - Focus/highlight local clip import when onboarding opens `/start?mode=clips`, upgrade the context row into a responsive Workspace Context Rail, wire `Ctrl+Enter` to Prompt Studio build, and standardize `ShortcutsModal` onto `<AppDialog>`.
  - Remove legacy `Header`, `ActionBar`, `PromptWorkspace`, `SunoSongStudio`, `OptimizePage`, `AiCoDirectorWidget`, `NewProjectWizard`, `ComposerPanel`, and dead `StoryBoard`/`ShotCard` modals.
- [x] **6.4 Bundle Budget, Icon Modularity & 6-Locale Parity (`vite.config.ts`, `iconRegistry.ts`, `check-bundle-budget.mjs`, `check-translations.mjs`):**
  - Exclude unused 24 MB `ort-wasm-simd-threaded.asyncify.wasm` while preserving Whisper ASR (`npm run bundle:check` < 22 MB).
  - Replace the 1,624-line switch in `Icon.tsx` with data-driven `iconRegistry.ts`, retire legacy `constants/translations.ts`, localize `creativeAssistantService` via i18n, and enforce 100% key parity across 6 languages x 17 namespaces.

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

## Completed Foundation (v17–v18 Baseline)

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

## Phase 1: State Isolation & Non-Blocking Persistence (P0 — Completed)

_Goal: Zero UI frame drops during timeline/node editing and 100% decoupled Zustand stores._

- [x] **1.1 Non-Blocking Autosave & Dirty Versioning (`useProjectAutosave`, `projectDocumentService.ts`):**
  - Replace synchronous deep-diffing and heavy array comparisons on the main thread in `captureProjectDocumentFromStores` with lightweight, monotonic store `mutationVersion` counters.
  - Schedule snapshot capture via `requestIdleCallback` (or debounced idle slices) and offload JSON serialization/hashing off the critical UI path.
- [x] **1.2 Strict `storeMediator` Decoupling:**
  - Refactor `useLocationStore` and `useExternalStudioResultStore` to eliminate direct mutations on `useAppStore`. Route all cross-store state synchronization through typed events in `storeMediator`.
  - Add static lint enforcement (`no-restricted-imports` / boundary rules) to prevent store-to-store imports.
- [x] **1.3 `AppRuntime` De-bloat & Render Isolation:**
  - Strip redundant root hooks and unused prop generation from `AppRuntime`.
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
  - Bind every cost approval token to a deterministic SHA-256 hash of the exact job payload (`prompt + model + duration + resolution + count`). Any parameter change immediately invalidates the approval state.
- [x] **4.3 Automated Architecture & Performance CI Gates:**
  - Add CI checks for zero circular dependencies (`npx madge --circular --extensions ts,tsx src/`).
  - Add a benchmark assertion ensuring `captureProjectDocumentFromStores` dirty-check overhead stays under `< 5ms` on the main thread.
  - Keep `ARCHITECTURE.md` and `ROADMAP.md` strictly synchronized with v18+ module boundaries.

# Loofi Creator Studio architecture

## Runtime shape

```text
React feature pages
  -> Zustand/Zundo stores
  -> singleton services
  -> typed preload boundary
  -> Electron main IPC modules
  -> provider adapters, durable job store, credential vault, filesystem media store
```

The web renderer remains usable for local planning, editing, and export. Official paid generation is
a desktop capability because credentials, approval tokens, durable provider operations, and local
media writes are enforced in Electron main.

## Product surfaces

The canonical shell exposes six destinations: Create, Projects, Assets, Timeline, Activity, and
Settings. Create owns the Brief → Scenes → Assets → Generate → Review → Export workflow.
`/director`, `/composer`, and `/optimize` remain compatibility redirects. Specialist functionality is
reachable from the canonical workflow or Settings rather than through duplicate global destinations.

## Feature ownership

- `src/features/create/CreatePage.tsx` — canonical workflow shell and step navigation.
- `src/features/create/CreateWorkflow.tsx` — small composition root for the active creation step.
- `src/features/create/hooks/useCreateWorkflow.ts` — workflow controller and business actions.
- `src/features/create/steps` and `components` — brief, generation, shots, review/export, Lyria,
  model input, approval, and toolbar presentation.
- `src/features/director` — legacy compatibility wrapper only.
- `src/features/production` — durable run contracts and reusable production controls.
- `src/features/hubs` — Projects, Assets, and Activity destinations.
- `src/core/models` — canonical model catalog, routing, and auditable cost calculations.
- `src/core/providers` — provider-neutral request/response and fallback policy.
- `src/core/services` — business logic; components never access databases directly.
- `electron/main.cjs` — stable two-line package entrypoint.
- `electron/app-runtime.cjs` — application composition and initialization.
- `electron/window-lifecycle.cjs` — sandboxed window and Safe Mode lifecycle.
- `electron/ipc` — focused credentials, provider, paid-job, media, project, diagnostics, and update
  registration modules.
- `electron/paid-job-engine.cjs` — restart-safe video and music execution state machine.
- `electron/media-store.cjs` — atomic checksum-verified local media storage.

## Model and approval contract

Every executable model entry contains canonical/provider IDs, API surface, lifecycle, modalities,
capabilities, supported dimensions/formats, price dimensions, source URL, and verification date.
Routing preserves explicit user choice and filters by lifecycle, capability, provider, region, and
availability.

Cost estimates are `exact`, `upper-bound`, or `unavailable`. Paid execution requires a positive
exact/upper-bound maximum. Renderer-side approval is advisory; Electron main recalculates from its
security-boundary mirror and rejects missing, stale, mismatched, or underestimated approvals.

Direct text/review calls use short-lived single-use approval tokens. Video and Lyria use durable paid
job records. Provider credentials stay in keytar/OS vault and never cross into renderer state.

## Durable jobs and media

Veo jobs persist the provider operation ID before polling. After restart, known operations resume;
submissions without a durable acknowledgement become `RecoveryRequired` and are not replayed.

Lyria Interactions responses are synchronous. The engine persists `Submitting`, receives interleaved
text/audio blocks, writes audio through the atomic media store, verifies SHA-256 readback, and only
then persists `Complete`. A lost acknowledgement becomes `RecoveryRequired`; a local write failure
after generation becomes `MediaAtRisk`.

The paid job file remains schema version 1 with additive fields so existing v8 video jobs continue to
load. The app ID, storage keys, IndexedDB stores, `.veo` import, and v8 project bundle fields are not
renamed or destructively reinterpreted.

## Security and diagnostics

Normal BrowserWindow settings use context isolation, sandboxing, web security, and no renderer Node
integration. IPC handlers validate IDs, MIME types, provider hosts, model capabilities, image counts,
durations, resolutions, formats, payload sizes, and cost metadata.

Diagnostics expose only versions, platform, Safe Mode, credential configured state, storage totals,
redacted job status, and logs. Prompt text, credentials, request payloads, and generated base64 media
must be excluded from support exports.

## Testing layers

- Vitest/jsdom: services, stores, routing, UI, accessibility, localization, migration fixtures.
- Node test runner: Electron main/preload modules, price mirror, durable jobs, media storage.
- Playwright: browser workflow, legacy redirects, responsive/RTL/accessibility, screenshots.
- Packaged smoke: Fedora 44 RPM/AppImage and Windows NSIS/portable through CI.

No automated suite is allowed to make a paid provider request. Live canaries are manual-only,
credential-free in the repository, excluded from normal CI, and protected by explicit cost ceilings.

# Architecture — v7.0.0 "Director Mode"

**Date**: 2026-07-10
**Status**: Complete

## Objective

Add an approval-gated production workspace that turns the current project into a durable plan,
executes selected Veo shots without duplicate paid submissions, reviews generated takes, and
commits accepted media back to the existing asset, storyboard, timeline, and export workflows.

## Design Decisions

### D1: Durable Production Runs

- **Layer**: types, services, store
- **New files**: `src/core/types/production.ts`, `src/core/services/productionRunService.ts`,
  `src/core/store/useProductionRunStore.ts`
- **Data model**: Versioned `ProductionRun` records with approval, shot, take, review, cost, and
  provider-operation metadata.
- **Pattern**: Singleton IndexedDB service as persistence authority, Zustand + Zundo active-run
  projection, and typed mediator events for cross-store integration.
- **Risk control**: A submitted job without a provider operation ID becomes `recovery-required`
  and is never automatically resubmitted.

### D2: Capability-Validated Veo Requests

- **Layer**: services, infrastructure
- **New files**: `src/core/services/veoGenerationService.ts`
- **Modified files**: `src/core/services/videoGenerationService.ts`, `sw.js`
- **Data model**: Provider-neutral `VeoGenerationRequest` supporting text, image, interpolation,
  references, and extension modes.
- **Pattern**: Validate and price requests before approval; persist the provider operation name
  before polling; resume only known operations.
- **Risk control**: No provider call occurs during route load, hydration, or planning.

### D3: Durable Generated Media

- **Layer**: infrastructure, services
- **New files**: `src/core/services/mediaAssetService.ts`
- **Data model**: Blob-backed media records with MIME type, size, provider URI, and expiry.
- **Pattern**: Store generated media in a dedicated IndexedDB store and expose session-scoped Blob
  URLs to existing asset/timeline consumers.
- **Risk control**: Failed caching produces `media-at-risk`; completion requires a local copy or an
  explicit waiver.

### D4: Advisory Structured Review

- **Layer**: services, features
- **New files**: `src/core/services/productionReviewService.ts`,
  `src/features/director/DirectorPage.tsx`
- **Data model**: Five scored review dimensions, findings, and a proposed revision prompt.
- **Pattern**: Local technical checks always run; optional Gemini semantic review runs only under
  the shot approval grant.
- **Risk control**: Scores never auto-accept, reject, or replace a prompt or take.

## Compatibility

- Existing prompt, optimize, storyboard, timeline, video studio, and Suno workflows remain.
- Existing generation tasks migrate to the expanded optional fields without data loss.
- Existing Director's Chain and sequential-generation hooks retain their public signatures.
- Veo 3.1 remains the only user-facing v7 video provider; provider-neutral types permit later
  adapters without changing Director Mode.

## Validation Strategy

- Co-located unit tests for every new service, store, and request rule.
- Route/component tests for no-cloud-before-approval behavior.
- E2E coverage for plan, approve, mocked generation, review, revision, acceptance, export, reload,
  and offline recovery.
- Release gates: `npm run validate`, `npm run test:e2e`, `npm run validate:release`, and
  `npm run dist`.

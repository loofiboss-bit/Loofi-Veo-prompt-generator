# Automation & Agents Skills

## Job Queue

- **Priority queue** — Priority-based task execution with configurable concurrency
- **Progress tracking** — Per-job progress reporting with ETA
- **Pause/resume** — Pause and resume individual jobs or entire queue
- **Error handling** — Retry failed jobs with exponential backoff

**Services:** `jobQueueService.ts`
**Store:** `useJobQueueStore`
**Features:** `src/features/jobs/`

## Batch Operations

- **Bulk prompt generation** — Generate multiple prompts in sequence or parallel
- **Batch export** — Export multiple clips with different settings
- **Batch template application** — Apply templates to multiple prompts at once
- **Progress dashboard** — Unified progress view for all batch operations

**Services:** `batchPromptService.ts`
**Store:** `useBatchPromptStore`
**Features:** `src/features/batch/`

## Generation Queue

- **API rate limiting** — Respect API rate limits with automatic throttling
- **Queue prioritization** — Reorder pending generations by priority
- **Cost estimation** — Estimate cost before submitting to queue
- **Result caching** — Cache generated results to avoid duplicate API calls

**Services:** `generationQueueService.ts`
**Store:** `useGenerationQueueStore`

## Render Agents

- **Background rendering** — Render compositions without blocking UI
- **Worker threads** — Offload heavy processing to Web Workers
- **Render farm** — Distribute rendering across multiple browser tabs/workers
- **Render scheduling** — Schedule renders for off-peak hours

**Infrastructure:** `src/infrastructure/` (workers)
**Status:** Partially implemented — workers exist, full agent system planned

## Event Bus

- **Store subscriptions** — Zustand store change notifications
- **Cross-module events** — Decouple modules via event-driven architecture
- **Broadcast channel** — Cross-tab event broadcasting
- **Event logging** — Debug event flow with structured logging

**Hooks:** `src/shared/hooks/useBroadcastState.ts`
**Store:** Zustand subscription mechanism

## Circuit Breaker

- **Failure detection** — Detect and isolate failing API endpoints
- **Automatic recovery** — Re-enable failed services after cool-down period
- **Fallback strategies** — Use cached results or alternative APIs on failure
- **Health monitoring** — Track API endpoint health and availability

**Services:** `circuitBreakerService.ts`
**Types:** `src/core/types/circuitBreaker.ts`

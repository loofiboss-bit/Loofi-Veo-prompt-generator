# Performance Skills

## Performance Profiling

- **Service profiler** — Measure service method execution time
- **Component profiler** — React render performance tracking
- **Bundle analysis** — Vite bundle size analysis and optimization
- **Memory tracking** — Monitor memory usage and detect leaks

**Services:** `performanceProfiler.ts`, `performanceService.ts`

## Lazy Loading

- **Component splitting** — React.lazy + Suspense for feature panels
- **Route-based splitting** — Code split by route in React Router
- **Dynamic imports** — Load heavy services on demand
- **Skeleton loading** — Display loading skeletons during lazy load

**Shared:** `src/shared/components/` (Skeleton components)

## Worker Threads

- **FFmpeg workers** — Offload video processing to Web Workers
- **Analysis workers** — Run heavy analysis (audio, video) off main thread
- **Render workers** — Background rendering without UI blocking
- **Worker pool** — Manage pool of reusable workers

**Infrastructure:** `src/infrastructure/` (workers)

## Caching

- **Service-level caching** — Cache expensive computations in services
- **API response caching** — Cache API responses with TTL
- **Asset caching** — Cache loaded assets in memory
- **Cache invalidation** — Smart invalidation on data changes

## Telemetry

- **Performance metrics** — Collect app performance data (FCP, LCP, TTI)
- **Error rates** — Track error frequency by feature/service
- **Usage analytics** — Anonymous feature usage statistics
- **Health monitoring** — Real-time app health dashboard

**Services:** `telemetryService.ts`
**Features:** `src/features/diagnostics/`
**Store:** `useDiagnosticsStore`

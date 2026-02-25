import { performanceService } from '@core/services/performanceService';

export const PERF_MARKS = {
  APP_STARTUP: 'app-startup',
  STORE_HYDRATION: 'store-hydration',
  FIRST_RENDER: 'first-render',
  FIRST_INTERACTIVE: 'first-interactive',
  CRITICAL_BOOTSTRAP: 'critical-bootstrap',
  DB_INIT: 'db-init',
  PLUGIN_INIT: 'plugin-init',
  QUEUE_REPLAY_SYNC: 'queue-replay-sync',
  ONLINE_RESUME_HANDOFF: 'online-resume-handoff',
  DEFERRED_SERVICES: 'deferred-services',
} as const;

export type PerfMarkName = (typeof PERF_MARKS)[keyof typeof PERF_MARKS];

export function markStart(name: PerfMarkName): void {
  performanceService.startMark(name);
}

export function markEnd(name: PerfMarkName): void {
  performanceService.endMark(name);
}

import { performanceService } from '@core/services/performanceService';

export const PERF_MARKS = {
  APP_STARTUP: 'app-startup',
  STORE_HYDRATION: 'store-hydration',
  FIRST_RENDER: 'first-render',
  FIRST_INTERACTIVE: 'first-interactive',
  DB_INIT: 'db-init',
  PLUGIN_INIT: 'plugin-init',
  DEFERRED_SERVICES: 'deferred-services',
} as const;

export type PerfMarkName = (typeof PERF_MARKS)[keyof typeof PERF_MARKS];

export function markStart(name: PerfMarkName): void {
  performanceService.startMark(name);
}

export function markEnd(name: PerfMarkName): void {
  performanceService.endMark(name);
}

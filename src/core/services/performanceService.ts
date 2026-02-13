/**
 * Performance Profiling Service
 * Lightweight in-memory profiler using the Web Performance API.
 * Stores up to MAX_METRICS recent measurements in a ring buffer.
 * Debug output can be enabled at runtime via:
 *   localStorage.setItem('debug-perf', 'true')
 */

import { logger } from './loggerService';

// ─── Public Interface ────────────────────────────────────────────────────────

/** A single captured performance measurement. */
export interface PerfMetric {
    /** Human-readable label passed to startMark / endMark */
    label: string;
    /** Duration of the measurement in milliseconds */
    duration: number;
    /** Unix timestamp (ms) when the measurement was recorded */
    timestamp: number;
}

// ─── Internal Constants ──────────────────────────────────────────────────────

const MAX_METRICS = 200;
const DEBUG_KEY = 'debug-perf';

// ─── Module-level ring buffer ────────────────────────────────────────────────

const metrics: PerfMetric[] = [];

// ─── Subscription Interface ──────────────────────────────────────────────────

type PerfListener = (metric: PerfMetric) => void;
const listeners: Set<PerfListener> = new Set();

/**
 * Subscribe to new performance metrics as they are recorded.
 * @param listener Function to call when a new metric is added.
 * @returns Unsubscribe function.
 */
function subscribe(listener: PerfListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notifyListeners(metric: PerfMetric) {
    listeners.forEach(listener => {
        try {
            listener(metric);
        } catch (error) {
            console.error('[PerformanceService] Listener error:', error);
        }
    });
}

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Place a named start mark in the browser Performance timeline.
 * Must be followed by a matching `endMark(label)` call.
 * @param label Unique name for this measurement window.
 */
function startMark(label: string): void {
    performance.mark(`loofi-start-${label}`);
}

/**
 * Place a named end mark, measure the interval since the matching
 * `startMark(label)`, record the result, and clean up the marks.
 * If no matching start mark exists the call is silently ignored.
 * @param label Must match the label passed to the corresponding startMark.
 */
function endMark(label: string): void {
    const start = `loofi-start-${label}`;
    const end = `loofi-end-${label}`;
    const measureName = `loofi-${label}`;

    performance.mark(end);

    try {
        const measure = performance.measure(measureName, start, end);
        const metric: PerfMetric = {
            label,
            duration: measure.duration,
            timestamp: Date.now(),
        };

        metrics.push(metric);
        if (metrics.length > MAX_METRICS) metrics.shift();

        notifyListeners(metric);

        if (localStorage.getItem(DEBUG_KEY)) {
            console.debug(`[perf] ${label}: ${measure.duration.toFixed(2)}ms`);
        }

        performance.clearMarks(start);
        performance.clearMarks(end);
        performance.clearMeasures(measureName);
    } catch {
        // Silently ignore when the start mark does not exist.
    }
}

/**
 * Return a shallow copy of all currently buffered metrics, oldest first.
 * The returned array is safe to mutate; it does not affect the internal buffer.
 */
function getMetrics(): PerfMetric[] {
    return [...metrics];
}

/**
 * Remove all buffered metrics from the in-memory ring buffer.
 */
function clearMetrics(): void {
    metrics.length = 0;
    logger.info('Performance metrics cleared', 'performanceService');
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const performanceService = {
    startMark,
    endMark,
    getMetrics,
    clearMetrics,
    subscribe,
};

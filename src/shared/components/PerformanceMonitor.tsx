import React, { useState, useEffect, useRef } from 'react';
import { performanceService, PerfMetric } from '@core/services/performanceService';
import Icon from '@shared/components/ui/Icon';

export const PerformanceMonitor: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [metrics, setMetrics] = useState<PerfMetric[]>([]);
    const [fps, setFps] = useState(0);
    const [memory, setMemory] = useState<{ used: number; limit: number } | null>(null);

    // FPS Counter
    useEffect(() => {
        if (!isVisible) return;

        let frameCount = 0;
        let lastTime = performance.now();
        let rafId: number;

        const loop = () => {
            const now = performance.now();
            frameCount++;
            if (now - lastTime >= 1000) {
                setFps(frameCount);
                frameCount = 0;
                lastTime = now;
            }

            // Memory (Chrome only)
            if ((performance as any).memory) {
                const mem = (performance as any).memory;
                setMemory({
                    used: mem.usedJSHeapSize / 1048576,
                    limit: mem.jsHeapSizeLimit / 1048576,
                });
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [isVisible]);

    // Metrics Subscription
    useEffect(() => {
        if (!isVisible) return;

        // Initial load
        setMetrics(performanceService.getMetrics().slice(-10).reverse());

        const unsubscribe = performanceService.subscribe((metric) => {
            setMetrics((prev) => [metric, ...prev].slice(0, 10));
        });

        return unsubscribe;
    }, [isVisible]);

    // Hotkey to toggle: Ctrl+Alt+P
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.altKey && e.code === 'KeyP') {
                setIsVisible((v) => !v);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed top-20 right-4 z-[9999] w-64 bg-black/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-3 font-mono text-xs text-white pointer-events-none select-none animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                <div className="flex items-center gap-2">
                    <Icon name="activity" className="w-3 h-3 text-cyan-400" />
                    <span className="font-bold">PERF MONITOR</span>
                </div>
                <span className={`font-bold ${fps < 30 ? 'text-red-500' : 'text-green-400'}`}>
                    {fps} FPS
                </span>
            </div>

            {memory && (
                <div className="mb-3 flex justify-between text-slate-400">
                    <span>Heap:</span>
                    <span>{memory.used.toFixed(1)} / {memory.limit.toFixed(0)} MB</span>
                </div>
            )}

            <div className="space-y-1">
                {metrics.map((m, i) => (
                    <div key={m.timestamp + i} className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-300 truncate max-w-[140px]" title={m.label}>
                            {m.label}
                        </span>
                        <span className={`${m.duration > 16.6 ? 'text-yellow-400' : 'text-slate-500'}`}>
                            {m.duration.toFixed(1)}ms
                        </span>
                    </div>
                ))}
                {metrics.length === 0 && (
                    <div className="text-slate-600 italic text-center py-2">No metrics yet</div>
                )}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-600 text-center">
                Toggle: Ctrl+Alt+P
            </div>
        </div>
    );
};

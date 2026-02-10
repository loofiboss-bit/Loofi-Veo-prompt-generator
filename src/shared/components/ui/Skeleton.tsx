import React from 'react';

interface StudioSkeletonProps {
    title?: string;
}

export function StudioSkeleton({ title = 'Studio' }: StudioSkeletonProps) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-4 sm:p-8">
            <div className="mx-auto h-full max-w-6xl rounded-2xl border border-slate-700/60 bg-slate-900/90 p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/70">Studio</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-100">Loading {title}</h3>
                    </div>
                    <div className="h-9 w-9 animate-pulse rounded-full border border-slate-600 bg-slate-800" />
                </div>

                <div className="grid h-[calc(100%-4.5rem)] grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="space-y-3 lg:col-span-4">
                        <div className="h-12 animate-pulse rounded-lg bg-slate-800/80" />
                        <div className="h-24 animate-pulse rounded-lg bg-slate-800/70" />
                        <div className="h-24 animate-pulse rounded-lg bg-slate-800/60" />
                        <div className="h-24 animate-pulse rounded-lg bg-slate-800/50" />
                    </div>
                    <div className="space-y-3 lg:col-span-8">
                        <div className="h-12 animate-pulse rounded-lg bg-slate-800/80" />
                        <div className="h-64 animate-pulse rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-700/40" />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-24 animate-pulse rounded-lg bg-slate-800/60" />
                            <div className="h-24 animate-pulse rounded-lg bg-slate-800/50" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ModalSkeleton() {
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4">
                <div className="h-8 w-1/3 bg-slate-800 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-slate-800/60 rounded animate-pulse" />
                <div className="space-y-2 pt-4">
                    <div className="h-10 w-full bg-slate-800/40 rounded animate-pulse" />
                    <div className="h-10 w-full bg-slate-800/40 rounded animate-pulse" />
                    <div className="h-10 w-full bg-slate-800/40 rounded animate-pulse" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <div className="h-9 w-20 bg-slate-800 rounded animate-pulse" />
                    <div className="h-9 w-20 bg-slate-700 rounded animate-pulse" />
                </div>
            </div>
        </div>
    );
}

export function TimelineSkeleton() {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-slate-900 border-t border-slate-700 h-64 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="flex gap-2">
                    <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-slate-800 rounded animate-pulse" />
                </div>
            </div>
            <div className="h-8 w-full bg-slate-800/30 rounded animate-pulse" />
            <div className="space-y-2">
                <div className="flex gap-1 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-24 w-40 bg-slate-800/40 rounded border border-slate-700/50 animate-pulse shrink-0" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Default export if needed, though named exports are preferred
export default { StudioSkeleton, ModalSkeleton, TimelineSkeleton };

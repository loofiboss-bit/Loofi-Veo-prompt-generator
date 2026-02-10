import React from 'react';

interface StudioSkeletonProps {
  title: string;
}

export default function StudioSkeleton({ title }: StudioSkeletonProps) {
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

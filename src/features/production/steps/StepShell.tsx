import type { ReactNode } from 'react';

export function StepShell({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-step-title`} className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
          Create step
        </p>
        <h2 id={`${id}-step-title`} className="mt-1 text-xl font-semibold text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </header>
      {children}
    </section>
  );
}

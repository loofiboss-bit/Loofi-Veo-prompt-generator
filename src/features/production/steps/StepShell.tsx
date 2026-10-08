import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('create');
  return (
    <section aria-labelledby={`${id}-step-title`} className="space-y-4">
      <header>
        <h2
          id={`${id}-step-title`}
          tabIndex={-1}
          className="mt-1 text-lg font-semibold text-slate-100 focus:outline-none"
        >
          {t(`steps.${id}.title`, title)}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{t(`steps.${id}.description`, description)}</p>
      </header>
      {children}
    </section>
  );
}

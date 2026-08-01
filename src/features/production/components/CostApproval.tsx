import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export const CostApproval = ({
  children,
  hidden = false,
}: {
  children: ReactNode;
  hidden?: boolean;
}) => {
  const { t } = useTranslation('create');

  return (
    <section
      hidden={hidden}
      aria-labelledby="cost-approval-title"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <h2 id="cost-approval-title" className="sr-only">
        {t('labels.costApproval')}
      </h2>
      {children}
    </section>
  );
};

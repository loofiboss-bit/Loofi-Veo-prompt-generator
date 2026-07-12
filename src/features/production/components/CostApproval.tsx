import type { ReactNode } from 'react';
export const CostApproval = ({
  children,
  hidden = false,
}: {
  children: ReactNode;
  hidden?: boolean;
}) => (
  <section
    hidden={hidden}
    aria-labelledby="cost-approval-title"
    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
  >
    <h2 id="cost-approval-title" className="sr-only">
      Cost approval
    </h2>
    {children}
  </section>
);

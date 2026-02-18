import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizationStore } from '@core/store/useOptimizationStore';

const SEVERITY_STYLES = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'ℹ️' },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '⚠️' },
};

export const NarrativeHealthPanel: React.FC = () => {
  const { t } = useTranslation('optimization');
  const issues = useOptimizationStore((state) => state.narrativeIssues);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h3 className="text-sm font-medium text-gray-300 mb-2">{t('narrative.title')}</h3>
      {issues.length === 0 ? (
        <p className="text-xs text-gray-500">{t('narrative.noIssues')}</p>
      ) : (
        <div role="list" className="space-y-1.5">
          {issues.map((issue) => {
            const style = SEVERITY_STYLES[issue.severity];
            return (
              <div
                key={issue.id}
                role="listitem"
                aria-label={t('aria.narrativeIssue', {
                  severity: t(`narrative.severity.${issue.severity}`),
                  description: issue.suggestion,
                })}
                className={`flex items-start gap-2 rounded p-2 ${style.bg} border ${style.border}`}
              >
                <span className="text-sm flex-shrink-0" aria-hidden="true">
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                      {t(`narrative.issues.${issue.type}`)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">{issue.suggestion}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

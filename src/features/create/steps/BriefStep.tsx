import { useTranslation } from 'react-i18next';

import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

export function BriefStep({ workflow }: { workflow: CreateWorkflowController }) {
  const { t } = useTranslation('create');

  return (
    <>
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <label htmlFor="creator-brief-idea" className="text-sm font-semibold text-slate-100">
          {t('labels.idea')}
        </label>
        <textarea
          id="creator-brief-idea"
          name="idea"
          value={workflow.promptState.idea}
          onChange={(event) => workflow.setPromptState({ idea: event.target.value })}
          placeholder={t('labels.ideaPlaceholder')}
          rows={4}
          className="mt-2 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        />
        <p className="mt-2 text-xs text-slate-400">{t('labels.ideaHelp')}</p>
      </section>

      {workflow.activeRun && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold">{t('labels.directorBrief')}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
            {workflow.activeRun.brief}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {t('labels.sourceRevision', {
              source: workflow.activeRun.source,
              revision: workflow.activeRun.planRevision,
            })}
          </p>
        </section>
      )}
    </>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PromptStudioDraftV1, StudioRevisionV1 } from '@core/types';
import { studioRevisionService } from '@core/services/studioRevisionService';
import { StudioComparison } from './StudioComparison';

export function StudioRevisionHistory({
  draft,
  refreshKey,
  disabled,
  onSave,
  onRestore,
}: {
  draft: PromptStudioDraftV1;
  refreshKey: number;
  disabled: boolean;
  onSave: () => Promise<void>;
  onRestore: (revision: StudioRevisionV1) => Promise<void>;
}) {
  const { t } = useTranslation('studio');
  const [revisions, setRevisions] = useState<StudioRevisionV1[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setRevisions([]);
    setError('');
    setLoading(true);
    void studioRevisionService
      .list(draft.projectId)
      .then((items) => {
        if (active) setRevisions([...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : t('actionError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [draft.projectId, refreshKey, reload, t]);
  const selected = revisions.find((item) => item.id === selectedId);
  const act = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
      setReload((n) => n + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('actionError'));
    }
  };
  return (
    <details className="studio-details">
      <summary>{t('revision.title')}</summary>
      <p className="studio-hint">{t('revision.description')}</p>
      {error ? (
        <div role="alert" className="studio-notice">
          {error}
          <button onClick={() => setReload((n) => n + 1)}>{t('retrySave')}</button>
        </div>
      ) : null}
      <div className="studio-actions">
        <button disabled={disabled} onClick={() => void act(onSave)}>
          {t('revision.save')}
        </button>
      </div>
      <label className="studio-field">
        <span>{t('revision.choose')}</span>
        <select value={selected?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">{t('revision.choose')}</option>
          {revisions.map((item) => (
            <option key={item.id} value={item.id}>
              {new Date(item.createdAt).toLocaleString()} ·{' '}
              {t('revision.reasons.' + item.reason, { defaultValue: item.reason })}
            </option>
          ))}
        </select>
      </label>
      {loading ? <p role="status">{t('loading')}</p> : null}
      {!loading && !error && !revisions.length ? (
        <p className="studio-hint">{t('revision.empty')}</p>
      ) : null}
      {selected ? (
        <>
          <StudioComparison before={draft} after={selected.snapshot} />
          <button disabled={disabled} onClick={() => void act(() => onRestore(selected))}>
            {t('revision.restore')}
          </button>
        </>
      ) : null}
    </details>
  );
}

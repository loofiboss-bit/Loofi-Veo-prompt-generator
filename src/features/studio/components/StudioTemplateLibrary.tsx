import { studioInputRows } from './studioInputPresentation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PromptStudioDraftV1 } from '@core/types/promptStudioDraft';
import type { StudioTemplateV1 } from '@core/types/studioTemplate';
import {
  sanitizeStudioTemplate,
  studioTemplateService,
} from '@core/services/studioTemplateService';

interface StudioTemplateLibraryProps {
  draft: PromptStudioDraftV1;
  onApply: (template: StudioTemplateV1) => Promise<void>;
}

export function StudioTemplateLibrary({ draft, onApply }: StudioTemplateLibraryProps) {
  const { t } = useTranslation('studio');
  const id = useId();
  const [templates, setTemplates] = useState<StudioTemplateV1[]>([]);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<StudioTemplateV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await studioTemplateService.list();
      if (mounted.current) setTemplates(loaded);
    } catch {
      if (mounted.current) setError(t('templateLibrary.loadFailed'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const workspace = useRef(`${draft.projectId}:${draft.mode}`);
  useEffect(() => {
    const current = `${draft.projectId}:${draft.mode}`;
    if (workspace.current !== current) {
      workspace.current = current;
      setSelected(null);
      setTarget('');
      setName('');
      setDescription('');
      setMessage(null);
    }
  }, [draft.mode, draft.projectId]);

  const act = async (operation: () => Promise<void>, successKey: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
      if (mounted.current) setMessage(t(successKey));
    } catch {
      if (mounted.current) setError(t('templateLibrary.operationFailed'));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const modeTemplates = templates.filter((template) => template.kind === draft.mode);
  const targets = [
    ...new Set(
      modeTemplates.map((template) =>
        template.kind === 'video'
          ? template.input.target
          : (template.input.targetProfile ?? 'suno-v5.5'),
      ),
    ),
  ];
  const visible = modeTemplates.filter((template) => {
    const templateTarget =
      template.kind === 'video'
        ? template.input.target
        : (template.input.targetProfile ?? 'suno-v5.5');
    return (
      (!target || templateTarget === target) &&
      `${template.name} ${template.description}`.toLowerCase().includes(query.trim().toLowerCase())
    );
  });

  return (
    <section className="studio-card" aria-labelledby={`${id}-title`} aria-busy={busy || loading}>
      <h2 id={`${id}-title`}>{t('templateLibrary.title')}</h2>
      <p>{t('templateLibrary.description')}</p>
      <p>{t(draft.mode === 'video' ? 'videoMode' : 'musicMode')}</p>
      <div className="studio-fields">
        <label className="studio-field">
          <span>{t('templateLibrary.name')}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
        </label>
        <label className="studio-field">
          <span>{t('templateLibrary.details')}</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={busy}
          />
        </label>
      </div>
      <button
        disabled={busy || !name.trim()}
        onClick={() =>
          void act(async () => {
            const saved = await studioTemplateService.create(name, description, draft);
            setTemplates((current) => [saved, ...current]);
            setSelected(saved);
          }, 'templateLibrary.saved')
        }
      >
        {t('templateLibrary.save')}
      </button>
      <div className="studio-fields">
        <label className="studio-field">
          <span>{t('templateLibrary.search')}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="studio-field">
          <span>{t('templateLibrary.target')}</span>
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">{t('templateLibrary.allTargets')}</option>
            {targets.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <div role="alert" className="studio-notice">
          {error}
          <button disabled={busy || loading} onClick={() => void load()}>
            {t('templateLibrary.retry')}
          </button>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {loading ? (
        <p role="status">{t('loading')}</p>
      ) : visible.length ? (
        <ul>
          {visible.map((template) => (
            <li key={template.id}>
              <button
                disabled={busy}
                aria-pressed={selected?.id === template.id}
                onClick={() => {
                  setSelected(template);
                  setName(template.name);
                  setDescription(template.description);
                }}
              >
                {template.name} — {t('templateLibrary.preview')}
              </button>
              {template.source === 'legacy' ? <span> {t('templateLibrary.legacy')}</span> : null}
            </li>
          ))}
        </ul>
      ) : !error ? (
        <p>{t('templateLibrary.empty')}</p>
      ) : null}
      {selected && selected.kind === draft.mode ? (
        <div className="studio-notice">
          <h3>{selected.name}</h3>
          <p>{selected.description}</p>
          <dl>
            {studioInputRows(selected.input, t).map(({ label, value }, index) => (
              <div key={index}>
                <dt>{label}</dt>
                <dd className="whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
            {selected.kind === 'music' && selected.lockedSections.length ? (
              <div>
                <dt>{t('lockSection')}</dt>
                <dd>{selected.lockedSections.join(', ')}</dd>
              </div>
            ) : null}
          </dl>
          {selected.kind === 'video' ? <p>{t('templateLibrary.mediaNotice')}</p> : null}
          <div className="studio-toolbar">
            <button
              disabled={busy}
              onClick={() =>
                void act(() => onApply(sanitizeStudioTemplate(selected)), 'templateLibrary.applied')
              }
            >
              {t('templateLibrary.apply')}
            </button>
            {selected.source === 'studio' ? (
              <>
                <button
                  disabled={busy || !name.trim()}
                  onClick={() =>
                    void act(async () => {
                      const saved = await studioTemplateService.update(
                        selected.id,
                        name,
                        description,
                        draft,
                      );
                      setTemplates((current) =>
                        current.map((template) => (template.id === saved.id ? saved : template)),
                      );
                      setSelected(saved);
                    }, 'templateLibrary.updated')
                  }
                >
                  {t('templateLibrary.update')}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await studioTemplateService.remove(selected.id);
                      setTemplates((current) =>
                        current.filter((template) => template.id !== selected.id),
                      );
                      setSelected(null);
                    }, 'templateLibrary.deleted')
                  }
                >
                  {t('templateLibrary.delete')}
                </button>
              </>
            ) : null}
            <button disabled={busy} onClick={() => setSelected(null)}>
              {t('templateLibrary.close')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

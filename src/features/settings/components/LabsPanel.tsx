import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { LAB_CAPABILITIES } from '@core/config/studioCapabilities';
const ComfyUiSettingsSection = lazy(() =>
  import('./ComfyUiSettingsSection').then((m) => ({ default: m.ComfyUiSettingsSection })),
);
export function LabsPanel() {
  const { t } = useTranslation('studio');
  const enabled = useSettingsStore((s) => s.enableExperimentalFeatures);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  return (
    <section className="studio-workspace">
      <h2 className="text-xl font-semibold">Labs</h2>
      <p className="studio-hint">{t('labsDescription')}</p>
      <label className="studio-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => updateSettings({ enableExperimentalFeatures: e.target.checked })}
        />
        {t('enableLabs')}
      </label>
      <ul className="mt-4 space-y-4">
        {LAB_CAPABILITIES.map((cap) => (
          <li key={cap.id}>
            <strong>{cap.label}</strong>
            <p className="studio-hint">{t('labs.' + cap.id)}</p>
            {!cap.runnable ? <span className="studio-hint">{t('notAvailable')}</span> : null}
          </li>
        ))}
      </ul>
      {enabled ? (
        <Suspense fallback={<p>{t('loading')}</p>}>
          <ComfyUiSettingsSection />
        </Suspense>
      ) : null}
    </section>
  );
}

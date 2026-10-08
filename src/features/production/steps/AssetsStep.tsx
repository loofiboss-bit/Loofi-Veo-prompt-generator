import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { openAssetLibrary } from '@shared/utils/assetLibraryEvents';
import { StepShell } from './StepShell';

export function AssetsStep({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <StepShell
      id="assets"
      title="Assets"
      description="Attach references and verify every required local asset before approval."
    >
      <button
        type="button"
        onClick={openAssetLibrary}
        className="rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold"
      >
        {t('assets.browseLibrary', 'Browse project assets')}
      </button>
      {children}
    </StepShell>
  );
}

import type { UniversalVideoTarget } from '@core/types/modelTranspiler';
import { TARGET_MODEL_PROFILES } from '@core/services/modelTranspilerService';
import { STUDIO_CAPABILITIES } from '@core/config/studioCapabilities';
import { useTranslation } from 'react-i18next';

interface UniversalTargetSelectorProps {
  value: string;
  onChange: (
    value: import('@core/types/promptArtifact').VideoPromptArtifactInput['target'],
  ) => void | Promise<void>;
}

export function UniversalTargetSelector({ value, onChange }: UniversalTargetSelectorProps) {
  const { t } = useTranslation('studio');
  const currentTarget = (
    value in TARGET_MODEL_PROFILES ? value : 'flow-veo'
  ) as UniversalVideoTarget;
  const profile = value === 'veo-api' ? undefined : TARGET_MODEL_PROFILES[currentTarget];

  return (
    <div className="space-y-1">
      <select
        aria-label={t('target')}
        value={value}
        onChange={(event) =>
          void onChange(
            event.target
              .value as import('@core/types/promptArtifact').VideoPromptArtifactInput['target'],
          )
        }
        data-studio-field="target"
        className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition focus:border-cyan-400"
        style={{
          background: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-primary)',
        }}
      >
        {Object.entries(STUDIO_CAPABILITIES)
          .filter(([target]) => target !== 'suno')
          .map(([target, capability]) => (
            <option key={target} value={target}>
              {capability.label}
            </option>
          ))}
      </select>
      {profile ? (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>{profile.vendor}</span>
          <span className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>
            {profile.syntaxFlavor}
          </span>
        </div>
      ) : null}
    </div>
  );
}

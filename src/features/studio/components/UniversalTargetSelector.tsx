import type { UniversalVideoTarget } from '@core/types/modelTranspiler';
import {
  TARGET_MODEL_PROFILES,
  getTargetProfiles,
  isActiveStudioTarget,
} from '@core/services/modelTranspilerService';
import { STUDIO_CAPABILITIES } from '@core/config/studioCapabilities';
import { useTranslation } from 'react-i18next';

interface UniversalTargetSelectorProps {
  value: string;
  profileId?: string;
  onProfileChange?: (profileId: string) => void;
  disabled?: boolean;
  onChange: (
    value: import('@core/types/promptArtifact').VideoPromptArtifactInput['target'],
  ) => void | Promise<void>;
}

export function UniversalTargetSelector({
  value,
  onChange,
  profileId,
  onProfileChange,
  disabled,
}: UniversalTargetSelectorProps) {
  const { t } = useTranslation('studio');
  const currentTarget = (
    value in TARGET_MODEL_PROFILES ? value : 'flow-veo'
  ) as UniversalVideoTarget;
  const profile = TARGET_MODEL_PROFILES[currentTarget];

  return (
    <div className="space-y-1">
      <select
        aria-label={t('target')}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          void onChange(
            event.target
              .value as import('@core/types/promptArtifact').VideoPromptArtifactInput['target'],
          )
        }
        data-studio-field="target"
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-cyan-400"
        style={{
          background: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border-primary)',
        }}
      >
        {!isActiveStudioTarget(currentTarget) ? (
          <option value={value} disabled>
            {t('modern.retiredTarget')}
          </option>
        ) : null}
        {Object.entries(STUDIO_CAPABILITIES)
          .filter(
            ([target]) => target !== 'suno' && isActiveStudioTarget(target as UniversalVideoTarget),
          )
          .map(([target, capability]) => (
            <option key={target} value={target}>
              {capability.label}
            </option>
          ))}
      </select>
      {onProfileChange && isActiveStudioTarget(currentTarget) ? (
        <label className="studio-field">
          <span>{t('modern.modelProfile')}</span>
          <select
            aria-label={t('modern.modelProfile')}
            value={profileId ?? getTargetProfiles(currentTarget)[0]?.profileId}
            disabled={disabled}
            onChange={(event) => onProfileChange(event.target.value)}
          >
            {getTargetProfiles(currentTarget).map((item) => (
              <option key={item.profileId} value={item.profileId}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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

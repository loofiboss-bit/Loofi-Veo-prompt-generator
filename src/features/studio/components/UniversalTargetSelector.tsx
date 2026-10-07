import type { UniversalVideoTarget } from '@core/types/modelTranspiler';
import { TARGET_MODEL_PROFILES } from '@core/services/modelTranspilerService';

interface UniversalTargetSelectorProps {
  value: string;
  onChange: (value: UniversalVideoTarget) => void;
}

export function UniversalTargetSelector({ value, onChange }: UniversalTargetSelectorProps) {
  const currentTarget = (
    value in TARGET_MODEL_PROFILES ? value : 'flow-veo'
  ) as UniversalVideoTarget;
  const profile = TARGET_MODEL_PROFILES[currentTarget];

  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as UniversalVideoTarget)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
      >
        <option value="flow-veo">Google Flow / Veo 3.1 (Default)</option>
        <option value="kling">Kling 1.5 / 2.0 (Bracket Tags)</option>
        <option value="runway-gen3">Runway Gen-3 / Gen-4 (Motion Vectors)</option>
        <option value="sora">OpenAI Sora (Photochemical Realism)</option>
        <option value="luma-ray">Luma Dream Machine Ray-2 (Trajectory Anchors)</option>
        <option value="veo-api">Veo API (Raw Direct)</option>
      </select>
      {profile ? (
        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>{profile.vendor}</span>
          <span className="font-mono text-cyan-300">{profile.syntaxFlavor}</span>
        </div>
      ) : null}
    </div>
  );
}

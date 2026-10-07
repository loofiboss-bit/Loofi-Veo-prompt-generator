import { useState } from 'react';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { checkComfyUiHealth } from '@core/services/comfyUiService';
import type { ComfyUiSystemStats, ComfyUiWorkflowPreset } from '@core/types/comfyUi';
import Icon from '@shared/components/ui/Icon';

export function ComfyUiSettingsSection() {
  const { comfyUiEnabled, comfyUiEndpoint, comfyUiWorkflowPreset, updateSettings } =
    useSettingsStore();

  const [endpoint, setEndpoint] = useState(comfyUiEndpoint);
  const [preset, setPreset] = useState<ComfyUiWorkflowPreset>(
    (comfyUiWorkflowPreset as ComfyUiWorkflowPreset) || 'stable-video-diffusion',
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    online: boolean;
    stats?: ComfyUiSystemStats;
    error?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await checkComfyUiHealth(endpoint);
      setTestResult({
        online: result.online,
        stats: result.systemStats,
        error: result.error,
      });
    } catch (err) {
      setTestResult({
        online: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    updateSettings({
      comfyUiEnabled: true,
      comfyUiEndpoint: endpoint,
      comfyUiWorkflowPreset: preset as
        | 'stable-video-diffusion'
        | 'hunyuan-video'
        | 'cogvideox'
        | 'animatediff',
    });
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon name="video" className="text-cyan-400 text-lg" />
          <div>
            <h3 className="text-base font-semibold text-slate-100">Local ComfyUI GPU Engine</h3>
            <p className="text-xs text-slate-400">
              Generate test video takes locally on your own GPU with zero cloud API charges.
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={comfyUiEnabled}
            onChange={(e) => updateSettings({ comfyUiEnabled: e.target.checked })}
            className="sr-only peer"
            aria-label="Enable ComfyUI Local GPU Engine"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
        </label>
      </div>

      {comfyUiEnabled ? (
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          <div>
            <label
              htmlFor="comfyui-endpoint-input"
              className="block text-xs font-medium text-slate-400 mb-1"
            >
              ComfyUI Server Endpoint
            </label>
            <div className="flex gap-2">
              <input
                id="comfyui-endpoint-input"
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://127.0.0.1:8188"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleTestConnection()}
                disabled={isTesting}
                className="px-3.5 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium hover:bg-slate-700 transition disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>

          {testResult ? (
            <div
              className={`p-3 rounded-lg border text-xs space-y-1 ${
                testResult.online
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <span aria-hidden="true">{testResult.online ? '✓' : '×'}</span>
                {testResult.online
                  ? 'Connected to local ComfyUI instance'
                  : `Failed to connect: ${testResult.error || 'Server unreachable'}`}
              </div>
              {testResult.stats?.devices?.[0] ? (
                <div className="text-[11px] opacity-90">
                  GPU: {testResult.stats.devices[0].name} • VRAM Free:{' '}
                  {(testResult.stats.devices[0].vram_free / 1024).toFixed(1)} GB /{' '}
                  {(testResult.stats.devices[0].vram_total / 1024).toFixed(1)} GB
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="comfyui-preset-select"
              className="block text-xs font-medium text-slate-400 mb-1"
            >
              Default Video Model Workflow
            </label>
            <select
              id="comfyui-preset-select"
              value={preset}
              onChange={(e) => setPreset(e.target.value as ComfyUiWorkflowPreset)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-cyan-400 focus:outline-none"
            >
              <option value="stable-video-diffusion">
                Stable Video Diffusion (SVD-XT) — Fast & Reliable
              </option>
              <option value="hunyuan-video">HunyuanVideo 720p — Cinematic Quality</option>
              <option value="cogvideox">CogVideoX 5B — Action & Temporal Dynamics</option>
              <option value="animatediff">AnimateDiff — Stylized & Motion Rich</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold hover:bg-cyan-300 transition"
            >
              Save ComfyUI Settings
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

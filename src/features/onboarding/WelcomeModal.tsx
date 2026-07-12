import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/ui/Modal';
import Button from '@shared/components/ui/Button';
import { useOnboarding } from '@shared/contexts/OnboardingContext';
import { setStoredApiKeyAsync } from '@core/services/apiKeyService';
import { useProjectStore } from '@core/store/useProjectStore';
import { useAppStore } from '@core/store/useAppStore';
import type { CostMode, ModelProvider } from '@core/models/catalog';
import { resolveProviderModelId } from '@core/models/catalog';
import { routeModel } from '@core/models/router';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = ['Language', 'Project folder', 'Provider', 'Cost mode', 'Privacy', 'Sample'] as const;

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const { setWelcomeShown } = useOnboarding();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [projectFolder, setProjectFolder] = useState('Default app data folder');
  const [provider, setProvider] = useState<ModelProvider>('gemini-api');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('http://127.0.0.1:11434');
  const [connectionMessage, setConnectionMessage] = useState('Not tested');
  const [connectionOk, setConnectionOk] = useState(false);
  const [costMode, setCostMode] = useState<CostMode>('smart');
  const [createSample, setCreateSample] = useState(true);
  const [busy, setBusy] = useState(false);

  const testConnection = async () => {
    setBusy(true);
    try {
      if (provider === 'gemini-api' && apiKey.trim()) {
        await setStoredApiKeyAsync(apiKey.trim());
        setApiKey('');
      }
      const result = await window.electron?.testProviderConnection?.({
        profile: {
          id: 'onboarding',
          provider,
          label: STEPS[step],
          endpoint: provider === 'ollama' ? endpoint : undefined,
        },
        providerModelId:
          provider === 'ollama'
            ? 'llama3.2'
            : resolveProviderModelId(
                routeModel({ operation: 'plan', mode: 'smart' }).model.id,
                provider,
              ),
      });
      if (!result) {
        setConnectionOk(provider === 'gemini-api' && Boolean(apiKey.trim()));
        setConnectionMessage('Saved for browser use. Connection will be verified on first call.');
      } else {
        setConnectionOk(result.ok);
        setConnectionMessage(result.message);
      }
    } catch (error) {
      setConnectionOk(false);
      setConnectionMessage(error instanceof Error ? error.message : 'Connection test failed.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    await i18n.changeLanguage(language);
    localStorage.setItem('v8-project-folder', projectFolder);
    localStorage.setItem('v8-provider-profile', JSON.stringify({ provider, endpoint }));
    localStorage.setItem('v8-default-cost-mode', costMode);
    if (createSample) {
      const project = await useProjectStore.getState().createProject({
        name: 'Sample: Neon Rain',
        description: 'Local-first sample project. No cloud call has been made.',
        tags: ['sample', 'local-only'],
      });
      if (project) {
        const app = useAppStore.getState();
        app.setPromptState({
          idea: 'A detective crosses a neon-lit street in heavy rain.',
          environment: 'Night city, wet asphalt, reflected signs',
          cameraMovement: 'Slow cinematic push-in',
          lightingStyle: 'Neon noir',
        });
        app.setSbShots([
          {
            id: 1,
            type: 'video',
            action: 'The detective pauses beneath a flickering sign.',
            camera: 'Slow push-in from a wide establishing frame',
            characterId: '',
            generatedVideoUrl: '',
            takes: [],
            selectedTakeIndex: 0,
            visualLink: false,
            duration: 8,
            transition: { type: 'cut', duration: 0 },
          },
        ]);
      }
    }
    setWelcomeShown();
    localStorage.setItem('v8-onboarding-complete', 'true');
    onClose();
    setBusy(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="lg" closeOnBackdropClick={false}>
      <div className="space-y-6 p-6 text-left text-slate-100">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
            First run · {step + 1}/{STEPS.length}
          </p>
          <h1 className="mt-1 text-2xl font-bold">{STEPS[step]}</h1>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-800">
            <div
              className="h-full bg-cyan-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {step === 0 && (
          <select
            aria-label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 p-3"
          >
            <option value="en">English</option>
            <option value="sv">Svenska</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
          </select>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Projects, media, checksums, and rotating backups live here.
            </p>
            <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm">
              {projectFolder}
            </div>
            <Button
              onClick={async () =>
                setProjectFolder((await window.electron?.selectProjectFolder?.()) ?? projectFolder)
              }
            >
              Choose folder
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <select
              aria-label="Provider"
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value as ModelProvider);
                setConnectionOk(false);
              }}
              className="w-full rounded border border-slate-700 bg-slate-900 p-3"
            >
              <option value="gemini-api">Gemini API / Google AI Studio</option>
              <option value="vertex-ai">Vertex AI (ADC/OAuth)</option>
              <option value="ollama">Ollama local drafting</option>
            </select>
            {provider === 'gemini-api' && (
              <input
                aria-label="Gemini API key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste key (stored in OS vault)"
                className="w-full rounded border border-slate-700 bg-slate-900 p-3"
              />
            )}
            {provider === 'ollama' && (
              <input
                aria-label="Ollama endpoint"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 p-3"
              />
            )}
            <Button onClick={() => void testConnection()} disabled={busy}>
              Test connection
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setConnectionOk(true);
                setConnectionMessage(
                  'Provider setup deferred. Local planning and sample mode remain available.',
                );
              }}
            >
              Configure later
            </Button>
            <p
              role="status"
              className={connectionOk ? 'text-sm text-emerald-300' : 'text-sm text-amber-300'}
            >
              {connectionMessage}
            </p>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(['smart', 'quality', 'fast', 'economy', 'manual'] as CostMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCostMode(mode)}
                className={`rounded border p-3 text-left capitalize ${costMode === mode ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              Desktop credentials stay in the OS vault. Paid submissions, polling, media downloads,
              hashing, and file writes run in Electron main.
            </p>
            <p>
              Every media call requires a visible cost approval. Local planning and this wizard make
              no paid cloud calls.
            </p>
            <p>
              Ollama is local drafting/review only and is never presented as a Google video
              provider.
            </p>
          </div>
        )}
        {step === 5 && (
          <label className="flex gap-3 rounded border border-slate-700 p-4">
            <input
              aria-label="Create local sample project"
              type="checkbox"
              checked={createSample}
              onChange={(event) => setCreateSample(event.target.checked)}
            />
            <span>
              <strong>Create local sample project</strong>
              <span className="mt-1 block text-sm text-slate-400">
                Adds one editable brief and scene without contacting any provider.
              </span>
            </span>
          </label>
        )}

        <div className="flex justify-between border-t border-slate-800 pt-4">
          <Button
            variant="ghost"
            disabled={step === 0 || busy}
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              disabled={step === 2 && !connectionOk}
              onClick={() => setStep((value) => value + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void finish()}>
              Create workspace
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WelcomeModal;

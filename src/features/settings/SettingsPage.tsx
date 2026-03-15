/**
 * SettingsPage Component
 * v2.4.0 — Full-page settings route (replaces modal for routed access)
 *
 * Reuses existing settings tab components (UpdateSettings, DesktopSettings,
 * PluginList, MarketplacePanel, ApiKeyModal) and adds new Language and
 * Theme/Accent sections.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@core/config/routes';
import { useViewport } from '@shared/hooks/useViewport';
import { UpdateSettings } from './updates/components/UpdateSettings';
import { DesktopSettings } from './desktop/components/DesktopSettings';
import PluginList from '@features/plugins/components/PluginList';
import { MarketplacePanel } from '@features/plugins/components/MarketplacePanel';
import { ApiKeyModal } from './ApiKeyModal';
import { useSettingsStore, type PromptGenerationProvider } from '@core/store/useSettingsStore';
import { registryService } from '@core/services/registryService';
import { checkOllamaHealth } from '@core/services/ollamaProvider';
import { themeService, ACCENT_PRESETS, type AccentPresetKey } from '@core/services/themeService';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  changeAppLanguage,
  type SupportedLanguage,
} from '@core/config/i18n';
import Icon from '@shared/components/ui/Icon';
import { useAppStore } from '@core/store/useAppStore';

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

interface SettingsPageProps {
  /** When true, renders without the back-navigation chrome (for embedding in modal). */
  embedded?: boolean;
}

const SETTINGS_TABS = ['general', 'updates', 'desktop', 'plugins', 'registry'] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

function isSettingsTab(value: string | null): value is SettingsTab {
  return value !== null && SETTINGS_TABS.includes(value as SettingsTab);
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ embedded = false }) => {
  const { t, i18n } = useTranslation('settings');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCompact } = useViewport();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    isSettingsTab(initialTab) ? initialTab : 'general',
  );
  const { registryUrl, promptGenerationProvider, localLlmEndpoint, localLlmModel, updateSettings } =
    useSettingsStore();
  const [localRegistryUrl, setLocalRegistryUrl] = useState(registryUrl ?? '');
  const [registryUrlError, setRegistryUrlError] = useState<string | null>(null);
  const isOllamaProvider = promptGenerationProvider === 'ollama';

  // Local LLM state
  const [localEndpoint, setLocalEndpoint] = useState(localLlmEndpoint);
  const [localModelName, setLocalModelName] = useState(localLlmModel);
  const [llmHealth, setLlmHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [llmChecking, setLlmChecking] = useState(false);

  // Theme state
  const { theme, setTheme } = useAppStore();
  const [currentAccent, setCurrentAccent] = useState<AccentPresetKey>(themeService.getAccent());

  const handleRegistryUrlSave = () => {
    const trimmed = localRegistryUrl.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setRegistryUrlError('Must be a valid URL (https://...)');
      return;
    }
    setRegistryUrlError(null);
    updateSettings({ registryUrl: trimmed });
    if (trimmed) {
      registryService.configure({ baseUrl: trimmed });
    }
  };

  const handleLanguageChange = async (lang: string) => {
    await changeAppLanguage(lang as SupportedLanguage);
  };

  const handleAccentChange = async (accent: AccentPresetKey) => {
    await themeService.setAccent(accent);
    setCurrentAccent(accent);
  };

  const handleThemeToggle = () => {
    const nextMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextMode);
    themeService.setMode(nextMode).catch(() => {});
  };

  const handlePromptProviderChange = (provider: PromptGenerationProvider) => {
    updateSettings({
      promptGenerationProvider: provider,
      localLlmEnabled: provider === 'ollama',
    });
    setLlmHealth(null);
  };

  const tabs = [
    { key: 'general' as const, label: t('general'), icon: 'settings' as const },
    { key: 'updates' as const, label: t('updates'), icon: 'cloud-download' as const },
    { key: 'desktop' as const, label: t('desktop'), icon: 'layers' as const },
    { key: 'plugins' as const, label: t('plugins'), icon: 'code' as const },
    { key: 'registry' as const, label: t('marketplace'), icon: 'globe' as const },
  ];

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (isSettingsTab(requestedTab)) {
      setActiveTab(requestedTab);
      return;
    }

    if (!requestedTab) {
      setActiveTab('general');
    }
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);

    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'general') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }

    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className={`${embedded ? '' : 'p-6'} min-h-full`}>
      {/* Header with back navigation */}
      {!embedded && (
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Back to prompt builder"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-100">{t('title')}</h1>
        </div>
      )}

      <div className={`flex flex-col lg:flex-row gap-6 ${isCompact ? 'max-w-full' : 'max-w-6xl'}`}>
        {/* Tab sidebar */}
        <nav className="flex lg:flex-col gap-1 lg:w-48 overflow-x-auto lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon name={tab.icon} className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {activeTab === 'general' && (
            <div className="space-y-8">
              {/* Language Selection */}
              <section>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{t('language')}</h3>
                <p className="text-sm text-slate-400 mb-4">{t('languageDescription')}</p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        lang === i18n.language
                          ? 'bg-cyan-600 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
              </section>

              {/* Theme Mode */}
              <section>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{t('theme')}</h3>
                <p className="text-sm text-slate-400 mb-4">{t('themeDescription')}</p>
                <div className="flex gap-4">
                  {/* Dark theme option */}
                  <button
                    onClick={theme === 'light' ? handleThemeToggle : undefined}
                    className={`flex-1 rounded-xl border-2 transition-all overflow-hidden ${
                      theme === 'dark'
                        ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="bg-slate-900 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <div className="flex-1 h-3 bg-slate-800 rounded" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-10 bg-slate-800 rounded" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2 w-3/4 bg-slate-700 rounded" />
                          <div className="h-2 w-1/2 bg-slate-800 rounded" />
                          <div className="h-4 w-1/3 bg-cyan-600 rounded mt-2" />
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-2 text-sm font-medium text-center ${
                        theme === 'dark' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t('darkMode')}
                    </div>
                  </button>

                  {/* Light theme option */}
                  <button
                    onClick={theme === 'dark' ? handleThemeToggle : undefined}
                    className={`flex-1 rounded-xl border-2 transition-all overflow-hidden ${
                      theme === 'light'
                        ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="bg-gray-100 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <div className="flex-1 h-3 bg-gray-200 rounded" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-10 bg-gray-200 rounded" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2 w-3/4 bg-gray-300 rounded" />
                          <div className="h-2 w-1/2 bg-gray-200 rounded" />
                          <div className="h-4 w-1/3 bg-cyan-600 rounded mt-2" />
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-2 text-sm font-medium text-center ${
                        theme === 'light' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t('lightMode')}
                    </div>
                  </button>
                </div>
              </section>

              {/* Accent Color */}
              <section>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{t('accentColor')}</h3>
                <p className="text-sm text-slate-400 mb-4">{t('accentColorDescription')}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {(
                    Object.entries(ACCENT_PRESETS) as [
                      AccentPresetKey,
                      (typeof ACCENT_PRESETS)[AccentPresetKey],
                    ][]
                  ).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handleAccentChange(key)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                        currentAccent === key
                          ? 'bg-slate-800 ring-2 ring-cyan-500 shadow-lg'
                          : 'bg-slate-800/50 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-slate-600"
                        style={{
                          backgroundColor: `hsl(${preset.hue}, ${preset.saturation}%, 50%)`,
                        }}
                      />
                      <span className="text-xs text-slate-300 text-center">
                        {t(`presets.${key}`, { defaultValue: preset.label })}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* API Configuration */}
              <section>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  {t('apiConfiguration')}
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <ApiKeyModal
                    isOpen={true}
                    onClose={() => {}}
                    onApiKeySet={() => {}}
                    embedded={true}
                  />
                </div>
              </section>

              {/* Prompt generation provider */}
              <section>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  {t('promptProvider', { defaultValue: 'Prompt Generation Provider' })}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {t('promptProviderDescription', {
                    defaultValue:
                      'Choose which provider generates your main Veo prompt. Gemini-only assistive tools remain unchanged.',
                  })}
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handlePromptProviderChange('gemini')}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      !isOllamaProvider
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                    aria-pressed={!isOllamaProvider}
                  >
                    <div className="text-sm font-semibold">
                      {t('providerGeminiLabel', { defaultValue: 'Gemini Cloud' })}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {t('providerGeminiDescription', {
                        defaultValue:
                          'Uses your Gemini API key for prompt generation and all Gemini-only assistive features.',
                      })}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePromptProviderChange('ollama')}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      isOllamaProvider
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                    }`}
                    aria-pressed={isOllamaProvider}
                  >
                    <div className="text-sm font-semibold">
                      {t('providerOllamaLabel', { defaultValue: 'Ollama Local' })}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {t('providerOllamaDescription', {
                        defaultValue:
                          'Routes main prompt generation through your local Ollama endpoint without sending prompt data to the cloud.',
                      })}
                    </p>
                  </button>
                </div>

                {isOllamaProvider && (
                  <div className="space-y-3">
                    {/* Endpoint */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {t('localLlmEndpoint', { defaultValue: 'Endpoint URL' })}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={localEndpoint}
                          onChange={(e) => setLocalEndpoint(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-cyan-500 focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            setLlmChecking(true);
                            setLlmHealth(null);
                            const result = await checkOllamaHealth(localEndpoint);
                            setLlmHealth(result);
                            setLlmChecking(false);
                          }}
                          disabled={llmChecking}
                          className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors disabled:opacity-50"
                        >
                          {llmChecking ? '...' : t('localLlmCheck', { defaultValue: 'Test' })}
                        </button>
                      </div>
                      {llmHealth && (
                        <p
                          className={`text-xs mt-1 ${
                            llmHealth.ok ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {llmHealth.message}
                        </p>
                      )}
                    </div>

                    {/* Model name */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {t('localLlmModel', { defaultValue: 'Model Name' })}
                      </label>
                      <input
                        type="text"
                        value={localModelName}
                        onChange={(e) => setLocalModelName(e.target.value)}
                        placeholder="llama3"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Save */}
                    <button
                      onClick={() => {
                        updateSettings({
                          promptGenerationProvider: 'ollama',
                          localLlmEnabled: true,
                          localLlmEndpoint: localEndpoint,
                          localLlmModel: localModelName,
                        });
                      }}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 transition-colors"
                    >
                      {t('save')}
                    </button>
                  </div>
                )}
              </section>

              {/* Plugin Registry */}
              <section>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  {t('pluginRegistryUrl')}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={localRegistryUrl}
                    onChange={(e) => {
                      setLocalRegistryUrl(e.target.value);
                      setRegistryUrlError(null);
                    }}
                    placeholder="https://registry.example.com"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    onClick={handleRegistryUrlSave}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 transition-colors"
                  >
                    {t('save')}
                  </button>
                </div>
                {registryUrlError && (
                  <p className="text-red-400 text-xs mt-1">{registryUrlError}</p>
                )}
              </section>
            </div>
          )}

          {activeTab === 'updates' && <UpdateSettings />}
          {activeTab === 'desktop' && <DesktopSettings />}
          {activeTab === 'plugins' && <PluginList />}
          {activeTab === 'registry' && <MarketplacePanel />}
        </div>
      </div>
    </div>
  );
};

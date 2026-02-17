/**
 * SettingsPage Component
 * v2.4.0 — Full-page settings route (replaces modal for routed access)
 *
 * Reuses existing settings tab components (UpdateSettings, DesktopSettings,
 * PluginList, MarketplacePanel, ApiKeyModal) and adds new Language and
 * Theme/Accent sections.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UpdateSettings } from './updates/components/UpdateSettings';
import { DesktopSettings } from './desktop/components/DesktopSettings';
import PluginList from '@features/plugins/components/PluginList';
import { MarketplacePanel } from '@features/plugins/components/MarketplacePanel';
import ApiKeyModal from './ApiKeyModal';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { registryService } from '@core/services/registryService';
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

export const SettingsPage: React.FC<SettingsPageProps> = ({ embedded = false }) => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'general' | 'updates' | 'desktop' | 'plugins' | 'registry'
  >('general');
  const { registryUrl, updateSettings } = useSettingsStore();
  const [localRegistryUrl, setLocalRegistryUrl] = useState(registryUrl ?? '');
  const [registryUrlError, setRegistryUrlError] = useState<string | null>(null);

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

  const tabs = [
    { key: 'general' as const, label: t('general'), icon: 'settings' as const },
    { key: 'updates' as const, label: t('updates'), icon: 'cloud-download' as const },
    { key: 'desktop' as const, label: t('desktop'), icon: 'layers' as const },
    { key: 'plugins' as const, label: t('plugins'), icon: 'code' as const },
    { key: 'registry' as const, label: t('marketplace'), icon: 'globe' as const },
  ];

  return (
    <div className={`${embedded ? '' : 'ml-0 lg:ml-64 p-6'} min-h-screen`}>
      {/* Header with back navigation */}
      {!embedded && (
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Back to prompt builder"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-100">{t('title')}</h1>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl">
        {/* Tab sidebar */}
        <nav className="flex lg:flex-col gap-1 lg:w-48 overflow-x-auto lg:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
        <div className="flex-1 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
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
                        lang === (localStorage.getItem('veo-studio-language') || 'en')
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
                <div className="flex gap-2">
                  <button
                    onClick={theme === 'light' ? handleThemeToggle : undefined}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      theme === 'dark'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t('darkMode')}
                  </button>
                  <button
                    onClick={theme === 'dark' ? handleThemeToggle : undefined}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      theme === 'light'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t('lightMode')}
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

/**
 * Plugin Manager Component
 * v1.4.0 Week 4 - Plugin Architecture Foundation
 */

import React, { useEffect, useState } from 'react';
import { usePluginStore } from '@core/store/pluginStore';
import type { Plugin, PluginManifest } from '@core/types/plugin';

export const PluginManager: React.FC = () => {
  const {
    plugins,
    loading,
    error,
    selectedPlugin,
    initialize,
    activatePlugin,
    deactivatePlugin,
    unloadPlugin,
    selectPlugin,
  } = usePluginStore();

  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleTogglePlugin = async (plugin: Plugin) => {
    try {
      if (plugin.state === 'active') {
        await deactivatePlugin(plugin.manifest.id);
      } else {
        await activatePlugin(plugin.manifest.id);
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const handleUninstall = async (plugin: Plugin) => {
    if (!confirm(`Are you sure you want to uninstall "${plugin.manifest.name}"?`)) {
      return;
    }

    try {
      await unloadPlugin(plugin.manifest.id);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'inactive':
        return 'text-gray-600 dark:text-gray-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStateLabel = (state: string) => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Plugin List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Plugins</h2>
          <button
            onClick={() => setShowInstallModal(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Install Plugin
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && plugins.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading plugins...
            </div>
          ) : plugins.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No plugins installed
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {plugins.map((plugin) => (
                <button
                  key={plugin.manifest.id}
                  onClick={() => selectPlugin(plugin)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedPlugin?.manifest.id === plugin.manifest.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {plugin.manifest.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        v{plugin.manifest.version} • {plugin.manifest.author}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${getStateColor(plugin.state)}`}>
                      {getStateLabel(plugin.state)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Plugin Details */}
      <div className="flex-1 flex flex-col">
        {selectedPlugin ? (
          <>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedPlugin.manifest.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedPlugin.manifest.description}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(
                    selectedPlugin.state,
                  )}`}
                >
                  {getStateLabel(selectedPlugin.state)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTogglePlugin(selectedPlugin)}
                  disabled={loading || selectedPlugin.state === 'error'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPlugin.state === 'active'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedPlugin.state === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleUninstall(selectedPlugin)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Uninstall
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Metadata */}
              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Information
                </h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Version
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {selectedPlugin.manifest.version}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Author</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">
                      {selectedPlugin.manifest.author}
                    </dd>
                  </div>
                  {selectedPlugin.manifest.license && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        License
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white">
                        {selectedPlugin.manifest.license}
                      </dd>
                    </div>
                  )}
                  {selectedPlugin.manifest.homepage && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Homepage
                      </dt>
                      <dd className="text-sm text-blue-600 dark:text-blue-400">
                        <a
                          href={selectedPlugin.manifest.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {selectedPlugin.manifest.homepage}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Permissions */}
              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Permissions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlugin.manifest.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </section>

              {/* Extension Points */}
              {selectedPlugin.manifest.extensionPoints &&
                selectedPlugin.manifest.extensionPoints.length > 0 && (
                  <section className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Extension Points
                    </h3>
                    <div className="space-y-2">
                      {selectedPlugin.manifest.extensionPoints.map((ext, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {ext.type}
                          </p>
                          {ext.label && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{ext.label}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* Settings */}
              {selectedPlugin.manifest.settings &&
                Object.keys(selectedPlugin.manifest.settings).length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Settings
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(selectedPlugin.manifest.settings).map(([key, setting]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {setting.label}
                            {setting.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {setting.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              {setting.description}
                            </p>
                          )}
                          {/* Setting input would go here based on type */}
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder={`Enter ${setting.label.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* Error Display */}
              {selectedPlugin.error && (
                <section className="mt-6">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">
                      Error
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {selectedPlugin.error.message}
                    </p>
                  </div>
                </section>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a plugin to view details
          </div>
        )}
      </div>

      {/* Install Modal */}
      {showInstallModal && <InstallPluginModal onClose={() => setShowInstallModal(false)} />}
    </div>
  );
};

/**
 * Install Plugin Modal
 */
const InstallPluginModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { loadPlugin } = usePluginStore();
  const [manifestJson, setManifestJson] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInstall = async () => {
    setError('');
    setLoading(true);

    try {
      const manifest: PluginManifest = JSON.parse(manifestJson);
      await loadPlugin(manifest);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Install Plugin</h2>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plugin Manifest (JSON)
          </label>
          <textarea
            value={manifestJson}
            onChange={(e) => setManifestJson(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
            placeholder={`{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A sample plugin",
  "author": "Your Name",
  "main": "index.js",
  "permissions": ["storage"]
}`}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={loading || !manifestJson}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
};

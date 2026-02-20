import React, { useEffect, useState } from 'react';
import { pluginService } from '@core/services/pluginService';
import { Plugin } from '@core/types/plugin';
import EmptyState from '@shared/components/EmptyState';
import Icon from '@shared/components/ui/Icon';
import { TrustBadge } from './TrustBadge';

const PluginList: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    const updatePlugins = () => {
      // Accessing private map via public getAll (if available) or casting
      // pluginService has generic getAll() ? No, checking service...
      // It has getAll()
      setPlugins(pluginService.getAll());
    };

    updatePlugins();
    const unsubscribe = pluginService.subscribe(updatePlugins);
    return unsubscribe;
  }, []);

  const handleToggle = async (pluginId: string, currentState: 'active' | 'inactive') => {
    // Not fully implemented in service yet, but we can try deactivate/activate
    // For internal plugins, they are auto-activated.
    // We can add toggle logic later. For now, just show state.
    // Toggle plugin state via service
    if (currentState === 'active') {
      await pluginService.deactivate(pluginId);
    } else {
      await pluginService.activate(pluginId);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Icon name="grid-3x3" className="w-5 h-5 text-fuchsia-400" />
        Installed Plugins
      </h3>

      <div className="grid grid-cols-1 gap-3">
        {plugins.map((plugin) => (
          <div
            key={plugin.manifest.id}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-lg ${plugin.state === 'active' ? 'bg-fuchsia-900/20 text-fuchsia-400' : 'bg-slate-700/30 text-slate-500'}`}
              >
                <Icon name="layers" className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-200 flex items-center gap-2">
                  {plugin.manifest.name}
                  <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                    v{plugin.manifest.version}
                  </span>
                  {plugin.trustLevel && (
                    <TrustBadge trustLevel={plugin.trustLevel} size="sm" showLabel={false} />
                  )}
                </h4>
                <p className="text-sm text-slate-400">{plugin.manifest.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span>{plugin.manifest.author}</span>
                  <span>•</span>
                  <span>{plugin.manifest.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  plugin.state === 'active'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {plugin.state}
              </div>
              {/* Toggle Switch Placeholder */}
              <button
                onClick={() => {
                  if (plugin.state === 'active' || plugin.state === 'inactive') {
                    handleToggle(plugin.manifest.id, plugin.state);
                  }
                }}
                aria-label={`Toggle ${plugin.manifest.name}`}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  plugin.state === 'active' ? 'bg-fuchsia-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    plugin.state === 'active' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}

        {plugins.length === 0 && (
          <EmptyState
            icon="🧩"
            title="No registered plugins found."
            description="Install plugins from the marketplace to extend Veo Studio workflows."
            className="bg-slate-800/20 rounded-xl border border-dashed border-slate-700 py-12"
          />
        )}
      </div>
    </div>
  );
};

export default PluginList;

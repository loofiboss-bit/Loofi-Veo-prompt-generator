/**
 * InstallConfirmDialog
 * Modal dialog for confirming plugin install/update/uninstall operations.
 * Shows permissions, trust level, and action description.
 * v2.0.0 - Platform Transformation
 */

import React from 'react';
import Icon from '@shared/components/ui/Icon';
import { TrustBadge } from './TrustBadge';
import { useMarketplaceStore } from '@core/store/useMarketplaceStore';

// ─── Permission Labels ──────────────────────────────────────────────

const PERMISSION_LABELS: Record<string, { label: string; risk: 'low' | 'medium' | 'high' }> = {
  storage: { label: 'Full storage access', risk: 'medium' },
  'storage:read': { label: 'Read stored data', risk: 'low' },
  'storage:write': { label: 'Write stored data', risk: 'medium' },
  'projects:read': { label: 'Read your projects', risk: 'low' },
  'projects:write': { label: 'Modify your projects', risk: 'high' },
  'history:read': { label: 'Read prompt history', risk: 'low' },
  'history:write': { label: 'Modify prompt history', risk: 'medium' },
  'templates:read': { label: 'Read templates', risk: 'low' },
  'templates:write': { label: 'Modify templates', risk: 'medium' },
  export: { label: 'Export data', risk: 'medium' },
  'ui:sidebar': { label: 'Add sidebar items', risk: 'low' },
  'ui:toolbar': { label: 'Add toolbar buttons', risk: 'low' },
  'ui:modal': { label: 'Show modal dialogs', risk: 'low' },
  'ui:studio': { label: 'Register studio panels', risk: 'low' },
  'events:subscribe': { label: 'Listen to app events', risk: 'low' },
  'events:publish': { label: 'Emit app events', risk: 'medium' },
};

const RISK_COLORS = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
};

// ─── Component ──────────────────────────────────────────────────────

export function InstallConfirmDialog() {
  const { pendingConfirmation, resolveConfirmation } = useMarketplaceStore();

  if (!pendingConfirmation) return null;

  const { action, pluginName, permissions, trustLevel } = pendingConfirmation;

  const actionLabel =
    action === 'install' ? 'Install' : action === 'update' ? 'Update' : 'Uninstall';
  const actionColor =
    action === 'uninstall' ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500';
  const actionIcon = action === 'uninstall' ? 'trash' : action === 'update' ? 'clock' : 'download';

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => resolveConfirmation(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') resolveConfirmation(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${actionLabel} plugin confirmation`}
      tabIndex={-1}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        className="w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800">
              <Icon name={actionIcon as 'download'} className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{actionLabel} Plugin</h3>
              <p className="text-sm text-slate-400">{pluginName}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Trust Level */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl">
            <TrustBadge trustLevel={trustLevel} size="md" />
            <div>
              <p className="text-sm font-medium text-white">
                {trustLevel === 'trusted'
                  ? 'Verified Publisher'
                  : trustLevel === 'untrusted'
                    ? 'Unverified Publisher'
                    : trustLevel === 'unsigned'
                      ? 'Unsigned Plugin'
                      : 'Invalid Signature'}
              </p>
              <p className="text-xs text-slate-500">
                {trustLevel === 'trusted'
                  ? 'This plugin is signed by a known trusted publisher.'
                  : trustLevel === 'unsigned'
                    ? 'This plugin has no cryptographic signature. Install at your own risk.'
                    : "This plugin's signature could not be verified as trusted."}
              </p>
            </div>
          </div>

          {/* Permissions */}
          {permissions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {action === 'update' ? 'New Permissions Required' : 'Permissions Required'}
              </h4>
              <div className="space-y-1.5">
                {permissions.map((perm) => {
                  const info = PERMISSION_LABELS[perm] ?? {
                    label: perm,
                    risk: 'medium' as const,
                  };
                  return (
                    <div
                      key={perm}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${RISK_COLORS[info.risk]}`}
                    >
                      <Icon
                        name={info.risk === 'high' ? 'alert-triangle' : 'check'}
                        className="w-3.5 h-3.5 flex-shrink-0"
                      />
                      <span className="text-xs">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uninstall warning */}
          {action === 'uninstall' && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-2">
                <Icon name="alert-triangle" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  This will remove the plugin and all its data. This action cannot be undone.
                </p>
              </div>
            </div>
          )}

          {/* Sandbox notice */}
          {action !== 'uninstall' && trustLevel !== 'trusted' && (
            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-start gap-2">
                <Icon name="lock" className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">
                  This plugin will run in a sandboxed environment with restricted access.
                  {trustLevel === 'unsigned' && ' Unsigned plugins run in full Worker isolation.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex gap-3 justify-end">
          <button
            onClick={() => resolveConfirmation(false)}
            className="px-4 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-xl hover:text-white hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => resolveConfirmation(true)}
            className={`px-5 py-2 text-sm text-white font-semibold rounded-xl transition-colors ${actionColor}`}
          >
            <span className="flex items-center gap-2">
              <Icon name={actionIcon as 'download'} className="w-4 h-4" />
              {actionLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

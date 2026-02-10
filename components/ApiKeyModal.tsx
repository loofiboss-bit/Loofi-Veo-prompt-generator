import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from '../services/apiKeyService';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApiKeySet: () => void;
    embedded?: boolean;
}

export default function ApiKeyModal({ isOpen, onClose, onApiKeySet, embedded = false }: ApiKeyModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const existingKey = getStoredApiKey();
            if (existingKey) {
                setApiKey(existingKey);
                setHasExistingKey(true);
            } else {
                setApiKey('');
                setHasExistingKey(false);
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        setStoredApiKey(apiKey.trim());

        setTimeout(() => {
            setIsSaving(false);
            onApiKeySet();
            onClose();
        }, 300);
    };

    const handleClear = () => {
        clearStoredApiKey();
        setApiKey('');
        setHasExistingKey(false);
    };

    if (!isOpen && !embedded) return null;

    const content = (
        <div className={embedded ? "" : "bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"}>
            {/* Header */}
            {!embedded && (
                <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <Icon name="settings" className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">API Key Settings</h2>
                            <p className="text-xs text-slate-400">Configure your Google Gemini API key</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className={embedded ? "space-y-4" : "p-5 space-y-4"}>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Gemini API Key
                    </label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key..."
                            className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            title={showKey ? 'Hide API key' : 'Show API key'}
                            aria-label={showKey ? 'Hide API key' : 'Show API key'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            <Icon name={showKey ? 'eye-off' : 'eye'} className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                    <div className="flex gap-3">
                        <Icon name="info" className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-slate-300">
                            <p className="mb-2">Get your free API key from Google AI Studio:</p>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                aistudio.google.com/app/apikey
                                <Icon name="external-link" className="w-3.5 h-3.5" />
                            </a>
                            <p className="mt-2 text-slate-400 text-xs">
                                Your API key is stored locally on your device and never sent to any external servers.
                            </p>
                        </div>
                    </div>
                </div>

                {hasExistingKey && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                        <Icon name="check-circle" className="w-4 h-4" />
                        <span>API key is configured</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between ${embedded ? 'pt-4' : 'p-5 border-t border-slate-700/50 bg-slate-800/30'}`}>
                <button
                    onClick={handleClear}
                    disabled={!hasExistingKey}
                    className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear Key
                </button>
                <div className="flex gap-3">
                    {!embedded && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim() || isSaving}
                        className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Icon name="spinner" className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save API Key'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            {content}
        </div>
    );
}

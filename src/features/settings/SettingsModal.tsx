import React, { useState } from 'react';
import { UpdateSettings } from './updates/components/UpdateSettings';
import ApiKeyModal from './ApiKeyModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApiKeySet?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onApiKeySet }) => {
    const [activeTab, setActiveTab] = useState<'general' | 'updates'>('general');

    if (!isOpen) return null;

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>Settings</h2>
                    <button
                        className="close-button"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="settings-modal-body">
                    <div className="settings-tabs">
                        <button
                            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            <span>General</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'updates' ? 'active' : ''}`}
                            onClick={() => setActiveTab('updates')}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Updates</span>
                        </button>
                    </div>

                    <div className="settings-content">
                        {activeTab === 'general' && (
                            <div className="settings-section">
                                <h3>API Configuration</h3>
                                <p className="section-description">
                                    Configure your Google Gemini API key for AI-powered features
                                </p>
                                <div className="api-key-section">
                                    <ApiKeyModal
                                        isOpen={true}
                                        onClose={() => { }}
                                        onApiKeySet={onApiKeySet}
                                        embedded={true}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'updates' && (
                            <UpdateSettings />
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .settings-modal-content {
          background: var(--bg-primary, #1a1a2e);
          border-radius: 16px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .settings-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid var(--border-color, #2a2a3e);
        }

        .settings-modal-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
        }

        .close-button {
          background: transparent;
          border: none;
          color: var(--text-secondary, #a0a0b0);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background: var(--bg-hover, #2a2a3e);
          color: var(--text-primary, #ffffff);
        }

        .close-button svg {
          width: 24px;
          height: 24px;
        }

        .settings-modal-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .settings-tabs {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
          background: var(--bg-secondary, #16162a);
          border-right: 1px solid var(--border-color, #2a2a3e);
          min-width: 200px;
        }

        .settings-tab {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary, #a0a0b0);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
        }

        .settings-tab:hover {
          background: var(--bg-hover, #2a2a3e);
          color: var(--text-primary, #ffffff);
        }

        .settings-tab.active {
          background: var(--accent-bg, rgba(99, 102, 241, 0.1));
          color: var(--accent-color, #6366f1);
        }

        .settings-tab svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .settings-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .settings-section {
          margin-bottom: 32px;
        }

        .settings-section:last-child {
          margin-bottom: 0;
        }

        .settings-section h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
        }

        .section-description {
          margin: 0 0 20px 0;
          font-size: 14px;
          color: var(--text-secondary, #a0a0b0);
        }

        .api-key-section {
          /* Remove modal styling from embedded API key component */
        }

        /* Scrollbar styling */
        .settings-content::-webkit-scrollbar {
          width: 8px;
        }

        .settings-content::-webkit-scrollbar-track {
          background: var(--bg-secondary, #16162a);
          border-radius: 4px;
        }

        .settings-content::-webkit-scrollbar-thumb {
          background: var(--border-color, #2a2a3e);
          border-radius: 4px;
        }

        .settings-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary, #a0a0b0);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .settings-modal-content {
            max-width: 100%;
            max-height: 100vh;
            border-radius: 0;
          }

          .settings-modal-body {
            flex-direction: column;
          }

          .settings-tabs {
            flex-direction: row;
            min-width: unset;
            border-right: none;
            border-bottom: 1px solid var(--border-color, #2a2a3e);
            overflow-x: auto;
          }

          .settings-tab {
            flex-shrink: 0;
          }
        }
      `}</style>
        </div>
    );
};

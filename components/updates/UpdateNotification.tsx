import React, { useEffect, useState } from 'react';
import { updateService, UpdateStatus, ReleaseChannel } from '../../services/updateService';

export const UpdateNotification: React.FC = () => {
    const [status, setStatus] = useState<UpdateStatus>(updateService.getStatus());
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const unsubscribe = updateService.subscribe(setStatus);
        return unsubscribe;
    }, []);

    if (!status.available || !status.releaseInfo) {
        return null;
    }

    const handleDownload = async () => {
        try {
            await updateService.downloadUpdate();
        } catch (error) {
            console.error('Failed to download update:', error);
        }
    };

    const handleInstall = async () => {
        try {
            await updateService.installUpdate();
        } catch (error) {
            console.error('Failed to install update:', error);
        }
    };

    const handleDismiss = () => {
        updateService.dismissUpdate();
    };

    return (
        <div className="update-notification">
            <div className="update-notification-content">
                <div className="update-notification-header">
                    <svg className="update-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <div className="update-notification-title">
                        <h3>Update Available</h3>
                        <p className="update-version">
                            Version {status.latestVersion}
                            {status.releaseInfo.isPrerelease && (
                                <span className="beta-badge">BETA</span>
                            )}
                        </p>
                    </div>
                    <button
                        className="update-close-btn"
                        onClick={handleDismiss}
                        aria-label="Dismiss update notification"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {showDetails && status.releaseInfo.changelog && (
                    <div className="update-changelog">
                        <h4>What's New</h4>
                        <div className="changelog-content">
                            {status.releaseInfo.changelog}
                        </div>
                    </div>
                )}

                {status.downloading && (
                    <div className="update-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${status.downloadProgress}%` }}
                            />
                        </div>
                        <p className="progress-text">
                            Downloading... {Math.round(status.downloadProgress)}%
                        </p>
                    </div>
                )}

                {status.error && (
                    <div className="update-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>{status.error}</p>
                    </div>
                )}

                <div className="update-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {showDetails ? 'Hide' : 'Show'} Details
                    </button>

                    {!status.downloading && (
                        <>
                            <button
                                className="btn-secondary"
                                onClick={handleDismiss}
                            >
                                Remind Me Later
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleDownload}
                            >
                                Download Update
                            </button>
                        </>
                    )}

                    {status.downloadProgress === 100 && (
                        <button
                            className="btn-primary"
                            onClick={handleInstall}
                        >
                            Install and Restart
                        </button>
                    )}
                </div>
            </div>

            <style>{`
        .update-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 400px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .update-notification-content {
          padding: 20px;
        }

        .update-notification-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .update-icon {
          width: 24px;
          height: 24px;
          color: var(--accent-color);
          flex-shrink: 0;
        }

        .update-notification-title {
          flex: 1;
        }

        .update-notification-title h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .update-version {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .beta-badge {
          display: inline-block;
          padding: 2px 6px;
          background: var(--warning-color);
          color: white;
          font-size: 10px;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .update-close-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: color 0.2s;
        }

        .update-close-btn:hover {
          color: var(--text-primary);
        }

        .update-close-btn svg {
          width: 20px;
          height: 20px;
        }

        .update-changelog {
          margin-bottom: 16px;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .update-changelog h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .changelog-content {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-secondary);
          white-space: pre-wrap;
        }

        .update-progress {
          margin-bottom: 16px;
        }

        .progress-bar {
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-color);
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
        }

        .update-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--error-bg);
          border: 1px solid var(--error-color);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .update-error svg {
          width: 20px;
          height: 20px;
          color: var(--error-color);
          flex-shrink: 0;
        }

        .update-error p {
          margin: 0;
          font-size: 13px;
          color: var(--error-color);
        }

        .update-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .update-actions button {
          flex: 1;
          min-width: 100px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .btn-secondary:hover {
          background: var(--bg-hover);
        }

        @media (max-width: 768px) {
          .update-notification {
            left: 20px;
            right: 20px;
            max-width: none;
          }
        }
      `}</style>
        </div>
    );
};

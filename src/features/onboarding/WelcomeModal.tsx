import React from 'react';
import Modal from '@shared/components/ui/Modal';
import Button from '@shared/components/ui/Button';
import { useOnboarding } from '@shared/contexts/OnboardingContext';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { startTutorial, setWelcomeShown } = useOnboarding();

  const handleStartTutorial = () => {
    setWelcomeShown();
    startTutorial();
    onClose();
  };

  const handleSkip = () => {
    setWelcomeShown();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} size="lg" closeOnBackdropClick={false}>
      <div className="welcome-modal">
        {/* Hero Section */}
        <div className="welcome-hero">
          <div className="welcome-logo">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-fade-in-up"
            >
              <rect width="64" height="64" rx="16" fill="url(#gradient)" />
              <path
                d="M32 16L40 28H24L32 16Z"
                fill="white"
                opacity="0.9"
                className="animate-pulse"
              />
              <path d="M24 32L32 44L40 32H24Z" fill="white" opacity="0.7" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="64" y2="64">
                  <stop offset="0%" stopColor="var(--color-primary-500)" />
                  <stop offset="100%" stopColor="var(--color-accent-500)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="welcome-title animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Welcome to Loofi Flow/Veo Studio
          </h1>

          <p className="welcome-subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Create Flow/Veo scene packs and Suno music prompts with local-first project tools
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="welcome-features">
          <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="feature-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3>Project Management</h3>
            <p>Organize your prompts into projects for better workflow</p>
          </div>

          <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="feature-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M15 3v18" />
              </svg>
            </div>
            <h3>Templates & Presets</h3>
            <p>Use pre-built templates or create your own custom presets</p>
          </div>

          <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="feature-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3>Export & Share</h3>
            <p>Export your prompts in multiple formats and share with ease</p>
          </div>

          <div className="feature-card animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="feature-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3>History & Versions</h3>
            <p>Track your prompt history and manage different versions</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="welcome-actions animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <Button variant="primary" size="lg" onClick={handleStartTutorial} className="welcome-cta">
            Take the Tour
          </Button>
          <Button variant="ghost" size="lg" onClick={handleSkip}>
            Skip for Now
          </Button>
        </div>

        {/* Footer Note */}
        <p className="welcome-footer animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          You can restart this tour anytime from the Help menu
        </p>
      </div>

      <style>{`
        .welcome-modal {
          padding: var(--spacing-8);
          text-align: center;
        }

        .welcome-hero {
          margin-bottom: var(--spacing-8);
        }

        .welcome-logo {
          display: flex;
          justify-content: center;
          margin-bottom: var(--spacing-6);
        }

        .welcome-title {
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-3);
          line-height: 1.2;
        }

        .welcome-subtitle {
          font-size: var(--font-size-lg);
          color: var(--color-text-secondary);
          margin-bottom: 0;
        }

        .welcome-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-4);
          margin-bottom: var(--spacing-8);
        }

        .feature-card {
          padding: var(--spacing-6);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          transition: all var(--transition-base);
        }

        .feature-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary-500);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto var(--spacing-4);
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500));
          border-radius: var(--radius-md);
          color: white;
        }

        .feature-card h3 {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-2);
        }

        .feature-card p {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .welcome-actions {
          display: flex;
          gap: var(--spacing-4);
          justify-content: center;
          margin-bottom: var(--spacing-6);
        }

        .welcome-cta {
          min-width: 160px;
        }

        .welcome-footer {
          font-size: var(--font-size-sm);
          color: var(--color-text-tertiary);
          margin: 0;
        }

        @media (max-width: 768px) {
          .welcome-modal {
            padding: var(--spacing-6);
          }

          .welcome-features {
            grid-template-columns: 1fr;
          }

          .welcome-actions {
            flex-direction: column;
          }

          .welcome-cta {
            width: 100%;
          }
        }
      `}</style>
    </Modal>
  );
};

export default WelcomeModal;

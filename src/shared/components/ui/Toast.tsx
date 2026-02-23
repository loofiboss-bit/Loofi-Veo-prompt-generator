import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { ToastMessage } from '@core/types';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const inTimer = setTimeout(() => setIsVisible(true), 10);

    // Error toasts are persistent — only auto-dismiss success/info/warning.
    // useToastManager intentionally omits a timer for errors so they stay
    // visible until the user explicitly dismisses them.
    if (toast.type === 'error') {
      return () => clearTimeout(inTimer);
    }

    const outTimer = setTimeout(() => {
      // Animate out
      setIsVisible(false);
      // Wait for animation to finish before removing from DOM
      setTimeout(() => onDismiss(toast.id), 300);
    }, 6000);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
    };
  }, [toast.id, toast.type, onDismiss]);

  const icons: { [key in ToastMessage['type']]: React.ReactNode } = {
    success: <Icon name="check" className="w-5 h-5 text-green-400" />,
    info: <Icon name="lightbulb" className="w-5 h-5 text-sky-400" />,
    error: <Icon name="alert-triangle" className="w-5 h-5 text-red-400" />,
    warning: <Icon name="alert-triangle" className="w-5 h-5 text-amber-400" />,
  };

  const baseClasses =
    'w-full max-w-sm p-4 rounded-lg shadow-2xl flex items-start space-x-3 transition-all duration-300 ease-in-out border pointer-events-auto';
  const visibleClasses = 'opacity-100 translate-y-0';
  const hiddenClasses = 'opacity-0 translate-y-4';

  const typeClasses: { [key in ToastMessage['type']]: string } = {
    success: 'bg-green-500/10 backdrop-blur-lg border-green-500/30 text-green-300',
    info: 'bg-sky-500/10 backdrop-blur-lg border-sky-500/30 text-sky-300',
    error: 'bg-red-500/10 backdrop-blur-lg border-red-500/30 text-red-300',
    warning: 'bg-amber-500/10 backdrop-blur-lg border-amber-500/30 text-amber-300',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${baseClasses} ${typeClasses[toast.type]} ${isVisible ? visibleClasses : hiddenClasses}`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity ml-2"
        aria-label="Dismiss"
      >
        <Icon name="cancel" className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;

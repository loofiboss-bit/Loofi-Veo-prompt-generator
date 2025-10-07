import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const inTimer = setTimeout(() => setIsVisible(true), 10);

    const outTimer = setTimeout(() => {
      // Animate out
      setIsVisible(false);
      // Wait for animation to finish before removing from DOM
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);

    return () => {
        clearTimeout(inTimer);
        clearTimeout(outTimer);
    };
  }, [toast.id, onDismiss]);

  const icons: { [key in ToastMessage['type']]: React.ReactNode } = {
    success: <Icon name="check" className="w-5 h-5 text-green-300" />,
    info: <Icon name="lightbulb" className="w-5 h-5 text-blue-300" />,
  };

  const baseClasses = 'w-full max-w-sm p-4 rounded-lg shadow-2xl flex items-center space-x-3 transition-all duration-300 ease-in-out border';
  const visibleClasses = 'opacity-100 translate-y-0';
  const hiddenClasses = 'opacity-0 translate-y-4';
  
  const typeClasses: { [key in ToastMessage['type']]: string } = {
    success: 'bg-green-900/80 backdrop-blur-sm border-green-700 text-green-200',
    info: 'bg-blue-900/80 backdrop-blur-sm border-blue-700 text-blue-200',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${baseClasses} ${typeClasses[toast.type]} ${isVisible ? visibleClasses : hiddenClasses}`}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
};

export default Toast;

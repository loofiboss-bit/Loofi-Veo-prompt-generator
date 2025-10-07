
import React from 'react';
import Icon from './Icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, isLoading, ...props }) => {
  const baseClasses = "w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105";

  const loadingStateClasses = "bg-cyan-700 animate-pulse";
  const interactiveClasses = "hover:bg-cyan-500";

  return (
    <button
      {...props}
      className={`${baseClasses} ${isLoading ? loadingStateClasses : interactiveClasses}`}
    >
      {isLoading && <Icon name="spinner" className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
      {children}
    </button>
  );
};

export default Button;
import React from 'react';

interface SuspenseFallbackProps {
  message?: string;
}

export default function SuspenseFallback({ message = 'Loading...' }: SuspenseFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}

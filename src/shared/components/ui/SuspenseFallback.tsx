import React from 'react';
import { ModalSkeleton } from './Skeleton';

interface SuspenseFallbackProps {
  message?: string;
}

export default function SuspenseFallback({ message }: SuspenseFallbackProps) {
  if (message) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    );
  }

  return <ModalSkeleton />;
}

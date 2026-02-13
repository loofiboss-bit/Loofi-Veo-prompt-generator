import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}) => {
  const getSkeletonStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};

    if (width) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }

    return style;
  };

  const renderSkeleton = (index: number) => (
    <div
      key={index}
      className={`skeleton skeleton-${variant} ${className}`}
      style={getSkeletonStyle()}
      aria-busy="true"
      aria-live="polite"
    />
  );

  return (
    <>
      {Array.from({ length: count }).map((_, index) => renderSkeleton(index))}

      <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            var(--color-bg-tertiary) 0%,
            var(--color-bg-secondary) 50%,
            var(--color-bg-tertiary) 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: var(--radius-sm);
        }

        .skeleton-text {
          height: 1em;
          margin-bottom: var(--spacing-2);
          border-radius: var(--radius-sm);
        }

        .skeleton-text:last-child {
          width: 80%;
        }

        .skeleton-circular {
          border-radius: var(--radius-full);
          width: 40px;
          height: 40px;
        }

        .skeleton-rectangular {
          width: 100%;
          height: 200px;
          border-radius: var(--radius-md);
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-full);
        }

        .skeleton-card {
          width: 100%;
          height: 300px;
          border-radius: var(--radius-lg);
        }

        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .skeleton {
            animation: none;
            background: var(--color-bg-tertiary);
          }
        }
      `}</style>
    </>
  );
};

// Preset skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; width?: string }> = ({
  lines = 3,
  width = '100%',
}) => (
  <div style={{ width }}>
    <Skeleton variant="text" count={lines} />
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="skeleton-card-wrapper">
    <Skeleton variant="rectangular" height={200} />
    <div style={{ padding: 'var(--spacing-4)' }}>
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" count={2} />
    </div>

    <style>{`
      .skeleton-card-wrapper {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
    `}</style>
  </div>
);

export const SkeletonAvatar: React.FC<{ withText?: boolean }> = ({ withText = false }) => (
  <div className="skeleton-avatar-wrapper">
    <Skeleton variant="avatar" />
    {withText && (
      <div className="skeleton-avatar-text">
        <Skeleton variant="text" width={120} height={16} />
        <Skeleton variant="text" width={80} height={14} />
      </div>
    )}

    <style>{`
      .skeleton-avatar-wrapper {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
      }

      .skeleton-avatar-text {
        flex: 1;
      }
    `}</style>
  </div>
);

// Panel-specific skeleton presets

export function StudioSkeleton() {
  return (
    <div className="w-full h-full flex flex-col gap-3 p-4 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-6 animate-pulse">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-24 mt-4" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="w-full flex flex-col gap-2 p-3 animate-pulse">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-3/4" />
    </div>
  );
}

export default Skeleton;

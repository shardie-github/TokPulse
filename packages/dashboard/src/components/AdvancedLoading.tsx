import { Loader2, RefreshCw } from 'lucide-react';
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-brand-600`} />
        {text && <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>}
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  lines?: number;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export function Skeleton({
  className = '',
  lines = 1,
  width = '100%',
  height = '1rem',
  rounded = true,
}: SkeletonProps) {
  const skeletonClasses = `
    bg-gray-200 dark:bg-gray-700 animate-pulse
    ${rounded ? 'rounded' : ''}
    ${className}
  `.trim();

  if (lines === 1) {
    return <div className={skeletonClasses} style={{ width, height }} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={skeletonClasses}
          style={{
            width: index === lines - 1 ? '75%' : width,
            height,
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  showImage?: boolean;
  showActions?: boolean;
  lines?: number;
}

export function SkeletonCard({
  showImage = false,
  showActions = false,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <div className="card p-4">
      {showImage && <Skeleton className="mb-4" height="200px" width="100%" rounded={true} />}

      <div className="space-y-3">
        <Skeleton height="1.5rem" width="60%" />
        <Skeleton lines={lines} height="0.875rem" />

        {showActions && (
          <div className="flex gap-2 pt-2">
            <Skeleton height="2rem" width="80px" />
            <Skeleton height="2rem" width="80px" />
          </div>
        )}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function SkeletonTable({ rows = 5, columns = 4, showHeader = true }: SkeletonTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          {showHeader && (
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {Array.from({ length: columns }).map((_, index) => (
                  <th key={index} className="px-4 py-3 text-left">
                    <Skeleton height="1rem" width="80%" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-gray-200 dark:border-gray-700">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton height="0.875rem" width="90%" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function LoadingState({
  loading,
  error,
  onRetry,
  children,
  fallback,
  errorFallback,
}: LoadingStateProps) {
  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }

    return (
      <div className="card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
            <RefreshCw className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error.message || 'An unexpected error occurred'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="card p-8">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}

interface ProgressiveLoadingProps {
  stages: Array<{
    name: string;
    duration: number;
    component: React.ReactNode;
  }>;
  onComplete?: () => void;
}

export function ProgressiveLoading({ stages, onComplete }: ProgressiveLoadingProps) {
  const [currentStage, setCurrentStage] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (currentStage >= stages.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStage((prev) => prev + 1);
    }, stages[currentStage].duration);

    return () => clearTimeout(timer);
  }, [currentStage, stages, onComplete]);

  if (isComplete) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {stages[currentStage]?.name || 'Loading...'}
        </span>
      </div>
      {stages[currentStage]?.component}
    </div>
  );
}

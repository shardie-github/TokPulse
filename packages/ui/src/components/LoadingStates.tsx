import React from 'react'
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-600`} />
      {text && (
        <p className="mt-2 text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
}

export function LoadingCard({ title, description, className = '' }: LoadingCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        {title && (
          <div className="mt-4">
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
          </div>
        )}
        {description && (
          <div className="mt-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mt-1"></div>
          </div>
        )}
      </div>
    </div>
  )
}

interface LoadingTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function LoadingTable({ rows = 5, columns = 4, className = '' }: LoadingTableProps) {
  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-gray-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LoadingChartProps {
  className?: string
}

export function LoadingChart({ className = '' }: LoadingChartProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="mt-4 flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  )
}

interface LoadingButtonProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function LoadingButton({ 
  loading = false, 
  children, 
  className = '', 
  disabled = false 
}: LoadingButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}

interface LoadingOverlayProps {
  loading?: boolean
  children: React.ReactNode
  text?: string
  className?: string
}

export function LoadingOverlay({ 
  loading = false, 
  children, 
  text = 'Loading...', 
  className = '' 
}: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">{text}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'idle'
  text?: string
  className?: string
}

export function StatusIndicator({ status, text, className = '' }: StatusIndicatorProps) {
  const statusConfig = {
    loading: {
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      animate: 'animate-spin',
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      animate: '',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      animate: '',
    },
    idle: {
      icon: RefreshCw,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      animate: '',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon className={`w-4 h-4 ${config.color} ${config.animate}`} />
      </div>
      {text && (
        <span className="ml-2 text-sm text-gray-700">{text}</span>
      )}
    </div>
  )
}

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          } ${i > 0 ? 'mt-2' : ''}`}
        />
      ))}
    </div>
  )
}

interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  )
}

interface ProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
}

export function ProgressBar({ 
  progress, 
  className = '', 
  showPercentage = true 
}: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Progress</span>
        {showPercentage && <span>{Math.round(progress)}%</span>}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// Hook for managing loading states
export function useLoadingState(initialState = false) {
  const [loading, setLoading] = React.useState(initialState)
  const [error, setError] = React.useState<string | null>(null)

  const startLoading = React.useCallback(() => {
    setLoading(true)
    setError(null)
  }, [])

  const stopLoading = React.useCallback(() => {
    setLoading(false)
  }, [])

  const setErrorState = React.useCallback((errorMessage: string) => {
    setLoading(false)
    setError(errorMessage)
  }, [])

  const reset = React.useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setErrorState,
    reset,
  }
}

export default {
  LoadingSpinner,
  LoadingCard,
  LoadingTable,
  LoadingChart,
  LoadingButton,
  LoadingOverlay,
  StatusIndicator,
  Skeleton,
  LoadingDots,
  ProgressBar,
  useLoadingState,
}
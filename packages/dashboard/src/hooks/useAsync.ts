import { useState, useEffect, useCallback, useRef } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for handling async operations with loading states
 * Provides a clean API for data fetching with error handling
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
) {
  const { immediate = false, onSuccess, onError } = options;
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]) => {
      if (!isMountedRef.current) return;

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await asyncFunction(...args);
        
        if (isMountedRef.current) {
          setState({ data: result, loading: false, error: null });
          onSuccess?.(result);
        }
      } catch (error) {
        if (isMountedRef.current) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          setState(prev => ({ ...prev, loading: false, error: errorObj }));
          onError?.(errorObj);
        }
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for handling async operations with retry logic
 */
export function useAsyncWithRetry<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions & { maxRetries?: number; retryDelay?: number } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, ...asyncOptions } = options;
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const asyncState = useAsync(asyncFunction, {
    ...asyncOptions,
    onError: (error) => {
      if (retryCount < maxRetries) {
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      }
      asyncOptions.onError?.(error);
    },
  });

  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setRetryCount(0);
    asyncState.execute();
  }, [asyncState]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...asyncState,
    retryCount,
    retry,
    canRetry: retryCount < maxRetries,
  };
}
import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastRenderTime: number;
}

/**
 * Hook for monitoring component performance
 * Tracks render times, mount times, and update frequency
 */
export function usePerformance(componentName?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    lastRenderTime: 0,
  });

  const mountTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);
  const updateCountRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    setMetrics(prev => ({
      ...prev,
      mountTime: mountTimeRef.current,
    }));

    return () => {
      if (componentName && process.env.NODE_ENV === 'development') {
        console.log(`Performance metrics for ${componentName}:`, {
          totalMountTime: performance.now() - mountTimeRef.current,
          totalUpdates: updateCountRef.current,
        });
      }
    };
  }, [componentName]);

  useEffect(() => {
    renderStartRef.current = performance.now();
    updateCountRef.current += 1;

    const updateMetrics = () => {
      const renderTime = performance.now() - renderStartRef.current;
      setMetrics(prev => ({
        ...prev,
        renderTime,
        updateCount: updateCountRef.current,
        lastRenderTime: renderTime,
      }));
    };

    // Use requestAnimationFrame to measure after paint
    requestAnimationFrame(updateMetrics);
  });

  return metrics;
}

/**
 * Hook for measuring async operations performance
 */
export function useAsyncPerformance() {
  const [operations, setOperations] = useState<Record<string, {
    startTime: number;
    endTime?: number;
    duration?: number;
    status: 'pending' | 'completed' | 'error';
  }>>({});

  const startOperation = (operationId: string) => {
    setOperations(prev => ({
      ...prev,
      [operationId]: {
        startTime: performance.now(),
        status: 'pending',
      },
    }));
  };

  const endOperation = (operationId: string, status: 'completed' | 'error' = 'completed') => {
    const endTime = performance.now();
    setOperations(prev => {
      const operation = prev[operationId];
      if (!operation) return prev;

      return {
        ...prev,
        [operationId]: {
          ...operation,
          endTime,
          duration: endTime - operation.startTime,
          status,
        },
      };
    });
  };

  const getOperationMetrics = (operationId: string) => {
    return operations[operationId];
  };

  const clearOperation = (operationId: string) => {
    setOperations(prev => {
      const { [operationId]: removed, ...rest } = prev;
      return rest;
    });
  };

  return {
    operations,
    startOperation,
    endOperation,
    getOperationMetrics,
    clearOperation,
  };
}

/**
 * Hook for measuring component render performance with React DevTools integration
 */
export function useRenderProfiler(componentName: string) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    renderCountRef.current += 1;
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderTimesRef.current.push(renderTime);

      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCountRef.current}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  const getAverageRenderTime = () => {
    if (renderTimesRef.current.length === 0) return 0;
    const sum = renderTimesRef.current.reduce((a, b) => a + b, 0);
    return sum / renderTimesRef.current.length;
  };

  const getSlowestRender = () => {
    return Math.max(...renderTimesRef.current, 0);
  };

  return {
    renderCount: renderCountRef.current,
    averageRenderTime: getAverageRenderTime(),
    slowestRender: getSlowestRender(),
    allRenderTimes: renderTimesRef.current,
  };
}
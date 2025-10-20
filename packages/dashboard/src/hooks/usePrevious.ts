import { useEffect, useRef } from 'react';

/**
 * Custom hook to get the previous value of a state or prop
 * Useful for detecting changes and implementing derived state
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

/**
 * Hook to track if a value has changed from its previous value
 */
export function useHasChanged<T>(value: T): boolean {
  const prevValue = usePrevious(value);
  return prevValue !== undefined && prevValue !== value;
}

/**
 * Hook to get the previous value and whether it has changed
 */
export function usePreviousWithChange<T>(value: T): { previous: T | undefined; hasChanged: boolean } {
  const previous = usePrevious(value);
  const hasChanged = previous !== undefined && previous !== value;
  
  return { previous, hasChanged };
}
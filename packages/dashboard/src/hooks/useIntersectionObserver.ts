import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverProps {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Custom hook for intersection observer
 * Useful for lazy loading, infinite scrolling, and animations
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0%',
  freezeOnceVisible = false,
}: UseIntersectionObserverProps = {}) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [node, setNode] = useState<Element | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry);
  };

  useEffect(() => {
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const currentObserver = new IntersectionObserver(updateEntry, observerParams);

    currentObserver.observe(node);
    observer.current = currentObserver;

    return () => {
      currentObserver.disconnect();
    };
  }, [node, threshold, root, rootMargin, frozen]);

  const prevNode = useRef<Element | null>(null);

  useEffect(() => {
    if (prevNode.current && node !== prevNode.current) {
      observer.current?.disconnect();
    }
    prevNode.current = node;
  }, [node]);

  return [setNode, entry] as const;
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, options?: UseIntersectionObserverProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [setRef, entry] = useIntersectionObserver({
    threshold: 0.1,
    ...options,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      setIsInView(true);
    }
  }, [entry]);

  useEffect(() => {
    if (isInView && src) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = src;
    }
  }, [isInView, src]);

  return [setRef, isLoaded, isInView] as const;
}
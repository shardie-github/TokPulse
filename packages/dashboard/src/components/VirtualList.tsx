import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loading = false,
  hasMore = false,
  onLoadMore,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleCount + overscan * 2
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Intersection observer for infinite loading
  useEffect(() => {
    if (!loadingRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
          
          {hasMore && (
            <div
              ref={loadingRef}
              style={{ height: itemHeight }}
              className="flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" />
                  Loading more...
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Scroll to load more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  gap?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  gap = 8,
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const columnsPerRow = Math.floor(containerWidth / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);
  const totalHeight = totalRows * (itemHeight + gap);

  const visibleRows = Math.ceil(containerHeight / (itemHeight + gap));
  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
  const endRow = Math.min(totalRows - 1, startRow + visibleRows + overscan * 2);

  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; row: number; col: number }> = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index < items.length) {
          result.push({
            item: items[index],
            index,
            row,
            col,
          });
        }
      }
    }
    
    return result;
  }, [items, startRow, endRow, columnsPerRow]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startRow * (itemHeight + gap)}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index, row, col }) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: 0,
                left: col * (itemWidth + gap),
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface InfiniteScrollProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
  children: React.ReactNode;
}

export function InfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 0.1,
  rootMargin = '100px',
  children,
}: InfiniteScrollProps) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!element || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [element, hasMore, loading, onLoadMore, threshold, rootMargin]);

  return (
    <div>
      {children}
      {hasMore && (
        <div ref={setElement} className="flex justify-center py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Scroll to load more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
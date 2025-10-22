import { jsx as _jsx } from "react/jsx-runtime";
import { LRUCache } from 'lru-cache';
// Performance monitoring utilities
export class PerformanceMonitor {
    static instance;
    metrics = new Map();
    cache;
    constructor(maxCacheSize = 1000) {
        this.cache = new LRUCache({
            max: maxCacheSize,
            ttl: 1000 * 60 * 5, // 5 minutes
        });
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    // Measure execution time
    async measure(name, fn, labels) {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.recordMetric(name, duration, labels);
            return result;
        }
        catch (error) {
            const duration = performance.now() - start;
            this.recordMetric(`${name}_error`, duration, labels);
            throw error;
        }
    }
    // Record metric
    recordMetric(name, value, labels) {
        const key = this.buildKey(name, labels);
        if (!this.metrics.has(key)) {
            this.metrics.set(key, []);
        }
        const values = this.metrics.get(key);
        values.push(value);
        // Keep only last 1000 values
        if (values.length > 1000) {
            values.splice(0, values.length - 1000);
        }
    }
    // Get metric statistics
    getMetricStats(name, labels) {
        const key = this.buildKey(name, labels);
        const values = this.metrics.get(key);
        if (!values || values.length === 0) {
            return null;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const count = sorted.length;
        const min = sorted[0];
        const max = sorted[count - 1];
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        return {
            count,
            min,
            max,
            avg,
            p50: this.percentile(sorted, 0.5),
            p95: this.percentile(sorted, 0.95),
            p99: this.percentile(sorted, 0.99),
        };
    }
    // Cache utilities
    get(key) {
        return this.cache.get(key);
    }
    set(key, value, ttl) {
        this.cache.set(key, value, { ttl });
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    // Memory usage monitoring
    getMemoryUsage() {
        return process.memoryUsage();
    }
    // CPU usage monitoring
    getCpuUsage() {
        return process.cpuUsage();
    }
    // Private methods
    buildKey(name, labels) {
        if (!labels)
            return name;
        const labelStr = Object.entries(labels)
            .map(([key, value]) => `${key}=${value}`)
            .join(',');
        return `${name}{${labelStr}}`;
    }
    percentile(sorted, p) {
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
}
// Database query optimization
export class QueryOptimizer {
    static instance;
    queryCache;
    slowQueries = new Map();
    constructor() {
        this.queryCache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 10, // 10 minutes
        });
    }
    static getInstance() {
        if (!QueryOptimizer.instance) {
            QueryOptimizer.instance = new QueryOptimizer();
        }
        return QueryOptimizer.instance;
    }
    // Optimize database query
    async optimizeQuery(queryKey, queryFn, options = {}) {
        const { cache = true, cacheTtl = 1000 * 60 * 5, // 5 minutes
        timeout = 30000, // 30 seconds
        retries = 3, } = options;
        // Check cache first
        if (cache) {
            const cached = this.queryCache.get(queryKey);
            if (cached !== undefined) {
                return cached;
            }
        }
        // Execute query with timeout and retries
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const result = await this.executeWithTimeout(queryFn, timeout);
                // Cache result
                if (cache) {
                    this.queryCache.set(queryKey, result, { ttl: cacheTtl });
                }
                return result;
            }
            catch (error) {
                lastError = error;
                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    break;
                }
                // Wait before retry
                if (attempt < retries) {
                    await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
            }
        }
        throw lastError || new Error('Query failed after all retries');
    }
    // Track slow queries
    trackSlowQuery(query, duration) {
        if (duration > 1000) { // Queries slower than 1 second
            const current = this.slowQueries.get(query) || 0;
            this.slowQueries.set(query, current + 1);
        }
    }
    // Get slow query report
    getSlowQueries() {
        return Array.from(this.slowQueries.entries())
            .map(([query, count]) => ({ query, count }))
            .sort((a, b) => b.count - a.count);
    }
    async executeWithTimeout(fn, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Query timeout'));
            }, timeout);
            fn()
                .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    isNonRetryableError(error) {
        const nonRetryableErrors = [
            'ValidationError',
            'NotFoundError',
            'UnauthorizedError',
            'ForbiddenError',
        ];
        return nonRetryableErrors.some(name => error.name === name);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// Bundle optimization utilities
export class BundleOptimizer {
    // Analyze bundle size
    static analyzeBundleSize(bundlePath) {
        // This would integrate with webpack-bundle-analyzer or similar
        return Promise.resolve({
            totalSize: 0,
            gzippedSize: 0,
            files: [],
        });
    }
    // Check bundle size limits
    static checkBundleLimits(currentSize, limits) {
        const warnings = [];
        if (currentSize > limits.maxSize) {
            warnings.push(`Bundle size ${currentSize} exceeds limit ${limits.maxSize}`);
        }
        return {
            withinLimits: warnings.length === 0,
            warnings,
        };
    }
}
// Image optimization utilities
export class ImageOptimizer {
    // Optimize image for web
    static async optimizeImage(imagePath, options = {}) {
        // This would integrate with sharp or similar image processing library
        return Promise.resolve({
            optimizedPath: imagePath,
            originalSize: 0,
            optimizedSize: 0,
            savings: 0,
        });
    }
    // Generate responsive images
    static async generateResponsiveImages(imagePath, sizes) {
        // This would generate multiple sizes of the same image
        return Promise.resolve([]);
    }
}
// Lazy loading utilities
export class LazyLoader {
    static observers = new Map();
    // Lazy load component
    static lazyLoadComponent(importFn, fallback) {
        const LazyComponent = React.lazy(importFn);
        return (props) => (_jsx(React.Suspense, { fallback: fallback ? _jsx("fallback", {}) : _jsx("div", { children: "Loading..." }), children: _jsx(LazyComponent, { ...props }) }));
    }
    // Lazy load image
    static lazyLoadImage(src, alt, options = {}) {
        const [loaded, setLoaded] = React.useState(false);
        const [error, setError] = React.useState(false);
        const imgRef = React.useRef(null);
        React.useEffect(() => {
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    const img = imgRef.current;
                    if (img) {
                        img.src = src;
                        observer.unobserve(img);
                    }
                }
            }, { threshold: 0.1 });
            if (imgRef.current) {
                observer.observe(imgRef.current);
            }
            return () => observer.disconnect();
        }, [src]);
        return (_jsx("img", { ref: imgRef, alt: alt, className: options.className, src: loaded ? src : options.placeholder, onLoad: () => {
                setLoaded(true);
                options.onLoad?.();
            }, onError: () => {
                setError(true);
                options.onError?.();
            }, style: {
                opacity: loaded ? 1 : 0.5,
                transition: 'opacity 0.3s ease',
            } }));
    }
}
// Performance budget checker
export class PerformanceBudget {
    static budgets = new Map();
    static setBudget(metric, limit) {
        this.budgets.set(metric, limit);
    }
    static checkBudget(metric, value) {
        const limit = this.budgets.get(metric) || 0;
        const percentage = limit > 0 ? (value / limit) * 100 : 0;
        return {
            withinBudget: value <= limit,
            limit,
            percentage,
        };
    }
    static getAllBudgets() {
        return Object.fromEntries(this.budgets);
    }
}
// Initialize performance monitoring
export function initializePerformanceMonitoring() {
    const monitor = PerformanceMonitor.getInstance();
    // Set up performance budgets
    PerformanceBudget.setBudget('bundle_size', 1024 * 1024); // 1MB
    PerformanceBudget.setBudget('api_response_time', 1000); // 1 second
    PerformanceBudget.setBudget('database_query_time', 500); // 500ms
    // Monitor memory usage
    setInterval(() => {
        const memUsage = monitor.getMemoryUsage();
        if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
            console.warn('High memory usage detected:', memUsage);
        }
    }, 30000); // Check every 30 seconds
}

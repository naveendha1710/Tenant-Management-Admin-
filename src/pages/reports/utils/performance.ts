/**
 * Batch process large arrays to avoid blocking UI
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map(processor);
    results.push(...batchResults);
    
    // Yield to browser
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load data in chunks
 */
export class DataLoader<T> {
  private data: T[];
  private chunkSize: number;
  private currentIndex: number = 0;

  constructor(data: T[], chunkSize: number = 100) {
    this.data = data;
    this.chunkSize = chunkSize;
  }

  hasMore(): boolean {
    return this.currentIndex < this.data.length;
  }

  loadNext(): T[] {
    const chunk = this.data.slice(
      this.currentIndex,
      this.currentIndex + this.chunkSize
    );
    this.currentIndex += this.chunkSize;
    return chunk;
  }

  reset(): void {
    this.currentIndex = 0;
  }

  getProgress(): number {
    return Math.min((this.currentIndex / this.data.length) * 100, 100);
  }
}

/**
 * Virtual scroll helper
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);
  
  return { start, end };
}

/**
 * Aggregate data efficiently
 */
export function aggregateData<T>(
  data: T[],
  groupBy: keyof T,
  aggregateField?: keyof T,
  aggregationType: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'count'
): Record<string, number> {
  const groups: Record<string, number[]> = {};
  
  data.forEach(item => {
    const key = String(item[groupBy] || 'Unknown');
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    if (aggregateField && aggregationType !== 'count') {
      const value = Number(item[aggregateField]) || 0;
      groups[key].push(value);
    } else {
      groups[key].push(1);
    }
  });
  
  const result: Record<string, number> = {};
  
  Object.entries(groups).forEach(([key, values]) => {
    switch (aggregationType) {
      case 'sum':
        result[key] = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'avg':
        result[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'min':
        result[key] = Math.min(...values);
        break;
      case 'max':
        result[key] = Math.max(...values);
        break;
      case 'count':
      default:
        result[key] = values.length;
        break;
    }
  });
  
  return result;
}

/**
 * Sample large datasets for preview
 */
export function sampleData<T>(data: T[], sampleSize: number = 1000): T[] {
  if (data.length <= sampleSize) {
    return data;
  }
  
  const step = Math.floor(data.length / sampleSize);
  const sampled: T[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
    if (sampled.length >= sampleSize) break;
  }
  
  return sampled;
}

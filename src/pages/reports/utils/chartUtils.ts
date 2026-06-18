import { ChartData } from '../types';

/**
 * Transform aggregated data to chart-ready format
 */
export function transformToChartData(
  data: { label: string; value: number }[]
): ChartData {
  return {
    labels: data.map(d => d.label),
    series: data.map(d => d.value),
  };
}

/**
 * Generate color palette
 */
export function generateColorPalette(count: number, theme: 'light' | 'dark' = 'light'): string[] {
  const lightPalette = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  
  const darkPalette = [
    '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
    '#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#818cf8',
  ];
  
  const palette = theme === 'dark' ? darkPalette : lightPalette;
  
  if (count <= palette.length) {
    return palette.slice(0, count);
  }
  
  // Generate additional colors if needed
  const colors = [...palette];
  while (colors.length < count) {
    colors.push(`hsl(${(colors.length * 137.5) % 360}, 70%, 50%)`);
  }
  
  return colors;
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with abbreviation
 */
export function formatNumber(value: number): string {
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)}Cr`;
  }
  if (value >= 100000) {
    return `${(value / 100000).toFixed(2)}L`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, previous: number): {
  value: number;
  type: 'increase' | 'decrease' | 'neutral';
} {
  if (previous === 0) {
    return { value: 0, type: 'neutral' };
  }
  
  const change = ((current - previous) / previous) * 100;
  
  return {
    value: Math.abs(change),
    type: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
  };
}

/**
 * Debounce function for filter updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Group data by field
 */
export function groupBy<T>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key] || 'Unknown');
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort data by value
 */
export function sortByValue(
  data: { label: string; value: number }[],
  order: 'asc' | 'desc' = 'desc'
): { label: string; value: number }[] {
  return [...data].sort((a, b) => {
    return order === 'asc' ? a.value - b.value : b.value - a.value;
  });
}

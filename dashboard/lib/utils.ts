import { format, parseISO } from 'date-fns';

export function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMMM d, yyyy');
  } catch {
    return dateString;
  }
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(2)}K`;
  }
  return tokens.toString();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const minutes = seconds / 60;
  return `${minutes.toFixed(2)}min`;
}

export function getStatusColor(status: 'success' | 'failure' | 'pending'): string {
  switch (status) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'failure':
      return 'text-red-600 dark:text-red-400';
    case 'pending':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function getStatusBgColor(status: 'success' | 'failure' | 'pending'): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'failure':
      return 'bg-red-100 dark:bg-red-900/30';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    default:
      return 'bg-gray-100 dark:bg-gray-800';
  }
}

export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

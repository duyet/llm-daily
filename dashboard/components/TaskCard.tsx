import Link from 'next/link';
import { formatCost, formatTokens, getStatusColor, getStatusBgColor, formatDate } from '@/lib/utils';

interface TaskCardProps {
  name: string;
  description?: string;
  status: 'success' | 'failure' | 'pending';
  lastRun?: string;
  totalExecutions: number;
  successfulExecutions: number;
  totalTokens: number;
  totalCost: number;
  latestResult?: string;
}

export default function TaskCard({
  name,
  description,
  status,
  lastRun,
  totalExecutions,
  successfulExecutions,
  totalTokens,
  totalCost,
  latestResult,
}: TaskCardProps) {
  const successRate = totalExecutions > 0
    ? ((successfulExecutions / totalExecutions) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <h3 className="text-xl font-medium text-neutral-900 dark:text-gray-100 mb-2">
            {name}
          </h3>
          {description && (
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBgColor(status)} ${getStatusColor(status)}`}
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs text-neutral-600 dark:text-gray-400 mb-1">Executions</p>
          <p className="text-lg font-medium text-neutral-900 dark:text-gray-100">
            {totalExecutions}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-600 dark:text-gray-400 mb-1">Success Rate</p>
          <p className="text-lg font-medium text-neutral-900 dark:text-gray-100">
            {successRate}%
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-600 dark:text-gray-400 mb-1">Total Tokens</p>
          <p className="text-lg font-medium text-neutral-900 dark:text-gray-100">
            {formatTokens(totalTokens)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-600 dark:text-gray-400 mb-1">Total Cost</p>
          <p className="text-lg font-medium text-neutral-900 dark:text-gray-100">
            {formatCost(totalCost)}
          </p>
        </div>
      </div>

      {lastRun && (
        <p className="text-xs text-neutral-600 dark:text-gray-400 mb-4">
          Last run: {formatDate(lastRun)}
        </p>
      )}

      {latestResult && (
        <Link
          href={`/results/${name}/${latestResult.replace('.md', '')}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-purple-DEFAULT hover:text-purple-light transition-colors duration-200"
        >
          View Latest Result
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

import { getAnalyticsData } from '@/lib/data-fetcher';
import TaskCard from '@/components/TaskCard';
import { formatCost, formatTokens } from '@/lib/utils';

export const dynamic = 'force-static';

export default async function Home() {
  const analytics = await getAnalyticsData();

  const tasks = Object.values(analytics.tasks);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Tasks</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {analytics.summary.totalTasks}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Executions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {analytics.summary.totalExecutions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Tokens</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatTokens(analytics.summary.totalTokens)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Cost</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCost(analytics.summary.totalCost)}
          </p>
        </div>
      </div>

      {/* Task Grid */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Tasks
        </h2>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No tasks found. Create your first task to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard
              key={task.name}
              name={task.name}
              description={task.description}
              status={task.status}
              lastRun={task.lastRun}
              totalExecutions={task.totalExecutions}
              successfulExecutions={task.successfulExecutions}
              totalTokens={task.totalTokens}
              totalCost={task.totalCost}
              latestResult={task.latestResult}
            />
          ))}
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}

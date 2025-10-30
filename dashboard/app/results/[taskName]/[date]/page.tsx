import { parseResultFile, getAllResultsForTask } from '@/lib/result-parser';
import { getAllTaskNames } from '@/lib/data-fetcher';
import { formatDate, formatCost, formatTokens, formatDuration, estimateReadingTime, getStatusColor } from '@/lib/utils';
import MDXContent from '@/components/MDXContent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

// Generate static paths for all task results
export async function generateStaticParams() {
  const taskNames = await getAllTaskNames();
  const params: { taskName: string; date: string }[] = [];

  for (const taskName of taskNames) {
    const results = await getAllResultsForTask(taskName);
    for (const result of results) {
      params.push({
        taskName,
        date: result.date,
      });
    }
  }

  return params;
}

interface PageProps {
  params: Promise<{
    taskName: string;
    date: string;
  }>;
}

export default async function ResultPage({ params }: PageProps) {
  const { taskName, date } = await params;
  const result = await parseResultFile(taskName, date);

  if (!result) {
    notFound();
  }

  const readingTime = estimateReadingTime(result.content);

  return (
    <article className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <li>
            <Link href="/" className="hover:text-purple-DEFAULT">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <span className="font-medium text-gray-900 dark:text-gray-100">{taskName}</span>
          </li>
          <li>/</li>
          <li>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(date)}</span>
          </li>
        </ol>
      </nav>

      {/* Article Header */}
      <header className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {taskName}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <time dateTime={result.metadata.timestamp} className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(result.metadata.timestamp)}
          </time>

          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {readingTime} min read
          </span>

          <span className={`flex items-center gap-1 ${getStatusColor(result.metadata.status)}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {result.metadata.status === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {result.metadata.status}
          </span>
        </div>

        {/* Metadata Cards */}
        {(result.metadata.model || result.metadata.tokensUsed || result.metadata.estimatedCost || result.metadata.responseTime) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {result.metadata.model && (
              <div className="bg-beige dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Model</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {result.metadata.model}
                </p>
              </div>
            )}
            {result.metadata.tokensUsed && (
              <div className="bg-beige dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tokens Used</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatTokens(result.metadata.tokensUsed)}
                </p>
              </div>
            )}
            {result.metadata.estimatedCost && (
              <div className="bg-beige dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCost(result.metadata.estimatedCost)}
                </p>
              </div>
            )}
            {result.metadata.responseTime && (
              <div className="bg-beige dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Response Time</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatDuration(result.metadata.responseTime)}
                </p>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Article Content - Blog Style */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-8">
        <MDXContent content={result.content} />
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-purple-DEFAULT hover:text-purple-light"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </footer>
    </article>
  );
}

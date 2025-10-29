import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { TaskResult, TaskMetadata } from './types';

const TASKS_DIR = path.join(process.cwd(), '..', 'tasks');

export async function parseResultFile(
  taskName: string,
  date: string
): Promise<TaskResult | null> {
  try {
    const filePath = path.join(TASKS_DIR, taskName, 'results', `${date}.md`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContents);

    const metadata: TaskMetadata = {
      taskName,
      timestamp: data.timestamp || date,
      model: data.model,
      tokensUsed: data.tokensUsed || data.tokens_used,
      estimatedCost: data.estimatedCost || data.estimated_cost,
      responseTime: data.responseTime || data.response_time,
      status: data.status || 'success',
      provider: data.provider,
    };

    return {
      metadata,
      content,
      resultPath: `data/tasks/${taskName}/${date}.md`,
      date,
    };
  } catch (error) {
    console.error(`Error parsing result file for ${taskName}/${date}:`, error);
    return null;
  }
}

export async function getAllResultsForTask(
  taskName: string
): Promise<TaskResult[]> {
  try {
    const resultsDir = path.join(TASKS_DIR, taskName, 'results');

    if (!fs.existsSync(resultsDir)) {
      return [];
    }

    const files = fs.readdirSync(resultsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    const results = await Promise.all(
      mdFiles.map(file => {
        const date = file.replace('.md', '');
        return parseResultFile(taskName, date);
      })
    );

    return results
      .filter((r): r is TaskResult => r !== null)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error(`Error getting all results for ${taskName}:`, error);
    return [];
  }
}

/**
 * Commit output integration - writes results to git and auto-commits
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import type {
  OutputIntegration,
  TaskResult,
  CommitOutputConfig,
} from '../../types/output.types.js';

export class CommitOutput implements OutputIntegration {
  readonly type = 'commit';

  constructor(private config: CommitOutputConfig) {}

  async execute(result: TaskResult): Promise<void> {
    try {
      // 1. Write task result to JSON file
      await this.writeTaskResult(result);

      // 2. Update memory.md if configured
      if (this.config.updateMemory !== false) {
        await this.updateMemory(result);
      }

      // 3. Git add files
      await this.gitAdd(result.taskName);

      // 4. Git commit with custom or default message
      await this.gitCommit(result);

      console.log(`✅ Committed results for ${result.taskName}`);
    } catch (error) {
      console.error(`❌ Failed to commit results for ${result.taskName}:`, error);
      throw error;
    }
  }

  /**
   * Write task result to JSON file
   */
  private async writeTaskResult(result: TaskResult): Promise<void> {
    const outputPath = this.config.path.replace('{{taskName}}', result.taskName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Write result
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`📝 Wrote result to ${outputPath}`);
  }

  /**
   * Update memory.md with execution info
   */
  private async updateMemory(result: TaskResult): Promise<void> {
    const memoryPath = `tasks/${result.taskName}/memory.md`;

    try {
      // Check if memory file exists
      await fs.access(memoryPath);

      // Read current memory
      let memory = await fs.readFile(memoryPath, 'utf-8');

      // Add execution entry at the top
      const entry = this.createMemoryEntry(result);
      const separator = '\n---\n\n';

      // Find the end of the frontmatter (if exists)
      const frontmatterEnd = memory.match(/^---\n[\s\S]+?\n---\n/);
      if (frontmatterEnd) {
        // Insert after frontmatter
        memory = memory.replace(/^(---\n[\s\S]+?\n---\n)/, `$1${separator}${entry}${separator}`);
      } else {
        // Insert at the beginning
        memory = `${entry}${separator}${memory}`;
      }

      // Write updated memory
      await fs.writeFile(memoryPath, memory, 'utf-8');

      console.log(`📝 Updated memory: ${memoryPath}`);
    } catch {
      // Memory file doesn't exist, skip update
    }
  }

  /**
   * Create memory entry for execution
   */
  private createMemoryEntry(result: TaskResult): string {
    const status = result.success ? '✅ Success' : '❌ Failed';
    const date = new Date(result.timestamp).toLocaleDateString();

    return `## Last Run: ${date} - ${status}

**Model**: ${result.metadata.model}
**Tokens**: ${result.metadata.tokens.total.toLocaleString()}
**Cost**: $${result.metadata.cost.toFixed(4)}
**Response Time**: ${result.metadata.responseTime.toFixed(2)}s

${result.error ? `**Error**: ${result.error}` : ''}
`;
  }

  /**
   * Git add files
   */
  private async gitAdd(taskName: string): Promise<void> {
    try {
      const files = [
        this.config.path.replace('{{taskName}}', taskName),
        `tasks/${taskName}/memory.md`,
      ];

      execSync(`git add ${files.join(' ')}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore git errors (might not be a git repo or files don't exist)
    }
  }

  /**
   * Git commit with message
   */
  private async gitCommit(result: TaskResult): Promise<void> {
    try {
      const message = this.formatCommitMessage(result);
      execSync(`git commit -m "${message}" --no-verify`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore commit errors (might be nothing to commit)
    }
  }

  /**
   * Format commit message
   */
  private formatCommitMessage(result: TaskResult): string {
    if (this.config.message) {
      return this.config.message
        .replace('{{taskName}}', result.taskName)
        .replace('{{timestamp}}', result.timestamp)
        .replace('{{status}}', result.success ? 'success' : 'failed');
    }

    const status = result.success ? '✅' : '❌';
    return `chore(task): ${status} ${result.taskName} [skip ci]`;
  }
}

/**
 * Generate command - Generate GitHub Actions workflows
 * Implementation for Phase 4
 */

import { logger } from '../utils/logger.js';
import { withSpinner } from '../utils/progress.js';
import { generateWorkflows, getGenerationSummary } from '../workflow-generator.js';
import type { GeneratedWorkflow } from '../types/workflow.types.js';

/**
 * Generate command options
 */
export interface GenerateCommandOptions {
  /** Dry run mode - show what would be generated */
  dryRun?: boolean;
  /** Force mode - overwrite existing workflows */
  force?: boolean;
}

/**
 * Generate GitHub Actions workflows for all tasks
 */
export async function generateCommand(options: GenerateCommandOptions = {}): Promise<void> {
  try {
    // Get summary first
    const summary = await getGenerationSummary();

    if (summary.totalTasks === 0) {
      logger.warn('No tasks found to generate workflows for');
      logger.info('Create a task with: npm run task:new <name>');
      return;
    }

    if (summary.validTasks === 0) {
      logger.error('No valid tasks found');
      if (summary.invalidTasks > 0) {
        logger.error(`Found ${summary.invalidTasks} invalid task(s)`);
        logger.info('Run: npm run task:validate to see errors');
      }
      return;
    }

    logger.info(`Found ${summary.validTasks} valid task${summary.validTasks > 1 ? 's' : ''}`);

    if (summary.invalidTasks > 0) {
      logger.warn(
        `Skipping ${summary.invalidTasks} invalid task${summary.invalidTasks > 1 ? 's' : ''}`
      );
    }

    // Dry run mode
    if (options.dryRun) {
      logger.info('Dry run mode - showing what would be generated:');
      console.log('');

      const workflows = await generateWorkflows({
        dryRun: true,
        force: options.force,
      });

      for (const workflow of workflows) {
        console.log(`  - ${workflow.filePath}`);
        if (workflow.secrets.length > 0) {
          console.log(`    Secrets: ${workflow.secrets.join(', ')}`);
        }
        if (workflow.warnings.length > 0) {
          console.log(`    ⚠️  ${workflow.warnings[0]}`);
        }
      }

      console.log('');
      logger.info('Run without --dry-run to generate workflows');
      return;
    }

    // Generate workflows
    let workflows: GeneratedWorkflow[] = [];

    await withSpinner(
      'Generating workflows...',
      async () => {
        workflows = await generateWorkflows({
          dryRun: false,
          force: options.force,
          validate: true,
        });
      },
      'Workflows generated'
    );

    // Display results
    console.log('');

    const generated = workflows.filter((w) => w.warnings.length === 0);
    const skipped = workflows.filter((w) =>
      w.warnings.some((warning) => warning.includes('already exists'))
    );

    if (generated.length > 0) {
      logger.success(`Generated ${generated.length} workflow${generated.length > 1 ? 's' : ''}:`);
      for (const workflow of generated) {
        console.log(`  ✓ ${workflow.filePath}`);
        if (workflow.secrets.length > 0) {
          console.log(`    Required secrets: ${workflow.secrets.join(', ')}`);
        }
      }
      console.log('');
    }

    if (skipped.length > 0) {
      logger.warn(`Skipped ${skipped.length} existing workflow${skipped.length > 1 ? 's' : ''}`);
      logger.info('Use --force to overwrite existing workflows');
      console.log('');
    }

    // Show unique secrets
    const allSecrets = new Set<string>();
    for (const workflow of workflows) {
      workflow.secrets.forEach((s) => allSecrets.add(s));
    }

    if (allSecrets.size > 0) {
      logger.info('Required GitHub secrets:');
      for (const secret of Array.from(allSecrets).sort()) {
        console.log(`  - ${secret}`);
      }
      console.log('');
      logger.info('Add these secrets in: Settings → Secrets → Actions');
      console.log('');
    }

    logger.info('Next steps:');
    console.log('  1. Review generated workflows in .github/workflows/');
    console.log('  2. Add required secrets to GitHub repository');
    console.log('  3. Commit and push to GitHub');
    console.log('  4. Check Actions tab for scheduled runs');
    console.log('');
  } catch (error) {
    logger.error(
      `Failed to generate workflows: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

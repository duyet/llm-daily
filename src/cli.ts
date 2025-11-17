#!/usr/bin/env node
/**
 * CLI entry point for llm-daily
 * Command-line interface for task management and execution
 */

import { program } from 'commander';
import { configureLogger } from './utils/logger.js';
import { generateCommand } from './commands/generate.js';
import { newCommand, type TaskTemplate } from './commands/new.js';
import { runCommand } from './commands/run.js';
import { listCommand } from './commands/list.js';
import { validateCommand } from './commands/validate.js';

/**
 * Setup CLI program
 */
program
  .name('llm-daily')
  .description('Scheduled LLM task automation with GitHub Actions')
  .version('0.1.0')
  .option('-q, --quiet', 'Quiet mode - only show errors')
  .option('-v, --verbose', 'Verbose mode - show debug information')
  .hook('preAction', (thisCommand) => {
    // Configure logger based on global options
    const opts = thisCommand.opts();
    configureLogger({ quiet: Boolean(opts.quiet), verbose: Boolean(opts.verbose) });
  });

/**
 * Generate command - Create GitHub Actions workflows
 */
program
  .command('generate')
  .description('Generate GitHub Actions workflows for all tasks')
  .option('--dry-run', 'Show what would be generated without creating files')
  .option('--force', 'Overwrite existing workflow files')
  .action(async (options: { dryRun?: boolean; force?: boolean }) => {
    await generateCommand(options);
  });

/**
 * New command - Create a new task
 */
program
  .command('new [name]')
  .description('Create a new task with scaffolding')
  .option('-i, --interactive', 'Interactive mode - prompt for all options')
  .option('-t, --template <type>', 'Template to use: daily-summary, monitoring, custom')
  .option('-p, --provider <id>', 'Provider ID (e.g., openai:gpt-4o-mini)')
  .option('-s, --schedule <cron>', 'Schedule as cron expression (e.g., "0 9 * * *")')
  .action(
    async (
      name: string | undefined,
      options: { interactive?: boolean; template?: string; provider?: string; schedule?: string },
    ) => {
      await newCommand(name, {
        ...options,
        template: options.template as TaskTemplate | undefined,
      });
    },
  );

/**
 * Run command - Execute a task locally
 */
program
  .command('run <name>')
  .description('Run a task locally')
  .option('--env-file <path>', 'Load environment from custom .env file')
  .option('--dry-run', 'Dry run - show what would be executed')
  .option('--force', 'Force run, skipping deduplication checks')
  .action(async (name: string, options: { envFile?: string; dryRun?: boolean; force?: boolean }) => {
    // Pass global options to command
    const globalOpts = program.opts();
    await runCommand(name, { ...options, quiet: Boolean(globalOpts.quiet), verbose: Boolean(globalOpts.verbose) });
  });

/**
 * List command - Show all tasks
 */
program
  .command('list')
  .description('List all tasks with their status')
  .option('-d, --detailed', 'Show detailed information including cost')
  .action(async (options: { detailed?: boolean }) => {
    await listCommand(options);
  });

/**
 * Validate command - Validate task configurations
 */
program
  .command('validate [name]')
  .description('Validate task configuration (omit name to validate all)')
  .option('--check-providers', 'Test provider connectivity (not yet implemented)')
  .option('--fail-fast', 'Stop validation on first error')
  .action(async (name: string | undefined, options: { checkProviders?: boolean; failFast?: boolean }) => {
    await validateCommand(name, options);
  });

/**
 * Parse and execute commands
 */
program.parse();

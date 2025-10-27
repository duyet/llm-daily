import { describe, it, expect } from 'vitest';
import {
  ErrorCodes,
  formatError,
  getSuggestionForError,
  printFormattedError,
  fromError,
  isErrorCode,
  type ErrorContext,
} from './error-formatter.js';

describe('Error Formatter', () => {
  describe('formatError', () => {
    it('should format error with all required fields', () => {
      const context: ErrorContext = {
        operation: 'read file',
        file: '/path/to/file.txt',
      };

      const error = formatError(ErrorCodes.FILE_NOT_FOUND, 'File does not exist', context);

      expect(error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
      expect(error.message).toBe('File does not exist');
      expect(error.context).toEqual(context);
      expect(error.suggestion).toContain('/path/to/file.txt');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should include task name in context', () => {
      const context: ErrorContext = {
        operation: 'execute task',
        taskName: 'my-task',
      };

      const error = formatError(ErrorCodes.TASK_EXECUTION_FAILED, 'Execution failed', context);

      expect(error.context.taskName).toBe('my-task');
    });

    it('should handle additional info in context', () => {
      const context: ErrorContext = {
        operation: 'authenticate',
        additionalInfo: {
          provider: 'openai',
          attemptCount: 3,
        },
      };

      const error = formatError(ErrorCodes.PROVIDER_AUTH, 'Authentication failed', context);

      expect(error.context.additionalInfo).toEqual({
        provider: 'openai',
        attemptCount: 3,
      });
    });
  });

  describe('getSuggestionForError', () => {
    describe('File Operations', () => {
      it('should suggest checking file path for FILE_NOT_FOUND', () => {
        const context: ErrorContext = {
          operation: 'read',
          file: '/missing/file.txt',
        };

        const suggestion = getSuggestionForError(ErrorCodes.FILE_NOT_FOUND, context);

        expect(suggestion).toContain('/missing/file.txt');
        expect(suggestion).toContain('exists');
      });

      it('should suggest permission check for FILE_READ_ERROR', () => {
        const context: ErrorContext = {
          operation: 'read',
          file: '/protected/file.txt',
        };

        const suggestion = getSuggestionForError(ErrorCodes.FILE_READ_ERROR, context);

        expect(suggestion).toContain('permissions');
        expect(suggestion).toContain('/protected/file.txt');
      });

      it('should suggest write permissions for FILE_WRITE_ERROR', () => {
        const context: ErrorContext = {
          operation: 'write',
          file: '/readonly/file.txt',
        };

        const suggestion = getSuggestionForError(ErrorCodes.FILE_WRITE_ERROR, context);

        expect(suggestion).toContain('write permissions');
      });
    });

    describe('Configuration Errors', () => {
      it('should suggest validation command for CONFIG_INVALID', () => {
        const context: ErrorContext = {
          operation: 'validate config',
          taskName: 'my-task',
        };

        const suggestion = getSuggestionForError(ErrorCodes.CONFIG_INVALID, context);

        expect(suggestion).toContain('task:validate');
        expect(suggestion).toContain('my-task');
      });

      it('should suggest creating config for CONFIG_MISSING', () => {
        const context: ErrorContext = {
          operation: 'load config',
          file: 'tasks/my-task/config.yaml',
        };

        const suggestion = getSuggestionForError(ErrorCodes.CONFIG_MISSING, context);

        expect(suggestion).toContain('task:new');
      });

      it('should suggest YAML fix for CONFIG_PARSE_ERROR', () => {
        const context: ErrorContext = {
          operation: 'parse config',
        };

        const suggestion = getSuggestionForError(ErrorCodes.CONFIG_PARSE_ERROR, context);

        expect(suggestion).toContain('YAML');
        expect(suggestion).toContain('syntax');
      });
    });

    describe('Task Errors', () => {
      it('should suggest listing tasks for TASK_NOT_FOUND', () => {
        const context: ErrorContext = {
          operation: 'find task',
          taskName: 'missing-task',
        };

        const suggestion = getSuggestionForError(ErrorCodes.TASK_NOT_FOUND, context);

        expect(suggestion).toContain('task:list');
        expect(suggestion).toContain('missing-task');
      });

      it('should suggest API key setup for TASK_EXECUTION_FAILED with API key error', () => {
        const context: ErrorContext = {
          operation: 'run task',
        };
        const originalError = new Error('API key not found');

        const suggestion = getSuggestionForError(
          ErrorCodes.TASK_EXECUTION_FAILED,
          context,
          originalError
        );

        expect(suggestion).toContain('API key');
        expect(suggestion).toContain('environment variables');
      });
    });

    describe('Provider Errors', () => {
      it('should suggest OpenAI API key for PROVIDER_AUTH with openai provider', () => {
        const context: ErrorContext = {
          operation: 'authenticate',
          additionalInfo: { provider: 'openai' },
        };

        const suggestion = getSuggestionForError(ErrorCodes.PROVIDER_AUTH, context);

        expect(suggestion).toContain('OPENAI_API_KEY');
      });

      it('should suggest OpenRouter API key for PROVIDER_AUTH with openrouter provider', () => {
        const context: ErrorContext = {
          operation: 'authenticate',
          additionalInfo: { provider: 'openrouter' },
        };

        const suggestion = getSuggestionForError(ErrorCodes.PROVIDER_AUTH, context);

        expect(suggestion).toContain('OPENROUTER_API_KEY');
      });

      it('should suggest timeout increase for PROVIDER_TIMEOUT', () => {
        const context: ErrorContext = {
          operation: 'call provider',
        };

        const suggestion = getSuggestionForError(ErrorCodes.PROVIDER_TIMEOUT, context);

        expect(suggestion).toContain('timeout');
        expect(suggestion).toContain('network');
      });

      it('should suggest rate limit handling for PROVIDER_RATE_LIMIT', () => {
        const context: ErrorContext = {
          operation: 'call provider',
        };

        const suggestion = getSuggestionForError(ErrorCodes.PROVIDER_RATE_LIMIT, context);

        expect(suggestion).toContain('Rate limit');
        expect(suggestion).toContain('Wait'); // Capital W in the actual message
      });
    });

    describe('Memory Errors', () => {
      it('should suggest memory format check for MEMORY_ERROR', () => {
        const context: ErrorContext = {
          operation: 'update memory',
        };

        const suggestion = getSuggestionForError(ErrorCodes.MEMORY_ERROR, context);

        expect(suggestion).toContain('memory file');
        expect(suggestion).toContain('YAML frontmatter');
      });
    });

    describe('Workflow Errors', () => {
      it('should suggest validation for WORKFLOW_GENERATION_FAILED', () => {
        const context: ErrorContext = {
          operation: 'generate workflows',
        };

        const suggestion = getSuggestionForError(ErrorCodes.WORKFLOW_GENERATION_FAILED, context);

        expect(suggestion).toContain('validation');
        expect(suggestion).toContain('configurations');
      });
    });

    describe('Output Errors', () => {
      it('should suggest webhook check for WEBHOOK_FAILED', () => {
        const context: ErrorContext = {
          operation: 'send webhook',
        };

        const suggestion = getSuggestionForError(ErrorCodes.WEBHOOK_FAILED, context);

        expect(suggestion).toContain('webhook');
        expect(suggestion).toContain('POST');
      });
    });
  });

  describe('printFormattedError', () => {
    it('should format error message with code and suggestion', () => {
      const error = formatError(ErrorCodes.FILE_NOT_FOUND, 'File does not exist', {
        operation: 'read file',
        file: '/path/to/file.txt',
      });

      const output = printFormattedError(error);

      expect(output).toContain('[ERR_FILE_NOT_FOUND]');
      expect(output).toContain('read file');
      expect(output).toContain('/path/to/file.txt');
      expect(output).toContain('failed:');
      expect(output).toContain('Suggestion:');
    });

    it('should include task name when present', () => {
      const error = formatError(ErrorCodes.TASK_EXECUTION_FAILED, 'Task failed', {
        operation: 'run task',
        taskName: 'my-task',
      });

      const output = printFormattedError(error);

      expect(output).toContain('(task: my-task)');
    });

    it('should format error without file or task name', () => {
      const error = formatError(ErrorCodes.PROVIDER_ERROR, 'Provider error', {
        operation: 'call provider',
      });

      const output = printFormattedError(error);

      expect(output).toContain('[ERR_PROVIDER]');
      expect(output).toContain('call provider');
      expect(output).not.toContain(' in ');
      expect(output).not.toContain('(task:');
    });
  });

  describe('fromError', () => {
    it('should create FormattedError from standard Error', () => {
      const standardError = new Error('Something went wrong');
      const context: ErrorContext = {
        operation: 'test operation',
      };

      const formatted = fromError(standardError, ErrorCodes.PROVIDER_ERROR, context);

      expect(formatted.code).toBe(ErrorCodes.PROVIDER_ERROR);
      expect(formatted.message).toBe('Something went wrong');
      expect(formatted.context).toEqual(context);
      expect(formatted.suggestion).toBeTruthy();
    });
  });

  describe('isErrorCode', () => {
    it('should return true for matching error code', () => {
      const error = formatError(ErrorCodes.FILE_NOT_FOUND, 'File not found', {
        operation: 'read',
      });

      expect(isErrorCode(error, ErrorCodes.FILE_NOT_FOUND)).toBe(true);
    });

    it('should return false for non-matching error code', () => {
      const error = formatError(ErrorCodes.FILE_NOT_FOUND, 'File not found', {
        operation: 'read',
      });

      expect(isErrorCode(error, ErrorCodes.CONFIG_INVALID)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isErrorCode(null, ErrorCodes.FILE_NOT_FOUND)).toBe(false);
      expect(isErrorCode(undefined, ErrorCodes.FILE_NOT_FOUND)).toBe(false);
      expect(isErrorCode('error', ErrorCodes.FILE_NOT_FOUND)).toBe(false);
      expect(isErrorCode(123, ErrorCodes.FILE_NOT_FOUND)).toBe(false);
    });

    it('should return false for objects without code property', () => {
      const obj = { message: 'error' };
      expect(isErrorCode(obj, ErrorCodes.FILE_NOT_FOUND)).toBe(false);
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes defined', () => {
      expect(ErrorCodes.FILE_NOT_FOUND).toBe('ERR_FILE_NOT_FOUND');
      expect(ErrorCodes.CONFIG_INVALID).toBe('ERR_CONFIG_INVALID');
      expect(ErrorCodes.TASK_NOT_FOUND).toBe('ERR_TASK_NOT_FOUND');
      expect(ErrorCodes.PROVIDER_AUTH).toBe('ERR_PROVIDER_AUTH');
      expect(ErrorCodes.MEMORY_ERROR).toBe('ERR_MEMORY');
      expect(ErrorCodes.WORKFLOW_GENERATION_FAILED).toBe('ERR_WORKFLOW_GENERATION');
      expect(ErrorCodes.WEBHOOK_FAILED).toBe('ERR_WEBHOOK_FAILED');
    });

    it('should have unique error code values', () => {
      const values = Object.values(ErrorCodes);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

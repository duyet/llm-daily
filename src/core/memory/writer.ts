/**
 * Memory file writer with atomic writes
 * Writes memory.md files safely using temp file + rename pattern
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { MemoryContent } from '../../types/memory.types.js';

/**
 * Write error with context
 */
export class MemoryWriteError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'MemoryWriteError';
    Object.setPrototypeOf(this, MemoryWriteError.prototype);
  }
}

/**
 * Serialize MemoryContent to YAML frontmatter + markdown format
 * @param content Memory content to serialize
 * @returns Formatted string
 */
export function serializeMemory(content: MemoryContent): string {
  try {
    // Serialize metadata to YAML
    const yamlContent = yaml.stringify(content.metadata, {
      defaultStringType: 'PLAIN',
      defaultKeyType: 'PLAIN',
    });

    // Combine frontmatter and body
    const lines: string[] = [
      '---',
      yamlContent.trim(),
      '---',
      '',
      content.body.trim(),
      '', // Trailing newline
    ];

    return lines.join('\n');
  } catch (error) {
    throw new MemoryWriteError(
      `Failed to serialize memory content: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Write memory content to file atomically
 * Uses temp file + rename pattern to prevent corruption
 * @param filePath Target file path
 * @param content Memory content to write
 * @throws MemoryWriteError if write fails
 */
export async function writeMemory(filePath: string, content: MemoryContent): Promise<void> {
  const tempPath = `${filePath}.tmp`;

  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Serialize content
    const serialized = serializeMemory(content);

    // Write to temporary file
    await fs.writeFile(tempPath, serialized, 'utf-8');

    // Atomic rename
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    throw new MemoryWriteError(
      `Failed to write memory file to ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Read memory file content
 * @param filePath File path to read
 * @returns Raw file content
 * @throws MemoryWriteError if read fails
 */
export async function readMemoryFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    // Return empty content if file doesn't exist
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }

    throw new MemoryWriteError(
      `Failed to read memory file from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

/**
 * Check if memory file exists
 * @param filePath File path to check
 * @returns True if file exists
 */
export async function memoryFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete memory file
 * @param filePath File path to delete
 * @throws MemoryWriteError if deletion fails
 */
export async function deleteMemoryFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }

    throw new MemoryWriteError(
      `Failed to delete memory file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}

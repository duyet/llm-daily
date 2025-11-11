/**
 * Progress indicators for CLI operations
 * Provides spinners for long operations and progress bars for iterations
 */

/**
 * Spinner frames for animation
 */
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Spinner class for long-running operations
 */
export class Spinner {
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private text: string;
  private stream = process.stderr;

  constructor(text: string = 'Loading...') {
    this.text = text;
  }

  /**
   * Start the spinner
   */
  start(): void {
    if (this.interval) {
      return; // Already running
    }

    this.frameIndex = 0;
    this.interval = setInterval(() => {
      const frame = spinnerFrames[this.frameIndex];
      this.stream.write(`\r${frame} ${this.text}`);
      this.frameIndex = (this.frameIndex + 1) % spinnerFrames.length;
    }, 80);
  }

  /**
   * Update spinner text
   */
  setText(text: string): void {
    this.text = text;
  }

  /**
   * Stop the spinner with a success message
   */
  succeed(message?: string): void {
    this.stop();
    const text = message ?? this.text;
    this.stream.write(`\r✓ ${text}\n`);
  }

  /**
   * Stop the spinner with a failure message
   */
  fail(message?: string): void {
    this.stop();
    const text = message ?? this.text;
    this.stream.write(`\r✗ ${text}\n`);
  }

  /**
   * Stop the spinner with an info message
   */
  info(message?: string): void {
    this.stop();
    const text = message ?? this.text;
    this.stream.write(`\rℹ ${text}\n`);
  }

  /**
   * Stop the spinner without a message
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.stream.write('\r\x1b[K'); // Clear line
    }
  }
}

/**
 * Progress bar class for tracking progress through iterations
 */
export class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number = 40;
  private stream = process.stderr;

  constructor(total: number, width: number = 40) {
    this.total = total;
    this.width = width;
  }

  /**
   * Update progress
   */
  update(current: number, text?: string): void {
    this.current = current;
    this.render(text);
  }

  /**
   * Increment progress by 1
   */
  tick(text?: string): void {
    this.current++;
    this.render(text);
  }

  /**
   * Complete the progress bar
   */
  complete(text?: string): void {
    this.current = this.total;
    this.render(text);
    this.stream.write('\n');
  }

  /**
   * Render the progress bar
   */
  private render(text?: string): void {
    const percentage = Math.min(100, (this.current / this.total) * 100);
    const filled = Math.floor((this.width * this.current) / this.total);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const suffix = text ? ` ${text}` : '';

    this.stream.write(
      `\r[${bar}] ${percentage.toFixed(0)}% (${this.current}/${this.total})${suffix}`
    );
  }
}

/**
 * Create a spinner
 */
export function spinner(text?: string): Spinner {
  return new Spinner(text);
}

/**
 * Create a progress bar
 */
export function progressBar(total: number, width?: number): ProgressBar {
  return new ProgressBar(total, width);
}

/**
 * Run an async operation with a spinner
 */
export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  successText?: string,
  options?: { quiet?: boolean }
): Promise<T> {
  const spin = new Spinner(text);

  // Only show spinner if not in quiet mode
  if (!options?.quiet) {
    spin.start();
  }

  try {
    const result = await operation();
    if (!options?.quiet) {
      spin.succeed(successText);
    }
    return result;
  } catch (error) {
    if (!options?.quiet) {
      spin.fail();
    }
    throw error;
  }
}

/**
 * Webhook output integration - sends results to HTTP endpoints
 */

import type {
  OutputIntegration,
  TaskResult,
  WebhookOutputConfig,
} from '../../types/output.types.js';

export class WebhookOutput implements OutputIntegration {
  readonly type = 'webhook';

  constructor(private config: WebhookOutputConfig) {}

  async execute(result: TaskResult): Promise<void> {
    const maxRetries = this.config.retries ?? 3;
    const timeout = this.config.timeout ?? 10000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sendWebhook(result, timeout);
        console.log(`✅ Sent webhook for ${result.taskName} to ${this.config.url}`);
        return;
      } catch (error) {
        console.error(`❌ Webhook attempt ${attempt}/${maxRetries} failed:`, error);

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to send webhook after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }

        // Exponential backoff
        await this.sleep(Math.min(1000 * 2 ** (attempt - 1), 10000));
      }
    }
  }

  /**
   * Send webhook HTTP request
   */
  private async sendWebhook(result: TaskResult, timeout: number): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'llm-daily/0.1.0',
          ...this.config.headers,
        },
        body: JSON.stringify(this.formatPayload(result)),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Format webhook payload
   */
  private formatPayload(result: TaskResult): object {
    return {
      task: result.taskName,
      timestamp: result.timestamp,
      success: result.success,
      response: result.response,
      metadata: {
        provider: result.metadata.provider,
        model: result.metadata.model,
        tokens: result.metadata.tokens,
        cost: result.metadata.cost,
        responseTime: result.metadata.responseTime,
      },
      error: result.error,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

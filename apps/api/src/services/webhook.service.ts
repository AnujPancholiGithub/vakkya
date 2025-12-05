import { createHmac } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { logger } from '../config/logger.js';

// Webhook delivery configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s exponential backoff
const WEBHOOK_TIMEOUT = 10000; // 10 seconds

export interface WebhookPayload {
  event: 'form.submitted';
  timestamp: string;
  data: Record<string, unknown>;
  metadata: {
    formId: string;
    formName: string;
    sessionId: string;
    submissionId: string;
  };
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  attempts: number;
  error?: string;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WebhookService {
  private sleepFn: (ms: number) => Promise<void>;

  constructor(sleepFn?: (ms: number) => Promise<void>) {
    this.sleepFn = sleepFn || sleep;
  }

  /**
   * Deliver webhook with retry logic (up to MAX_RETRIES attempts)
   * Retries on 5xx errors and 429 rate limits with exponential backoff
   * Does NOT retry on 4xx client errors (except 429)
   */
  async deliverWebhook(
    webhookUrl: string,
    payload: WebhookPayload,
    webhookSecret?: string
  ): Promise<WebhookDeliveryResult> {
    const payloadString = JSON.stringify(payload);
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;
    let attemptCount = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      attemptCount = attempt + 1;
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Vakkya-Event': payload.event,
          'X-Vakkya-Timestamp': payload.timestamp,
        };

        // Add HMAC signature if secret is provided
        if (webhookSecret) {
          const signature = generateWebhookSignature(payloadString, webhookSecret);
          headers['X-Vakkya-Signature'] = signature;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body: payloadString,
            signal: controller.signal,
          });

          lastStatusCode = response.status;

          if (response.ok) {
            logger.info({ webhookUrl, attempts: attemptCount }, 'Webhook delivered successfully');
            return {
              success: true,
              statusCode: response.status,
              attempts: attemptCount,
            };
          }

          // Non-retryable status codes (4xx except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            lastError = `HTTP ${response.status}: ${response.statusText}`;
            logger.warn({ webhookUrl, status: response.status }, 'Webhook rejected (non-retryable)');
            return {
              success: false,
              statusCode: lastStatusCode,
              attempts: attemptCount,
              error: lastError,
            };
          }

          lastError = `HTTP ${response.status}: ${response.statusText}`;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = 'Request timeout';
          } else {
            lastError = error.message;
          }
        } else {
          lastError = 'Unknown error';
        }
        logger.warn({ webhookUrl, error: lastError, attempt: attemptCount }, 'Webhook delivery failed');
      }

      // Wait before retry (if not last attempt)
      if (attempt < MAX_RETRIES) {
        await this.sleepFn(RETRY_DELAYS[attempt]);
      }
    }

    logger.error({ webhookUrl, error: lastError }, 'Webhook delivery failed after all retries');
    return {
      success: false,
      statusCode: lastStatusCode,
      attempts: attemptCount,
      error: lastError,
    };
  }

  /**
   * Submit form data and trigger webhook delivery
   * Creates a FormSubmission record and delivers webhook if configured
   * 
   * Note: Webhook secret support will be added in Phase 6 (Dashboard Form Builder)
   * when webhookSecret field is added to FormSchema model. The HMAC signature
   * generation is already implemented in deliverWebhook().
   */
  async submitForm(
    formId: string,
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<{ submissionId: string; webhookResult?: WebhookDeliveryResult }> {
    // Get form schema
    const formSchema = await prisma.formSchema.findUnique({
      where: { id: formId },
    });

    if (!formSchema) {
      throw new Error('Form not found');
    }

    // Create submission
    const submission = await prisma.formSubmission.create({
      data: {
        formSchemaId: formId,
        sessionId,
        data: data as object,
        webhookSent: false,
      },
    });

    // If webhook URL is configured, deliver it
    // TODO: Pass webhookSecret when FormSchema.webhookSecret field is added (Phase 6)
    let webhookResult: WebhookDeliveryResult | undefined;
    if (formSchema.webhookUrl) {
      const payload: WebhookPayload = {
        event: 'form.submitted',
        timestamp: new Date().toISOString(),
        data,
        metadata: {
          formId: formSchema.id,
          formName: formSchema.name,
          sessionId,
          submissionId: submission.id,
        },
      };

      webhookResult = await this.deliverWebhook(formSchema.webhookUrl, payload);

      // Update submission with webhook status
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: { webhookSent: webhookResult.success },
      });
    }

    return { submissionId: submission.id, webhookResult };
  }
}

export const webhookService = new WebhookService();

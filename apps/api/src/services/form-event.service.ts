import { prisma } from '../lib/prisma.js';
import type { FormEventType } from '@vakkya/schemas';

export interface LogFormActivationInput {
  formSchemaId: string;
  sessionId: string;
  conversationId?: string;
  triggerReason?: string;
}

export interface LogFieldCollectedInput {
  formSchemaId: string;
  sessionId: string;
  conversationId?: string;
  fieldName: string;
  fieldValue: string;
  attemptCount: number;
}

export interface LogFormSubmittedInput {
  formSchemaId: string;
  sessionId: string;
  conversationId?: string;
  fieldValues: Record<string, unknown>;
}

export interface LogFormAbandonedInput {
  formSchemaId: string;
  sessionId: string;
  conversationId?: string;
  abandonmentPoint?: string;
  reason?: string;
}

/**
 * Form Event Logging Service
 * Logs form lifecycle events for analytics and conversation history
 * 
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */
export class FormEventService {
  /**
   * Log form activation event
   * Requirement 11.1: Log activation with form ID and trigger reason
   */
  async logFormActivation(input: LogFormActivationInput) {
    return prisma.formEvent.create({
      data: {
        formSchemaId: input.formSchemaId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        eventType: 'activated' as FormEventType,
        metadata: input.triggerReason ? { triggerReason: input.triggerReason } : undefined,
      },
    });
  }


  /**
   * Log field value collected event
   * Requirement 11.2: Log field name, value, and number of attempts
   */
  async logFieldCollected(input: LogFieldCollectedInput) {
    return prisma.formEvent.create({
      data: {
        formSchemaId: input.formSchemaId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        eventType: 'field_collected' as FormEventType,
        fieldName: input.fieldName,
        fieldValue: input.fieldValue,
        attemptCount: input.attemptCount,
      },
    });
  }

  /**
   * Log form submission event
   * Requirement 11.3: Log complete submission with all field values
   */
  async logFormSubmitted(input: LogFormSubmittedInput) {
    return prisma.formEvent.create({
      data: {
        formSchemaId: input.formSchemaId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        eventType: 'submitted' as FormEventType,
        metadata: { fieldValues: input.fieldValues } as object,
      },
    });
  }

  /**
   * Log form abandonment event
   * Requirement 11.4: Log abandonment point and reason if available
   */
  async logFormAbandoned(input: LogFormAbandonedInput) {
    return prisma.formEvent.create({
      data: {
        formSchemaId: input.formSchemaId,
        sessionId: input.sessionId,
        conversationId: input.conversationId,
        eventType: 'abandoned' as FormEventType,
        metadata: {
          ...(input.abandonmentPoint && { abandonmentPoint: input.abandonmentPoint }),
          ...(input.reason && { reason: input.reason }),
        },
      },
    });
  }

  /**
   * Get all events for a form schema
   * Used for analytics and debugging
   */
  async getEventsForForm(formSchemaId: string) {
    return prisma.formEvent.findMany({
      where: { formSchemaId },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Get all events for a conversation
   * Requirement 11.5: Display form interactions inline with conversation turns
   */
  async getEventsForConversation(conversationId: string) {
    return prisma.formEvent.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get all events for a session
   * Used for session-level analytics
   */
  async getEventsForSession(sessionId: string) {
    return prisma.formEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
  }
}

export const formEventService = new FormEventService();

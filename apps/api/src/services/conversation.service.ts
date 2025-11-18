import { prisma } from '../lib/prisma.js';

export interface CreateConversationInput {
  projectId: string;
  sessionId: string;
}

export interface AddTurnInput {
  userQuery: string;
  agentResponse: string;
}

export class ConversationService {
  /**
   * Create a new conversation
   */
  async create(input: CreateConversationInput) {
    const { projectId, sessionId } = input;

    const conversation = await prisma.conversation.create({
      data: {
        projectId,
        sessionId,
      },
    });

    return conversation;
  }

  /**
   * Add a turn to an existing conversation
   * Increments turnCount atomically using a transaction
   */
  async addTurn(conversationId: string, input: AddTurnInput) {
    const { userQuery, agentResponse } = input;

    try {
      // Use transaction to ensure turnCount stays in sync with actual turn records
      const [turn] = await prisma.$transaction([
        prisma.conversationTurn.create({
          data: {
            conversationId,
            userQuery,
            agentResponse,
          },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: {
            turnCount: {
              increment: 1,
            },
          },
        }),
      ]);

      return turn;
    } catch (error) {
      // Handle case where conversation doesn't exist
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025' || error.code === 'P2003') {
          throw new Error('Conversation not found');
        }
      }
      throw error;
    }
  }

  /**
   * List all conversations for a project
   * No pagination for MVP
   */
  async list(projectId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
    });

    return conversations;
  }

  /**
   * Get conversation detail with all turns
   * Validates that conversation belongs to the specified project (ownership check)
   */
  async get(conversationId: string, projectId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        projectId, // Ownership validation
      },
      include: {
        turns: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return conversation;
  }
}

export const conversationService = new ConversationService();

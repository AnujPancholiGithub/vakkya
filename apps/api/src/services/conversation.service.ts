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
   * Increments turnCount atomically
   */
  async addTurn(conversationId: string, input: AddTurnInput) {
    const { userQuery, agentResponse } = input;

    // Create turn and increment turnCount in a transaction
    await prisma.$transaction([
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
   */
  async get(conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        turns: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return conversation;
  }
}

export const conversationService = new ConversationService();

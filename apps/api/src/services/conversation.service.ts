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
      // Use transaction to ensure atomicity and prevent race conditions
      const turn = await prisma.$transaction(async (tx) => {
        // Verify conversation exists first
        const conversation = await tx.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        // Create turn
        const newTurn = await tx.conversationTurn.create({
          data: {
            conversationId,
            userQuery: userQuery.trim(),
            agentResponse: agentResponse.trim(),
          },
        });

        // Increment count
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            turnCount: {
              increment: 1,
            },
          },
        });

        return newTurn;
      });

      return turn;
    } catch (error) {
      // Handle case where conversation doesn't exist
      if (error instanceof Error && error.message === 'Conversation not found') {
        throw error;
      }
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
   * Includes first turn's user query for preview
   * No pagination for MVP
   */
  async list(projectId: string) {
    const conversations = await prisma.conversation.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      include: {
        turns: {
          orderBy: { timestamp: 'asc' },
          take: 1,
          select: { userQuery: true },
        },
      },
    });

    return conversations.map((c) => ({
      ...c,
      firstQuery: c.turns[0]?.userQuery || null,
      turns: undefined, // Remove turns from response
    }));
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

  /**
   * Get conversation with ownership validation via userId
   * Single query to prevent N+1 issues
   */
  async getWithOwnership(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        project: {
          userId, // Ownership validation through project
        },
      },
      include: {
        turns: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    return conversation;
  }
}

export const conversationService = new ConversationService();

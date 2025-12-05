import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';

export interface CreateProjectInput {
  userId: string;
  name: string;
  systemPrompt?: string;
  agentName?: string;
}

export interface UpdateProjectInput {
  name?: string;
  systemPrompt?: string | null;
  agentName?: string | null;
  initiationMode?: 'agent_first' | 'user_first';
  autoTerminate?: boolean;
}

export interface ProjectConfig {
  projectId: string;
  name: string;
  systemPrompt: string | null;
  agentName: string | null;
  initiationMode: string;
  autoTerminate: boolean;
}

// Security: Max length for system prompt to prevent abuse
const MAX_SYSTEM_PROMPT_LENGTH = 2000;
const MAX_AGENT_NAME_LENGTH = 100;
const MAX_PROJECT_NAME_LENGTH = 100;

/**
 * Sanitize system prompt to prevent prompt injection attacks.
 * Removes potentially dangerous patterns while preserving legitimate content.
 * 
 * NOTE: This blocklist is defense-in-depth only. Determined attackers can bypass
 * with unicode lookalikes, word splitting, etc. The primary protection is in the
 * voice agent's system prompt structure which sandboxes user-provided content.
 */
function sanitizeSystemPrompt(prompt: string | undefined | null): string | null {
  if (!prompt) return null;
  
  // Trim and limit length
  let sanitized = prompt.trim().slice(0, MAX_SYSTEM_PROMPT_LENGTH);
  
  // Remove attempts to override system behavior
  // These patterns try to make the AI ignore previous instructions
  const dangerousPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /forget\s+(all\s+)?(previous|above|prior)\s+instructions?/gi,
    /you\s+are\s+now\s+in\s+developer\s+mode/gi,
    /enter\s+developer\s+mode/gi,
    /jailbreak/gi,
  ];
  
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }
  
  return sanitized || null;
}

/**
 * Sanitize agent name
 */
function sanitizeAgentName(name: string | undefined | null): string | null {
  if (!name) return null;
  return name.trim().slice(0, MAX_AGENT_NAME_LENGTH) || null;
}

/**
 * Validate and sanitize project name
 * Throws if name is empty or invalid
 */
function validateProjectName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Project name is required');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Project name cannot be empty');
  }
  return trimmed.slice(0, MAX_PROJECT_NAME_LENGTH);
}

export class ProjectService {
  /**
   * Create a new project with a unique widget token
   * Enforces 10 project limit per user
   */
  async create(input: CreateProjectInput) {
    const { userId, name, systemPrompt, agentName } = input;

    // Validate project name
    const validatedName = validateProjectName(name);

    // Check project limit (10 per user)
    const projectCount = await prisma.project.count({
      where: { userId },
    });

    if (projectCount >= 10) {
      throw new Error('Project limit reached. Maximum 10 projects per user.');
    }

    // Generate unique 64-character hex token (32 bytes)
    const widgetToken = randomBytes(32).toString('hex');

    const project = await prisma.project.create({
      data: {
        userId,
        name: validatedName,
        widgetToken,
        systemPrompt: sanitizeSystemPrompt(systemPrompt),
        agentName: sanitizeAgentName(agentName),
      },
    });

    return project;
  }

  /**
   * List all projects for a user with document and conversation counts
   */
  async list(userId: string) {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    return projects;
  }

  /**
   * Get a single project by ID with ownership check
   */
  async get(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    return project;
  }

  /**
   * Update project settings with validation
   */
  async update(userId: string, projectId: string, input: UpdateProjectInput) {
    // Verify ownership first
    await this.get(userId, projectId);

    // Build update data with sanitization
    const updateData: Record<string, unknown> = {};
    
    if (input.name !== undefined) {
      updateData.name = validateProjectName(input.name);
    }
    
    if (input.systemPrompt !== undefined) {
      updateData.systemPrompt = sanitizeSystemPrompt(input.systemPrompt);
    }
    
    if (input.agentName !== undefined) {
      updateData.agentName = sanitizeAgentName(input.agentName);
    }

    if (input.initiationMode !== undefined) {
      updateData.initiationMode = input.initiationMode;
    }

    if (input.autoTerminate !== undefined) {
      updateData.autoTerminate = input.autoTerminate;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return project;
  }

  /**
   * Delete project (cascade deletes documents and conversations)
   */
  async delete(userId: string, projectId: string) {
    // Verify ownership first
    await this.get(userId, projectId);

    await prisma.project.delete({
      where: { id: projectId },
    });
  }

  /**
   * Validate widget token and return project configuration
   * Returns null for invalid tokens
   */
  async validateToken(token: string): Promise<ProjectConfig | null> {
    const project = await prisma.project.findUnique({
      where: { widgetToken: token },
      select: {
        id: true,
        name: true,
        systemPrompt: true,
        agentName: true,
        initiationMode: true,
        autoTerminate: true,
      },
    });

    if (!project) {
      return null;
    }

    return {
      projectId: project.id,
      name: project.name,
      systemPrompt: project.systemPrompt,
      agentName: project.agentName,
      initiationMode: project.initiationMode,
      autoTerminate: project.autoTerminate,
    };
  }
}

export const projectService = new ProjectService();

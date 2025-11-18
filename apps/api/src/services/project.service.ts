import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';

export interface CreateProjectInput {
  userId: string;
  name: string;
}

export interface UpdateProjectInput {
  name?: string;
}

export interface ProjectConfig {
  projectId: string;
  name: string;
}

export class ProjectService {
  /**
   * Create a new project with a unique widget token
   * Enforces 10 project limit per user
   */
  async create(input: CreateProjectInput) {
    const { userId, name } = input;

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
        name,
        widgetToken,
      },
    });

    return project;
  }

  /**
   * List all projects for a user
   */
  async list(userId: string) {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

    const project = await prisma.project.update({
      where: { id: projectId },
      data: input,
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
      },
    });

    if (!project) {
      return null;
    }

    return {
      projectId: project.id,
      name: project.name,
    };
  }
}

export const projectService = new ProjectService();

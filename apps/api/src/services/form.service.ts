import { prisma } from '../lib/prisma.js';
import type { FormField, CreateFormSchemaInput, UpdateFormSchemaInput } from '@vakkya/schemas';

export interface FormSchemaWithCounts {
  id: string;
  projectId: string;
  name: string;
  fields: FormField[];
  webhookUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { submissions: number };
}

export class FormService {
  /**
   * Create a new form schema for a project
   */
  async createFormSchema(
    userId: string,
    projectId: string,
    input: CreateFormSchemaInput
  ) {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const formSchema = await prisma.formSchema.create({
      data: {
        projectId,
        name: input.name,
        fields: input.fields,
        webhookUrl: input.webhookUrl || null,
      },
    });

    return formSchema;
  }

  /**
   * List all form schemas for a project
   */
  async listFormSchemas(userId: string, projectId: string): Promise<FormSchemaWithCounts[]> {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }


    const formSchemas = await prisma.formSchema.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { submissions: true } },
      },
    });

    return formSchemas.map((schema) => ({
      ...schema,
      fields: schema.fields as FormField[],
    }));
  }

  /**
   * Get a single form schema by ID
   */
  async getFormSchema(userId: string, projectId: string, formId: string) {
    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const formSchema = await prisma.formSchema.findFirst({
      where: { id: formId, projectId },
    });

    if (!formSchema) {
      throw new Error('Form not found');
    }

    return {
      ...formSchema,
      fields: formSchema.fields as FormField[],
    };
  }

  /**
   * Update a form schema
   */
  async updateFormSchema(
    userId: string,
    projectId: string,
    formId: string,
    input: UpdateFormSchemaInput
  ) {
    // Verify ownership and form exists
    await this.getFormSchema(userId, projectId, formId);

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.fields !== undefined) {
      updateData.fields = input.fields;
    }
    if (input.webhookUrl !== undefined) {
      updateData.webhookUrl = input.webhookUrl || null;
    }

    const formSchema = await prisma.formSchema.update({
      where: { id: formId },
      data: updateData,
    });

    return {
      ...formSchema,
      fields: formSchema.fields as FormField[],
    };
  }

  /**
   * Delete a form schema (cascade deletes submissions)
   */
  async deleteFormSchema(userId: string, projectId: string, formId: string) {
    // Verify ownership and form exists
    await this.getFormSchema(userId, projectId, formId);

    await prisma.formSchema.delete({
      where: { id: formId },
    });
  }

  /**
   * List all submissions for a form
   * Returns submissions in reverse chronological order
   */
  async listSubmissions(userId: string, projectId: string, formId: string) {
    // Verify ownership and form exists
    await this.getFormSchema(userId, projectId, formId);

    const submissions = await prisma.formSubmission.findMany({
      where: { formSchemaId: formId },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
  }

  /**
   * Get form schema by ID (for internal use, no auth check)
   * Used by voice agent to fetch form schema
   */
  async getFormSchemaById(formId: string) {
    const formSchema = await prisma.formSchema.findUnique({
      where: { id: formId },
    });

    if (!formSchema) {
      return null;
    }

    return {
      ...formSchema,
      fields: formSchema.fields as FormField[],
    };
  }

  /**
   * Get active form for a project (for internal use, no auth check)
   * Returns the most recently created form for the project
   * Used by voice agent to determine if form mode should be active
   */
  async getActiveFormForProject(projectId: string) {
    const formSchema = await prisma.formSchema.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!formSchema) {
      return null;
    }

    return {
      ...formSchema,
      fields: formSchema.fields as FormField[],
    };
  }
}

export const formService = new FormService();

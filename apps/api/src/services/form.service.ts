import { prisma } from '../lib/prisma.js';
import type { FormField, CreateFormSchemaInput, UpdateFormSchemaInput } from '@vakkya/schemas';

export interface FormSchemaWithCounts {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  fields: FormField[];
  triggerPhrases: string[];
  greetingMessage: string | null;
  completionMessage: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { submissions: number };
}

export interface TriggerPhraseConflict {
  phrase: string;
  conflictingFormId: string;
  conflictingFormName: string;
}

export class TriggerPhraseConflictError extends Error {
  conflicts: TriggerPhraseConflict[];

  constructor(conflicts: TriggerPhraseConflict[]) {
    const phrases = conflicts.map((c) => `"${c.phrase}" (used by "${c.conflictingFormName}")`).join(', ');
    super(`Trigger phrase conflict: ${phrases}`);
    this.name = 'TriggerPhraseConflictError';
    this.conflicts = conflicts;
  }
}

export class FormService {
  /**
   * Check for trigger phrase conflicts within a project
   * Returns conflicts if any trigger phrases are already used by other forms
   */
  async checkTriggerPhraseConflicts(
    projectId: string,
    triggerPhrases: string[],
    excludeFormId?: string
  ): Promise<TriggerPhraseConflict[]> {
    if (!triggerPhrases || triggerPhrases.length === 0) {
      return [];
    }

    // Normalize phrases for comparison (lowercase, trimmed)
    const normalizedPhrases = triggerPhrases.map((p) => p.toLowerCase().trim());

    // Get all other forms in the project
    const otherForms = await prisma.formSchema.findMany({
      where: {
        projectId,
        ...(excludeFormId ? { id: { not: excludeFormId } } : {}),
      },
      select: {
        id: true,
        name: true,
        triggerPhrases: true,
      },
    });

    const conflicts: TriggerPhraseConflict[] = [];

    for (const form of otherForms) {
      const formPhrases = (form.triggerPhrases as string[]) || [];
      const normalizedFormPhrases = formPhrases.map((p) => p.toLowerCase().trim());

      for (const phrase of normalizedPhrases) {
        if (normalizedFormPhrases.includes(phrase)) {
          // Find the original phrase (preserving case)
          const originalPhrase = triggerPhrases.find(
            (p) => p.toLowerCase().trim() === phrase
          );
          conflicts.push({
            phrase: originalPhrase || phrase,
            conflictingFormId: form.id,
            conflictingFormName: form.name,
          });
        }
      }
    }

    return conflicts;
  }

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

    // Check for trigger phrase conflicts
    if (input.triggerPhrases && input.triggerPhrases.length > 0) {
      const conflicts = await this.checkTriggerPhraseConflicts(
        projectId,
        input.triggerPhrases
      );
      if (conflicts.length > 0) {
        throw new TriggerPhraseConflictError(conflicts);
      }
    }

    const formSchema = await prisma.formSchema.create({
      data: {
        projectId,
        name: input.name,
        description: input.description || null,
        fields: input.fields,
        triggerPhrases: input.triggerPhrases || [],
        greetingMessage: input.greetingMessage || null,
        completionMessage: input.completionMessage || null,
        webhookUrl: input.webhookUrl || null,
        webhookSecret: input.webhookSecret || null,
        isActive: input.isActive ?? true,
      },
    });

    return {
      ...formSchema,
      fields: formSchema.fields as FormField[],
      triggerPhrases: formSchema.triggerPhrases as string[],
    };
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
      triggerPhrases: schema.triggerPhrases as string[],
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

    // Check for trigger phrase conflicts (excluding current form)
    if (input.triggerPhrases && input.triggerPhrases.length > 0) {
      const conflicts = await this.checkTriggerPhraseConflicts(
        projectId,
        input.triggerPhrases,
        formId
      );
      if (conflicts.length > 0) {
        throw new TriggerPhraseConflictError(conflicts);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description || null;
    }
    if (input.fields !== undefined) {
      updateData.fields = input.fields;
    }
    if (input.triggerPhrases !== undefined) {
      updateData.triggerPhrases = input.triggerPhrases;
    }
    if (input.greetingMessage !== undefined) {
      updateData.greetingMessage = input.greetingMessage || null;
    }
    if (input.completionMessage !== undefined) {
      updateData.completionMessage = input.completionMessage || null;
    }
    if (input.webhookUrl !== undefined) {
      updateData.webhookUrl = input.webhookUrl || null;
    }
    if (input.webhookSecret !== undefined) {
      updateData.webhookSecret = input.webhookSecret || null;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
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

  /**
   * Get all active forms for a project (for internal use, no auth check)
   * Returns all forms with isActive=true for the project
   * Used by voice agent to get available forms with trigger phrases
   * Requirement 2.1: All active forms available to agent
   */
  async getActiveFormsForProject(projectId: string) {
    const formSchemas = await prisma.formSchema.findMany({
      where: { projectId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return formSchemas.map((schema) => ({
      ...schema,
      fields: schema.fields as FormField[],
      triggerPhrases: schema.triggerPhrases as string[],
    }));
  }
}

export const formService = new FormService();

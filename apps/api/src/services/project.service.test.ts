import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ProjectService } from './project.service.js';
import { prisma } from '../lib/prisma.js';
import { hashSync } from 'bcrypt';

describe('ProjectService', () => {
  const projectService = new ProjectService();
  const testUserEmail = 'test-user-' + Date.now() + '@example.com';
  const otherUserEmail = 'other-user-' + Date.now() + '@example.com';
  let testUserId: string;
  let otherUserId: string;

  // Create test users before all tests
  beforeEach(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: hashSync('password123', 10),
      },
    });
    testUserId = testUser.id;

    const otherUser = await prisma.user.create({
      data: {
        email: otherUserEmail,
        password: hashSync('password123', 10),
      },
    });
    otherUserId = otherUser.id;
  });

  // Clean up test data after each test
  afterEach(async () => {
    await prisma.project.deleteMany({
      where: {
        userId: {
          in: [testUserId, otherUserId],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [testUserEmail, otherUserEmail],
        },
      },
    });
  });

  describe('Token Generation', () => {
    it('should generate a 64-character hex token', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'Test Project',
      });

      // Token should be exactly 64 characters
      expect(project.widgetToken).toHaveLength(64);

      // Token should be valid hex (only 0-9, a-f)
      expect(project.widgetToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens for different projects', async () => {
      const project1 = await projectService.create({
        userId: testUserId,
        name: 'Project 1',
      });

      const project2 = await projectService.create({
        userId: testUserId,
        name: 'Project 2',
      });

      expect(project1.widgetToken).not.toBe(project2.widgetToken);
    });
  });

  describe('Ownership Validation', () => {
    it('should allow owner to get their project', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'Owner Test Project',
      });

      const retrieved = await projectService.get(testUserId, project.id);

      expect(retrieved.id).toBe(project.id);
      expect(retrieved.userId).toBe(testUserId);
    });

    it('should reject access when user does not own project', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'Owner Test Project',
      });

      await expect(
        projectService.get(otherUserId, project.id)
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should allow owner to update their project', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'Original Name',
      });

      const updated = await projectService.update(testUserId, project.id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    }, 10000);

    it('should reject update when user does not own project', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'Original Name',
      });

      await expect(
        projectService.update(otherUserId, project.id, { name: 'Hacked Name' })
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should allow owner to delete their project', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'To Delete',
      });

      await projectService.delete(testUserId, project.id);

      // Verify project is deleted
      await expect(
        projectService.get(testUserId, project.id)
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should reject delete when user does not own project', async () => {
      const project = await projectService.create({
        userId: testUserId,
        name: 'Protected Project',
      });

      await expect(
        projectService.delete(otherUserId, project.id)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('Project Limit Enforcement', () => {
    it('should allow creating up to 10 projects', async () => {
      const projects = [];

      for (let i = 0; i < 10; i++) {
        const project = await projectService.create({
          userId: testUserId,
          name: `Project ${i + 1}`,
        });
        projects.push(project);
      }

      expect(projects).toHaveLength(10);
    }, 15000);

    it('should reject creating 11th project', async () => {
      // Create 10 projects
      for (let i = 0; i < 10; i++) {
        await projectService.create({
          userId: testUserId,
          name: `Project ${i + 1}`,
        });
      }

      // Try to create 11th project
      await expect(
        projectService.create({
          userId: testUserId,
          name: 'Project 11',
        })
      ).rejects.toThrow('Project limit reached. Maximum 10 projects per user.');
    }, 15000);

    it('should allow creating project after deleting one', async () => {
      // Create 10 projects
      const projects = [];
      for (let i = 0; i < 10; i++) {
        const project = await projectService.create({
          userId: testUserId,
          name: `Project ${i + 1}`,
        });
        projects.push(project);
      }

      // Delete one project
      await projectService.delete(testUserId, projects[0].id);

      // Should now be able to create another
      const newProject = await projectService.create({
        userId: testUserId,
        name: 'New Project After Delete',
      });

      expect(newProject).toBeDefined();
      expect(newProject.name).toBe('New Project After Delete');
    }, 15000);
  });

  /**
   * **Feature: session-control-features, Property 1: Initiation Mode Default**
   * *For any* project without explicit initiation mode configuration, 
   * the system shall default to "agent_first" behavior.
   * **Validates: Requirements 1.4, 6.3**
   */
  describe('Session Control Configuration Property Tests', () => {
    it('Property 1: Initiation Mode Default - projects default to agent_first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (projectName) => {
            const project = await projectService.create({
              userId: testUserId,
              name: projectName,
            });

            // Verify defaults are applied
            expect(project.initiationMode).toBe('agent_first');
            expect(project.autoTerminate).toBe(true);

            // Clean up
            await projectService.delete(testUserId, project.id);
          }
        ),
        { numRuns: 10 } // Limit runs due to database operations
      );
    }, 30000);

    /**
     * **Feature: session-control-features, Property 6: Configuration Persistence Round Trip**
     * *For any* session configuration with valid initiationMode and autoTerminate values,
     * saving and then retrieving shall return identical values.
     * **Validates: Requirements 6.1, 6.2, 6.4**
     */
    it('Property 6: Configuration Persistence Round Trip - config values persist correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('agent_first', 'user_first'),
          fc.boolean(),
          async (projectName, initiationMode, autoTerminate) => {
            // Create project with default values first
            const project = await projectService.create({
              userId: testUserId,
              name: projectName,
            });

            // Update with specific session config values via direct Prisma update
            // (since ProjectService.update doesn't expose these fields yet)
            await prisma.project.update({
              where: { id: project.id },
              data: { initiationMode, autoTerminate },
            });

            // Retrieve via validateToken (the round-trip path)
            const config = await projectService.validateToken(project.widgetToken);

            // Verify round-trip consistency
            expect(config).not.toBeNull();
            expect(config!.initiationMode).toBe(initiationMode);
            expect(config!.autoTerminate).toBe(autoTerminate);

            // Clean up
            await projectService.delete(testUserId, project.id);
          }
        ),
        { numRuns: 10 } // Limit runs due to database operations
      );
    }, 30000);
  });
});

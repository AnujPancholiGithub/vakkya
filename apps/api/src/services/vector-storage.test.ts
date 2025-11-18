import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { storeVectors, querySimilarChunks, deleteDocumentChunks } from './vector-storage.js';
import type { EmbeddedChunk } from './embedding.js';

describe('Vector Storage Service', () => {
  let testUserId: string;
  let testProjectId: string;
  let testDocumentId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-vector-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedpassword',
      },
    });
    testUserId = user.id;

    // Create test project with unique token
    const uniqueToken = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const project = await prisma.project.create({
      data: {
        userId: testUserId,
        name: 'Test Project',
        widgetToken: uniqueToken,
      },
    });
    testProjectId = project.id;

    // Create test document
    const document = await prisma.document.create({
      data: {
        projectId: testProjectId,
        filename: 'test.txt',
        fileType: 'txt',
        filePath: '/tmp/test.txt',
        status: 'processing',
      },
    });
    testDocumentId = document.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('storeVectors', () => {
    it('should store embedded chunks', async () => {
      const chunks: EmbeddedChunk[] = [
        {
          text: 'First chunk',
          index: 0,
          embedding: new Array(1536).fill(0.1),
        },
        {
          text: 'Second chunk',
          index: 1,
          embedding: new Array(1536).fill(0.2),
        },
      ];

      await storeVectors(testProjectId, testDocumentId, chunks);

      const storedChunks = await prisma.documentChunk.findMany({
        where: { documentId: testDocumentId },
      });

      expect(storedChunks).toHaveLength(2);
      expect(storedChunks[0].text).toBe('First chunk');
      expect(storedChunks[1].text).toBe('Second chunk');
    });

    it('should handle empty chunks array', async () => {
      await expect(storeVectors(testProjectId, testDocumentId, [])).resolves.toBeUndefined();
    });
  });

  describe('querySimilarChunks', () => {
    beforeEach(async () => {
      // Store some test chunks
      const chunks: EmbeddedChunk[] = [
        {
          text: 'Machine learning is a subset of AI',
          index: 0,
          embedding: new Array(1536).fill(0.1),
        },
        {
          text: 'Deep learning uses neural networks',
          index: 1,
          embedding: new Array(1536).fill(0.2),
        },
        {
          text: 'Natural language processing handles text',
          index: 2,
          embedding: new Array(1536).fill(0.3),
        },
      ];

      await storeVectors(testProjectId, testDocumentId, chunks);
    });

    it('should query similar chunks', async () => {
      const queryEmbedding = new Array(1536).fill(0.15);
      const results = await querySimilarChunks(testProjectId, queryEmbedding, 2);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('similarity');
    });

    it('should return empty array for project with no chunks', async () => {
      const uniqueToken = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const emptyProject = await prisma.project.create({
        data: {
          userId: testUserId,
          name: 'Empty Project',
          widgetToken: uniqueToken,
        },
      });

      const queryEmbedding = new Array(1536).fill(0.1);
      const results = await querySimilarChunks(emptyProject.id, queryEmbedding, 5);

      expect(results).toHaveLength(0);

      await prisma.project.delete({ where: { id: emptyProject.id } });
    });

    it('should respect topK limit', async () => {
      const queryEmbedding = new Array(1536).fill(0.2);
      const results = await querySimilarChunks(testProjectId, queryEmbedding, 1);

      expect(results).toHaveLength(1);
    });
  });

  describe('deleteDocumentChunks', () => {
    beforeEach(async () => {
      const chunks: EmbeddedChunk[] = [
        {
          text: 'Chunk to delete',
          index: 0,
          embedding: new Array(1536).fill(0.1),
        },
      ];

      await storeVectors(testProjectId, testDocumentId, chunks);
    });

    it('should delete all chunks for a document', async () => {
      await deleteDocumentChunks(testDocumentId);

      const remainingChunks = await prisma.documentChunk.findMany({
        where: { documentId: testDocumentId },
      });

      expect(remainingChunks).toHaveLength(0);
    });
  });
});

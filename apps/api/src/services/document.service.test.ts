import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../lib/prisma.js';
import {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
} from './document.service.js';

// Mock the RAG services
vi.mock('./document-parser.js', () => ({
  parseDocument: vi.fn().mockResolvedValue({
    text: 'Sample document content for testing',
    pageCount: 1,
  }),
}));

vi.mock('./text-chunker.js', () => ({
  chunkText: vi.fn().mockResolvedValue([
    { text: 'First chunk', index: 0 },
    { text: 'Second chunk', index: 1 },
  ]),
}));

vi.mock('./embedding.js', () => ({
  generateEmbeddings: vi.fn().mockResolvedValue([
    { text: 'First chunk', index: 0, embedding: new Array(1536).fill(0.1) },
    { text: 'Second chunk', index: 1, embedding: new Array(1536).fill(0.2) },
  ]),
}));

vi.mock('./vector-storage.js', () => ({
  storeVectors: vi.fn().mockResolvedValue(undefined),
  deleteDocumentChunks: vi.fn().mockResolvedValue(undefined),
}));

describe('Document Service', () => {
  let testUserId: string;
  let testProjectId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-doc-${Date.now()}-${Math.random()}@example.com`,
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
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('uploadDocument', () => {
    it('should upload and process a document', async () => {
      const buffer = Buffer.from('Test document content');
      const result = await uploadDocument(testProjectId, 'test.txt', buffer, 'txt');

      expect(result).toHaveProperty('id');
      expect(result.filename).toBe('test.txt');
      expect(result.fileType).toBe('txt');
      expect(result.status).toBe('completed');
      expect(result.chunkCount).toBe(2);
    });

    it('should create document record in database', async () => {
      const buffer = Buffer.from('Test document content');
      const result = await uploadDocument(testProjectId, 'test.txt', buffer, 'txt');

      const document = await prisma.document.findUnique({
        where: { id: result.id },
      });

      expect(document).toBeTruthy();
      expect(document?.filename).toBe('test.txt');
      expect(document?.status).toBe('completed');
    });

    it('should handle upload errors gracefully', async () => {
      // Mock parseDocument to throw error
      const { parseDocument } = await import('./document-parser.js');
      vi.mocked(parseDocument).mockRejectedValueOnce(new Error('Parse failed'));

      const buffer = Buffer.from('Test document content');
      
      await expect(
        uploadDocument(testProjectId, 'test.txt', buffer, 'txt')
      ).rejects.toThrow('Document processing failed');

      // Verify document status is 'failed'
      const documents = await prisma.document.findMany({
        where: { projectId: testProjectId },
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].status).toBe('failed');
    });
  });

  describe('listDocuments', () => {
    beforeEach(async () => {
      const buffer = Buffer.from('Test document content');
      await uploadDocument(testProjectId, 'test1.txt', buffer, 'txt');
      await uploadDocument(testProjectId, 'test2.md', buffer, 'md');
    });

    it('should list all documents for a project', async () => {
      const documents = await listDocuments(testProjectId);

      expect(documents).toHaveLength(2);
      expect(documents[0].filename).toBe('test2.md');
      expect(documents[1].filename).toBe('test1.txt');
    });

    it('should return empty list for project with no documents', async () => {
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

      const documents = await listDocuments(emptyProject.id);

      expect(documents).toHaveLength(0);

      await prisma.project.delete({ where: { id: emptyProject.id } });
    });
  });

  describe('getDocument', () => {
    let documentId: string;

    beforeEach(async () => {
      const buffer = Buffer.from('Test document content');
      const result = await uploadDocument(testProjectId, 'test.txt', buffer, 'txt');
      documentId = result.id;
    });

    it('should get document details', async () => {
      const document = await getDocument(testProjectId, documentId);

      expect(document).toBeTruthy();
      expect(document?.filename).toBe('test.txt');
      expect(document?.status).toBe('completed');
    });

    it('should return null for non-existent document', async () => {
      const document = await getDocument(testProjectId, 'nonexistent');

      expect(document).toBeNull();
    });

    it('should return null for document from different project', async () => {
      const uniqueToken = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      const otherProject = await prisma.project.create({
        data: {
          userId: testUserId,
          name: 'Other Project',
          widgetToken: uniqueToken,
        },
      });

      const document = await getDocument(otherProject.id, documentId);

      expect(document).toBeNull();

      await prisma.project.delete({ where: { id: otherProject.id } });
    });
  });

  describe('deleteDocument', () => {
    let documentId: string;

    beforeEach(async () => {
      const buffer = Buffer.from('Test document content');
      const result = await uploadDocument(testProjectId, 'test.txt', buffer, 'txt');
      documentId = result.id;
    });

    it('should delete document', async () => {
      await deleteDocument(testProjectId, documentId);

      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      expect(document).toBeNull();
    });

    it('should throw error for non-existent document', async () => {
      await expect(deleteDocument(testProjectId, 'nonexistent')).rejects.toThrow(
        'Document not found'
      );
    });
  });
});

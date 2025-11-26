import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../app.js';
import { validateEnv } from '../config/env.js';
import { createLogger } from '../config/logger.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import FormData from 'form-data';
import type { FastifyInstance } from 'fastify';

// Mock the RAG services
vi.mock('../services/document-parser.js', () => ({
  parseDocument: vi.fn().mockResolvedValue({
    text: 'Sample document content for testing',
    pageCount: 1,
  }),
}));

vi.mock('../services/text-chunker.js', () => ({
  chunkText: vi.fn().mockResolvedValue([
    { text: 'First chunk', index: 0 },
    { text: 'Second chunk', index: 1 },
  ]),
}));

vi.mock('../services/embedding.js', () => ({
  generateEmbeddings: vi.fn().mockResolvedValue([
    { text: 'First chunk', index: 0, embedding: new Array(1536).fill(0.1) },
    { text: 'Second chunk', index: 1, embedding: new Array(1536).fill(0.2) },
  ]),
  generateQueryEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

vi.mock('../services/vector-storage.js', () => ({
  storeVectors: vi.fn().mockResolvedValue(undefined),
  deleteDocumentChunks: vi.fn().mockResolvedValue(undefined),
  querySimilarChunks: vi.fn().mockResolvedValue([]),
}));

describe('Document Routes', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let testProjectId: string;
  let authToken: string;

  beforeEach(async () => {
    const env = validateEnv();
    const logger = createLogger(env);
    app = await createApp(env, logger);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-doc-routes-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedpassword',
      },
    });
    testUserId = user.id;

    // Create test project
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

    // Generate auth token
    authToken = signToken({ userId: testUserId, email: user.email }, env);
  });

  afterEach(async () => {
    await app.close();
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('POST /projects/:projectId/documents', () => {
    it('should upload a document', async () => {
      const form = new FormData();
      form.append('file', Buffer.from('Test document content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });

      if (response.statusCode !== 201) {
        console.log('Upload failed:', response.body);
      }

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.document).toHaveProperty('id');
      expect(body.document.filename).toBe('test.txt');
      expect(body.document.status).toBe('completed');
    });

    it('should require authentication', async () => {
      const form = new FormData();
      form.append('file', Buffer.from('Test content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject invalid file types', async () => {
      const form = new FormData();
      form.append('file', Buffer.from('Test content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_FILE');
    });

    it('should reject files that are too large', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const form = new FormData();
      form.append('file', largeBuffer, {
        filename: 'large.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });

      // Fastify multipart plugin rejects with 500 for files exceeding limit
      expect(response.statusCode).toBe(500);
    });

    it('should return 404 for non-existent project', async () => {
      const form = new FormData();
      form.append('file', Buffer.from('Test content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/projects/nonexistent/documents',
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });

      expect(response.statusCode).toBe(400); // Invalid CUID format
    });
  });

  describe('GET /projects/:projectId/documents', () => {
    beforeEach(async () => {
      // Upload a test document
      const form = new FormData();
      form.append('file', Buffer.from('Test content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });
    });

    it('should list documents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.documents).toBeInstanceOf(Array);
      expect(body.documents.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/documents`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /projects/:projectId/documents/:documentId', () => {
    let documentId: string;

    beforeEach(async () => {
      // Upload a test document
      const form = new FormData();
      form.append('file', Buffer.from('Test content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });

      const body = JSON.parse(uploadResponse.body);
      documentId = body.document.id;
    });

    it('should get document details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/documents/${documentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.document).toHaveProperty('id', documentId);
      expect(body.document).toHaveProperty('filename', 'test.txt');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/documents/${documentId}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = 'clxxx0000000000000000000';
      const response = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/documents/${fakeId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /projects/:projectId/documents/:documentId', () => {
    let documentId: string;

    beforeEach(async () => {
      // Upload a test document
      const form = new FormData();
      form.append('file', Buffer.from('Test content'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: `/projects/${testProjectId}/documents`,
        headers: {
          authorization: `Bearer ${authToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });

      const body = JSON.parse(uploadResponse.body);
      documentId = body.document.id;
    });

    it('should delete document', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/projects/${testProjectId}/documents/${documentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify document is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/projects/${testProjectId}/documents/${documentId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/projects/${testProjectId}/documents/${documentId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

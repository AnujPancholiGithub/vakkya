import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmbeddings, generateQueryEmbedding } from './embedding.js';
import type { TextChunk } from './text-chunker.js';

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [
            { embedding: new Array(1536).fill(0.1) },
            { embedding: new Array(1536).fill(0.2) },
          ],
        }),
      },
    })),
  };
});

describe('Embedding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEmbeddings', () => {
    it('should return empty array for empty chunks', async () => {
      const result = await generateEmbeddings([]);
      expect(result).toEqual([]);
    });

    it('should generate embeddings for chunks', async () => {
      const chunks: TextChunk[] = [
        { text: 'First chunk', index: 0 },
        { text: 'Second chunk', index: 1 },
      ];

      const result = await generateEmbeddings(chunks);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('text', 'First chunk');
      expect(result[0]).toHaveProperty('index', 0);
      expect(result[0]).toHaveProperty('embedding');
      expect(result[0].embedding).toHaveLength(1536);
    });

    it('should preserve chunk indices', async () => {
      const chunks: TextChunk[] = [
        { text: 'Chunk 0', index: 0 },
        { text: 'Chunk 1', index: 1 },
      ];

      const result = await generateEmbeddings(chunks);

      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
    });

    it('should validate embedding dimensions', async () => {
      const chunks: TextChunk[] = [{ text: 'Test', index: 0 }];

      const result = await generateEmbeddings(chunks);

      result.forEach(chunk => {
        expect(chunk.embedding).toHaveLength(1536);
      });
    });
  });

  describe('generateQueryEmbedding', () => {
    it('should generate embedding for query text', async () => {
      const query = 'What is the meaning of life?';
      const result = await generateQueryEmbedding(query);

      expect(result).toHaveLength(1536);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

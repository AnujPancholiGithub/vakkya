/**
 * Embedding generation service using OpenAI
 */

import OpenAI from 'openai';
import { env } from '../config/env.js';
import type { TextChunk } from './text-chunker.js';

export interface EmbeddedChunk extends TextChunk {
  embedding: number[];
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100;

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 * Supports OpenRouter via OPENAI_BASE_URL env var
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL || undefined,
    });
  }
  return openaiClient;
}

/**
 * Generate embeddings for a batch of text chunks
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    throw new Error(
      `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate embeddings for text chunks with batching
 */
export async function generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const embeddedChunks: EmbeddedChunk[] = [];

  // Process chunks in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(chunk => chunk.text);
    
    const embeddings = await generateEmbeddingsBatch(texts);

    // Validate embedding dimensions
    for (const embedding of embeddings) {
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`
        );
      }
    }

    // Combine chunks with their embeddings
    batch.forEach((chunk, idx) => {
      embeddedChunks.push({
        ...chunk,
        embedding: embeddings[idx],
      });
    });
  }

  return embeddedChunks;
}

/**
 * Generate embedding for a single query text
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = await generateEmbeddingsBatch([query]);
  return embeddings[0];
}

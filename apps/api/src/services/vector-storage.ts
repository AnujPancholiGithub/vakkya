/**
 * Vector storage service using PostgreSQL pgvector
 */

import { prisma } from '../lib/prisma.js';
import type { EmbeddedChunk } from './embedding.js';

export interface StoredChunk {
  id: string;
  text: string;
  chunkIndex: number;
  similarity?: number;
}

/**
 * Store embedded chunks in PostgreSQL with pgvector
 */
export async function storeVectors(
  projectId: string,
  documentId: string,
  chunks: EmbeddedChunk[]
): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  try {
    // Store chunks with embeddings using raw SQL for pgvector support
    for (const chunk of chunks) {
      await prisma.$executeRaw`
        INSERT INTO document_chunks (id, "documentId", "projectId", "chunkIndex", text, embedding)
        VALUES (
          gen_random_uuid()::text,
          ${documentId},
          ${projectId},
          ${chunk.index},
          ${chunk.text},
          ${`[${chunk.embedding.join(',')}]`}::vector
        )
      `;
    }
  } catch (error) {
    throw new Error(
      `Failed to store vectors: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Query similar chunks using pgvector cosine similarity
 */
export async function querySimilarChunks(
  projectId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<StoredChunk[]> {
  try {
    // Use raw SQL for pgvector similarity search
    const results = await prisma.$queryRaw<Array<{
      id: string;
      text: string;
      chunkIndex: number;
      similarity: number;
    }>>`
      SELECT 
        id,
        text,
        "chunkIndex" as "chunkIndex",
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) as similarity
      FROM document_chunks
      WHERE "projectId" = ${projectId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
      LIMIT ${topK}
    `;

    return results.map(row => ({
      id: row.id,
      text: row.text,
      chunkIndex: row.chunkIndex,
      similarity: row.similarity,
    }));
  } catch (error) {
    throw new Error(
      `Failed to query similar chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete all chunks for a document
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  try {
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });
  } catch (error) {
    throw new Error(
      `Failed to delete document chunks: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Document service orchestrating upload and RAG processing
 */

import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { parseDocument } from './document-parser.js';
import { chunkText } from './text-chunker.js';
import { generateEmbeddings } from './embedding.js';
import { storeVectors, deleteDocumentChunks } from './vector-storage.js';
import { DocumentNotFoundError } from '../lib/errors.js';
import type { AllowedFileType } from '../lib/document-validation.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/vakkya-uploads';

export interface DocumentUploadResult {
  id: string;
  filename: string;
  fileType: AllowedFileType;
  status: string;
  chunkCount: number;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create upload directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save uploaded file to disk
 */
async function saveFile(filename: string, buffer: Buffer): Promise<string> {
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, `${Date.now()}-${filename}`);
  
  try {
    await fs.writeFile(filePath, buffer);
    return filePath;
  } catch (error) {
    throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete file from disk
 */
async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore file not found errors
    if (error instanceof Error && !error.message.includes('ENOENT')) {
      throw error;
    }
  }
}

/**
 * Upload and process document synchronously
 */
export async function uploadDocument(
  projectId: string,
  filename: string,
  buffer: Buffer,
  fileType: AllowedFileType
): Promise<DocumentUploadResult> {
  let filePath: string | null = null;
  let documentId: string | null = null;

  try {
    // Step 1: Create document record with 'uploading' status
    const document = await prisma.document.create({
      data: {
        projectId,
        filename,
        fileType,
        filePath: 'pending', // Will be updated after file save
        status: 'uploading',
      },
    });
    documentId = document.id;

    // Step 2: Save file to disk
    filePath = await saveFile(filename, buffer);

    // Step 3: Update document with file path and change status to 'processing'
    await prisma.document.update({
      where: { id: documentId },
      data: {
        filePath,
        status: 'processing',
      },
    });

    // Step 4: Parse document
    const parseResult = await parseDocument(filePath, fileType);

    // Step 5: Chunk text
    const chunks = await chunkText(parseResult.text);

    // Step 6: Generate embeddings
    const embeddedChunks = await generateEmbeddings(chunks);

    // Step 7: Store vectors in PostgreSQL
    await storeVectors(projectId, documentId, embeddedChunks);

    // Step 8: Update document status to 'completed'
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'completed' },
    });

    return {
      id: documentId,
      filename,
      fileType,
      status: 'completed',
      chunkCount: embeddedChunks.length,
    };
  } catch (error) {
    // Handle error: update document status and clean up
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (documentId) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      // Delete chunks if any were stored
      await deleteDocumentChunks(documentId);
    }

    // Clean up file if it was saved
    if (filePath) {
      await deleteFile(filePath);
    }

    throw new Error(`Document processing failed: ${errorMessage}`);
  }
}

/**
 * List documents for a project
 */
export async function listDocuments(projectId: string) {
  return prisma.document.findMany({
    where: { projectId },
    select: {
      id: true,
      filename: true,
      fileType: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get document details
 */
export async function getDocument(projectId: string, documentId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
    },
    select: {
      id: true,
      filename: true,
      fileType: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      chunks: {
        select: {
          id: true,
          chunkIndex: true,
          text: true,
        },
      },
    },
  });
}

/**
 * Delete document and its chunks
 */
export async function deleteDocument(projectId: string, documentId: string): Promise<void> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      projectId,
    },
  });

  if (!document) {
    throw new DocumentNotFoundError('Document not found');
  }

  try {
    // Delete chunks from vector storage
    await deleteDocumentChunks(documentId);

    // Delete file from disk
    if (document.filePath && document.filePath !== 'pending') {
      await deleteFile(document.filePath);
    }

    // Delete document record
    await prisma.document.delete({
      where: { id: documentId },
    });
  } catch (error) {
    throw new Error(
      `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Text chunking service using LangChain RecursiveCharacterTextSplitter
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export interface TextChunk {
  text: string;
  index: number;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Split text into chunks with overlap
 */
export async function chunkText(text: string): Promise<TextChunk[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const chunks = await splitter.splitText(text);

  return chunks.map((chunk, index) => ({
    text: chunk,
    index,
  }));
}

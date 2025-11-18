import { describe, it, expect } from 'vitest';
import { parseDocument } from './document-parser.js';
import { chunkText } from './text-chunker.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../../test-fixtures');

describe('RAG Pipeline Integration', () => {
  it('should parse and chunk a text document', async () => {
    const filePath = path.join(fixturesDir, 'sample.txt');
    
    // Step 1: Parse document
    const parseResult = await parseDocument(filePath, 'txt');
    expect(parseResult.text).toBeTruthy();
    
    // Step 2: Chunk text
    const chunks = await chunkText(parseResult.text);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('text');
    expect(chunks[0]).toHaveProperty('index');
  });

  it('should parse and chunk a markdown document', async () => {
    const filePath = path.join(fixturesDir, 'sample.md');
    
    // Step 1: Parse document
    const parseResult = await parseDocument(filePath, 'md');
    expect(parseResult.text).toBeTruthy();
    
    // Step 2: Chunk text
    const chunks = await chunkText(parseResult.text);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle empty document', async () => {
    // Create empty text
    const emptyText = '';
    
    // Chunk empty text
    const chunks = await chunkText(emptyText);
    expect(chunks).toEqual([]);
  });

  it('should preserve text content through pipeline', async () => {
    const filePath = path.join(fixturesDir, 'sample.txt');
    
    // Parse and chunk
    const parseResult = await parseDocument(filePath, 'txt');
    const chunks = await chunkText(parseResult.text);
    
    // Verify content is preserved
    const combinedText = chunks.map(c => c.text).join(' ');
    expect(combinedText).toContain('sample text file');
  });
});

import { describe, it, expect } from 'vitest';
import { parseDocument } from './document-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../../test-fixtures');

describe('Document Parser', () => {
  describe('parseDocument', () => {
    it('should parse TXT files', async () => {
      const filePath = path.join(fixturesDir, 'sample.txt');
      const result = await parseDocument(filePath, 'txt');
      
      expect(result.text).toBeTruthy();
      expect(result.text).toContain('sample text file');
      expect(result.text).toContain('multiple lines');
    });

    it('should parse MD files', async () => {
      const filePath = path.join(fixturesDir, 'sample.md');
      const result = await parseDocument(filePath, 'md');
      
      expect(result.text).toBeTruthy();
      expect(result.text).toContain('Sample Markdown');
      expect(result.text).toContain('markdown');
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(fixturesDir, 'nonexistent.txt');
      
      await expect(parseDocument(filePath, 'txt')).rejects.toThrow();
    });

    it('should throw error for unsupported file type', async () => {
      const filePath = path.join(fixturesDir, 'sample.txt');
      
      // @ts-expect-error - Testing invalid file type
      await expect(parseDocument(filePath, 'jpg')).rejects.toThrow('Unsupported file type');
    });
  });
});

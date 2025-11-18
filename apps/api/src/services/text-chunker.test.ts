import { describe, it, expect } from 'vitest';
import { chunkText } from './text-chunker.js';

describe('Text Chunker', () => {
  describe('chunkText', () => {
    it('should return empty array for empty text', async () => {
      const result = await chunkText('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only text', async () => {
      const result = await chunkText('   \n  \t  ');
      expect(result).toEqual([]);
    });

    it('should return single chunk for short text', async () => {
      const text = 'This is a short text that fits in one chunk.';
      const result = await chunkText(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
      expect(result[0].index).toBe(0);
    });

    it('should split long text into multiple chunks', async () => {
      // Create text longer than 1000 characters
      const longText = 'A'.repeat(2500);
      const result = await chunkText(longText);
      
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
    });

    it('should create chunks with proper indices', async () => {
      const longText = 'B'.repeat(2500);
      const result = await chunkText(longText);
      
      result.forEach((chunk, idx) => {
        expect(chunk.index).toBe(idx);
      });
    });

    it('should handle text with newlines', async () => {
      const text = 'Line 1\nLine 2\nLine 3\nLine 4';
      const result = await chunkText(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].text).toContain('Line 1');
      expect(result[0].text).toContain('Line 4');
    });

    it('should respect chunk size limits', async () => {
      const longText = 'C'.repeat(3000);
      const result = await chunkText(longText);
      
      // Each chunk should be roughly 1000 chars (with some tolerance for splitting logic)
      result.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(1200); // Allow some buffer
      });
    });
  });
});

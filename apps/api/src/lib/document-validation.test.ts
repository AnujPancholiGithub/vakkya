import { describe, it, expect } from 'vitest';
import {
  validateFileType,
  validateFileSize,
  validateDocument,
  getFileType
} from './document-validation';

describe('Document Validation', () => {
  describe('validateFileType', () => {
    it('should accept PDF files', () => {
      const result = validateFileType('document.pdf');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept TXT files', () => {
      const result = validateFileType('notes.txt');
      expect(result.valid).toBe(true);
    });

    it('should accept MD files', () => {
      const result = validateFileType('readme.md');
      expect(result.valid).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(validateFileType('file.PDF').valid).toBe(true);
      expect(validateFileType('file.TXT').valid).toBe(true);
      expect(validateFileType('file.MD').valid).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const result = validateFileType('image.jpg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject files without extension', () => {
      const result = validateFileType('noextension');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no extension');
    });

    it('should handle multiple dots in filename', () => {
      const result = validateFileType('my.document.pdf');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    const MB = 1024 * 1024;

    it('should accept files under 10MB', () => {
      const result = validateFileSize(5 * MB);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept files exactly at 10MB', () => {
      const result = validateFileSize(10 * MB);
      expect(result.valid).toBe(true);
    });

    it('should reject files over 10MB', () => {
      const result = validateFileSize(11 * MB);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should accept very small files', () => {
      const result = validateFileSize(1024); // 1KB
      expect(result.valid).toBe(true);
    });

    it('should accept empty files', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDocument', () => {
    const MB = 1024 * 1024;

    it('should accept valid document', () => {
      const result = validateDocument('document.pdf', 5 * MB);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid file type', () => {
      const result = validateDocument('image.jpg', 5 * MB);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject oversized file', () => {
      const result = validateDocument('document.pdf', 15 * MB);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject both invalid type and size', () => {
      const result = validateDocument('image.jpg', 15 * MB);
      expect(result.valid).toBe(false);
      // Should fail on type first
      expect(result.error).toContain('not supported');
    });
  });

  describe('getFileType', () => {
    it('should extract PDF type', () => {
      expect(getFileType('document.pdf')).toBe('pdf');
    });

    it('should extract TXT type', () => {
      expect(getFileType('notes.txt')).toBe('txt');
    });

    it('should extract MD type', () => {
      expect(getFileType('readme.md')).toBe('md');
    });

    it('should be case insensitive', () => {
      expect(getFileType('file.PDF')).toBe('pdf');
    });

    it('should return null for unsupported types', () => {
      expect(getFileType('image.jpg')).toBeNull();
    });

    it('should return null for files without extension', () => {
      expect(getFileType('noextension')).toBeNull();
    });

    it('should handle multiple dots', () => {
      expect(getFileType('my.document.pdf')).toBe('pdf');
    });
  });
});

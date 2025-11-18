/**
 * Document validation utilities for file uploads
 */

const ALLOWED_FILE_TYPES = ['pdf', 'txt', 'md'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file extension against allowed types
 */
export function validateFileType(filename: string): ValidationResult {
  const parts = filename.split('.');
  
  // File must have at least one dot to have an extension
  if (parts.length < 2) {
    return {
      valid: false,
      error: 'File has no extension'
    };
  }
  
  const extension = parts[parts.length - 1].toLowerCase();
  
  if (!extension) {
    return {
      valid: false,
      error: 'File has no extension'
    };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(extension as AllowedFileType)) {
    return {
      valid: false,
      error: `File type .${extension} not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Validates file size against maximum limit
 */
export function validateFileSize(sizeInBytes: number): ValidationResult {
  if (sizeInBytes > MAX_FILE_SIZE) {
    const sizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size ${sizeMB}MB exceeds maximum allowed size of ${maxMB}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Validates both file type and size
 */
export function validateDocument(filename: string, sizeInBytes: number): ValidationResult {
  const typeValidation = validateFileType(filename);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const sizeValidation = validateFileSize(sizeInBytes);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true };
}

/**
 * Extracts file type from filename
 */
export function getFileType(filename: string): AllowedFileType | null {
  const parts = filename.split('.');
  
  // File must have at least one dot to have an extension
  if (parts.length < 2) {
    return null;
  }
  
  const extension = parts[parts.length - 1].toLowerCase();
  
  if (extension && ALLOWED_FILE_TYPES.includes(extension as AllowedFileType)) {
    return extension as AllowedFileType;
  }
  return null;
}

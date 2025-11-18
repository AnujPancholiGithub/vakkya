/**
 * Document parser service for extracting text from various file formats
 */

import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import type { AllowedFileType } from '../lib/document-validation.js';

export interface ParseResult {
  text: string;
  pageCount?: number;
}

/**
 * Parse PDF file and extract text content
 */
async function parsePDF(filePath: string): Promise<ParseResult> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      text: data.text,
      pageCount: data.numpages
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse text file (TXT or MD) and extract content
 */
async function parseText(filePath: string): Promise<ParseResult> {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return { text };
  } catch (error) {
    throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse document based on file type
 */
export async function parseDocument(filePath: string, fileType: AllowedFileType): Promise<ParseResult> {
  switch (fileType) {
    case 'pdf':
      return parsePDF(filePath);
    case 'txt':
    case 'md':
      return parseText(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

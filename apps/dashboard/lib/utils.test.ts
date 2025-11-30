import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { cn, formatRelativeTime, truncateText, getFileTypeIcon, getSetupStep, getSetupStatus } from './utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('should handle empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })
})

/**
 * **Feature: dashboard-ux, Property 4: Relative Time Formatting**
 * **Validates: Requirements 3.2, 6.4, 6.5**
 *
 * For any timestamp, formatRelativeTime SHALL return:
 * - Relative format ("Xh ago", "Yesterday") for timestamps within 24 hours
 * - Short date format ("Nov 28") for older timestamps
 */
describe('formatRelativeTime property tests', () => {
  it('should return relative format for timestamps within 24 hours', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 23 }),
        (hoursAgo) => {
          const date = new Date()
          date.setHours(date.getHours() - hoursAgo)
          const result = formatRelativeTime(date)
          // Should contain "h ago" for hours within 24h
          expect(result).toMatch(/^\d+h ago$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return short date format for timestamps older than 24 hours (not yesterday)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 365 }),
        (daysAgo) => {
          const date = new Date()
          date.setDate(date.getDate() - daysAgo)
          const result = formatRelativeTime(date)
          // Should be short date format (e.g., "Nov 28") or "Yesterday"
          const isShortDate = /^[A-Z][a-z]{2} \d{1,2}$/.test(result)
          const isYesterday = result === 'Yesterday'
          expect(isShortDate || isYesterday).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "Invalid date" for invalid date inputs', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Invalid date')
    expect(formatRelativeTime(new Date('invalid'))).toBe('Invalid date')
  })

  it('should return short date format for future dates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const result = formatRelativeTime(futureDate)
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })
})

/**
 * **Feature: dashboard-ux, Property 8: Text Truncation with Ellipsis**
 * **Validates: Requirements 6.1**
 *
 * For any string input with length > maxLength, truncateText SHALL return
 * a string of exactly maxLength characters ending with "..."
 */
describe('truncateText property tests', () => {
  it('should return string of exactly maxLength ending with ellipsis when text exceeds maxLength', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.integer({ min: 4, max: 50 }),
        (text, maxLength) => {
          fc.pre(text.length > maxLength)
          const result = truncateText(text, maxLength)
          expect(result.length).toBe(maxLength)
          expect(result.endsWith('...')).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return original string when length <= maxLength', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.integer({ min: 50, max: 100 }),
        (text, maxLength) => {
          const result = truncateText(text, maxLength)
          expect(result).toBe(text)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })

  it('should handle maxLength <= 3', () => {
    expect(truncateText('hello world', 3)).toBe('...')
    expect(truncateText('hello world', 2)).toBe('..')
    expect(truncateText('hello world', 1)).toBe('.')
  })
})

/**
 * **Feature: dashboard-ux, Property 7: File Type Icon Mapping**
 * **Validates: Requirements 5.5**
 *
 * For any document filename with extension .pdf, .txt, or .md,
 * getFileTypeIcon SHALL return the corresponding icon identifier.
 */
describe('getFileTypeIcon property tests', () => {
  it('should return correct icon for known extensions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.')),
        fc.constantFrom('pdf', 'txt', 'md'),
        (basename, ext) => {
          const filename = `${basename}.${ext}`
          const result = getFileTypeIcon(filename)
          expect(result).toBe(ext)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "file" for unknown extensions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('.')),
        fc.string({ minLength: 1, maxLength: 5 }).filter(s => !['pdf', 'txt', 'md'].includes(s.toLowerCase()) && !s.includes('.')),
        (basename, ext) => {
          const filename = `${basename}.${ext}`
          const result = getFileTypeIcon(filename)
          expect(result).toBe('file')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle case insensitivity', () => {
    expect(getFileTypeIcon('doc.PDF')).toBe('pdf')
    expect(getFileTypeIcon('doc.TXT')).toBe('txt')
    expect(getFileTypeIcon('doc.MD')).toBe('md')
  })
})

/**
 * **Feature: dashboard-ux, Property 2: Progress Step State Consistency**
 * **Validates: Requirements 2.2**
 *
 * For any project with given document count and conversation count,
 * the progress indicator SHALL correctly derive the setup step.
 */
describe('getSetupStep property tests', () => {
  it('should return step 3 (complete) when conversationCount > 0', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (documentCount, conversationCount) => {
          const result = getSetupStep({ documentCount, conversationCount })
          expect(result).toBe(3)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return step 2 (embed) when documentCount > 0 and conversationCount = 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (documentCount) => {
          const result = getSetupStep({ documentCount, conversationCount: 0 })
          expect(result).toBe(2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return step 1 (upload) when documentCount = 0 and conversationCount = 0', () => {
    const result = getSetupStep({ documentCount: 0, conversationCount: 0 })
    expect(result).toBe(1)
  })

  it('should be deterministic for any input combination', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        (documentCount, conversationCount) => {
          const result1 = getSetupStep({ documentCount, conversationCount })
          const result2 = getSetupStep({ documentCount, conversationCount })
          expect(result1).toBe(result2)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: dashboard-ux, Property 5: Setup Status Badge Logic**
 * **Validates: Requirements 3.3**
 *
 * For any project where documentCount is 0 OR conversationCount is 0,
 * the project card SHALL display a setup status badge indicating incomplete setup.
 */
describe('getSetupStatus property tests', () => {
  it('should return "incomplete" when documentCount is 0', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        (conversationCount) => {
          const result = getSetupStatus({ documentCount: 0, conversationCount })
          expect(result).toBe('incomplete')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "ready" when documentCount > 0 and conversationCount is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (documentCount) => {
          const result = getSetupStatus({ documentCount, conversationCount: 0 })
          expect(result).toBe('ready')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "active" when both documentCount > 0 and conversationCount > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (documentCount, conversationCount) => {
          const result = getSetupStatus({ documentCount, conversationCount })
          expect(result).toBe('active')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should show badge (not active) when setup is incomplete', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 100 }),
        (documentCount, conversationCount) => {
          // Setup is incomplete when either count is 0
          const isIncomplete = documentCount === 0 || conversationCount === 0
          const result = getSetupStatus({ documentCount, conversationCount })
          
          if (isIncomplete) {
            // Badge should be shown (status is not 'active')
            expect(result).not.toBe('active')
          } else {
            // No badge needed (status is 'active')
            expect(result).toBe('active')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

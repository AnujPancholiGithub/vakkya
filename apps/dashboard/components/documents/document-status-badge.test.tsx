import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getStatusTooltip } from './document-status-badge'

/**
 * **Feature: dashboard-ux, Property 6: Document Status Tooltip Mapping**
 * **Validates: Requirements 4.4**
 *
 * For any document status value (PENDING, PROCESSING, COMPLETED, FAILED),
 * hovering over the status badge SHALL display the corresponding tooltip text.
 */
describe('Document Status Tooltip Mapping property tests', () => {
  const validStatuses = ['uploading', 'processing', 'completed', 'failed'] as const
  
  const expectedTooltips: Record<string, string> = {
    uploading: 'File is being uploaded to the server',
    processing: 'Document is being chunked and embedded for RAG',
    completed: 'Document is ready and available for voice agent queries',
    failed: 'Processing failed - check file format and retry',
  }

  it('should return correct tooltip for all valid status values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validStatuses),
        (status) => {
          const tooltip = getStatusTooltip(status)
          expect(tooltip).toBe(expectedTooltips[status])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return non-empty tooltip for all valid statuses', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validStatuses),
        (status) => {
          const tooltip = getStatusTooltip(status)
          expect(tooltip.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return "Unknown status" for invalid status values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !validStatuses.includes(s as typeof validStatuses[number])
        ),
        (invalidStatus) => {
          const tooltip = getStatusTooltip(invalidStatus)
          expect(tooltip).toBe('Unknown status')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have unique tooltips for each status', () => {
    const tooltips = validStatuses.map(status => getStatusTooltip(status))
    const uniqueTooltips = new Set(tooltips)
    expect(uniqueTooltips.size).toBe(validStatuses.length)
  })
})

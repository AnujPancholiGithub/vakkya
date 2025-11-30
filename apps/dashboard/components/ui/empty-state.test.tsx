import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './empty-state'

/**
 * **Feature: dashboard-ux, Property 1: Empty State Documentation Link Presence**
 * **Validates: Requirements 1.5**
 *
 * For any empty state component rendered with a secondaryAction,
 * the component SHALL include a secondary link element pointing to documentation.
 */
describe('EmptyState property tests', () => {
  it('should render documentation link when secondaryAction is provided', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        (linkLabel, href, title, description) => {
          const { unmount } = render(
            <EmptyState
              title={title}
              description={description}
              secondaryAction={{
                label: linkLabel,
                href: href,
              }}
            />
          )

          const link = screen.getByTestId('empty-state-docs-link')
          expect(link).toBeDefined()
          expect(link.tagName.toLowerCase()).toBe('a')
          expect(link.getAttribute('href')).toBe(href)
          expect(link.getAttribute('target')).toBe('_blank')
          expect(link.getAttribute('rel')).toBe('noopener noreferrer')
          expect(link.textContent).toContain(linkLabel)

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should render all illustration variants with documentation link', () => {
    const illustrations = ['workflow', 'documents', 'conversations'] as const

    illustrations.forEach((illustration) => {
      const { unmount } = render(
        <EmptyState
          illustration={illustration}
          title="Test Title"
          description="Test description"
          secondaryAction={{
            label: 'Learn more',
            href: 'https://docs.example.com',
          }}
        />
      )

      const link = screen.getByTestId('empty-state-docs-link')
      expect(link).toBeDefined()
      expect(link.getAttribute('href')).toBe('https://docs.example.com')

      unmount()
    })
  })
})

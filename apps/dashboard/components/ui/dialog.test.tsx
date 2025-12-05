import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

/**
 * **Feature: dialog-polish, Property 1: Dialog Overlay Opacity**
 * **Validates: Requirements 1.1**
 *
 * For any rendered dialog, the overlay element SHALL have the reduced opacity
 * class (bg-black/60) applied instead of the heavier bg-black/80.
 */
describe('Dialog component styling', () => {
  it('should render overlay with reduced opacity (bg-black/60)', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test description</DialogDescription>
          </DialogHeader>
          <div>Content</div>
          <DialogFooter>
            <button>Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    // Find the overlay element by its data-state attribute
    const overlay = document.querySelector('[data-state="open"].fixed.inset-0')
    expect(overlay).toBeDefined()
    expect(overlay).not.toBeNull()
    expect(overlay?.className).toContain('bg-black/60')
    expect(overlay?.className).not.toContain('bg-black/80')
  })

  it('should render dialog content with enhanced styling', () => {
    render(
      <Dialog open={true}>
        <DialogContent data-testid="dialog-content">
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <div>Content</div>
        </DialogContent>
      </Dialog>
    )

    const content = screen.getByTestId('dialog-content')
    expect(content.className).toContain('bg-zinc-900')
    expect(content.className).toContain('border-zinc-800')
    expect(content.className).toContain('rounded-xl')
    expect(content.className).toContain('shadow-2xl')
  })
})

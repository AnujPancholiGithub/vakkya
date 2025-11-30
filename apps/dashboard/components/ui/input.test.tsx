import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './input'

/**
 * **Feature: dialog-polish, Property 2: Input Focus Ring Presence**
 * **Validates: Requirements 2.1**
 *
 * For any input element in a dialog, when focused, the input SHALL have
 * the primary color focus ring classes applied.
 */
describe('Input component styling', () => {
  it('should have focus ring classes for primary color focus state', () => {
    render(<Input data-testid="test-input" placeholder="Test input" />)

    const input = screen.getByTestId('test-input')
    
    // Verify focus ring classes are present
    expect(input.className).toContain('focus:ring-2')
    expect(input.className).toContain('focus:ring-primary')
    expect(input.className).toContain('focus:border-primary')
  })

  it('should have darker background color that contrasts with dialog', () => {
    render(<Input data-testid="test-input" />)

    const input = screen.getByTestId('test-input')
    
    // Verify background and border styling
    expect(input.className).toContain('bg-zinc-950')
    expect(input.className).toContain('border-zinc-800')
  })

  it('should have transition-colors for smooth focus effect', () => {
    render(<Input data-testid="test-input" />)

    const input = screen.getByTestId('test-input')
    
    expect(input.className).toContain('transition-colors')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormEditorDialog } from './form-editor-dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the queries
vi.mock('@/lib/queries', () => ({
  useCreateForm: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
  useUpdateForm: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

/**
 * FormEditorDialog V2 Fields Tests
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */
describe('FormEditorDialog V2 Fields', () => {
  const defaultProps = {
    projectId: 'project_123',
    open: true,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Mode - V2 Field Rendering (Requirement 9.1-9.4)', () => {
    it('should render all V2 fields in create mode', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Basic fields
      expect(screen.getByLabelText(/form name/i)).toBeDefined()
      
      // V2 fields (Requirements 9.1-9.4)
      expect(screen.getByLabelText(/description/i)).toBeDefined()
      expect(screen.getByText(/trigger phrases/i)).toBeDefined()
      expect(screen.getByLabelText(/greeting message/i)).toBeDefined()
      expect(screen.getByLabelText(/completion message/i)).toBeDefined()
      expect(screen.getByLabelText(/webhook url/i)).toBeDefined()
      expect(screen.getByLabelText(/webhook secret/i)).toBeDefined()
      expect(screen.getByLabelText(/active/i)).toBeDefined()
    })

    it('should have active checkbox checked by default', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const activeCheckbox = screen.getByLabelText(/active/i) as HTMLInputElement
      expect(activeCheckbox.checked).toBe(true)
    })

    it('should allow adding trigger phrases (Requirement 9.1)', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const triggerInput = screen.getByPlaceholderText(/i want to contact you/i)
      fireEvent.change(triggerInput, { target: { value: 'contact us' } })
      
      const addButton = screen.getByRole('button', { name: /^add$/i })
      fireEvent.click(addButton)

      expect(screen.getByText('contact us')).toBeDefined()
    })

    it('should add trigger phrase on Enter key', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const triggerInput = screen.getByPlaceholderText(/i want to contact you/i)
      fireEvent.change(triggerInput, { target: { value: 'book appointment' } })
      fireEvent.keyDown(triggerInput, { key: 'Enter' })

      expect(screen.getByText('book appointment')).toBeDefined()
    })
  })

  describe('Edit Mode - V2 Field Population', () => {
    const existingForm = {
      id: 'form_123',
      projectId: 'project_123',
      name: 'Contact Form',
      description: 'A form for contacting us',
      fields: [{ name: 'email', type: 'email' as const, label: 'Email', required: true }],
      triggerPhrases: ['contact us', 'get in touch'],
      greetingMessage: 'Hello! How can I help?',
      completionMessage: 'Thanks for reaching out!',
      webhookUrl: 'https://example.com/webhook',
      webhookSecret: 'secret123',
      isActive: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    it('should populate all V2 fields from existing form', () => {
      render(<FormEditorDialog {...defaultProps} form={existingForm} />, { wrapper: createWrapper() })

      expect(screen.getByDisplayValue('Contact Form')).toBeDefined()
      expect(screen.getByDisplayValue('A form for contacting us')).toBeDefined()
      expect(screen.getByText('contact us')).toBeDefined()
      expect(screen.getByText('get in touch')).toBeDefined()
      expect(screen.getByDisplayValue('Hello! How can I help?')).toBeDefined()
      expect(screen.getByDisplayValue('Thanks for reaching out!')).toBeDefined()
      expect(screen.getByDisplayValue('https://example.com/webhook')).toBeDefined()
      
      const activeCheckbox = screen.getByLabelText(/active/i) as HTMLInputElement
      expect(activeCheckbox.checked).toBe(false)
    })

    it('should show Edit Form title in edit mode', () => {
      render(<FormEditorDialog {...defaultProps} form={existingForm} />, { wrapper: createWrapper() })

      expect(screen.getByText('Edit Form')).toBeDefined()
    })
  })

  describe('Description Field (Requirement 9.2)', () => {
    it('should have max length of 500 characters', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const descriptionField = screen.getByLabelText(/description/i) as HTMLTextAreaElement
      expect(descriptionField.getAttribute('maxLength')).toBe('500')
    })

    it('should show helper text', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/helps the agent understand/i)).toBeDefined()
    })
  })

  describe('Greeting and Completion Messages (Requirements 9.3, 9.4)', () => {
    it('should have max length of 500 characters for greeting', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const greetingField = screen.getByLabelText(/greeting message/i) as HTMLTextAreaElement
      expect(greetingField.getAttribute('maxLength')).toBe('500')
    })

    it('should have max length of 500 characters for completion', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const completionField = screen.getByLabelText(/completion message/i) as HTMLTextAreaElement
      expect(completionField.getAttribute('maxLength')).toBe('500')
    })
  })

  describe('Webhook Secret', () => {
    it('should be a password input type', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const secretField = screen.getByLabelText(/webhook secret/i) as HTMLInputElement
      expect(secretField.getAttribute('type')).toBe('password')
    })

    it('should show helper text about HMAC signing', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/sign webhook payloads/i)).toBeDefined()
    })
  })

  describe('Active Toggle', () => {
    it('should toggle active state', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      const activeCheckbox = screen.getByLabelText(/active/i) as HTMLInputElement
      expect(activeCheckbox.checked).toBe(true)

      fireEvent.click(activeCheckbox)
      expect(activeCheckbox.checked).toBe(false)

      fireEvent.click(activeCheckbox)
      expect(activeCheckbox.checked).toBe(true)
    })

    it('should show helper text about voice agent availability', () => {
      render(<FormEditorDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/only active forms are available/i)).toBeDefined()
    })
  })
})

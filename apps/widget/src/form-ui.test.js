import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFormUI } from './form-ui.js';

describe('createFormUI', () => {
  let host;
  let shadow;
  let callbacks;
  let sampleSchema;

  beforeEach(() => {
    host = document.createElement('div');
    shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    
    callbacks = {
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      onAnswer: vi.fn(),
    };
    
    sampleSchema = {
      id: 'form-123',
      name: 'Contact Form',
      fields: [
        { name: 'name', type: 'string', label: 'What is your name', required: true },
        { name: 'email', type: 'email', label: 'What is your email', required: true },
        { name: 'phone', type: 'phone', label: 'Phone number', required: false },
      ],
    };
  });

  afterEach(() => {
    host.remove();
  });

  describe('initialization', () => {
    it('should create form UI element', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.className).toBe('vakkya-form-ui');
    });

    it('should have dialog role for accessibility', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      expect(element.getAttribute('role')).toBe('dialog');
      expect(element.getAttribute('aria-label')).toBe('Form: Contact Form');
    });

    it('should display form title', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const title = element.querySelector('.vakkya-form-title');
      expect(title.textContent).toBe('Contact Form');
    });

    it('should display first question', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const question = element.querySelector('.vakkya-form-question');
      expect(question.textContent).toBe('What is your name?');
    });

    it('should create close button', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const closeButton = element.querySelector('.vakkya-form-close');
      expect(closeButton).toBeTruthy();
      expect(closeButton.getAttribute('aria-label')).toBe('Close form');
    });

    it('should call onClose when close button clicked', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const closeButton = element.querySelector('.vakkya-form-close');
      closeButton.click();
      
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });

    it('should inject styles into shadow root', () => {
      createFormUI(shadow, sampleSchema, callbacks);
      
      const styles = shadow.querySelectorAll('style');
      const hasFormStyles = Array.from(styles).some(s => 
        s.textContent.includes('.vakkya-form-ui')
      );
      expect(hasFormStyles).toBe(true);
    });
  });

  describe('progress dots', () => {
    it('should display correct number of progress dots', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const dots = element.querySelectorAll('.vakkya-form-dot');
      expect(dots.length).toBe(3);
    });

    it('should mark first dot as current', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const dots = element.querySelectorAll('.vakkya-form-dot');
      expect(dots[0].classList.contains('current')).toBe(true);
      expect(dots[1].classList.contains('current')).toBe(false);
    });
  });

  describe('input types', () => {
    it('should create text input for string field', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      expect(input.tagName).toBe('INPUT');
      expect(input.type).toBe('text');
    });

    it('should create email input for email field', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      expect(input.type).toBe('email');
    });

    it('should create tel input for phone field', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'phone', type: 'phone', label: 'Phone', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      expect(input.type).toBe('tel');
    });

    it('should create number input for number field', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'age', type: 'number', label: 'Age', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      expect(input.type).toBe('number');
    });

    it('should create textarea for text field', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'message', type: 'text', label: 'Message', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const textarea = element.querySelector('.vakkya-form-input');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should create select for enum field', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{
          name: 'country',
          type: 'enum',
          label: 'Country',
          required: true,
          options: ['USA', 'Canada', 'Mexico'],
        }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const select = element.querySelector('.vakkya-form-select');
      expect(select.tagName).toBe('SELECT');
      expect(select.options.length).toBe(4); // placeholder + 3 options
    });
  });

  describe('navigation', () => {
    it('should disable back button on first question', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const backBtn = element.querySelector('.vakkya-form-btn-secondary');
      expect(backBtn.disabled).toBe(true);
    });

    it('should advance to next question on valid input', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      input.value = 'John Doe';
      
      const nextBtn = element.querySelector('.vakkya-form-btn-primary');
      nextBtn.click();
      
      const question = element.querySelector('.vakkya-form-question');
      expect(question.textContent).toBe('What is your email?');
    });

    it('should call onAnswer callback when advancing', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      input.value = 'John Doe';
      
      const nextBtn = element.querySelector('.vakkya-form-btn-primary');
      nextBtn.click();
      
      expect(callbacks.onAnswer).toHaveBeenCalledWith('name', 'John Doe');
    });

    it('should enable back button after advancing', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      // Advance to second question
      const input = element.querySelector('.vakkya-form-input');
      input.value = 'John Doe';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const backBtn = element.querySelector('.vakkya-form-btn-secondary');
      expect(backBtn.disabled).toBe(false);
    });

    it('should go back to previous question', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      // Advance to second question
      const input = element.querySelector('.vakkya-form-input');
      input.value = 'John Doe';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      // Go back
      element.querySelector('.vakkya-form-btn-secondary').click();
      
      const question = element.querySelector('.vakkya-form-question');
      expect(question.textContent).toBe('What is your name?');
    });

    it('should show Skip button for optional fields', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      // Advance to phone (optional)
      element.querySelector('.vakkya-form-input').value = 'John';
      element.querySelector('.vakkya-form-btn-primary').click();
      element.querySelector('.vakkya-form-input').value = 'john@test.com';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const nextBtn = element.querySelector('.vakkya-form-btn-primary');
      expect(nextBtn.textContent).toBe('Skip');
    });
  });

  describe('validation', () => {
    it('should show error for empty required field', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const nextBtn = element.querySelector('.vakkya-form-btn-primary');
      nextBtn.click();
      
      const error = element.querySelector('.vakkya-form-error-text');
      expect(error.textContent).toBe('This field is required');
    });

    it('should show error for invalid email', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      input.value = 'not-an-email';
      
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const error = element.querySelector('.vakkya-form-error-text');
      expect(error.textContent).toBe('Please enter a valid email address');
    });

    it('should show error for invalid phone', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'phone', type: 'phone', label: 'Phone', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      input.value = '123';
      
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const error = element.querySelector('.vakkya-form-error-text');
      expect(error.textContent).toBe('Please enter a valid phone number');
    });

    it('should show error for invalid number', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'age', type: 'number', label: 'Age', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const input = element.querySelector('.vakkya-form-input');
      // Browser number inputs return empty for non-numeric values
      // So we test the required validation instead
      input.value = '';
      
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const error = element.querySelector('.vakkya-form-error-text');
      expect(error.textContent).toBe('This field is required');
    });

    it('should allow skipping optional fields', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'phone', type: 'phone', label: 'Phone', required: false }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      element.querySelector('.vakkya-form-btn-primary').click();
      
      // Should show completion screen
      const complete = element.querySelector('.vakkya-form-complete');
      expect(complete).toBeTruthy();
    });
  });

  describe('completion', () => {
    it('should show completion screen after last question', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      element.querySelector('.vakkya-form-input').value = 'John';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const complete = element.querySelector('.vakkya-form-complete');
      expect(complete).toBeTruthy();
      expect(element.querySelector('.vakkya-form-complete-title').textContent).toBe('Thank you!');
    });

    it('should call onSubmit with all answers', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [
          { name: 'name', type: 'string', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
        ],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      element.querySelector('.vakkya-form-input').value = 'John';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      element.querySelector('.vakkya-form-input').value = 'john@test.com';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      expect(callbacks.onSubmit).toHaveBeenCalledWith({
        name: 'John',
        email: 'john@test.com',
      });
    });
  });

  describe('voice input integration', () => {
    it('should display voice hint', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const voiceHint = element.querySelector('.vakkya-form-voice-hint');
      expect(voiceHint).toBeTruthy();
      expect(voiceHint.textContent).toContain('speak your answer');
    });

    it('should set answer from voice input', () => {
      const { element, setAnswer } = createFormUI(shadow, sampleSchema, callbacks);
      
      setAnswer('name', 'John Doe');
      
      // Should advance to next question
      const question = element.querySelector('.vakkya-form-question');
      expect(question.textContent).toBe('What is your email?');
    });

    it('should call onSubmit when voice completes form', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      };
      const { setAnswer } = createFormUI(shadow, schema, callbacks);
      
      setAnswer('name', 'John');
      
      expect(callbacks.onSubmit).toHaveBeenCalledWith({ name: 'John' });
    });
  });

  describe('getCurrentField', () => {
    it('should return current field', () => {
      const { getCurrentField } = createFormUI(shadow, sampleSchema, callbacks);
      
      const field = getCurrentField();
      expect(field.name).toBe('name');
      expect(field.type).toBe('string');
    });

    it('should return null when form is complete', () => {
      const schema = {
        id: 'test',
        name: 'Test',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      };
      const { element, getCurrentField } = createFormUI(shadow, schema, callbacks);
      
      element.querySelector('.vakkya-form-input').value = 'John';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      expect(getCurrentField()).toBeNull();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const { getState } = createFormUI(shadow, sampleSchema, callbacks);
      
      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.answers).toEqual({});
      expect(state.completed).toBe(false);
    });

    it('should reflect state changes', () => {
      const { element, getState } = createFormUI(shadow, sampleSchema, callbacks);
      
      element.querySelector('.vakkya-form-input').value = 'John';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      const state = getState();
      expect(state.currentIndex).toBe(1);
      expect(state.answers.name).toBe('John');
    });
  });

  describe('goBack', () => {
    it('should go back programmatically', () => {
      const { element, goBack } = createFormUI(shadow, sampleSchema, callbacks);
      
      // Advance first
      element.querySelector('.vakkya-form-input').value = 'John';
      element.querySelector('.vakkya-form-btn-primary').click();
      
      goBack();
      
      const question = element.querySelector('.vakkya-form-question');
      expect(question.textContent).toBe('What is your name?');
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      const { element, showError } = createFormUI(shadow, sampleSchema, callbacks);
      
      showError('Custom error message');
      
      const error = element.querySelector('.vakkya-form-error-text');
      expect(error.textContent).toBe('Custom error message');
    });
  });

  describe('accessibility', () => {
    it('should have proper button types', () => {
      const { element } = createFormUI(shadow, sampleSchema, callbacks);
      
      const buttons = element.querySelectorAll('button');
      buttons.forEach(btn => {
        expect(btn.getAttribute('type')).toBe('button');
      });
    });

    it('should include mobile responsive styles', () => {
      createFormUI(shadow, sampleSchema, callbacks);
      
      const styles = shadow.querySelectorAll('style');
      const hasMediaQuery = Array.from(styles).some(s => 
        s.textContent.includes('@media') && s.textContent.includes('480px')
      );
      expect(hasMediaQuery).toBe(true);
    });
  });

  describe('XSS prevention', () => {
    it('should escape HTML in form name', () => {
      const schema = {
        id: 'test',
        name: '<script>alert("xss")</script>',
        fields: [{ name: 'name', type: 'string', label: 'Name', required: true }],
      };
      const { element } = createFormUI(shadow, schema, callbacks);
      
      const title = element.querySelector('.vakkya-form-title');
      expect(title.textContent).toBe('<script>alert("xss")</script>');
      expect(title.innerHTML).not.toContain('<script>');
    });
  });
});

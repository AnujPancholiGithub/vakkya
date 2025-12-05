/**
 * Form State Manager Tests
 * 
 * Property 7: Confirmation State Machine
 * Property 8: Keyboard Bypass Confirmation
 * Property 9: Extraction Fallback After Failures
 * Property 14: Connection Recovery State Preservation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFormStateManager } from './form-state-manager.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const mockFormSchema = {
  id: 'form_123',
  projectId: 'project_456',
  name: 'Contact Form',
  fields: [
    { name: 'name', type: 'string', label: 'What is your name?', required: true },
    { name: 'email', type: 'email', label: 'What is your email?', required: true },
    { name: 'phone', type: 'phone', label: 'What is your phone?', required: false },
  ],
};

describe('FormStateManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Basic State Management', () => {
    it('should initialize with inactive state', () => {
      const manager = createFormStateManager();
      const state = manager.getState();

      expect(state.mode).toBe('inactive');
      expect(state.currentForm).toBeNull();
      expect(state.currentFieldIndex).toBe(0);
      expect(state.answers).toEqual({});
      expect(state.pendingConfirmation).toBeNull();
    });

    it('should activate form and set mode to active', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);
      const state = manager.getState();

      expect(state.mode).toBe('active');
      expect(state.currentForm).toEqual(mockFormSchema);
      expect(state.currentFieldIndex).toBe(0);
    });

    it('should get current field', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      const field = manager.getCurrentField();
      expect(field.name).toBe('name');
      expect(field.label).toBe('What is your name?');
    });

    it('should notify listeners on state change', () => {
      const manager = createFormStateManager();
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.activateForm(mockFormSchema);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'active',
      }));
    });

    it('should unsubscribe listener', () => {
      const manager = createFormStateManager();
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();
      manager.activateForm(mockFormSchema);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  /**
   * Property 7: Confirmation State Machine
   * For any voice-extracted value, the system shall transition through states:
   * COLLECTING → CONFIRMING → (COLLECTING if rejected, next field if confirmed)
   */
  describe('Property 7: Confirmation State Machine', () => {
    it('should set pending confirmation for voice input', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      manager.setPendingConfirmation('name', 'John Doe', 'my name is john doe');
      const state = manager.getState();

      expect(state.pendingConfirmation).toEqual({
        fieldName: 'name',
        extractedValue: 'John Doe',
        originalUtterance: 'my name is john doe',
      });
    });

    it('should directly confirm value without pending confirmation', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Agent skips value_extracted and directly confirms
      const result = manager.confirmAnswerDirect('name', 'John Doe');

      expect(result).toBeTruthy();
      expect(result.value).toBe('John Doe');
      
      const state = manager.getState();
      expect(state.answers.name.confirmed).toBe(true);
      expect(state.answers.name.value).toBe('John Doe');
      expect(state.answers.name.source).toBe('voice');
      expect(state.currentFieldIndex).toBe(1); // Advanced to next field
      expect(state.pendingConfirmation).toBeNull();
    });

    it('should confirm answer and advance to next field', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Set voice answer (not confirmed yet)
      manager.setAnswer('name', 'John Doe', 'voice');
      manager.setPendingConfirmation('name', 'John Doe', 'my name is john doe');

      // Confirm
      manager.confirmAnswer('name');
      const state = manager.getState();

      expect(state.answers.name.confirmed).toBe(true);
      expect(state.answers.name.value).toBe('John Doe');
      expect(state.currentFieldIndex).toBe(1);
      expect(state.pendingConfirmation).toBeNull();
    });

    it('should reject answer and stay on same field', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      manager.setAnswer('name', 'John Doe', 'voice');
      manager.setPendingConfirmation('name', 'John Doe', 'my name is john doe');

      // Reject
      manager.rejectAnswer('name');
      const state = manager.getState();

      expect(state.currentFieldIndex).toBe(0); // Still on first field
      expect(state.pendingConfirmation).toBeNull();
    });

    it('should track attempt count on rejection', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // First attempt
      manager.setAnswer('name', 'John', 'voice');
      manager.setPendingConfirmation('name', 'John', 'john');
      manager.rejectAnswer('name');

      // Second attempt
      manager.setAnswer('name', 'Jon', 'voice');
      manager.setPendingConfirmation('name', 'Jon', 'jon');
      manager.rejectAnswer('name');

      expect(manager.getCurrentFieldAttempts()).toBe(2);
    });
  });

  /**
   * Property 8: Keyboard Bypass Confirmation
   * For any value entered via keyboard, the system shall skip the CONFIRMING state
   * and directly store the value.
   */
  describe('Property 8: Keyboard Bypass Confirmation', () => {
    it('should auto-confirm keyboard input and advance', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      manager.setAnswer('name', 'John Doe', 'keyboard');
      const state = manager.getState();

      expect(state.answers.name.confirmed).toBe(true);
      expect(state.answers.name.source).toBe('keyboard');
      expect(state.currentFieldIndex).toBe(1); // Advanced to next field
    });

    it('should clear pending confirmation when keyboard input received', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Voice input pending
      manager.setPendingConfirmation('name', 'John', 'john');

      // Keyboard input overrides
      manager.setAnswer('name', 'John Doe', 'keyboard');
      const state = manager.getState();

      expect(state.pendingConfirmation).toBeNull();
      expect(state.answers.name.value).toBe('John Doe');
    });

    it('should not require confirmation for keyboard input', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Fill all fields via keyboard
      manager.setAnswer('name', 'John', 'keyboard');
      manager.setAnswer('email', 'john@example.com', 'keyboard');
      manager.setAnswer('phone', '555-1234', 'keyboard');

      const state = manager.getState();
      expect(state.mode).toBe('summary');
      expect(Object.values(state.answers).every(a => a.confirmed)).toBe(true);
    });
  });

  /**
   * Property 9: Extraction Fallback After Failures
   * For any field where voice extraction fails 3 consecutive times,
   * the system shall offer keyboard input as fallback.
   */
  describe('Property 9: Extraction Fallback After Failures', () => {
    it('should offer keyboard fallback after 3 failed attempts', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Three failed voice attempts
      for (let i = 0; i < 3; i++) {
        manager.setAnswer('name', `attempt${i}`, 'voice');
        manager.setPendingConfirmation('name', `attempt${i}`, `attempt ${i}`);
        manager.rejectAnswer('name');
      }

      expect(manager.shouldOfferKeyboardFallback()).toBe(true);
    });

    it('should not offer fallback before 3 attempts', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Two failed attempts
      for (let i = 0; i < 2; i++) {
        manager.setAnswer('name', `attempt${i}`, 'voice');
        manager.setPendingConfirmation('name', `attempt${i}`, `attempt ${i}`);
        manager.rejectAnswer('name');
      }

      expect(manager.shouldOfferKeyboardFallback()).toBe(false);
    });

    it('should reset fallback flag when keyboard input received', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Trigger fallback
      for (let i = 0; i < 3; i++) {
        manager.setAnswer('name', `attempt${i}`, 'voice');
        manager.setPendingConfirmation('name', `attempt${i}`, `attempt ${i}`);
        manager.rejectAnswer('name');
      }

      expect(manager.shouldOfferKeyboardFallback()).toBe(true);

      // Use keyboard
      manager.setAnswer('name', 'John', 'keyboard');

      expect(manager.shouldOfferKeyboardFallback()).toBe(false);
    });

    it('should reset fallback flag when voice input confirmed', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Trigger fallback
      for (let i = 0; i < 3; i++) {
        manager.setAnswer('name', `attempt${i}`, 'voice');
        manager.setPendingConfirmation('name', `attempt${i}`, `attempt ${i}`);
        manager.rejectAnswer('name');
      }

      // Successful voice input
      manager.setAnswer('name', 'John', 'voice');
      manager.setPendingConfirmation('name', 'John', 'john');
      manager.confirmAnswer('name');

      expect(manager.shouldOfferKeyboardFallback()).toBe(false);
    });
  });

  /**
   * Property 14: Connection Recovery State Preservation
   * For any disconnection during form collection, all confirmed answers
   * shall be preserved in local storage.
   */
  describe('Property 14: Connection Recovery State Preservation', () => {
    it('should save state to localStorage on answer', () => {
      const manager = createFormStateManager('test-session');
      manager.activateForm(mockFormSchema);
      manager.setAnswer('name', 'John', 'keyboard');

      expect(localStorageMock.setItem).toHaveBeenCalled();
      // Get the last call (after setAnswer)
      const lastCallIndex = localStorageMock.setItem.mock.calls.length - 1;
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[lastCallIndex][1]);
      expect(savedData.formId).toBe('form_123');
      expect(savedData.answers.name.value).toBe('John');
    });

    it('should restore state from localStorage', () => {
      // Setup persisted state
      const persisted = {
        formId: 'form_123',
        projectId: 'project_456',
        sessionId: 'test-session',
        answers: {
          name: { value: 'John', confirmed: true, source: 'keyboard', attempts: 1, timestamp: Date.now() },
        },
        currentFieldIndex: 1,
        mode: 'active',
        savedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persisted));

      const manager = createFormStateManager();
      const restored = manager.restoreFromStorage(mockFormSchema);

      expect(restored).toBe(true);
      const state = manager.getState();
      expect(state.answers.name.value).toBe('John');
      expect(state.currentFieldIndex).toBe(1);
    });

    it('should not restore expired state', () => {
      const persisted = {
        formId: 'form_123',
        projectId: 'project_456',
        sessionId: 'test-session',
        answers: {},
        currentFieldIndex: 0,
        mode: 'active',
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        expiresAt: Date.now() - 1 * 60 * 60 * 1000, // Expired 1 hour ago
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persisted));

      const manager = createFormStateManager();
      const restored = manager.restoreFromStorage(mockFormSchema);

      expect(restored).toBe(false);
    });

    it('should not restore state for different form', () => {
      const persisted = {
        formId: 'different_form',
        projectId: 'project_456',
        sessionId: 'test-session',
        answers: {},
        currentFieldIndex: 0,
        mode: 'active',
        savedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persisted));

      const manager = createFormStateManager();
      const restored = manager.restoreFromStorage(mockFormSchema);

      expect(restored).toBe(false);
    });

    it('should clear storage on form completion', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);
      manager.completeForm();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vakkya_form_state');
    });

    it('should clear storage on form abandonment', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);
      manager.abandonForm();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vakkya_form_state');
    });

    it('should check if persisted state exists', () => {
      const persisted = {
        formId: 'form_123',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persisted));

      const manager = createFormStateManager();
      expect(manager.hasPersistedState('form_123')).toBe(true);
      expect(manager.hasPersistedState('other_form')).toBe(false);
    });
  });

  describe('Form Lifecycle', () => {
    it('should pause and resume form', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      manager.pauseForm();
      expect(manager.getState().mode).toBe('paused');

      manager.resumeForm();
      expect(manager.getState().mode).toBe('active');
    });

    it('should not pause inactive form', () => {
      const manager = createFormStateManager();
      manager.pauseForm();
      expect(manager.getState().mode).toBe('inactive');
    });

    it('should abandon form and reset state', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);
      manager.setAnswer('name', 'John', 'keyboard');

      manager.abandonForm();
      const state = manager.getState();

      expect(state.mode).toBe('inactive');
      expect(state.currentForm).toBeNull();
      expect(state.answers).toEqual({});
    });

    it('should transition to summary when all required fields collected', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Fill required fields
      manager.setAnswer('name', 'John', 'keyboard');
      manager.setAnswer('email', 'john@example.com', 'keyboard');
      // Skip optional phone field
      manager.setAnswer('phone', '', 'keyboard');

      const state = manager.getState();
      expect(state.mode).toBe('summary');
    });
  });

  /**
   * Property 12: Edit Without Restart
   * For any edit request during summary, only the specified field shall be cleared;
   * all other answers shall be preserved.
   */
  describe('Property 12: Edit Without Restart', () => {
    it('should edit specific field without clearing others', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Fill all fields
      manager.setAnswer('name', 'John', 'keyboard');
      manager.setAnswer('email', 'john@example.com', 'keyboard');
      manager.setAnswer('phone', '555-1234', 'keyboard');

      // Edit email
      manager.editField('email');
      const state = manager.getState();

      expect(state.mode).toBe('active');
      expect(state.currentFieldIndex).toBe(1); // Email field index
      expect(state.answers.name.value).toBe('John'); // Preserved
      expect(state.answers.email).toBeUndefined(); // Cleared
      expect(state.answers.phone.value).toBe('555-1234'); // Preserved
    });

    it('should not edit non-existent field', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);
      manager.setAnswer('name', 'John', 'keyboard');

      manager.editField('nonexistent');
      const state = manager.getState();

      expect(state.answers.name.value).toBe('John');
    });
  });

  /**
   * Property 10: Input Priority Resolution
   * For any concurrent voice and keyboard inputs, the most recent complete input
   * (by timestamp) shall be used.
   */
  describe('Property 10: Input Priority Resolution', () => {
    it('should track timestamp for each input', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      const beforeTime = Date.now();
      manager.setAnswer('name', 'John', 'keyboard');
      const afterTime = Date.now();

      const state = manager.getState();
      expect(state.answers.name.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(state.answers.name.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should use most recent input when keyboard overrides voice', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Voice input first (unconfirmed)
      manager.setAnswer('name', 'John', 'voice');
      const voiceTimestamp = manager.getState().answers.name.timestamp;

      // Small delay to ensure different timestamp
      const laterTimestamp = voiceTimestamp + 100;
      vi.spyOn(Date, 'now').mockReturnValue(laterTimestamp);

      // Keyboard input overrides
      manager.setAnswer('name', 'Jonathan', 'keyboard');

      const state = manager.getState();
      expect(state.answers.name.value).toBe('Jonathan');
      expect(state.answers.name.timestamp).toBe(laterTimestamp);
      expect(state.answers.name.source).toBe('keyboard');

      vi.restoreAllMocks();
    });

    it('should preserve source information for analytics', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      manager.setAnswer('name', 'John', 'voice');
      expect(manager.getState().answers.name.source).toBe('voice');

      manager.setAnswer('name', 'John', 'keyboard');
      expect(manager.getState().answers.name.source).toBe('keyboard');
    });
  });

  describe('getConfirmedAnswers', () => {
    it('should return only confirmed answers', () => {
      const manager = createFormStateManager();
      manager.activateForm(mockFormSchema);

      // Confirmed via keyboard
      manager.setAnswer('name', 'John', 'keyboard');

      // Unconfirmed voice input
      manager.setAnswer('email', 'john@example.com', 'voice');

      const confirmed = manager.getConfirmedAnswers();
      expect(confirmed).toEqual({ name: 'John' });
    });
  });
});

/**
 * Form State Manager
 * Manages form state on the client side with persistence for recovery
 * 
 * Validates: Requirements 4.1-4.5, 7.1-7.2
 */

const STORAGE_KEY = 'vakkya_form_state';
const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * @typedef {Object} FieldAnswer
 * @property {unknown} value
 * @property {boolean} confirmed
 * @property {'voice'|'keyboard'} source
 * @property {number} attempts
 * @property {number} timestamp
 */

/**
 * @typedef {Object} PendingConfirmation
 * @property {string} fieldName
 * @property {unknown} extractedValue
 * @property {string} originalUtterance
 */

/**
 * @typedef {Object} FormSchema
 * @property {string} id
 * @property {string} projectId
 * @property {string} name
 * @property {Array<{name: string, type: string, label: string, required: boolean, options?: string[]}>} fields
 */

/**
 * @typedef {'inactive'|'active'|'paused'|'summary'|'completed'} FormMode
 */

/**
 * @typedef {Object} FormState
 * @property {FormSchema|null} currentForm
 * @property {number} currentFieldIndex
 * @property {Record<string, FieldAnswer>} answers
 * @property {PendingConfirmation|null} pendingConfirmation
 * @property {FormMode} mode
 * @property {string|null} sessionId
 * @property {boolean} fallbackToKeyboard
 */

/**
 * @typedef {Object} PersistedFormState
 * @property {string} formId
 * @property {string} projectId
 * @property {string} sessionId
 * @property {Record<string, FieldAnswer>} answers
 * @property {number} currentFieldIndex
 * @property {FormMode} mode
 * @property {number} savedAt
 * @property {number} expiresAt
 */

/**
 * Create a form state manager
 * @param {string} [sessionId] - Session ID for persistence
 * @returns {Object} Form state manager
 */
export function createFormStateManager(sessionId = null) {
  /** @type {FormState} */
  const state = {
    currentForm: null,
    currentFieldIndex: 0,
    answers: {},
    pendingConfirmation: null,
    mode: 'inactive',
    sessionId: sessionId || generateSessionId(),
    fallbackToKeyboard: false,
  };

  /** @type {Array<(state: FormState) => void>} */
  const listeners = [];

  /**
   * Notify all listeners of state change
   */
  function notifyListeners() {
    const snapshot = getState();
    listeners.forEach(listener => listener(snapshot));
  }

  /**
   * Get current state snapshot
   * @returns {FormState}
   */
  function getState() {
    return {
      currentForm: state.currentForm,
      currentFieldIndex: state.currentFieldIndex,
      answers: { ...state.answers },
      pendingConfirmation: state.pendingConfirmation ? { ...state.pendingConfirmation } : null,
      mode: state.mode,
      sessionId: state.sessionId,
      fallbackToKeyboard: state.fallbackToKeyboard,
    };
  }

  /**
   * Subscribe to state changes
   * @param {(state: FormState) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  /**
   * Activate a form
   * @param {FormSchema} schema - Form schema to activate
   */
  function activateForm(schema) {
    state.currentForm = schema;
    state.currentFieldIndex = 0;
    state.answers = {};
    state.pendingConfirmation = null;
    state.mode = 'active';
    state.fallbackToKeyboard = false;
    saveToStorage();
    notifyListeners();
  }

  /**
   * Set answer for a field
   * Property 8: Keyboard inputs skip confirmation
   * Requirements 1.2, 4.2: On confirm, add answer card to chat, hide current input, show next
   * @param {string} fieldName
   * @param {unknown} value
   * @param {'voice'|'keyboard'} source
   * @returns {{ field: Object, value: unknown, shouldTransitionToSummary: boolean } | null}
   */
  function setAnswer(fieldName, value, source) {
    const existingAnswer = state.answers[fieldName];
    const attempts = existingAnswer ? existingAnswer.attempts + 1 : 1;

    // Get the field info before advancing
    const confirmedField = state.currentForm?.fields?.find(f => f.name === fieldName);

    state.answers[fieldName] = {
      value,
      confirmed: source === 'keyboard', // Keyboard inputs are auto-confirmed
      source,
      attempts,
      timestamp: Date.now(),
    };

    // For keyboard input, skip confirmation and advance
    if (source === 'keyboard') {
      state.pendingConfirmation = null;
      state.fallbackToKeyboard = false;
      const previousIndex = state.currentFieldIndex;
      advanceToNextField();
      const shouldTransitionToSummary = state.mode === 'summary';
      
      saveToStorage();
      notifyListeners();

      // Return info for the caller to add answer card and handle transition
      return {
        field: confirmedField,
        value,
        shouldTransitionToSummary,
        previousIndex,
        newIndex: state.currentFieldIndex,
      };
    }

    saveToStorage();
    notifyListeners();
    return null;
  }

  /**
   * Set pending confirmation for voice-extracted value
   * Property 7: Voice values require confirmation
   * @param {string} fieldName
   * @param {unknown} extractedValue
   * @param {string} originalUtterance
   */
  function setPendingConfirmation(fieldName, extractedValue, originalUtterance) {
    state.pendingConfirmation = {
      fieldName,
      extractedValue,
      originalUtterance,
    };
    notifyListeners();
  }

  /**
   * Confirm the pending answer
   * Requirements 1.2, 4.2: On confirm, add answer card to chat, hide current input, show next
   * @param {string} fieldName
   * @returns {{ field: Object, value: unknown, shouldTransitionToSummary: boolean } | null}
   */
  function confirmAnswer(fieldName) {
    if (!state.pendingConfirmation || state.pendingConfirmation.fieldName !== fieldName) {
      return null;
    }

    const pending = state.pendingConfirmation;
    const existingAnswer = state.answers[fieldName];

    // Get the field info before advancing
    const confirmedField = state.currentForm?.fields?.find(f => f.name === fieldName);
    const confirmedValue = pending.extractedValue;

    state.answers[fieldName] = {
      value: confirmedValue,
      confirmed: true,
      source: 'voice',
      attempts: existingAnswer ? existingAnswer.attempts : 1,
      timestamp: Date.now(),
    };

    state.pendingConfirmation = null;
    state.fallbackToKeyboard = false;
    
    // Advance to next field and check if we should transition to summary
    const previousIndex = state.currentFieldIndex;
    advanceToNextField();
    const shouldTransitionToSummary = state.mode === 'summary';
    
    saveToStorage();
    notifyListeners();

    // Return info for the caller to add answer card and handle transition
    return {
      field: confirmedField,
      value: confirmedValue,
      shouldTransitionToSummary,
      previousIndex,
      newIndex: state.currentFieldIndex,
    };
  }

  /**
   * Reject the pending answer
   * Property 7: Rejection returns to COLLECTING state
   * @param {string} fieldName
   */
  function rejectAnswer(fieldName) {
    if (!state.pendingConfirmation || state.pendingConfirmation.fieldName !== fieldName) {
      return;
    }

    const existingAnswer = state.answers[fieldName];
    const attempts = existingAnswer ? existingAnswer.attempts : 1;

    // Property 9: After 3 failed attempts, offer keyboard fallback
    if (attempts >= 3) {
      state.fallbackToKeyboard = true;
    }

    state.pendingConfirmation = null;
    notifyListeners();
  }

  /**
   * Edit a specific field (from summary)
   * Property 12: Edit without restart
   * @param {string} fieldName
   */
  function editField(fieldName) {
    if (!state.currentForm) return;

    const fieldIndex = state.currentForm.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) return;

    // Clear only this field's answer
    delete state.answers[fieldName];
    state.currentFieldIndex = fieldIndex;
    state.mode = 'active';
    state.pendingConfirmation = null;
    state.fallbackToKeyboard = false;
    saveToStorage();
    notifyListeners();
  }

  /**
   * Pause form collection (for RAG detour)
   */
  function pauseForm() {
    if (state.mode === 'active') {
      state.mode = 'paused';
      saveToStorage();
      notifyListeners();
    }
  }

  /**
   * Resume form collection
   */
  function resumeForm() {
    if (state.mode === 'paused') {
      state.mode = 'active';
      notifyListeners();
    }
  }

  /**
   * Abandon form collection
   */
  function abandonForm() {
    state.currentForm = null;
    state.currentFieldIndex = 0;
    state.answers = {};
    state.pendingConfirmation = null;
    state.mode = 'inactive';
    state.fallbackToKeyboard = false;
    clearStorage();
    notifyListeners();
  }

  /**
   * Transition to summary mode
   */
  function showSummary() {
    state.mode = 'summary';
    state.pendingConfirmation = null;
    notifyListeners();
  }

  /**
   * Mark form as completed
   */
  function completeForm() {
    state.mode = 'completed';
    clearStorage();
    notifyListeners();
  }

  /**
   * Advance to next field or summary
   */
  function advanceToNextField() {
    if (!state.currentForm) return;

    state.currentFieldIndex++;

    // Check if all fields are collected
    if (state.currentFieldIndex >= state.currentForm.fields.length) {
      // Property 11: Transition to summary when all required fields collected
      const allRequiredCollected = state.currentForm.fields
        .filter(f => f.required)
        .every(f => state.answers[f.name]?.confirmed);

      if (allRequiredCollected) {
        state.mode = 'summary';
      }
    }
  }

  /**
   * Get current field
   * @returns {Object|null}
   */
  function getCurrentField() {
    if (!state.currentForm || state.currentFieldIndex >= state.currentForm.fields.length) {
      return null;
    }
    return state.currentForm.fields[state.currentFieldIndex];
  }

  /**
   * Get the active field (alias for getCurrentField for clarity)
   * Requirement 4.1: Track which field is currently being collected
   * @returns {Object|null}
   */
  function getActiveField() {
    return getCurrentField();
  }

  /**
   * Get all completed (confirmed) fields with their answers
   * Requirements 1.3, 3.1: Return completed fields for display as answer cards
   * @returns {Array<{field: Object, answer: FieldAnswer}>}
   */
  function getCompletedFields() {
    if (!state.currentForm) return [];

    const completed = [];
    for (const field of state.currentForm.fields) {
      const answer = state.answers[field.name];
      if (answer && answer.confirmed) {
        completed.push({ field, answer });
      }
    }
    return completed;
  }

  /**
   * Get form progress for progress indicator
   * Requirement 6.4: Display "Question X of Y"
   * @returns {{ current: number, total: number }}
   */
  function getProgress() {
    if (!state.currentForm) {
      return { current: 0, total: 0 };
    }
    return {
      current: state.currentFieldIndex + 1,
      total: state.currentForm.fields.length,
    };
  }

  /**
   * Check if a specific field is the active field
   * @param {string} fieldName
   * @returns {boolean}
   */
  function isFieldActive(fieldName) {
    const activeField = getActiveField();
    return activeField !== null && activeField.name === fieldName;
  }

  /**
   * Set the active field index (for agent synchronization)
   * Requirement 4.1, 4.3: Sync field index with agent's field_focus messages
   * @param {number} index - The field index to set as active
   */
  function setActiveFieldIndex(index) {
    if (!state.currentForm) return;
    
    const maxIndex = state.currentForm.fields.length - 1;
    if (index < 0 || index > maxIndex) {
      console.warn('[Vakkya] Invalid field index:', index);
      return;
    }
    
    state.currentFieldIndex = index;
    saveToStorage();
    notifyListeners();
  }

  /**
   * Get attempt count for current field
   * @returns {number}
   */
  function getCurrentFieldAttempts() {
    const field = getCurrentField();
    if (!field) return 0;
    return state.answers[field.name]?.attempts || 0;
  }

  /**
   * Check if keyboard fallback should be offered
   * Property 9: After 3 failed attempts
   * @returns {boolean}
   */
  function shouldOfferKeyboardFallback() {
    return state.fallbackToKeyboard;
  }

  /**
   * Get all confirmed answers
   * @returns {Record<string, unknown>}
   */
  function getConfirmedAnswers() {
    const result = {};
    for (const [key, answer] of Object.entries(state.answers)) {
      if (answer.confirmed) {
        result[key] = answer.value;
      }
    }
    return result;
  }

  // === Persistence (Property 14: Connection Recovery State Preservation) ===

  /**
   * Save state to localStorage
   */
  function saveToStorage() {
    if (!state.currentForm || state.mode === 'inactive' || state.mode === 'completed') {
      return;
    }

    try {
      /** @type {PersistedFormState} */
      const persisted = {
        formId: state.currentForm.id,
        projectId: state.currentForm.projectId,
        sessionId: state.sessionId,
        answers: state.answers,
        currentFieldIndex: state.currentFieldIndex,
        mode: state.mode,
        savedAt: Date.now(),
        expiresAt: Date.now() + EXPIRATION_MS,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch (err) {
      // localStorage might be full or disabled
      console.warn('[Vakkya] Failed to save form state:', err);
    }
  }

  /**
   * Restore state from localStorage
   * Property 15: Resume from last confirmed field
   * @param {FormSchema} schema - Form schema to validate against
   * @returns {boolean} True if state was restored
   */
  function restoreFromStorage(schema) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      /** @type {PersistedFormState} */
      const persisted = JSON.parse(stored);

      // Check expiration
      if (Date.now() > persisted.expiresAt) {
        clearStorage();
        return false;
      }

      // Check if same form
      if (persisted.formId !== schema.id) {
        return false;
      }

      // Restore state
      state.currentForm = schema;
      state.answers = persisted.answers;
      state.currentFieldIndex = persisted.currentFieldIndex;
      state.mode = persisted.mode === 'completed' ? 'inactive' : persisted.mode;
      state.sessionId = persisted.sessionId;
      state.pendingConfirmation = null;
      state.fallbackToKeyboard = false;

      notifyListeners();
      return true;
    } catch (err) {
      console.warn('[Vakkya] Failed to restore form state:', err);
      return false;
    }
  }

  /**
   * Clear persisted state
   */
  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // Ignore errors
    }
  }

  /**
   * Check if there's persisted state for a form
   * @param {string} formId
   * @returns {boolean}
   */
  function hasPersistedState(formId) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const persisted = JSON.parse(stored);
      return persisted.formId === formId && Date.now() < persisted.expiresAt;
    } catch {
      return false;
    }
  }

  return {
    // State access
    getState,
    subscribe,
    getCurrentField,
    getActiveField,
    getCompletedFields,
    getProgress,
    isFieldActive,
    getCurrentFieldAttempts,
    shouldOfferKeyboardFallback,
    getConfirmedAnswers,

    // Form lifecycle
    activateForm,
    pauseForm,
    resumeForm,
    abandonForm,
    showSummary,
    completeForm,

    // Answer management
    setAnswer,
    setPendingConfirmation,
    confirmAnswer,
    rejectAnswer,
    editField,
    setActiveFieldIndex,

    // Persistence
    saveToStorage,
    restoreFromStorage,
    clearStorage,
    hasPersistedState,
  };
}

/**
 * Generate a unique session ID
 * @returns {string}
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

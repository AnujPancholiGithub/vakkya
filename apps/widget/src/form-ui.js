/**
 * Form UI component
 * Typeform-style one-question-at-a-time interface for voice forms
 * Supports both voice and keyboard input
 */

const FORM_UI_STYLES = `
  .vakkya-form-ui {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 380px;
    max-height: 400px;
    background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 2147483647;
  }
  
  .vakkya-form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .vakkya-form-title {
    color: white;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }
  
  .vakkya-form-close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }
  
  .vakkya-form-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .vakkya-form-close:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }
  
  .vakkya-form-close svg {
    width: 14px;
    height: 14px;
    fill: white;
  }
  
  .vakkya-form-content {
    flex: 1;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }
  
  .vakkya-form-question {
    color: white;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.4;
    margin: 0;
  }
  
  .vakkya-form-input-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .vakkya-form-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 16px;
    outline: none;
    transition: border-color 0.2s ease, background 0.2s ease;
  }
  
  .vakkya-form-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .vakkya-form-input:focus {
    border-color: white;
    background: rgba(255, 255, 255, 0.15);
  }
  
  .vakkya-form-input.error {
    border-color: #EF4444;
  }
  
  .vakkya-form-select {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 16px;
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }
  
  .vakkya-form-select option {
    background: #1E3A8A;
    color: white;
  }
  
  .vakkya-form-error-text {
    color: #FCA5A5;
    font-size: 13px;
    margin: 0;
  }
  
  .vakkya-form-hint {
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    margin: 0;
  }
  
  .vakkya-form-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .vakkya-form-progress {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  
  .vakkya-form-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transition: background 0.2s ease;
  }
  
  .vakkya-form-dot.completed {
    background: #10B981;
  }
  
  .vakkya-form-dot.current {
    background: white;
  }
  
  .vakkya-form-actions {
    display: flex;
    gap: 8px;
  }
  
  .vakkya-form-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }
  
  .vakkya-form-btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  .vakkya-form-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .vakkya-form-btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .vakkya-form-btn-primary {
    background: white;
    color: #1E3A8A;
  }
  
  .vakkya-form-btn-primary:hover {
    background: #F0F0F0;
  }
  
  .vakkya-form-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .vakkya-form-voice-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    margin-top: 4px;
  }
  
  .vakkya-form-voice-hint svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }
  
  .vakkya-form-complete {
    text-align: center;
    padding: 32px 16px;
  }
  
  .vakkya-form-complete-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    background: #10B981;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .vakkya-form-complete-icon svg {
    width: 24px;
    height: 24px;
    fill: white;
  }
  
  .vakkya-form-complete-title {
    color: white;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px;
  }
  
  .vakkya-form-complete-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    margin: 0;
  }
  
  @media (max-width: 480px) {
    .vakkya-form-ui {
      width: calc(100vw - 32px);
      right: 16px;
      bottom: 16px;
      max-height: 70vh;
    }
    
    .vakkya-form-question {
      font-size: 16px;
    }
  }
`;

const CLOSE_ICON = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
const MIC_ICON = `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

/**
 * @typedef {Object} FormField
 * @property {string} name
 * @property {'string'|'email'|'phone'|'number'|'enum'|'text'} type
 * @property {string} label
 * @property {boolean} required
 * @property {string[]} [options]
 */

/**
 * @typedef {Object} FormSchema
 * @property {string} id
 * @property {string} name
 * @property {FormField[]} fields
 */

/**
 * @typedef {Object} FormState
 * @property {number} currentIndex
 * @property {Object<string, any>} answers
 * @property {boolean} completed
 * @property {string|null} error
 */

/**
 * Create the form UI element
 * @param {ShadowRoot} shadow - Shadow root to inject styles
 * @param {FormSchema} schema - Form schema
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onClose - Called when form is closed
 * @param {Function} callbacks.onSubmit - Called when form is submitted
 * @param {Function} [callbacks.onAnswer] - Called when an answer is provided
 * @returns {Object} Form UI controller
 */
export function createFormUI(shadow, schema, callbacks) {
  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = FORM_UI_STYLES;
  shadow.appendChild(styleSheet);
  
  /** @type {FormState} */
  const state = {
    currentIndex: 0,
    answers: {},
    completed: false,
    error: null,
  };
  
  // Create main container
  const element = document.createElement('div');
  element.className = 'vakkya-form-ui';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', `Form: ${schema.name}`);
  
  // Build initial UI
  renderForm();
  
  /**
   * Render the form UI based on current state
   */
  function renderForm() {
    element.innerHTML = '';
    
    if (state.completed) {
      renderComplete();
      return;
    }
    
    const field = schema.fields[state.currentIndex];
    if (!field) {
      state.completed = true;
      renderComplete();
      return;
    }
    
    // Header
    const header = document.createElement('div');
    header.className = 'vakkya-form-header';
    header.innerHTML = `
      <span class="vakkya-form-title">${escapeHtml(schema.name)}</span>
      <button class="vakkya-form-close" aria-label="Close form" type="button">${CLOSE_ICON}</button>
    `;
    header.querySelector('.vakkya-form-close').addEventListener('click', () => {
      if (callbacks.onClose) callbacks.onClose();
    });
    
    // Content
    const content = document.createElement('div');
    content.className = 'vakkya-form-content';
    
    // Question
    const question = document.createElement('p');
    question.className = 'vakkya-form-question';
    question.textContent = field.label + (field.label.endsWith('?') ? '' : '?');
    content.appendChild(question);
    
    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'vakkya-form-input-container';
    
    // Create appropriate input based on field type
    const input = createInput(field);
    inputContainer.appendChild(input);
    
    // Error text
    if (state.error) {
      const errorText = document.createElement('p');
      errorText.className = 'vakkya-form-error-text';
      errorText.textContent = state.error;
      inputContainer.appendChild(errorText);
    }
    
    // Voice hint
    const voiceHint = document.createElement('div');
    voiceHint.className = 'vakkya-form-voice-hint';
    voiceHint.innerHTML = `${MIC_ICON} <span>Or speak your answer</span>`;
    inputContainer.appendChild(voiceHint);
    
    // Optional hint
    if (!field.required) {
      const hint = document.createElement('p');
      hint.className = 'vakkya-form-hint';
      hint.textContent = 'Optional - press Skip to continue';
      inputContainer.appendChild(hint);
    }
    
    content.appendChild(inputContainer);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'vakkya-form-footer';
    
    // Progress dots
    const progress = document.createElement('div');
    progress.className = 'vakkya-form-progress';
    schema.fields.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'vakkya-form-dot';
      if (i < state.currentIndex) dot.classList.add('completed');
      if (i === state.currentIndex) dot.classList.add('current');
      progress.appendChild(dot);
    });
    
    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'vakkya-form-actions';
    
    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'vakkya-form-btn vakkya-form-btn-secondary';
    backBtn.textContent = 'Back';
    backBtn.type = 'button';
    backBtn.disabled = state.currentIndex === 0;
    backBtn.addEventListener('click', goBack);
    
    // Next/Skip button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'vakkya-form-btn vakkya-form-btn-primary';
    nextBtn.textContent = field.required ? 'Next' : 'Skip';
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', () => handleNext(input));
    
    actions.appendChild(backBtn);
    actions.appendChild(nextBtn);
    
    footer.appendChild(progress);
    footer.appendChild(actions);
    
    // Assemble
    element.appendChild(header);
    element.appendChild(content);
    element.appendChild(footer);
    
    // Focus input
    setTimeout(() => input.focus(), 100);
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleNext(input);
      }
    });
  }
  
  /**
   * Create input element based on field type
   * @param {FormField} field
   * @returns {HTMLElement}
   */
  function createInput(field) {
    if (field.type === 'enum' && field.options) {
      const select = document.createElement('select');
      select.className = 'vakkya-form-select';
      select.name = field.name;
      
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select an option...';
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);
      
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (state.answers[field.name] === opt) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      
      return select;
    }
    
    if (field.type === 'text') {
      const textarea = document.createElement('textarea');
      textarea.className = 'vakkya-form-input';
      textarea.name = field.name;
      textarea.placeholder = getPlaceholder(field);
      textarea.rows = 3;
      textarea.value = state.answers[field.name] || '';
      return textarea;
    }
    
    const input = document.createElement('input');
    input.className = 'vakkya-form-input';
    input.name = field.name;
    input.placeholder = getPlaceholder(field);
    input.value = state.answers[field.name] || '';
    
    // Set input type
    switch (field.type) {
      case 'email':
        input.type = 'email';
        break;
      case 'phone':
        input.type = 'tel';
        break;
      case 'number':
        input.type = 'number';
        break;
      default:
        input.type = 'text';
    }
    
    return input;
  }
  
  /**
   * Get placeholder text for field
   * @param {FormField} field
   * @returns {string}
   */
  function getPlaceholder(field) {
    switch (field.type) {
      case 'email':
        return 'your@email.com';
      case 'phone':
        return '(555) 123-4567';
      case 'number':
        return 'Enter a number';
      case 'text':
        return 'Type your answer...';
      default:
        return 'Type your answer...';
    }
  }
  
  /**
   * Handle next button click
   * @param {HTMLElement} input
   */
  function handleNext(input) {
    const field = schema.fields[state.currentIndex];
    const value = input.value.trim();
    
    // Validate
    const error = validateField(field, value);
    if (error) {
      state.error = error;
      input.classList.add('error');
      renderForm();
      return;
    }
    
    // Store answer (skip empty optional fields)
    if (value) {
      state.answers[field.name] = value;
    }
    
    // Notify callback
    if (callbacks.onAnswer) {
      callbacks.onAnswer(field.name, value);
    }
    
    // Clear error and advance
    state.error = null;
    state.currentIndex++;
    
    // Check if complete
    if (state.currentIndex >= schema.fields.length) {
      state.completed = true;
      if (callbacks.onSubmit) {
        callbacks.onSubmit(state.answers);
      }
    }
    
    renderForm();
  }
  
  /**
   * Go back to previous question
   */
  function goBack() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      state.error = null;
      renderForm();
    }
  }
  
  /**
   * Validate field value
   * @param {FormField} field
   * @param {string} value
   * @returns {string|null} Error message or null if valid
   */
  function validateField(field, value) {
    // Required check
    if (field.required && !value) {
      return 'This field is required';
    }
    
    // Skip validation for empty optional fields
    if (!value) return null;
    
    // Type-specific validation
    switch (field.type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'phone':
        // Must have at least 10 digits after removing non-digit characters
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length < 10 || !/^\+?[\d\s\-()]+$/.test(value)) {
          return 'Please enter a valid phone number';
        }
        break;
      case 'number':
        if (isNaN(Number(value))) {
          return 'Please enter a valid number';
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Render completion screen
   */
  function renderComplete() {
    element.innerHTML = `
      <div class="vakkya-form-header">
        <span class="vakkya-form-title">${escapeHtml(schema.name)}</span>
        <button class="vakkya-form-close" aria-label="Close form" type="button">${CLOSE_ICON}</button>
      </div>
      <div class="vakkya-form-complete">
        <div class="vakkya-form-complete-icon">${CHECK_ICON}</div>
        <h3 class="vakkya-form-complete-title">Thank you!</h3>
        <p class="vakkya-form-complete-text">Your response has been submitted.</p>
      </div>
    `;
    
    element.querySelector('.vakkya-form-close').addEventListener('click', () => {
      if (callbacks.onClose) callbacks.onClose();
    });
  }
  
  /**
   * Set answer from voice input
   * @param {string} fieldName
   * @param {any} value
   */
  function setAnswer(fieldName, value) {
    const fieldIndex = schema.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) return;
    
    state.answers[fieldName] = value;
    
    // If this is the current field, advance
    if (fieldIndex === state.currentIndex) {
      state.currentIndex++;
      if (state.currentIndex >= schema.fields.length) {
        state.completed = true;
        if (callbacks.onSubmit) {
          callbacks.onSubmit(state.answers);
        }
      }
      renderForm();
    }
  }
  
  /**
   * Get current field
   * @returns {FormField|null}
   */
  function getCurrentField() {
    return schema.fields[state.currentIndex] || null;
  }
  
  /**
   * Get current state
   * @returns {FormState}
   */
  function getState() {
    return { ...state };
  }
  
  /**
   * Show error message
   * @param {string} message
   */
  function showError(message) {
    state.error = message;
    renderForm();
  }
  
  /**
   * Focus a specific field by name
   * @param {string} fieldName
   */
  function focusField(fieldName) {
    const fieldIndex = schema.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) return;
    
    state.currentIndex = fieldIndex;
    state.error = null;
    renderForm();
  }

  /**
   * Show pending value for confirmation (voice extraction)
   * @param {string} fieldName
   * @param {any} value
   * @param {string} utterance
   */
  function showPendingValue(fieldName, value, utterance) {
    const fieldIndex = schema.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) return;
    
    // Navigate to the field if not already there
    if (state.currentIndex !== fieldIndex) {
      state.currentIndex = fieldIndex;
    }
    
    // Store the pending value (will be shown in input)
    state.answers[fieldName] = value;
    state.error = null;
    renderForm();
    
    // Highlight the input to show it's pending confirmation
    const input = element.querySelector('.vakkya-form-input, .vakkya-form-select');
    if (input) {
      input.style.borderColor = '#FCD34D'; // Yellow for pending
    }
  }

  /**
   * Confirm a value (from agent confirmation)
   * @param {string} fieldName
   * @param {any} value
   */
  function confirmValue(fieldName, value) {
    const fieldIndex = schema.fields.findIndex(f => f.name === fieldName);
    if (fieldIndex === -1) return;
    
    state.answers[fieldName] = value;
    
    // Advance to next field
    if (fieldIndex === state.currentIndex) {
      state.currentIndex++;
      if (state.currentIndex >= schema.fields.length) {
        state.completed = true;
        if (callbacks.onSubmit) {
          callbacks.onSubmit(state.answers);
        }
      }
    }
    
    state.error = null;
    renderForm();
  }

  /**
   * Show form summary before submission
   * @param {Object} answers
   */
  function showSummary(answers) {
    // Update state with all answers
    state.answers = { ...state.answers, ...answers };
    state.currentIndex = schema.fields.length; // Move past all fields
    
    // Render summary view
    element.innerHTML = `
      <div class="vakkya-form-header">
        <span class="vakkya-form-title">${escapeHtml(schema.name)} - Review</span>
        <button class="vakkya-form-close" aria-label="Close form" type="button">${CLOSE_ICON}</button>
      </div>
      <div class="vakkya-form-content">
        <p class="vakkya-form-question">Please review your answers:</p>
        ${schema.fields.map(field => `
          <div style="margin-bottom: 12px;">
            <div style="color: rgba(255,255,255,0.7); font-size: 12px;">${escapeHtml(field.label)}</div>
            <div style="color: white; font-size: 14px;">${escapeHtml(String(state.answers[field.name] || '-'))}</div>
          </div>
        `).join('')}
      </div>
      <div class="vakkya-form-footer">
        <div></div>
        <div class="vakkya-form-actions">
          <button class="vakkya-form-btn vakkya-form-btn-secondary" type="button">Edit</button>
          <button class="vakkya-form-btn vakkya-form-btn-primary" type="button">Submit</button>
        </div>
      </div>
    `;
    
    element.querySelector('.vakkya-form-close').addEventListener('click', () => {
      if (callbacks.onClose) callbacks.onClose();
    });
    
    element.querySelector('.vakkya-form-btn-secondary').addEventListener('click', () => {
      state.currentIndex = 0;
      renderForm();
    });
    
    element.querySelector('.vakkya-form-btn-primary').addEventListener('click', () => {
      if (callbacks.onSubmit) {
        callbacks.onSubmit(state.answers);
      }
    });
  }

  /**
   * Show success message after submission
   * @param {string} submissionId
   */
  function showSuccess(submissionId) {
    state.completed = true;
    renderComplete();
  }

  return {
    element,
    setAnswer,
    getCurrentField,
    getState,
    goBack,
    showError,
    focusField,
    showPendingValue,
    confirmValue,
    showSummary,
    showSuccess,
  };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

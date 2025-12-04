/**
 * Chat Panel Component
 * Expandable panel with header, message list, and voice input bar
 * Requirements: 3.1, 3.5, 5.1, 5.2, 5.3, 5.5, 7.1
 */

import { CHAT_PANEL_STYLES, applyAccentColor, applyTheme } from './chat-styles.js';
import { createWaveformRenderer, generateIdleData } from './waveform.js';

// SVG Icons
const CLOSE_ICON = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
const MIC_ICON = `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;
const CHAT_ICON = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;
const EDIT_ICON = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
const SPINNER_ICON = `<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`;
const SUCCESS_ICON = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
const ERROR_ICON = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;

/**
 * @typedef {'idle'|'listening'|'processing'|'speaking'} VoiceStatus
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'agent'|'system'|'form-input'|'summary'|'answer-card'} type
 * @property {string} content
 * @property {number} timestamp
 * @property {boolean} [isTranscribing]
 * @property {boolean} [isSpeaking]
 * @property {string} [fieldName] - For form-input and answer-card types
 * @property {'string'|'email'|'phone'|'number'|'enum'|'text'} [fieldType] - For form-input type
 * @property {string[]} [options] - For enum field type
 * @property {any} [fieldValue] - Current value of form input or answer-card
 * @property {boolean} [isConfirmed] - Whether value is confirmed
 * @property {boolean} [isPending] - Awaiting voice confirmation
 * @property {any} [pendingValue] - Value awaiting confirmation
 * @property {string} [formName] - For summary type
 * @property {Record<string, {label: string, value: unknown}>} [answers] - For summary type
 * @property {'idle'|'submitting'|'success'|'error'} [submissionState] - For summary type
 * @property {string} [errorMessage] - For summary type when error
 * @property {string} [fieldLabel] - For answer-card type
 */

/**
 * @typedef {Object} ChatPanelState
 * @property {boolean} isExpanded
 * @property {ChatMessage[]} messages
 * @property {VoiceStatus} voiceStatus
 */

/**
 * Create the chat panel component
 * @param {ShadowRoot} shadow - Shadow root to inject styles
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onClose - Called when panel is closed
 * @param {Function} [callbacks.onMicClick] - Called when mic button is clicked
 * @param {Function} [callbacks.onKeyboardInput] - Called when user types in form input
 * @param {Function} [callbacks.onConfirmValue] - Called when user confirms voice-extracted value
 * @param {Function} [callbacks.onRejectValue] - Called when user rejects voice-extracted value
 * @param {Function} [callbacks.onSummaryApprove] - Called when user approves form submission
 * @param {Function} [callbacks.onSummaryEdit] - Called when user wants to edit a field from summary
 * @param {Object} [options] - Configuration options
 * @param {string} [options.accentColor] - Custom accent color
 * @param {'light'|'dark'} [options.theme] - Theme
 * @returns {Object} Chat panel controller
 */
export function createChatPanel(shadow, callbacks, options = {}) {
  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = CHAT_PANEL_STYLES;
  shadow.appendChild(styleSheet);

  // Apply customization
  const host = shadow.host;
  if (options.accentColor) {
    applyAccentColor(host, options.accentColor);
  }
  if (options.theme) {
    applyTheme(host, options.theme);
  }

  /** @type {ChatPanelState} */
  const state = {
    isExpanded: false,
    messages: [],
    voiceStatus: 'idle',
  };

  // Create main container
  const element = document.createElement('div');
  element.className = 'vakkya-chat-panel collapsed';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Voice conversation');

  // References to dynamic elements
  let messagesContainer = null;
  let micButton = null;
  let waveformCanvas = null;
  let waveformRenderer = null;
  let statusText = null;
  let stickyInputContainer = null;

  // Sticky input state
  let stickyInputState = {
    visible: false,
    field: null,
    fieldIndex: 0,
    totalFields: 0,
    value: '',
    pendingConfirmation: null,
    validationError: null,
    isSpeaking: false,
  };

  // Build UI structure
  buildUI();

  /**
   * Build the chat panel UI
   */
  function buildUI() {
    element.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'vakkya-chat-header';

    const title = document.createElement('h2');
    title.className = 'vakkya-chat-title';
    title.textContent = 'Voice Assistant';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'vakkya-chat-close';
    closeBtn.setAttribute('aria-label', 'Close conversation');
    closeBtn.setAttribute('type', 'button');
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.addEventListener('click', () => {
      collapse();
      if (callbacks.onClose) callbacks.onClose();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Messages container
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'vakkya-chat-messages';
    messagesContainer.setAttribute('role', 'log');
    messagesContainer.setAttribute('aria-live', 'polite');

    // Render initial messages or empty state
    renderMessages();

    // Sticky input container (Requirements 2.1, 6.4)
    stickyInputContainer = document.createElement('div');
    stickyInputContainer.className = 'vakkya-sticky-input hidden';
    stickyInputContainer.setAttribute('role', 'form');
    stickyInputContainer.setAttribute('aria-label', 'Current form field');
    buildStickyInputContent();

    // Voice input bar
    const voiceBar = document.createElement('div');
    voiceBar.className = 'vakkya-voice-bar';

    // Status text (Requirements 7.1, 7.2, 7.3, 7.4)
    statusText = document.createElement('div');
    statusText.className = 'vakkya-status-text';
    statusText.textContent = '';
    statusText.style.display = 'none';

    // Mini waveform (Requirement 7.1)
    const waveformContainer = document.createElement('div');
    waveformContainer.className = 'vakkya-waveform-mini';
    waveformCanvas = document.createElement('canvas');
    waveformCanvas.width = 200;
    waveformCanvas.height = 40;
    waveformCanvas.style.width = '100%';
    waveformCanvas.style.height = '100%';
    waveformContainer.appendChild(waveformCanvas);

    // Initialize waveform renderer
    waveformRenderer = createWaveformRenderer(waveformCanvas);
    waveformRenderer.start();

    // Mic button
    micButton = document.createElement('button');
    micButton.className = 'vakkya-mic-button';
    micButton.setAttribute('aria-label', 'Toggle microphone');
    micButton.setAttribute('type', 'button');
    micButton.innerHTML = MIC_ICON;
    micButton.addEventListener('click', () => {
      if (callbacks.onMicClick) callbacks.onMicClick();
    });

    voiceBar.appendChild(waveformContainer);
    voiceBar.appendChild(micButton);

    // Assemble
    element.appendChild(header);
    element.appendChild(statusText);
    element.appendChild(messagesContainer);
    element.appendChild(stickyInputContainer);
    element.appendChild(voiceBar);
  }

  /**
   * Render messages in the container
   */
  function renderMessages() {
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    if (state.messages.length === 0) {
      // Empty state
      const empty = document.createElement('div');
      empty.className = 'vakkya-chat-empty';
      empty.innerHTML = `
        <svg class="vakkya-chat-empty-icon" viewBox="0 0 24 24">
          ${CHAT_ICON.replace('<svg viewBox="0 0 24 24">', '').replace('</svg>', '')}
        </svg>
        <p class="vakkya-chat-empty-text">Start speaking to begin the conversation</p>
      `;
      messagesContainer.appendChild(empty);
      return;
    }

    state.messages.forEach((msg) => {
      const bubble = createMessageBubble(msg);
      messagesContainer.appendChild(bubble);
    });

    // Auto-scroll to bottom (Requirement 3.4)
    scrollToBottom();
  }

  /**
   * Create a message bubble element
   * @param {ChatMessage} message
   * @returns {HTMLElement}
   */
  function createMessageBubble(message) {
    // Handle form input messages differently (Requirement 4.1)
    // Note: form-input messages are now only rendered in sticky container
    // Completed fields are shown as answer-cards (Requirement 1.1, 1.4)
    if (message.type === 'form-input') {
      return createInlineFormInput(message);
    }

    // Handle answer card messages for completed fields (Requirement 1.3, 3.1, 3.2, 3.4)
    if (message.type === 'answer-card') {
      return createAnswerCard(message);
    }

    // Handle summary card messages (Requirement 4.5, 8.1)
    if (message.type === 'summary') {
      return createSummaryCard(message);
    }

    const bubble = document.createElement('div');
    bubble.className = `vakkya-message vakkya-message-${message.type}`;
    bubble.setAttribute('data-message-id', message.id);

    if (message.isTranscribing) {
      bubble.classList.add('vakkya-message-transcribing');
    }

    const content = document.createElement('span');
    content.textContent = message.content;
    bubble.appendChild(content);

    // Speaking indicator for agent messages
    if (message.type === 'agent' && message.isSpeaking) {
      const indicator = document.createElement('span');
      indicator.className = 'vakkya-speaking-indicator';
      indicator.innerHTML = `
        <span class="vakkya-speaking-dot"></span>
        <span class="vakkya-speaking-dot"></span>
        <span class="vakkya-speaking-dot"></span>
      `;
      bubble.appendChild(indicator);
    }

    return bubble;
  }

  /**
   * Create summary card component
   * Requirement 4.5: Display all collected answers with edit and approve buttons
   * Requirement 8.1: Present summary when all fields collected
   * @param {ChatMessage} message
   * @returns {HTMLElement}
   */
  function createSummaryCard(message) {
    const card = document.createElement('div');
    card.className = 'vakkya-summary-card';
    card.setAttribute('data-message-id', message.id);

    // Add submission state class
    if (message.submissionState && message.submissionState !== 'idle') {
      card.classList.add(`vakkya-summary-${message.submissionState}`);
    }

    // Header
    const header = document.createElement('div');
    header.className = 'vakkya-summary-header';
    
    const title = document.createElement('h3');
    title.className = 'vakkya-summary-title';
    title.textContent = message.formName || 'Summary';
    header.appendChild(title);

    // Status indicator for submission states
    if (message.submissionState === 'submitting') {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'vakkya-summary-status vakkya-summary-status-submitting';
      statusBadge.innerHTML = `${SPINNER_ICON}<span>Submitting...</span>`;
      header.appendChild(statusBadge);
    } else if (message.submissionState === 'success') {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'vakkya-summary-status vakkya-summary-status-success';
      statusBadge.innerHTML = `${SUCCESS_ICON}<span>Submitted</span>`;
      header.appendChild(statusBadge);
    } else if (message.submissionState === 'error') {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'vakkya-summary-status vakkya-summary-status-error';
      statusBadge.innerHTML = `${ERROR_ICON}<span>Failed</span>`;
      header.appendChild(statusBadge);
    }

    card.appendChild(header);

    // Answers list
    const answersList = document.createElement('div');
    answersList.className = 'vakkya-summary-answers';

    if (message.answers) {
      for (const [fieldName, fieldData] of Object.entries(message.answers)) {
        const answerRow = document.createElement('div');
        answerRow.className = 'vakkya-summary-answer';

        const labelEl = document.createElement('span');
        labelEl.className = 'vakkya-summary-label';
        labelEl.textContent = fieldData.label;

        const valueEl = document.createElement('span');
        valueEl.className = 'vakkya-summary-value';
        valueEl.textContent = formatAnswerValue(fieldData.value);

        answerRow.appendChild(labelEl);
        answerRow.appendChild(valueEl);

        // Edit button (only show if not submitting/success)
        if (message.submissionState !== 'submitting' && message.submissionState !== 'success') {
          const editBtn = document.createElement('button');
          editBtn.className = 'vakkya-summary-edit-btn';
          editBtn.type = 'button';
          editBtn.setAttribute('aria-label', `Edit ${fieldData.label}`);
          editBtn.innerHTML = EDIT_ICON;
          editBtn.addEventListener('click', () => {
            if (callbacks.onSummaryEdit) {
              callbacks.onSummaryEdit(fieldName);
            }
          });
          answerRow.appendChild(editBtn);
        }

        answersList.appendChild(answerRow);
      }
    }

    card.appendChild(answersList);

    // Error message (if error state)
    if (message.submissionState === 'error' && message.errorMessage) {
      const errorEl = document.createElement('div');
      errorEl.className = 'vakkya-summary-error';
      errorEl.textContent = message.errorMessage;
      card.appendChild(errorEl);
    }

    // Actions (only show if not success)
    if (message.submissionState !== 'success') {
      const actions = document.createElement('div');
      actions.className = 'vakkya-summary-actions';

      const approveBtn = document.createElement('button');
      approveBtn.className = 'vakkya-summary-approve-btn';
      approveBtn.type = 'button';
      
      if (message.submissionState === 'submitting') {
        approveBtn.disabled = true;
        approveBtn.innerHTML = `${SPINNER_ICON}<span>Submitting...</span>`;
      } else if (message.submissionState === 'error') {
        approveBtn.innerHTML = `${CHECK_ICON}<span>Retry</span>`;
      } else {
        approveBtn.innerHTML = `${CHECK_ICON}<span>Approve & Submit</span>`;
      }

      approveBtn.addEventListener('click', () => {
        if (!approveBtn.disabled && callbacks.onSummaryApprove) {
          callbacks.onSummaryApprove();
        }
      });

      actions.appendChild(approveBtn);
      card.appendChild(actions);
    }

    // Success message
    if (message.submissionState === 'success') {
      const successEl = document.createElement('div');
      successEl.className = 'vakkya-summary-success-message';
      successEl.textContent = 'Your information has been submitted successfully!';
      card.appendChild(successEl);
    }

    return card;
  }

  /**
   * Format answer value for display
   * @param {unknown} value
   * @returns {string}
   */
  function formatAnswerValue(value) {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  /**
   * Create answer card component for completed fields
   * Requirements 1.3, 3.1, 3.2, 3.4: Compact display with no edit controls
   * @param {ChatMessage} message
   * @returns {HTMLElement}
   */
  function createAnswerCard(message) {
    const card = document.createElement('div');
    card.className = 'vakkya-answer-card';
    card.setAttribute('data-message-id', message.id);
    card.setAttribute('data-field-name', message.fieldName || '');

    // Checkmark icon
    const checkIcon = document.createElement('span');
    checkIcon.className = 'vakkya-answer-card-check';
    checkIcon.innerHTML = CHECK_ICON;

    // Label and value
    const content = document.createElement('span');
    content.className = 'vakkya-answer-card-content';
    
    const label = document.createElement('span');
    label.className = 'vakkya-answer-card-label';
    label.textContent = message.fieldLabel || message.content || message.fieldName;

    const value = document.createElement('span');
    value.className = 'vakkya-answer-card-value';
    value.textContent = formatAnswerValue(message.fieldValue);

    content.appendChild(label);
    content.appendChild(document.createTextNode(': '));
    content.appendChild(value);

    card.appendChild(checkIcon);
    card.appendChild(content);

    return card;
  }

  /**
   * Create inline form input component
   * Requirement 4.1: Render form inputs within chat flow
   * @param {ChatMessage} message
   * @returns {HTMLElement}
   */
  function createInlineFormInput(message) {
    const container = document.createElement('div');
    container.className = 'vakkya-inline-form';
    container.setAttribute('data-message-id', message.id);
    container.setAttribute('data-field-name', message.fieldName);

    // Add label for the field
    if (message.content) {
      const label = document.createElement('label');
      label.className = 'vakkya-inline-label';
      label.textContent = message.content;
      container.appendChild(label);
    }

    // Input based on field type
    let input;
    
    if (message.fieldType === 'enum' && message.options) {
      // Select dropdown for enum types
      input = document.createElement('select');
      input.className = 'vakkya-inline-select';
      
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select an option...';
      placeholder.disabled = true;
      placeholder.selected = !message.fieldValue;
      input.appendChild(placeholder);
      
      message.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (message.fieldValue === opt) {
          option.selected = true;
        }
        input.appendChild(option);
      });
    } else if (message.fieldType === 'text') {
      // Textarea for text type
      input = document.createElement('textarea');
      input.className = 'vakkya-inline-textarea';
      input.placeholder = 'Type your answer...';
      input.rows = 3;
      input.value = message.fieldValue || '';
    } else {
      // Standard input for string, email, phone, number
      input = document.createElement('input');
      input.className = 'vakkya-inline-input';
      input.value = message.fieldValue || '';
      
      switch (message.fieldType) {
        case 'email':
          input.type = 'email';
          input.placeholder = 'your@email.com';
          break;
        case 'phone':
          input.type = 'tel';
          input.placeholder = '(555) 123-4567';
          break;
        case 'number':
          input.type = 'number';
          input.placeholder = 'Enter a number';
          break;
        default:
          input.type = 'text';
          input.placeholder = 'Type your answer...';
      }
    }

    input.name = message.fieldName;
    input.disabled = message.isConfirmed;

    // Show pending value in input field (Requirement 4.3)
    // When voice extracts a value, display it in the input for visual confirmation
    if (message.isPending && message.pendingValue !== undefined) {
      input.value = String(message.pendingValue);
      input.classList.add('vakkya-inline-pending-input');
    }

    // Handle keyboard input submission (Requirement 4.2)
    // User must explicitly press Enter to submit - no auto-submit on typing
    const handleInputSubmit = () => {
      const value = input.value.trim();
      if (!value) return;
      
      // Update local state first
      const msgIndex = state.messages.findIndex(m => m.id === message.id);
      if (msgIndex !== -1) {
        state.messages[msgIndex].fieldValue = value;
        // Clear any pending confirmation since keyboard input is direct
        state.messages[msgIndex].isPending = false;
        state.messages[msgIndex].pendingValue = undefined;
      }
      
      // Send to agent via data channel callback
      if (callbacks.onKeyboardInput) {
        callbacks.onKeyboardInput(message.fieldName, value);
      }
    };

    // Handle Enter key for explicit submission (except for textarea)
    if (input.tagName !== 'TEXTAREA') {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleInputSubmit();
        }
      });
    }
    
    // Handle Ctrl+Enter for textarea submission
    if (input.tagName === 'TEXTAREA') {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleInputSubmit();
        }
      });
    }

    container.appendChild(input);

    // Pending confirmation UI (Requirement 4.3)
    if (message.isPending && message.pendingValue !== undefined) {
      const pendingUI = createPendingConfirmationUI(message);
      container.appendChild(pendingUI);
    }

    // Confirmed state indicator
    if (message.isConfirmed) {
      const confirmedBadge = document.createElement('div');
      confirmedBadge.className = 'vakkya-inline-confirmed';
      confirmedBadge.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        <span>Confirmed</span>
      `;
      container.appendChild(confirmedBadge);
    }

    return container;
  }

  /**
   * Create pending confirmation UI for voice-extracted values
   * Requirement 4.3: Show extracted value with confirm/reject
   * @param {ChatMessage} message
   * @returns {HTMLElement}
   */
  function createPendingConfirmationUI(message) {
    const pending = document.createElement('div');
    pending.className = 'vakkya-inline-pending';
    
    const label = document.createElement('div');
    label.className = 'vakkya-inline-pending-label';
    label.textContent = 'I heard:';
    
    const value = document.createElement('div');
    value.className = 'vakkya-inline-pending-value';
    value.textContent = String(message.pendingValue);
    
    const actions = document.createElement('div');
    actions.className = 'vakkya-inline-pending-actions';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'vakkya-inline-btn vakkya-inline-btn-confirm';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', () => {
      if (callbacks.onConfirmValue) {
        callbacks.onConfirmValue(message.fieldName);
      }
    });
    
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'vakkya-inline-btn vakkya-inline-btn-reject';
    rejectBtn.textContent = 'Try again';
    rejectBtn.type = 'button';
    rejectBtn.addEventListener('click', () => {
      if (callbacks.onRejectValue) {
        callbacks.onRejectValue(message.fieldName);
      }
    });
    
    actions.appendChild(confirmBtn);
    actions.appendChild(rejectBtn);
    
    pending.appendChild(label);
    pending.appendChild(value);
    pending.appendChild(actions);
    
    return pending;
  }

  /**
   * Scroll messages to bottom
   * Requirement 3.4: Auto-scroll on new messages
   */
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Build sticky input container content
   * Requirements 2.1, 6.4: Progress indicator, field label, input, pending confirmation
   */
  function buildStickyInputContent() {
    if (!stickyInputContainer) return;
    stickyInputContainer.innerHTML = '';

    if (!stickyInputState.visible || !stickyInputState.field) {
      return;
    }

    const field = stickyInputState.field;

    // Progress indicator (Requirement 6.4)
    const progress = document.createElement('div');
    progress.className = 'vakkya-sticky-progress';
    
    const progressText = document.createElement('span');
    progressText.className = 'vakkya-sticky-progress-text';
    progressText.textContent = `Question ${stickyInputState.fieldIndex + 1} of ${stickyInputState.totalFields}`;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'vakkya-sticky-progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'vakkya-sticky-progress-fill';
    const progressPercent = ((stickyInputState.fieldIndex + 1) / stickyInputState.totalFields) * 100;
    progressFill.style.width = `${progressPercent}%`;
    
    progressBar.appendChild(progressFill);
    progress.appendChild(progressText);
    progress.appendChild(progressBar);
    stickyInputContainer.appendChild(progress);

    // Speaking indicator (Requirement 6.5)
    if (stickyInputState.isSpeaking) {
      const speaking = document.createElement('div');
      speaking.className = 'vakkya-sticky-speaking';
      speaking.innerHTML = `
        <div class="vakkya-sticky-speaking-dots">
          <span></span><span></span><span></span>
        </div>
        <span>Agent is speaking...</span>
      `;
      stickyInputContainer.appendChild(speaking);
    }

    // Field label
    const label = document.createElement('label');
    label.className = 'vakkya-sticky-label';
    label.textContent = field.label || field.name;
    stickyInputContainer.appendChild(label);

    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'vakkya-sticky-input-wrapper';

    // Check if there's a pending confirmation (Requirement 6.2)
    if (stickyInputState.pendingConfirmation) {
      const pending = createStickyPendingUI(stickyInputState.pendingConfirmation);
      inputWrapper.appendChild(pending);
    } else {
      // Create input row with input and submit button
      const inputRow = document.createElement('div');
      inputRow.className = 'vakkya-sticky-input-row';
      
      // Create input based on field type
      const input = createStickyFieldInput(field);
      inputRow.appendChild(input);
      
      // Add submit button for mobile users (no Enter key)
      const submitBtn = document.createElement('button');
      submitBtn.className = 'vakkya-sticky-submit-btn';
      submitBtn.type = 'button';
      submitBtn.setAttribute('aria-label', 'Submit answer');
      submitBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
      submitBtn.addEventListener('click', () => {
        const value = input.value?.trim();
        if (!value) return;
        
        stickyInputState.value = value;
        stickyInputState.validationError = null;
        
        if (callbacks.onKeyboardInput) {
          callbacks.onKeyboardInput(field.name, value);
        }
      });
      inputRow.appendChild(submitBtn);
      
      inputWrapper.appendChild(inputRow);
    }

    stickyInputContainer.appendChild(inputWrapper);

    // Validation error (Requirement 6.3)
    if (stickyInputState.validationError) {
      const error = document.createElement('div');
      error.className = 'vakkya-sticky-error';
      error.innerHTML = `${ERROR_ICON}<span>${stickyInputState.validationError}</span>`;
      stickyInputContainer.appendChild(error);
    }
  }

  /**
   * Create input element for sticky container based on field type
   * @param {Object} field - Form field definition
   * @returns {HTMLElement}
   */
  function createStickyFieldInput(field) {
    let input;

    if (field.type === 'enum' && field.options) {
      input = document.createElement('select');
      input.className = 'vakkya-inline-select';
      
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select an option...';
      placeholder.disabled = true;
      placeholder.selected = !stickyInputState.value;
      input.appendChild(placeholder);
      
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (stickyInputState.value === opt) {
          option.selected = true;
        }
        input.appendChild(option);
      });
    } else if (field.type === 'text') {
      input = document.createElement('textarea');
      input.className = 'vakkya-inline-textarea';
      input.placeholder = 'Type your answer...';
      input.rows = 3;
      input.value = stickyInputState.value || '';
    } else {
      input = document.createElement('input');
      input.className = 'vakkya-inline-input';
      input.value = stickyInputState.value || '';
      
      switch (field.type) {
        case 'email':
          input.type = 'email';
          input.placeholder = 'your@email.com';
          break;
        case 'phone':
          input.type = 'tel';
          input.placeholder = '(555) 123-4567';
          break;
        case 'number':
          input.type = 'number';
          input.placeholder = 'Enter a number';
          break;
        default:
          input.type = 'text';
          input.placeholder = 'Type your answer...';
      }
    }

    input.name = field.name;
    input.id = `sticky-input-${field.name}`;

    // Track local value changes without auto-submitting
    // User must explicitly press Enter to submit (Requirement 4.2)
    input.addEventListener('input', () => {
      stickyInputState.value = input.value;
      stickyInputState.validationError = null;
    });

    // Handle explicit submission via Enter key (except textarea)
    const handleSubmit = () => {
      const value = input.value.trim();
      if (!value) return;
      
      stickyInputState.value = value;
      stickyInputState.validationError = null;
      
      if (callbacks.onKeyboardInput) {
        callbacks.onKeyboardInput(field.name, value);
      }
    };

    if (input.tagName !== 'TEXTAREA') {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        }
      });
    } else {
      // Ctrl+Enter for textarea submission
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSubmit();
        }
      });
    }

    return input;
  }

  /**
   * Create pending confirmation UI for sticky container
   * Requirement 6.2: Show extracted value with confirm/reject
   * @param {Object} pending - Pending confirmation data
   * @returns {HTMLElement}
   */
  function createStickyPendingUI(pending) {
    const container = document.createElement('div');
    container.className = 'vakkya-sticky-pending';

    const header = document.createElement('div');
    header.className = 'vakkya-sticky-pending-header';
    header.textContent = 'I heard:';

    const value = document.createElement('div');
    value.className = 'vakkya-sticky-pending-value';
    value.textContent = String(pending.extractedValue);

    const actions = document.createElement('div');
    actions.className = 'vakkya-sticky-pending-actions';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'vakkya-inline-btn vakkya-inline-btn-confirm';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', () => {
      if (callbacks.onConfirmValue) {
        callbacks.onConfirmValue(pending.fieldName);
      }
    });

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'vakkya-inline-btn vakkya-inline-btn-reject';
    rejectBtn.textContent = 'Try again';
    rejectBtn.type = 'button';
    rejectBtn.addEventListener('click', () => {
      if (callbacks.onRejectValue) {
        callbacks.onRejectValue(pending.fieldName);
      }
    });

    actions.appendChild(confirmBtn);
    actions.appendChild(rejectBtn);

    container.appendChild(header);
    container.appendChild(value);
    container.appendChild(actions);

    return container;
  }

  /**
   * Show sticky input container
   * Requirement 2.1: Position input in sticky container above voice bar
   * @param {Object} field - Form field to display
   * @param {number} fieldIndex - Current field index (0-based)
   * @param {number} totalFields - Total number of fields
   * @param {unknown} [value] - Current field value
   */
  function showStickyInput(field, fieldIndex, totalFields, value = '') {
    stickyInputState = {
      visible: true,
      field,
      fieldIndex,
      totalFields,
      value: value || '',
      pendingConfirmation: null,
      validationError: null,
      isSpeaking: false,
    };

    if (stickyInputContainer) {
      stickyInputContainer.classList.remove('hidden');
      buildStickyInputContent();
      
      // Focus the input after rendering
      setTimeout(() => {
        const input = stickyInputContainer.querySelector('input, select, textarea');
        if (input) input.focus();
      }, 100);
    }
  }

  /**
   * Hide sticky input container
   * Requirements 2.4, 2.5: Hide when in summary mode or no form active
   */
  function hideStickyInput() {
    stickyInputState = {
      visible: false,
      field: null,
      fieldIndex: 0,
      totalFields: 0,
      value: '',
      pendingConfirmation: null,
      validationError: null,
      isSpeaking: false,
    };

    if (stickyInputContainer) {
      stickyInputContainer.classList.add('hidden');
      stickyInputContainer.innerHTML = '';
    }
  }

  /**
   * Update sticky input with pending confirmation
   * Requirement 6.2: Show extracted value with confirm/reject options
   * @param {string} fieldName
   * @param {unknown} extractedValue
   */
  function setStickyInputPending(fieldName, extractedValue) {
    if (stickyInputState.field && stickyInputState.field.name === fieldName) {
      stickyInputState.pendingConfirmation = {
        fieldName,
        extractedValue,
      };
      buildStickyInputContent();
    }
  }

  /**
   * Clear pending confirmation from sticky input
   * @param {string} fieldName
   */
  function clearStickyInputPending(fieldName) {
    if (stickyInputState.pendingConfirmation?.fieldName === fieldName) {
      stickyInputState.pendingConfirmation = null;
      stickyInputState.value = '';
      buildStickyInputContent();
    }
  }

  /**
   * Set validation error on sticky input
   * Requirement 6.3: Display error message below input
   * @param {string} errorMessage
   */
  function setStickyInputError(errorMessage) {
    stickyInputState.validationError = errorMessage;
    buildStickyInputContent();
  }

  /**
   * Clear validation error from sticky input
   */
  function clearStickyInputError() {
    stickyInputState.validationError = null;
    buildStickyInputContent();
  }

  /**
   * Set speaking indicator on sticky input
   * Requirement 6.5: Show subtle speaking indicator
   * @param {boolean} isSpeaking
   */
  function setStickyInputSpeaking(isSpeaking) {
    stickyInputState.isSpeaking = isSpeaking;
    buildStickyInputContent();
  }

  /**
   * Update sticky input value
   * @param {unknown} value
   */
  function updateStickyInputValue(value) {
    stickyInputState.value = value || '';
    const input = stickyInputContainer?.querySelector('input, select, textarea');
    if (input && input.value !== stickyInputState.value) {
      input.value = stickyInputState.value;
    }
  }

  /**
   * Check if sticky input is visible
   * @returns {boolean}
   */
  function isStickyInputVisible() {
    return stickyInputState.visible;
  }

  /**
   * Expand the chat panel with animation
   * Requirement 3.1, 3.5: Smooth transition from button to panel
   */
  function expand() {
    if (state.isExpanded) return;

    state.isExpanded = true;
    element.classList.remove('collapsed');
    
    // Trigger reflow for animation
    void element.offsetHeight;
    
    element.classList.add('expanded');
  }

  /**
   * Collapse the chat panel with animation
   * Requirement 3.5: Smooth collapse back to button
   */
  function collapse() {
    if (!state.isExpanded) return;

    state.isExpanded = false;
    element.classList.remove('expanded');
    element.classList.add('collapsed');
  }

  /**
   * Add a message to the chat
   * @param {ChatMessage} message
   */
  function addMessage(message) {
    state.messages.push(message);
    
    if (messagesContainer) {
      // Remove empty state if present
      const empty = messagesContainer.querySelector('.vakkya-chat-empty');
      if (empty) empty.remove();

      const bubble = createMessageBubble(message);
      messagesContainer.appendChild(bubble);
      scrollToBottom();
    }
  }

  /**
   * Update an existing message
   * @param {string} messageId
   * @param {Partial<ChatMessage>} updates
   */
  function updateMessage(messageId, updates) {
    const index = state.messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    state.messages[index] = { ...state.messages[index], ...updates };

    // Update DOM
    const existingElement = messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
    if (existingElement) {
      const msg = state.messages[index];
      
      // For form-input messages, re-render completely
      if (msg.type === 'form-input') {
        const newBubble = createMessageBubble(msg);
        existingElement.replaceWith(newBubble);
        scrollToBottom();
        return;
      }

      // For summary messages, re-render completely
      if (msg.type === 'summary') {
        const newCard = createMessageBubble(msg);
        existingElement.replaceWith(newCard);
        scrollToBottom();
        return;
      }

      // For regular messages, update in place
      const content = existingElement.querySelector('span:not(.vakkya-speaking-indicator)');
      if (content) content.textContent = msg.content;

      // Update transcribing state
      existingElement.classList.toggle('vakkya-message-transcribing', !!msg.isTranscribing);

      // Update speaking indicator
      const existingIndicator = existingElement.querySelector('.vakkya-speaking-indicator');
      if (msg.isSpeaking && !existingIndicator) {
        const indicator = document.createElement('span');
        indicator.className = 'vakkya-speaking-indicator';
        indicator.innerHTML = `
          <span class="vakkya-speaking-dot"></span>
          <span class="vakkya-speaking-dot"></span>
          <span class="vakkya-speaking-dot"></span>
        `;
        existingElement.appendChild(indicator);
      } else if (!msg.isSpeaking && existingIndicator) {
        existingIndicator.remove();
      }

      scrollToBottom();
    }
  }

  /**
   * Set voice status
   * Requirements 7.1, 7.2, 7.3, 7.4: Visual feedback for voice states
   * @param {VoiceStatus} status
   */
  function setVoiceStatus(status) {
    state.voiceStatus = status;

    // Status messages for each state
    const statusMessages = {
      idle: '',
      listening: 'Listening...',
      processing: 'Processing...',
      speaking: 'Speaking...',
    };

    // Aria labels for accessibility
    const ariaLabels = {
      idle: 'Start voice conversation',
      listening: 'Listening to your voice',
      processing: 'Processing your request',
      speaking: 'Agent is speaking',
    };

    if (micButton) {
      // Remove all status classes
      micButton.classList.remove('listening', 'processing', 'speaking', 'error');
      
      // Add current status class
      if (status !== 'idle') {
        micButton.classList.add(status);
      }

      // Update aria-label for accessibility (Requirement 7.4)
      micButton.setAttribute('aria-label', ariaLabels[status] || 'Toggle microphone');
    }

    // Update status text
    if (statusText) {
      const message = statusMessages[status] || '';
      if (message) {
        statusText.textContent = message;
        statusText.style.display = 'block';
      } else {
        statusText.style.display = 'none';
      }
    }

    // Update waveform based on status
    if (status === 'idle' || status === 'processing') {
      showIdleWaveform();
    }
  }

  /**
   * Get the waveform canvas for external rendering
   * @returns {HTMLCanvasElement|null}
   */
  function getWaveformCanvas() {
    return waveformCanvas;
  }

  /**
   * Update waveform visualization data
   * Requirement 7.1: Show animated waveform when user is speaking
   * @param {Uint8Array} data - Frequency data from audio analyser
   */
  function updateWaveform(data) {
    if (waveformRenderer) {
      waveformRenderer.setData(data);
    }
  }

  /**
   * Show idle waveform animation
   * Displays subtle animation when not actively speaking
   */
  function showIdleWaveform() {
    if (waveformRenderer) {
      const idleData = generateIdleData();
      waveformRenderer.setData(idleData);
    }
  }

  /**
   * Show error status
   * Requirement 7.4: Display clear status indicator for errors
   * @param {string} message - Error message to display
   */
  function showError(message) {
    state.voiceStatus = 'idle';

    if (micButton) {
      micButton.classList.remove('listening', 'processing', 'speaking');
      micButton.classList.add('error');
      micButton.setAttribute('aria-label', `Error: ${message || 'Microphone error'}`);
    }

    if (statusText) {
      statusText.textContent = message || 'Error occurred';
      statusText.style.display = 'block';
      statusText.style.color = '#EF4444';
    }
  }

  /**
   * Clear error status
   */
  function clearError() {
    if (micButton) {
      micButton.classList.remove('error');
    }

    if (statusText) {
      statusText.style.color = '';
      setVoiceStatus('idle');
    }
  }

  /**
   * Destroy the chat panel and clean up resources
   */
  function destroy() {
    if (waveformRenderer) {
      waveformRenderer.destroy();
      waveformRenderer = null;
    }
  }

  /**
   * Clear all messages
   */
  function clearMessages() {
    state.messages = [];
    renderMessages();
  }

  /**
   * Add a form input message to the chat
   * Requirement 4.1: Render inline form inputs in chat flow
   * @param {string} fieldName
   * @param {'string'|'email'|'phone'|'number'|'enum'|'text'} fieldType
   * @param {string} label
   * @param {string[]} [options] - For enum type
   * @returns {string} Message ID
   */
  function addFormInput(fieldName, fieldType, label, options) {
    console.log('[Vakkya] addFormInput called:', { fieldName, fieldType, label, options });
    const message = {
      id: generateMessageId(),
      type: 'form-input',
      content: label,
      timestamp: Date.now(),
      fieldName,
      fieldType,
      options,
      fieldValue: undefined,
      isConfirmed: false,
      isPending: false,
      pendingValue: undefined,
    };

    console.log('[Vakkya] Adding form-input message:', message);
    addMessage(message);
    console.log('[Vakkya] Form input added, total messages:', state.messages.length);
    return message.id;
  }

  /**
   * Update form input with pending value for confirmation
   * Requirement 4.3: Display extracted value with pending state
   * @param {string} fieldName
   * @param {any} value
   */
  function setFormInputPending(fieldName, value) {
    const message = state.messages.find(
      m => m.type === 'form-input' && m.fieldName === fieldName
    );
    
    if (message) {
      updateMessage(message.id, {
        isPending: true,
        pendingValue: value,
      });
    }
  }

  /**
   * Confirm form input value
   * Requirement 4.4: Update input state on confirm
   * @param {string} fieldName
   */
  function confirmFormInput(fieldName) {
    const message = state.messages.find(
      m => m.type === 'form-input' && m.fieldName === fieldName
    );
    
    if (message && message.isPending) {
      updateMessage(message.id, {
        fieldValue: message.pendingValue,
        isConfirmed: true,
        isPending: false,
        pendingValue: undefined,
      });
    }
  }

  /**
   * Reject form input value and clear pending state
   * Requirement 4.4: Clear and re-ask on reject
   * @param {string} fieldName
   */
  function rejectFormInput(fieldName) {
    const message = state.messages.find(
      m => m.type === 'form-input' && m.fieldName === fieldName
    );
    
    if (message) {
      // Clear pending state and reset field value for re-entry
      updateMessage(message.id, {
        isPending: false,
        pendingValue: undefined,
        fieldValue: undefined, // Clear the value so user can re-enter
        isConfirmed: false,
      });
    }
  }

  /**
   * Update form input value from keyboard
   * Requirement 4.2: Handle keyboard input
   * @param {string} fieldName
   * @param {any} value
   */
  function updateFormInputValue(fieldName, value) {
    const message = state.messages.find(
      m => m.type === 'form-input' && m.fieldName === fieldName
    );
    
    if (message) {
      updateMessage(message.id, {
        fieldValue: value,
      });
    }
  }

  /**
   * Get current state
   * @returns {ChatPanelState}
   */
  function getState() {
    return { ...state, messages: [...state.messages] };
  }

  /**
   * Check if panel is expanded
   * @returns {boolean}
   */
  function isExpanded() {
    return state.isExpanded;
  }

  /**
   * Add an answer card to the chat for a completed field
   * Requirements 1.3, 3.1, 3.2, 3.4: Compact display with no edit controls
   * @param {string} fieldName - Field name
   * @param {string} fieldLabel - Display label for the field
   * @param {unknown} value - Confirmed value
   * @returns {string} Message ID
   */
  function addAnswerCard(fieldName, fieldLabel, value) {
    const message = {
      id: generateMessageId(),
      type: 'answer-card',
      content: fieldLabel,
      timestamp: Date.now(),
      fieldName,
      fieldLabel,
      fieldValue: value,
    };

    addMessage(message);
    return message.id;
  }

  /**
   * Add a summary card to the chat
   * Requirement 4.5: Display summary card within chat flow
   * Requirement 8.1: Present summary when all fields collected
   * @param {string} formName - Name of the form
   * @param {Record<string, {label: string, value: unknown}>} answers - Collected answers
   * @returns {string} Message ID
   */
  function addSummaryCard(formName, answers) {
    const message = {
      id: generateMessageId(),
      type: 'summary',
      content: '',
      timestamp: Date.now(),
      formName,
      answers,
      submissionState: 'idle',
      errorMessage: null,
    };

    addMessage(message);
    return message.id;
  }

  /**
   * Set summary card to submitting state
   * Requirement 8.2: Show submitting state
   * @param {string} messageId
   */
  function setSummarySubmitting(messageId) {
    updateMessage(messageId, { submissionState: 'submitting' });
  }

  /**
   * Set summary card to success state
   * Requirement 8.3: Show success state
   * @param {string} messageId
   */
  function setSummarySuccess(messageId) {
    updateMessage(messageId, { submissionState: 'success' });
  }

  /**
   * Set summary card to error state
   * Requirement 8.3: Show error state with retry option
   * @param {string} messageId
   * @param {string} errorMessage
   */
  function setSummaryError(messageId, errorMessage) {
    updateMessage(messageId, { 
      submissionState: 'error',
      errorMessage,
    });
  }

  /**
   * Reset summary card to idle state (for retry)
   * @param {string} messageId
   */
  function resetSummaryState(messageId) {
    updateMessage(messageId, { 
      submissionState: 'idle',
      errorMessage: null,
    });
  }

  return {
    element,
    expand,
    collapse,
    isExpanded,
    addMessage,
    updateMessage,
    setVoiceStatus,
    showError,
    clearError,
    getWaveformCanvas,
    updateWaveform,
    showIdleWaveform,
    clearMessages,
    getState,
    scrollToBottom,
    destroy,
    // Form input methods
    addFormInput,
    setFormInputPending,
    confirmFormInput,
    rejectFormInput,
    updateFormInputValue,
    // Answer card methods (Requirements 1.3, 3.1, 3.2, 3.4)
    addAnswerCard,
    // Summary card methods
    addSummaryCard,
    setSummarySubmitting,
    setSummarySuccess,
    setSummaryError,
    resetSummaryState,
    // Sticky input methods (Requirements 2.1, 2.4, 2.5, 6.2, 6.3, 6.4, 6.5)
    showStickyInput,
    hideStickyInput,
    setStickyInputPending,
    clearStickyInputPending,
    setStickyInputError,
    clearStickyInputError,
    setStickyInputSpeaking,
    updateStickyInputValue,
    isStickyInputVisible,
  };
}

/**
 * Generate a unique message ID
 * @returns {string}
 */
export function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

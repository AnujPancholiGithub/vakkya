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

/**
 * @typedef {'idle'|'listening'|'processing'|'speaking'} VoiceStatus
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'agent'|'system'|'form-input'} type
 * @property {string} content
 * @property {number} timestamp
 * @property {boolean} [isTranscribing]
 * @property {boolean} [isSpeaking]
 * @property {string} [fieldName] - For form-input type
 * @property {'string'|'email'|'phone'|'number'|'enum'|'text'} [fieldType] - For form-input type
 * @property {string[]} [options] - For enum field type
 * @property {any} [fieldValue] - Current value of form input
 * @property {boolean} [isConfirmed] - Whether value is confirmed
 * @property {boolean} [isPending] - Awaiting voice confirmation
 * @property {any} [pendingValue] - Value awaiting confirmation
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
    if (message.type === 'form-input') {
      return createInlineFormInput(message);
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

    // Handle keyboard input (Requirement 4.2)
    const handleInput = () => {
      const value = input.value.trim();
      if (value && callbacks.onKeyboardInput) {
        callbacks.onKeyboardInput(message.fieldName, value);
      }
    };

    // Debounce input events
    let inputTimeout;
    input.addEventListener('input', () => {
      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(handleInput, 500);
    });

    // Handle Enter key (except for textarea)
    if (input.tagName !== 'TEXTAREA') {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleInput();
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

    addMessage(message);
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
      updateMessage(message.id, {
        isPending: false,
        pendingValue: undefined,
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
  };
}

/**
 * Generate a unique message ID
 * @returns {string}
 */
export function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

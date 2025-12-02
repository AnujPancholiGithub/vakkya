/**
 * Chat Panel Component
 * Expandable panel with header, message list, and voice input bar
 * Requirements: 3.1, 3.5, 5.1, 5.2, 5.3, 5.5
 */

import { CHAT_PANEL_STYLES, applyAccentColor, applyTheme } from './chat-styles.js';

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
 * @property {'user'|'agent'|'system'} type
 * @property {string} content
 * @property {number} timestamp
 * @property {boolean} [isTranscribing]
 * @property {boolean} [isSpeaking]
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

  // Build UI structure
  buildUI();

  // References to dynamic elements
  let messagesContainer = null;
  let micButton = null;
  let waveformCanvas = null;

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

    // Mini waveform
    const waveformContainer = document.createElement('div');
    waveformContainer.className = 'vakkya-waveform-mini';
    waveformCanvas = document.createElement('canvas');
    waveformCanvas.width = 200;
    waveformCanvas.height = 40;
    waveformCanvas.style.width = '100%';
    waveformCanvas.style.height = '100%';
    waveformContainer.appendChild(waveformCanvas);

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
    const bubble = messagesContainer?.querySelector(`[data-message-id="${messageId}"]`);
    if (bubble) {
      const msg = state.messages[index];
      
      // Update content
      const content = bubble.querySelector('span:not(.vakkya-speaking-indicator)');
      if (content) content.textContent = msg.content;

      // Update transcribing state
      bubble.classList.toggle('vakkya-message-transcribing', !!msg.isTranscribing);

      // Update speaking indicator
      const existingIndicator = bubble.querySelector('.vakkya-speaking-indicator');
      if (msg.isSpeaking && !existingIndicator) {
        const indicator = document.createElement('span');
        indicator.className = 'vakkya-speaking-indicator';
        indicator.innerHTML = `
          <span class="vakkya-speaking-dot"></span>
          <span class="vakkya-speaking-dot"></span>
          <span class="vakkya-speaking-dot"></span>
        `;
        bubble.appendChild(indicator);
      } else if (!msg.isSpeaking && existingIndicator) {
        existingIndicator.remove();
      }

      scrollToBottom();
    }
  }

  /**
   * Set voice status
   * @param {VoiceStatus} status
   */
  function setVoiceStatus(status) {
    state.voiceStatus = status;

    if (micButton) {
      // Remove all status classes
      micButton.classList.remove('listening', 'processing', 'speaking', 'error');
      
      // Add current status class
      if (status !== 'idle') {
        micButton.classList.add(status);
      }
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
   * Clear all messages
   */
  function clearMessages() {
    state.messages = [];
    renderMessages();
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
    getWaveformCanvas,
    clearMessages,
    getState,
    scrollToBottom,
  };
}

/**
 * Generate a unique message ID
 * @returns {string}
 */
export function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

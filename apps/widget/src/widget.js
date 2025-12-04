/**
 * Main widget class - orchestrates all widget functionality
 */

import { parseConfig } from './config.js';
import { createContainer, destroyContainer } from './container.js';
import { applyAccentColor, applyTheme } from './chat-styles.js';
import { createButton, requestMicrophonePermission, releaseMicrophone } from './button.js';
import { createChatPanel } from './chat-panel.js';
import { generateIdleData } from './waveform.js';
import { createAudioProcessor } from './audio-processor.js';
import { createLiveKitManager } from './livekit-manager.js';
import { createFormStateManager } from './form-state-manager.js';
import { safeExecute } from './errors.js';

/**
 * @typedef {Object} WidgetState
 * @property {'idle'|'connecting'|'active'|'error'} status
 * @property {string|null} error
 * @property {'voice'|'form'|null} mode - Current interaction mode
 */

export class VakkyaWidget {
  constructor(scriptElement) {
    this.config = parseConfig(scriptElement);
    this.container = null;
    this.host = null;
    this.shadow = null;
    
    /** @type {WidgetState} */
    this.state = {
      status: 'idle',
      error: null,
      mode: null,
    };
    
    this.initialized = false;
    this._animating = false;
    
    // Components
    this.button = null;
    this.chatPanel = null;
    this.formSchema = null;
    this.audioProcessor = null;
    this.livekitManager = null;
    this.micStream = null;
    
    // Transcription state (Requirements 3.2)
    this.currentUserTranscriptionId = null;
    
    // Chat panel state (for submission flow - Requirements 8.2, 8.3)
    this.currentSummaryMessageId = null;
  }

  /**
   * Initialize the widget
   * @returns {boolean} True if initialization succeeded
   */
  init() {
    if (this.initialized) {
      console.warn('[Vakkya] Widget already initialized');
      return true;
    }

    if (!this.config) {
      this.state.status = 'error';
      this.state.error = 'Invalid configuration';
      return false;
    }

    try {
      const { host, shadow, container } = createContainer();
      this.host = host;
      this.shadow = shadow;
      this.container = container;
      
      // Apply customization (Requirements 6.1, 6.2, 6.3)
      this.applyCustomization();
      
      // Create and add button
      this.button = createButton(shadow);
      this.button.addEventListener('click', () => this.handleButtonClick());
      container.appendChild(this.button);
      
      // Create LiveKit manager
      this.livekitManager = createLiveKitManager(this.config.token, this.config.apiUrl);
      this.livekitManager.onStateChange((state, error) => this.handleConnectionStateChange(state, error));
      this.livekitManager.onRemoteAudio((audioElement) => this.handleRemoteAudio(audioElement));
      this.livekitManager.onFormAvailable((schema) => this.handleFormAvailable(schema));
      this.livekitManager.onAgentMessage((message) => this.handleAgentMessage(message));
      this.livekitManager.onTranscription((content, isFinal) => this.handleUserTranscription(content, isFinal));
      
      // Create form state manager for persistence (Requirement 7.1)
      this.formStateManager = createFormStateManager();
      
      this.initialized = true;
      return true;
    } catch (err) {
      console.error('[Vakkya] Failed to initialize widget:', err);
      this.state.status = 'error';
      this.state.error = 'Initialization failed';
      return false;
    }
  }

  /**
   * Handle button click - expand to voice UI
   */
  async handleButtonClick() {
    if (this.state.status === 'connecting' || this.state.status === 'active') {
      return;
    }

    // Allow retry from error state
    if (this.state.status === 'error') {
      this.state.status = 'idle';
      this.state.error = null;
    }

    await safeExecute(async () => {
      // Request microphone permission
      this.micStream = await requestMicrophonePermission();
      
      if (!this.micStream) {
        this.showError('mic_denied');
        return;
      }

      // Show chat panel (Requirements 3.1)
      this.showChatPanel();
      
      // Connect audio processor
      this.audioProcessor = createAudioProcessor();
      this.audioProcessor.connect(this.micStream);
      
      // Start waveform animation
      this.startWaveformAnimation();
      
      // Connect to LiveKit
      this.state.status = 'connecting';
      const connected = await this.livekitManager.connect(this.micStream);
      
      if (!connected) {
        // Error will be handled by onStateChange callback
        return;
      }
      
      this.state.status = 'active';
    }, (error) => {
      this.showError(error.code);
    });
  }

  /**
   * Show the chat panel (Requirements 3.1)
   * Replaces voice-ui with chat panel for conversation display
   */
  showChatPanel() {
    if (this.chatPanel) return;
    
    // Hide button
    if (this.button) {
      this.button.style.display = 'none';
    }
    
    // Create chat panel with all event handlers connected
    this.chatPanel = createChatPanel(this.shadow, {
      onClose: () => this.handleClose(),
      onMicClick: () => this.handleMicClick(),
      onKeyboardInput: (fieldName, value) => this.handleFormAnswer(fieldName, value),
      onConfirmValue: (fieldName) => this.handleFieldConfirm(fieldName),
      onRejectValue: (fieldName) => this.handleFieldReject(fieldName),
      onSummaryApprove: () => this.handleSubmissionApproval(),
      onSummaryEdit: (fieldName) => this.handleSummaryEdit(fieldName),
    }, {
      accentColor: this.config?.accentColor,
      theme: this.config?.theme,
    });
    
    this.container.appendChild(this.chatPanel.element);
    
    // Expand the chat panel with animation
    this.chatPanel.expand();
  }

  /**
   * Start waveform animation loop
   */
  startWaveformAnimation() {
    if (!this.chatPanel) return;
    
    this._animating = true;
    
    // Update waveform with audio data
    const updateWaveform = () => {
      if (!this._animating || !this.chatPanel) return;
      
      if (this.audioProcessor && this.audioProcessor.isConnected()) {
        this.chatPanel.updateWaveform(this.audioProcessor.getFrequencyData());
      } else {
        this.chatPanel.showIdleWaveform();
      }
      
      if (this._animating && (this.state.status === 'active' || this.state.status === 'connecting')) {
        requestAnimationFrame(updateWaveform);
      }
    };
    
    requestAnimationFrame(updateWaveform);
  }

  /**
   * Handle connection state changes
   * Requirement 7.2: Resume from last confirmed field on reconnection
   * @param {string} state
   * @param {string} [error]
   */
  handleConnectionStateChange(state, error) {
    if (this.chatPanel) {
      if (state === 'validating' || state === 'connecting') {
        this.chatPanel.setVoiceStatus('processing');
      } else if (state === 'connected') {
        this.chatPanel.setVoiceStatus('listening');
      } else if (state === 'reconnected') {
        // Requirement 7.2: Restore form state after reconnection
        this.handleReconnection();
      } else if (state === 'error') {
        this.chatPanel.showError(error || 'Connection failed');
        this.state.status = 'error';
        this.state.error = error;
      }
    }
  }

  /**
   * Handle successful reconnection
   * Requirement 7.2: Resume from last confirmed field
   */
  handleReconnection() {
    console.log('[Vakkya] Reconnected, checking for form state to restore');
    
    // Check if there's persisted state to restore
    if (this.formStateManager && this.livekitManager) {
      const availableForms = this.livekitManager.getAvailableForms();
      if (availableForms.length > 0) {
        // Try to restore from the first available form
        const restored = this.formStateManager.restoreFromStorage(availableForms[0]);
        if (restored) {
          console.log('[Vakkya] Restored form state after reconnection');
        }
      }
    }
    
    if (this.chatPanel) {
      this.chatPanel.setVoiceStatus('listening');
    }
  }

  /**
   * Handle form available callback - stores form schema but does NOT display it
   * Forms should only be displayed via handleFormActivate (agent message via data channel)
   * Validates: Requirements 1.1, 1.2 (No Automatic Form Display)
   * @param {Object} schema - Form schema from API
   */
  handleFormAvailable(schema) {
    if (!schema || !schema.fields || schema.fields.length === 0) {
      return;
    }
    
    // Store form schema internally for later use when agent activates it
    // Do NOT automatically show form UI - agent controls when to display forms
    console.log('[Vakkya] Form available (stored, not displayed):', schema.name);
    this.formSchema = schema;
  }

  /**
   * Handle remote audio from agent
   * @param {HTMLAudioElement} audioElement
   */
  handleRemoteAudio(audioElement) {
    if (this.chatPanel) {
      this.chatPanel.setVoiceStatus('speaking');
    }
    
    // When audio ends, go back to listening
    audioElement.addEventListener('ended', () => {
      if (this.chatPanel && this.state.status === 'active') {
        this.chatPanel.setVoiceStatus('listening');
      }
    });
  }

  /**
   * Handle user transcription from LiveKit
   * Requirements 3.2: Display user speech as message bubbles, real-time update
   * @param {string} content - Transcription text
   * @param {boolean} isFinal - Whether this is the final transcription
   */
  handleUserTranscription(content, isFinal) {
    if (!content || !content.trim()) return;

    // Display transcription in chat panel (Requirements 3.2)
    if (this.chatPanel) {
      if (!this.currentUserTranscriptionId) {
        // New transcription - add message to chat
        const message = {
          id: `user_${Date.now()}`,
          type: 'user',
          content: content.trim(),
          timestamp: Date.now(),
          isTranscribing: !isFinal,
        };
        this.currentUserTranscriptionId = message.id;
        this.chatPanel.addMessage(message);
      } else {
        // Update existing transcription message
        this.chatPanel.updateMessage(this.currentUserTranscriptionId, {
          content: content.trim(),
          isTranscribing: !isFinal,
        });
      }
    }

    // If final, reset current transcription ID for next utterance
    if (isFinal) {
      this.currentUserTranscriptionId = null;
    }

    console.log('[Vakkya] User transcription:', content, isFinal ? '(final)' : '(interim)');
  }

  /**
   * Handle close button click
   */
  async handleClose() {
    // Stop animation loop first
    this._animating = false;
    
    // Disconnect from LiveKit
    if (this.livekitManager) {
      await this.livekitManager.disconnect();
    }
    
    // Disconnect audio processor
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    
    // Release microphone
    if (this.micStream) {
      releaseMicrophone(this.micStream);
      this.micStream = null;
    }
    
    // Remove chat panel
    if (this.chatPanel) {
      this.chatPanel.destroy();
      this.chatPanel.element.remove();
      this.chatPanel = null;
    }
    
    // Show button again
    if (this.button) {
      this.button.style.display = 'flex';
    }
    
    this.state.status = 'idle';
    this.state.error = null;
    this.state.mode = null;
    this.currentUserTranscriptionId = null;
    this.currentSummaryMessageId = null;
  }

  /**
   * Show error in UI
   * @param {string} errorCode
   */
  showError(errorCode) {
    const messages = {
      mic_denied: 'Microphone access denied',
      mic_not_found: 'No microphone found',
      connection_failed: 'Connection failed',
      invalid_token: 'Invalid configuration',
      sdk_load_failed: 'Failed to load',
      unknown: 'Something went wrong',
    };
    
    if (this.chatPanel) {
      this.chatPanel.showError(messages[errorCode] || messages.unknown);
    }
    
    this.state.status = 'error';
    this.state.error = errorCode;
  }

  /**
   * Destroy the widget and clean up resources
   */
  async destroy() {
    await this.handleClose();
    
    if (this.host) {
      destroyContainer(this.host);
      this.host = null;
      this.shadow = null;
      this.container = null;
    }
    
    this.button = null;
    this.chatPanel = null;
    this.livekitManager = null;
    this.formSchema = null;
    this.initialized = false;
    this.state = { status: 'idle', error: null, mode: null };
  }

  /**
   * Activate form for conversational forms (via chat panel)
   * Requirement 2.2, 2.3: Form activation via data channel
   * @param {Object} schema - Form schema from API
   */
  activateForm(schema) {
    this.formSchema = schema;
    this.state.mode = 'form';
    
    // Try to restore existing state for this form (Requirement 7.2)
    const restored = this.formStateManager.restoreFromStorage(schema);
    if (restored) {
      console.log('[Vakkya] Restored form state from storage');
    } else {
      // Activate new form
      this.formStateManager.activateForm(schema);
    }
    
    // Form inputs will be rendered inline in chat panel via handleFieldFocus
    console.log('[Vakkya] Form activated:', schema.name);
  }

  /**
   * Handle form submission
   * @param {Object} answers - Collected form answers
   */
  async handleFormSubmit(answers) {
    // Send form data to voice agent via data channel if connected
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.publishMessage({
        type: 'form_complete',
        formId: this.formSchema?.id,
        answers,
      });
    }
  }

  /**
   * Handle individual form answer (keyboard input)
   * Requirements 1.2, 4.2: On keyboard input, add answer card and advance to next field
   * @param {string} fieldName
   * @param {any} value
   */
  handleFormAnswer(fieldName, value) {
    console.log('[Vakkya] handleFormAnswer:', fieldName, value);
    
    // Get the field info
    const field = this.formSchema?.fields?.find(f => f.name === fieldName);
    if (!field) {
      console.warn('[Vakkya] handleFormAnswer: field not found in schema:', fieldName);
      return;
    }
    
    // Set answer in form state manager (keyboard inputs are auto-confirmed)
    const result = this.formStateManager?.setAnswer(fieldName, value, 'keyboard');
    console.log('[Vakkya] handleFormAnswer: setAnswer result:', result);
    
    if (result && this.chatPanel) {
      // Add answer card to chat for the completed field (Requirement 1.3, 3.1)
      this.chatPanel.addAnswerCard(
        fieldName,
        field.label || fieldName,
        result.value
      );
      
      // Hide the current sticky input
      this.chatPanel.hideStickyInput();
      
      // Check if we should transition to summary (Requirement 1.5, 4.4)
      if (result.shouldTransitionToSummary) {
        console.log('[Vakkya] handleFormAnswer: transitioning to summary');
        this.transitionToSummary();
      } else {
        // Show the next field in sticky input with animation (Requirement 2.3)
        console.log('[Vakkya] handleFormAnswer: showing next field');
        this.showNextFieldWithAnimation();
      }
    } else {
      console.warn('[Vakkya] handleFormAnswer: no result from setAnswer or missing chatPanel');
    }
    
    // Send keyboard input to voice agent via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.sendKeyboardInput(fieldName, value);
    }
  }

  /**
   * Handle mic button click in chat panel
   * Toggles microphone state
   */
  handleMicClick() {
    // Mic is always active when chat panel is open
    // This could be extended to toggle mute state if needed
    console.log('[Vakkya] Mic button clicked');
  }

  /**
   * Handle field confirmation from chat panel
   * Requirements 1.2, 4.2: On confirm, add answer card to chat, hide current input, show next
   * Requirement 6.2: Clear pending confirmation from sticky container after confirm
   * @param {string} fieldName
   */
  handleFieldConfirm(fieldName) {
    // Get the field info and value before confirming
    const formState = this.formStateManager?.getState();
    const pendingConfirmation = formState?.pendingConfirmation;
    const field = this.formSchema?.fields?.find(f => f.name === fieldName);
    
    // Confirm in form state manager and get transition info
    const result = this.formStateManager?.confirmAnswer(fieldName);
    
    if (result && this.chatPanel && field) {
      // Clear sticky input pending confirmation (Requirement 6.2)
      this.chatPanel.clearStickyInputPending(fieldName);
      
      // Add answer card to chat for the completed field (Requirement 1.3, 3.1)
      this.chatPanel.addAnswerCard(
        fieldName,
        field.label || fieldName,
        result.value
      );
      
      // Hide the current sticky input
      this.chatPanel.hideStickyInput();
      
      // Check if we should transition to summary (Requirement 1.5, 4.4)
      if (result.shouldTransitionToSummary) {
        this.transitionToSummary();
      } else {
        // Show the next field in sticky input with animation (Requirement 2.3)
        this.showNextFieldWithAnimation();
      }
    }
    
    // Update chat panel state (legacy inline form input)
    if (this.chatPanel) {
      this.chatPanel.confirmFormInput(fieldName);
    }
    
    // Send confirmation to agent via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.publishMessage({
        type: 'field_confirmed',
        fieldName,
      });
    }
    
    console.log('[Vakkya] Field confirmed:', fieldName);
  }

  /**
   * Show the next field in sticky input with animation
   * Requirement 2.3: Animate transition to new field input
   */
  showNextFieldWithAnimation() {
    if (!this.formStateManager || !this.chatPanel || !this.formSchema) return;
    
    const nextField = this.formStateManager.getActiveField();
    if (!nextField) return;
    
    const progress = this.formStateManager.getProgress();
    const currentValue = this.formStateManager.getState().answers[nextField.name]?.value || '';
    
    // Small delay for animation effect (Requirement 2.3)
    setTimeout(() => {
      this.chatPanel.showStickyInput(
        nextField,
        progress.current - 1, // 0-based index
        progress.total,
        currentValue
      );
    }, 150);
  }

  /**
   * Transition to summary mode when all fields are collected
   * Requirements 1.5, 4.4: Transition to summary when complete
   */
  transitionToSummary() {
    if (!this.formStateManager || !this.chatPanel || !this.formSchema) return;
    
    // Hide sticky input (Requirement 2.4)
    this.chatPanel.hideStickyInput();
    
    // Get all confirmed answers
    const confirmedAnswers = this.formStateManager.getConfirmedAnswers();
    
    // Format answers for summary card
    const formattedAnswers = {};
    for (const [fieldName, value] of Object.entries(confirmedAnswers)) {
      const field = this.formSchema.fields?.find(f => f.name === fieldName);
      formattedAnswers[fieldName] = {
        label: field?.label || fieldName,
        value: value,
      };
    }
    
    // Add summary card to chat (Requirement 8.1)
    this.currentSummaryMessageId = this.chatPanel.addSummaryCard(
      this.formSchema.name || 'Form Summary',
      formattedAnswers
    );
    
    // Update form state manager
    this.formStateManager.showSummary();
    
    console.log('[Vakkya] Transitioned to summary mode');
  }

  /**
   * Handle field rejection from chat panel
   * Requirement 4.4: Clear and re-ask on reject
   * Requirement 6.2: Clear pending confirmation from sticky container
   * @param {string} fieldName
   */
  handleFieldReject(fieldName) {
    // Update chat panel state - clear inline form input pending
    if (this.chatPanel) {
      this.chatPanel.rejectFormInput(fieldName);
      // Clear sticky input pending confirmation (Requirement 6.2)
      this.chatPanel.clearStickyInputPending(fieldName);
    }
    
    // Update form state manager
    if (this.formStateManager) {
      this.formStateManager.rejectAnswer(fieldName);
    }
    
    // Send rejection to agent via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.publishMessage({
        type: 'field_rejected',
        fieldName,
      });
    }
    
    console.log('[Vakkya] Field rejected:', fieldName);
  }

  /**
   * Handle agent messages from data channel
   * Validates: Requirements 10.1, 10.2 (Property 6, 21)
   * @param {Object} message - AgentToWidgetMessage
   */
  handleAgentMessage(message) {
    switch (message.type) {
      case 'form_activate':
        this.handleFormActivate(message.schema);
        break;
      case 'field_focus':
        this.handleFieldFocus(message.fieldName, message.fieldIndex);
        break;
      case 'field_completed':
        this.handleFieldCompleted(message.fieldName, message.value);
        break;
      case 'value_extracted':
        this.handleValueExtracted(message.fieldName, message.value, message.utterance);
        break;
      case 'value_confirmed':
        this.handleValueConfirmed(message.fieldName, message.value);
        break;
      case 'show_summary':
        this.handleShowSummary(message.answers);
        break;
      case 'submission_success':
        this.handleSubmissionSuccess(message.submissionId);
        break;
      case 'submission_failed':
        this.handleSubmissionFailed(message.error, message.canRetry);
        break;
      case 'form_deactivated':
        this.handleFormDeactivated();
        break;
      case 'agent_message':
        this.handleAgentTextMessage(message.content, message.isSpeaking);
        break;
      case 'agent_speaking_start':
        this.handleAgentSpeakingStart();
        break;
      case 'agent_speaking_end':
        this.handleAgentSpeakingEnd();
        break;
      case 'validation_error':
        this.handleValidationError(message.fieldName, message.error);
        break;
      default:
        console.warn('[Vakkya] Unknown agent message type:', message.type);
    }
  }

  /**
   * Handle form_activate message from agent
   * Property 6: Form Activation Widget Sync
   * Requirements 1.1, 2.1: Display only first field in sticky container
   * @param {Object} schema - Form schema from agent
   */
  handleFormActivate(schema) {
    console.log('[Vakkya] handleFormActivate called with schema:', JSON.stringify(schema, null, 2));
    
    if (!schema || !schema.fields || schema.fields.length === 0) {
      console.warn('[Vakkya] Invalid form schema in form_activate - schema:', schema, 'fields:', schema?.fields);
      return;
    }
    
    console.log('[Vakkya] Form activated by agent:', schema.name, 'with', schema.fields.length, 'fields');
    this.activateForm(schema);
    
    if (this.chatPanel && schema.fields) {
      // Add a system message introducing the form
      this.chatPanel.addMessage({
        id: `form_intro_${Date.now()}`,
        type: 'system',
        content: `You can type your answers below or speak them.`,
        timestamp: Date.now(),
      });
      
      // Show only the first field in sticky input (Requirement 1.1, 2.1)
      const firstField = schema.fields[0];
      if (firstField) {
        this.chatPanel.showStickyInput(
          firstField,
          0, // First field (0-based index)
          schema.fields.length,
          '' // No initial value
        );
      }
      
      console.log('[Vakkya] First field shown in sticky input:', firstField?.name);
    } else {
      console.warn('[Vakkya] Cannot show sticky input - chatPanel:', !!this.chatPanel, 'fields:', !!schema.fields);
    }
  }

  /**
   * Handle field_focus message - navigate to specific field
   * Requirement 4.1, 4.3: Track current field and sync with agent
   * @param {string} fieldName
   * @param {number} [fieldIndex] - Index of the field in the form schema
   */
  handleFieldFocus(fieldName, fieldIndex) {
    if (!this.chatPanel || !this.formSchema) return;
    
    // Find the field in the schema
    const field = this.formSchema.fields?.find(f => f.name === fieldName);
    if (!field) {
      console.warn('[Vakkya] Field not found in schema:', fieldName);
      return;
    }
    
    // Update form state manager with current field index (Requirement 4.1)
    if (this.formStateManager && typeof fieldIndex === 'number') {
      this.formStateManager.setActiveFieldIndex(fieldIndex);
    }
    
    // Update sticky input with the focused field (Requirement 2.1)
    // Note: We ONLY use sticky input now - no inline form inputs in chat (Requirement 1.1, 1.4)
    const totalFields = this.formSchema.fields?.length || 0;
    const currentIndex = typeof fieldIndex === 'number' ? fieldIndex : 0;
    
    if (this.chatPanel.showStickyInput) {
      this.chatPanel.showStickyInput(
        field,
        currentIndex,
        totalFields
      );
    }
    
    console.log('[Vakkya] Field focus updated:', fieldName, 'index:', fieldIndex);
  }

  /**
   * Handle field_completed message from agent
   * Requirements 1.2, 3.1: Add answer card to chat when agent confirms field, advance to next field
   * @param {string} fieldName - Name of the completed field
   * @param {unknown} value - The confirmed value for the field
   */
  handleFieldCompleted(fieldName, value) {
    if (!this.chatPanel || !this.formSchema) return;
    
    // Find the field in the schema
    const field = this.formSchema.fields?.find(f => f.name === fieldName);
    if (!field) {
      console.warn('[Vakkya] Field not found in schema for field_completed:', fieldName);
      return;
    }
    
    // Set the answer in form state manager (mark as confirmed from voice)
    const result = this.formStateManager?.setAnswer(fieldName, value, 'voice');
    
    // If voice input, we need to manually confirm it since setAnswer with 'voice' doesn't auto-confirm
    if (!result) {
      // The answer was set but needs confirmation - confirm it now
      this.formStateManager?.setPendingConfirmation(fieldName, value, '');
      const confirmResult = this.formStateManager?.confirmAnswer(fieldName);
      
      if (confirmResult && this.chatPanel) {
        // Add answer card to chat for the completed field (Requirement 1.3, 3.1)
        this.chatPanel.addAnswerCard(
          fieldName,
          field.label || fieldName,
          confirmResult.value
        );
        
        // Clear any pending state from sticky input
        this.chatPanel.clearStickyInputPending(fieldName);
        
        // Hide the current sticky input
        this.chatPanel.hideStickyInput();
        
        // Check if we should transition to summary (Requirement 1.5, 4.4)
        if (confirmResult.shouldTransitionToSummary) {
          this.transitionToSummary();
        } else {
          // Show the next field in sticky input with animation (Requirement 2.3)
          this.showNextFieldWithAnimation();
        }
      }
    } else {
      // Keyboard-style auto-confirm happened
      if (this.chatPanel) {
        // Add answer card to chat for the completed field (Requirement 1.3, 3.1)
        this.chatPanel.addAnswerCard(
          fieldName,
          field.label || fieldName,
          result.value
        );
        
        // Hide the current sticky input
        this.chatPanel.hideStickyInput();
        
        // Check if we should transition to summary (Requirement 1.5, 4.4)
        if (result.shouldTransitionToSummary) {
          this.transitionToSummary();
        } else {
          // Show the next field in sticky input with animation (Requirement 2.3)
          this.showNextFieldWithAnimation();
        }
      }
    }
    
    console.log('[Vakkya] Field completed:', fieldName, 'value:', value);
  }

  /**
   * Handle value_extracted message - show pending confirmation
   * Requirement 4.3: Display extracted value with pending state
   * Requirement 6.2: Show extracted value with confirm/reject in sticky container
   * @param {string} fieldName
   * @param {any} value
   * @param {string} utterance
   */
  handleValueExtracted(fieldName, value, utterance) {
    if (this.chatPanel) {
      // Update legacy inline form input
      this.chatPanel.setFormInputPending(fieldName, value);
      
      // Update sticky input container with pending confirmation (Requirement 6.2)
      // This shows "I heard: {value}" with Confirm/Reject buttons
      this.chatPanel.setStickyInputPending(fieldName, value);
    }
    
    // Also update form state manager with pending confirmation
    if (this.formStateManager) {
      this.formStateManager.setPendingConfirmation(fieldName, value, utterance || '');
    }
  }

  /**
   * Handle value_confirmed message - confirm the value from agent
   * Requirements 1.2, 4.2: On confirm, add answer card to chat, hide current input, show next
   * @param {string} fieldName
   * @param {any} value
   */
  handleValueConfirmed(fieldName, value) {
    // Get the field info
    const field = this.formSchema?.fields?.find(f => f.name === fieldName);
    
    // Confirm in form state manager
    const result = this.formStateManager?.confirmAnswer(fieldName);
    
    if (this.chatPanel && field) {
      // Add answer card to chat for the completed field (Requirement 1.3, 3.1)
      this.chatPanel.addAnswerCard(
        fieldName,
        field.label || fieldName,
        result?.value ?? value
      );
      
      // Hide the current sticky input
      this.chatPanel.hideStickyInput();
      
      // Check if we should transition to summary (Requirement 1.5, 4.4)
      if (result?.shouldTransitionToSummary) {
        this.transitionToSummary();
      } else {
        // Show the next field in sticky input with animation (Requirement 2.3)
        this.showNextFieldWithAnimation();
      }
      
      // Also update legacy inline form input
      this.chatPanel.confirmFormInput(fieldName);
    }
  }

  /**
   * Handle show_summary message - display form summary
   * Requirement 8.1: Present summary when all fields collected
   * @param {Object} answers
   */
  handleShowSummary(answers) {
    // Add summary card to chat panel
    if (this.chatPanel && this.formSchema) {
      // Convert answers to the format expected by chat panel
      const formattedAnswers = {};
      for (const [fieldName, value] of Object.entries(answers)) {
        const field = this.formSchema.fields?.find(f => f.name === fieldName);
        formattedAnswers[fieldName] = {
          label: field?.label || fieldName,
          value: value,
        };
      }
      
      this.currentSummaryMessageId = this.chatPanel.addSummaryCard(
        this.formSchema.name || 'Form Summary',
        formattedAnswers
      );
    }
    
    // Update form state manager
    if (this.formStateManager) {
      this.formStateManager.showSummary();
    }
  }

  /**
   * Handle submission_success message
   * Requirement 8.3: Show success message in chat
   * @param {string} submissionId
   */
  handleSubmissionSuccess(submissionId) {
    // Update chat panel summary card
    if (this.chatPanel && this.currentSummaryMessageId) {
      this.chatPanel.setSummarySuccess(this.currentSummaryMessageId);
      
      // Add success message to chat (Requirement 8.3)
      this.chatPanel.addMessage({
        id: `success_${Date.now()}`,
        type: 'system',
        content: 'Your information has been submitted successfully! Is there anything else I can help you with?',
        timestamp: Date.now(),
      });
    }
    
    // Mark form as completed in state manager
    if (this.formStateManager) {
      this.formStateManager.completeForm();
    }
    
    console.log('[Vakkya] Submission successful:', submissionId);
  }

  /**
   * Handle submission_failed message
   * Requirement 8.3: Display error in chat, allow retry
   * @param {string} error
   * @param {boolean} canRetry
   */
  handleSubmissionFailed(error, canRetry) {
    // Update chat panel summary card
    if (this.chatPanel && this.currentSummaryMessageId) {
      const errorMessage = error || 'Submission failed. Please try again.';
      this.chatPanel.setSummaryError(this.currentSummaryMessageId, errorMessage);
    }
    
    console.log('[Vakkya] Submission failed:', error, 'canRetry:', canRetry);
  }

  /**
   * Handle submission approval from chat panel
   * Requirement 8.2: Send submission_approved via data channel, show submitting state
   */
  handleSubmissionApproval() {
    // Show submitting state in chat panel
    if (this.chatPanel && this.currentSummaryMessageId) {
      this.chatPanel.setSummarySubmitting(this.currentSummaryMessageId);
    }
    
    // Send submission_approved via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.sendSubmissionApproved();
      console.log('[Vakkya] Submission approved, sent to agent');
    } else {
      // Handle case where not connected - show error
      this.handleSubmissionFailed('Not connected to voice agent. Please try again.', true);
    }
  }

  /**
   * Handle summary edit request from chat panel
   * @param {string} fieldName - Field to edit
   */
  handleSummaryEdit(fieldName) {
    // Reset summary state for re-editing
    if (this.chatPanel && this.currentSummaryMessageId) {
      this.chatPanel.resetSummaryState(this.currentSummaryMessageId);
    }
    
    // Send edit request via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.sendEditRequested(fieldName);
    }
    
    // Update form state manager
    if (this.formStateManager) {
      this.formStateManager.editField(fieldName);
    }
    
    console.log('[Vakkya] Edit requested for field:', fieldName);
  }

  /**
   * Handle form_deactivated message - clear form state
   */
  handleFormDeactivated() {
    // Clear form schema and mode
    this.formSchema = null;
    this.state.mode = null;
    this.currentSummaryMessageId = null;
    
    // Add system message to chat panel
    if (this.chatPanel) {
      this.chatPanel.addMessage({
        id: `system_${Date.now()}`,
        type: 'system',
        content: 'Form completed. How else can I help you?',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle agent_message from data channel
   * Requirements 3.3: Display agent text as message bubbles
   * @param {string} content - Agent message text
   * @param {boolean} [isSpeaking] - Whether agent is currently speaking this message
   */
  handleAgentTextMessage(content, isSpeaking = false) {
    if (!content || !content.trim()) return;

    // Display agent message in chat panel (Requirements 3.3)
    if (this.chatPanel) {
      const message = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        content: content.trim(),
        timestamp: Date.now(),
        isSpeaking,
      };
      this.chatPanel.addMessage(message);
    }

    console.log('[Vakkya] Agent message:', content, isSpeaking ? '(speaking)' : '');
  }

  /**
   * Handle agent_speaking_start from data channel
   * Requirements 7.2: Show speaking indicator during TTS
   */
  handleAgentSpeakingStart() {
    // Update chat panel status
    if (this.chatPanel) {
      this.chatPanel.setVoiceStatus('speaking');
      
      // Find the most recent agent message and mark it as speaking
      const state = this.chatPanel.getState();
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].type === 'agent') {
          this.chatPanel.updateMessage(state.messages[i].id, { isSpeaking: true });
          break;
        }
      }
    }

    console.log('[Vakkya] Agent speaking started');
  }

  /**
   * Handle agent_speaking_end from data channel
   * Requirements 7.2: Remove speaking indicator when TTS ends
   */
  handleAgentSpeakingEnd() {
    // Update chat panel status back to listening
    if (this.chatPanel) {
      if (this.state.status === 'active') {
        this.chatPanel.setVoiceStatus('listening');
      }
      
      // Find the most recent agent message and mark it as not speaking
      const state = this.chatPanel.getState();
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].type === 'agent') {
          this.chatPanel.updateMessage(state.messages[i].id, { isSpeaking: false });
          break;
        }
      }
    }

    console.log('[Vakkya] Agent speaking ended');
  }

  /**
   * Handle validation_error message from agent
   * Requirement 6.3: Display validation error message below input
   * @param {string} fieldName - Field that failed validation
   * @param {string} error - Error message to display
   */
  handleValidationError(fieldName, error) {
    if (!this.chatPanel) return;
    
    // Display error in sticky input container (Requirement 6.3)
    this.chatPanel.setStickyInputError(error);
    
    console.log('[Vakkya] Validation error for field:', fieldName, 'error:', error);
  }

  /**
   * Set form answer from voice input (called by voice agent)
   * @param {string} fieldName
   * @param {any} value
   */
  setFormAnswer(fieldName, value) {
    if (this.chatPanel) {
      this.chatPanel.updateFormInputValue(fieldName, value);
    }
  }

  /**
   * Get current form field (for voice agent coordination)
   * @returns {Object|null}
   */
  getCurrentFormField() {
    // With chat panel, we track the current field via formSchema
    // Return the current field being collected if form is active
    return this.formSchema ? { schema: this.formSchema } : null;
  }

  /**
   * Get current widget state
   * @returns {WidgetState}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get widget configuration
   * @returns {import('./config.js').WidgetConfig|null}
   */
  getConfig() {
    return this.config ? { ...this.config } : null;
  }

  /**
   * Apply customization from config to host element
   * Requirements: 6.1, 6.2, 6.3
   */
  applyCustomization() {
    if (!this.host || !this.config) return;

    // Apply custom accent color (Requirement 6.1, 6.3)
    if (this.config.accentColor) {
      applyAccentColor(this.host, this.config.accentColor);
    }

    // Apply theme (Requirement 6.2)
    if (this.config.theme) {
      applyTheme(this.host, this.config.theme);
    }

    // Apply position
    if (this.config.position === 'bottom-left') {
      this.host.setAttribute('data-position', 'bottom-left');
    }
  }
}

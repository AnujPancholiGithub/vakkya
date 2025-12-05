/**
 * Main widget class - orchestrates all widget functionality
 */

import { parseConfig } from './config.js';
import { createContainer, destroyContainer } from './container.js';
import { createButton, requestMicrophonePermission, releaseMicrophone } from './button.js';
import { createVoiceUI } from './voice-ui.js';
import { createFormUI } from './form-ui.js';
import { createWaveformRenderer, generateIdleData } from './waveform.js';
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
    this.voiceUI = null;
    this.formUI = null;
    this.formSchema = null;
    this.waveformRenderer = null;
    this.audioProcessor = null;
    this.livekitManager = null;
    this.micStream = null;
    
    // Transcription state (Requirements 3.2)
    this.currentUserTranscriptionId = null;
    this.transcriptions = [];
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

      // Show voice UI
      this.showVoiceUI();
      
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
   * Show the voice UI
   */
  showVoiceUI() {
    if (this.voiceUI) return;
    
    // Hide button
    if (this.button) {
      this.button.style.display = 'none';
    }
    
    // Create voice UI
    this.voiceUI = createVoiceUI(this.shadow, () => this.handleClose());
    this.container.appendChild(this.voiceUI.element);
    
    // Create waveform renderer
    this.waveformRenderer = createWaveformRenderer(this.voiceUI.canvas);
  }

  /**
   * Start waveform animation loop
   */
  startWaveformAnimation() {
    if (!this.waveformRenderer) return;
    
    this.waveformRenderer.start();
    this._animating = true;
    
    // Update waveform with audio data
    const updateWaveform = () => {
      if (!this._animating || !this.waveformRenderer) return;
      
      if (this.audioProcessor && this.audioProcessor.isConnected()) {
        this.waveformRenderer.setData(this.audioProcessor.getFrequencyData());
      } else {
        this.waveformRenderer.setData(generateIdleData());
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
    if (this.voiceUI) {
      if (state === 'validating' || state === 'connecting') {
        this.voiceUI.setStatus('connecting');
      } else if (state === 'connected') {
        this.voiceUI.setStatus('listening');
      } else if (state === 'reconnected') {
        // Requirement 7.2: Restore form state after reconnection
        this.handleReconnection();
      } else if (state === 'error') {
        this.voiceUI.showError(error || 'Connection failed');
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
    
    // If form UI exists and has a state manager, it will auto-restore
    // If not, check if there's persisted state to restore
    if (!this.formUI && this.formStateManager && this.livekitManager) {
      const availableForms = this.livekitManager.getAvailableForms();
      if (availableForms.length > 0) {
        // Try to restore from the first available form
        const restored = this.formStateManager.restoreFromStorage(availableForms[0]);
        if (restored) {
          console.log('[Vakkya] Restored form state after reconnection');
          // Recreate form UI with restored state
          this.showFormUI(availableForms[0]);
        }
      }
    }
    
    if (this.voiceUI) {
      this.voiceUI.setStatus('listening');
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
    if (this.voiceUI) {
      this.voiceUI.setStatus('speaking');
    }
    
    // When audio ends, go back to listening
    audioElement.addEventListener('ended', () => {
      if (this.voiceUI && this.state.status === 'active') {
        this.voiceUI.setStatus('listening');
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

    // Store transcription for later use (when chat panel is integrated)
    const transcription = {
      id: this.currentUserTranscriptionId || `trans_${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      isFinal,
    };

    if (!this.currentUserTranscriptionId) {
      // New transcription - add to list
      this.currentUserTranscriptionId = transcription.id;
      this.transcriptions.push(transcription);
    } else {
      // Update existing transcription
      const index = this.transcriptions.findIndex(t => t.id === this.currentUserTranscriptionId);
      if (index !== -1) {
        this.transcriptions[index] = transcription;
      }
    }

    // If final, reset current transcription ID for next utterance
    if (isFinal) {
      this.currentUserTranscriptionId = null;
    }

    // TODO: When chat panel is integrated (task 17), display transcription in chat
    // For now, just log it
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
    
    // Stop waveform
    if (this.waveformRenderer) {
      this.waveformRenderer.destroy();
      this.waveformRenderer = null;
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
    
    // Remove voice UI
    if (this.voiceUI) {
      this.voiceUI.element.remove();
      this.voiceUI = null;
    }
    
    // Remove form UI
    if (this.formUI) {
      this.formUI.element.remove();
      this.formUI = null;
    }
    
    // Show button again
    if (this.button) {
      this.button.style.display = 'flex';
    }
    
    this.state.status = 'idle';
    this.state.error = null;
    this.state.mode = null;
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
    
    if (this.voiceUI) {
      this.voiceUI.showError(messages[errorCode] || messages.unknown);
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
    this.livekitManager = null;
    this.formSchema = null;
    this.initialized = false;
    this.state = { status: 'idle', error: null, mode: null };
  }

  /**
   * Show form UI for conversational forms
   * Requirement 7.1: Preserve form state during disconnection
   * @param {Object} schema - Form schema from API
   */
  showFormUI(schema) {
    if (this.formUI) return;
    
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
    
    // Create form UI (voice UI stays visible for hybrid voice+visual experience)
    this.formUI = createFormUI(this.shadow, schema, {
      onClose: () => this.handleClose(),
      onSubmit: (answers) => this.handleFormSubmit(answers),
      onAnswer: (fieldName, value) => this.handleFormAnswer(fieldName, value),
    });
    
    this.container.appendChild(this.formUI.element);
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
   * @param {string} fieldName
   * @param {any} value
   */
  handleFormAnswer(fieldName, value) {
    // Send keyboard input to voice agent via data channel
    if (this.livekitManager && this.livekitManager.isConnected()) {
      this.livekitManager.sendKeyboardInput(fieldName, value);
    }
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
        this.handleFieldFocus(message.fieldName);
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
      default:
        console.warn('[Vakkya] Unknown agent message type:', message.type);
    }
  }

  /**
   * Handle form_activate message from agent
   * Property 6: Form Activation Widget Sync
   * @param {Object} schema - Form schema from agent
   */
  handleFormActivate(schema) {
    if (!schema || !schema.fields || schema.fields.length === 0) {
      console.warn('[Vakkya] Invalid form schema in form_activate');
      return;
    }
    
    console.log('[Vakkya] Form activated by agent:', schema.name);
    this.showFormUI(schema);
  }

  /**
   * Handle field_focus message - navigate to specific field
   * @param {string} fieldName
   */
  handleFieldFocus(fieldName) {
    if (this.formUI) {
      this.formUI.focusField(fieldName);
    }
  }

  /**
   * Handle value_extracted message - show pending confirmation
   * @param {string} fieldName
   * @param {any} value
   * @param {string} utterance
   */
  handleValueExtracted(fieldName, value, utterance) {
    if (this.formUI) {
      this.formUI.showPendingValue(fieldName, value, utterance);
    }
  }

  /**
   * Handle value_confirmed message - confirm the value
   * @param {string} fieldName
   * @param {any} value
   */
  handleValueConfirmed(fieldName, value) {
    if (this.formUI) {
      this.formUI.confirmValue(fieldName, value);
    }
  }

  /**
   * Handle show_summary message - display form summary
   * @param {Object} answers
   */
  handleShowSummary(answers) {
    if (this.formUI) {
      this.formUI.showSummary(answers);
    }
  }

  /**
   * Handle submission_success message
   * @param {string} submissionId
   */
  handleSubmissionSuccess(submissionId) {
    if (this.formUI) {
      this.formUI.showSuccess(submissionId);
    }
  }

  /**
   * Handle submission_failed message
   * @param {string} error
   * @param {boolean} canRetry
   */
  handleSubmissionFailed(error, canRetry) {
    if (this.formUI) {
      this.formUI.showError(error, canRetry);
    }
  }

  /**
   * Handle form_deactivated message - close form UI
   */
  handleFormDeactivated() {
    if (this.formUI) {
      this.formUI.element.remove();
      this.formUI = null;
      this.formSchema = null;
      this.state.mode = null;
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

    // Store agent message for later use (when chat panel is integrated)
    const message = {
      id: `agent_${Date.now()}`,
      type: 'agent',
      content: content.trim(),
      timestamp: Date.now(),
      isSpeaking,
    };

    this.transcriptions.push(message);

    // TODO: When chat panel is integrated (task 17), display message in chat
    // For now, just log it
    console.log('[Vakkya] Agent message:', content, isSpeaking ? '(speaking)' : '');
  }

  /**
   * Handle agent_speaking_start from data channel
   * Requirements 7.2: Show speaking indicator during TTS
   */
  handleAgentSpeakingStart() {
    // Find the most recent agent message and mark it as speaking
    for (let i = this.transcriptions.length - 1; i >= 0; i--) {
      if (this.transcriptions[i].type === 'agent') {
        this.transcriptions[i].isSpeaking = true;
        break;
      }
    }

    // Update voice UI status
    if (this.voiceUI) {
      this.voiceUI.setStatus('speaking');
    }

    // TODO: When chat panel is integrated (task 17), update message bubble with speaking indicator
    console.log('[Vakkya] Agent speaking started');
  }

  /**
   * Handle agent_speaking_end from data channel
   * Requirements 7.2: Remove speaking indicator when TTS ends
   */
  handleAgentSpeakingEnd() {
    // Find the most recent agent message and mark it as not speaking
    for (let i = this.transcriptions.length - 1; i >= 0; i--) {
      if (this.transcriptions[i].type === 'agent') {
        this.transcriptions[i].isSpeaking = false;
        break;
      }
    }

    // Update voice UI status back to listening
    if (this.voiceUI && this.state.status === 'active') {
      this.voiceUI.setStatus('listening');
    }

    // TODO: When chat panel is integrated (task 17), update message bubble to remove speaking indicator
    console.log('[Vakkya] Agent speaking ended');
  }

  /**
   * Set form answer from voice input (called by voice agent)
   * @param {string} fieldName
   * @param {any} value
   */
  setFormAnswer(fieldName, value) {
    if (this.formUI) {
      this.formUI.setAnswer(fieldName, value);
    }
  }

  /**
   * Get current form field (for voice agent coordination)
   * @returns {Object|null}
   */
  getCurrentFormField() {
    return this.formUI ? this.formUI.getCurrentField() : null;
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
}
